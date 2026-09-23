const fs = require('fs');
const path = require('path');
const db = require('../db');

async function run() {
  try {
    const sqlPath = path.join(__dirname, 'migrations', '29_convert_user_quests_updated_at_to_timestamptz.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    await db.query(sql);
    console.log('✓ Migration 29 applied successfully.');

    // Verify column type
    const check = await db.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'user_quests' AND column_name = 'updated_at'
    `);
    console.log('user_quests.updated_at data_type:', check.rows[0]?.data_type);
  } catch (e) {
    console.error('Migration failed:', e);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

run();
