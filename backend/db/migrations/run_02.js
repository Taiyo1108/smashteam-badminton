const fs = require('fs');
const path = require('path');
const db = require('../index');

async function run() {
  try {
    const sql = fs.readFileSync(path.join(__dirname, '02_add_is_active_to_slots.sql'), 'utf8');
    await db.query(sql);
    console.log("Migration 02 successful!");
    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
}
run();
