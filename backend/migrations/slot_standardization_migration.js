const db = require('../db');

async function runMigration() {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    console.log('Starting Slot Standardization Migration...');

    // 1. Add registered_slots column to monthly_subscriptions table
    await client.query(`
      ALTER TABLE monthly_subscriptions 
      ADD COLUMN IF NOT EXISTS registered_slots TEXT[] DEFAULT '{}';
      
      CREATE INDEX IF NOT EXISTS idx_monthly_subs_slots 
      ON monthly_subscriptions USING GIN (registered_slots);
    `);
    console.log('✓ Added registered_slots column to monthly_subscriptions');

    // 2. Add slot_code column to sessions table
    await client.query(`
      ALTER TABLE sessions 
      ADD COLUMN IF NOT EXISTS slot_code VARCHAR(50) NULL;

      CREATE INDEX IF NOT EXISTS idx_sessions_slot_code 
      ON sessions (slot_code);
    `);
    console.log('✓ Added slot_code column to sessions table');

    // 3. Populate existing registered_slots from registered_days for legacy rows
    const subsRes = await client.query(`
      SELECT id, registered_days, registered_slots FROM monthly_subscriptions
      WHERE registered_slots IS NULL OR array_length(registered_slots, 1) IS NULL;
    `);

    let migratedSubsCount = 0;
    for (const sub of subsRes.rows) {
      const days = sub.registered_days || [];
      const derivedSlots = [];

      for (const d of days) {
        if (d === 'WEDNESDAY') derivedSlots.push('WED_18_20');
        else if (d === 'THURSDAY') derivedSlots.push('THU_18_20'); // Default legacy Thursday to 18-20h
        else if (d === 'SATURDAY') derivedSlots.push('SAT_18_20');
        else if (d === 'MONDAY') derivedSlots.push('MON_18_20');
        else if (d === 'TUESDAY') derivedSlots.push('TUE_18_20');
        else if (d === 'FRIDAY') derivedSlots.push('FRI_18_20');
        else if (d === 'SUNDAY') derivedSlots.push('SUN_18_20');
      }

      if (derivedSlots.length > 0) {
        await client.query(`
          UPDATE monthly_subscriptions 
          SET registered_slots = $1::text[] 
          WHERE id = $2::uuid;
        `, [derivedSlots, sub.id]);
        migratedSubsCount++;
      }
    }
    console.log(`✓ Backfilled registered_slots for ${migratedSubsCount} existing subscriptions`);

    // 4. Populate slot_code for existing sessions based on start and end time
    const sessionsRes = await client.query(`
      SELECT id, date_time, session_start, session_end FROM sessions
      WHERE slot_code IS NULL;
    `);

    let updatedSessionsCount = 0;
    for (const s of sessionsRes.rows) {
      const tStart = s.session_start ? new Date(s.session_start) : new Date(s.date_time);
      const tEnd = s.session_end ? new Date(s.session_end) : new Date(tStart.getTime() + 2 * 3600000);

      const vnWeekday = tStart.toLocaleDateString('en-US', { timeZone: 'Asia/Ho_Chi_Minh', weekday: 'short' }).toUpperCase();
      const vnStartHour = parseInt(tStart.toLocaleTimeString('en-US', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', hour12: false }), 10);
      const vnEndHour = parseInt(tEnd.toLocaleTimeString('en-US', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', hour12: false }), 10);

      // Map weekday prefix: WED, THU, SAT...
      let dayPrefix = vnWeekday.slice(0, 3);
      if (dayPrefix === 'TUE') dayPrefix = 'TUE';

      const code = `${dayPrefix}_${String(vnStartHour).padStart(2, '0')}_${String(vnEndHour).padStart(2, '0')}`.replace(/_0/g, '_');
      
      // Standardize single digit to format like THU_17_19 or THU_18_20
      const standardCode = `${dayPrefix}_${vnStartHour}_${vnEndHour}`;

      await client.query(`
        UPDATE sessions SET slot_code = $1 WHERE id = $2::uuid;
      `, [standardCode, s.id]);
      updatedSessionsCount++;
    }
    console.log(`✓ Populated slot_code for ${updatedSessionsCount} existing sessions`);

    await client.query('COMMIT');
    console.log('Slot Standardization Migration completed successfully.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration failed, rolled back:', error);
    throw error;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  runMigration()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = runMigration;
