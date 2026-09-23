const fs = require('fs');
const path = require('path');
const db = require('../index');

async function run() {
  try {
    let sql = fs.readFileSync(path.join(__dirname, '22_convert_timestamps_to_vietnam_tz.sql'), 'utf8');
    sql = sql.replace(/^\uFEFF/, '');
    await db.query(sql);
    console.log("Migration 22 successful!");
    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
}
run();