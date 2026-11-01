const db = require('../index');
const fs = require('fs');
const path = require('path');

async function run() {
  try {
    const sql = fs.readFileSync(path.join(__dirname, '36_monthly_inactivity_discipline.sql'), 'utf8');
    await db.query(sql);
    console.log('Migration 36 completed successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Migration 36 error:', err);
    process.exit(1);
  }
}

run();
