const fs = require('fs');
const path = require('path');
const db = require('../index');

async function runMigration() {
  try {
    console.log('Running Migration 13 (Advanced Smash Shop)...');
    const schemaPath = path.join(__dirname, '13_smash_shop_advanced.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    await db.query(schemaSql);
    
    console.log('✅ Migration 13 chạy thành công!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Lỗi khi chạy migration 13:', error);
    process.exit(1);
  }
}

runMigration();
