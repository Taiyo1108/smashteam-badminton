const db = require('../index');
const fs = require('fs');
const path = require('path');

async function run() {
  try {
    const sql = fs.readFileSync(path.join(__dirname, '37_customizable_monthly_club_slots.sql'), 'utf8');
    await db.query(sql);
    console.log('Migration 37 completed successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Migration 37 error:', err);
    process.exit(1);
  }
}

run();
