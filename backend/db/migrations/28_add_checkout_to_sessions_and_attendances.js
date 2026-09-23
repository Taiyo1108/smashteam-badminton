const fs = require('fs');
const path = require('path');
const db = require('../index');

async function runMigration() {
  console.log('--- Running Migration 28: Add Checkout to Sessions and Attendances ---');
  try {
    const sqlPath = path.join(__dirname, '28_add_checkout_to_sessions_and_attendances.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    await db.query(sql);
    console.log('✅ Migration 28 completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration 28 failed:', err);
    process.exit(1);
  }
}

runMigration();
