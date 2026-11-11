const db = require('../db');

async function runMigration() {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    console.log('Starting Monthly Subscriptions & Attendance Extension migration...');

    // 1. Create monthly_subscriptions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS monthly_subscriptions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        month_year VARCHAR(7) NOT NULL, -- e.g. '2026-10'
        registered_days TEXT[] NOT NULL, -- e.g. ARRAY['WEDNESDAY', 'THURSDAY', 'SATURDAY']
        payment_status VARCHAR(20) DEFAULT 'PAID', -- 'PAID', 'PENDING', 'EXEMPT'
        receipt_url TEXT NULL,
        note TEXT NULL,
        created_by UUID NULL REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT uq_user_month_subscription UNIQUE (user_id, month_year)
      );
      CREATE INDEX IF NOT EXISTS idx_monthly_subs_month ON monthly_subscriptions(month_year);
      CREATE INDEX IF NOT EXISTS idx_monthly_subs_user ON monthly_subscriptions(user_id);
    `);
    console.log('✓ Created monthly_subscriptions table and indexes');

    // 2. Extend attendances with registration_type column
    await client.query(`
      ALTER TABLE attendances 
      ADD COLUMN IF NOT EXISTS registration_type VARCHAR(30) DEFAULT 'STANDARD';
      CREATE INDEX IF NOT EXISTS idx_attendances_reg_type ON attendances(registration_type);
    `);
    console.log('✓ Added registration_type to attendances table');

    await client.query('COMMIT');
    console.log('Monthly Subscriptions migration completed successfully.');
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
