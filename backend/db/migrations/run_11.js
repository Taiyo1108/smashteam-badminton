const fs = require('fs');
const path = require('path');
const db = require('../index');

async function runMigration() {
  try {
    console.log('Running Migration 11 (SmashPass Gamification)...');
    const schemaPath = path.join(__dirname, '11_smash_pass_gamification.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    await db.query(schemaSql);
    
    console.log('✅ Migration 11 chạy thành công!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Lỗi khi chạy migration 11:', error);
    process.exit(1);
  }
}

runMigration();
