const fs = require('fs');
const path = require('path');
const db = require('../index');

async function runMigration() {
  try {
    console.log('Running Migration 12 (Smash Shop)...');
    const schemaPath = path.join(__dirname, '12_smash_shop.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    await db.query(schemaSql);
    
    console.log('✅ Migration 12 chạy thành công!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Lỗi khi chạy migration 12:', error);
    process.exit(1);
  }
}

runMigration();
