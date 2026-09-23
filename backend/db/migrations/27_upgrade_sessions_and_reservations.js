const pool = require('../index');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  const client = await pool.connect();
  try {
    console.log('--- RUNNING MIGRATION 27: Upgrade Sessions, Reservations, Waitlist, and Audit Logs ---');
    await client.query('BEGIN');

    const sqlPath = path.join(__dirname, '27_upgrade_sessions_and_reservations.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    await client.query(sql);

    await client.query('COMMIT');
    console.log('🎉 Migration 27 successfully applied!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration 27 failed:', error);
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
