const fs = require('fs');
const path = require('path');
const db = require('../index');

async function runMigration() {
  try {
    console.log('Running Migration 14 (Remove SmashPass)...');
    const schemaPath = path.join(__dirname, '14_remove_smash_pass.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    await db.query(schemaSql);
    
    console.log('✅ Migration 14 chạy thành công!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Lỗi khi chạy migration 14:', error);
    process.exit(1);
  }
}

runMigration();
