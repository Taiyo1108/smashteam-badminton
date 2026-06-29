const fs = require('fs');
const path = require('path');
const db = require('../index');

async function runMigration() {
  try {
    console.log('Running Migration 10 (Advanced Member Fields)...');
    const schemaPath = path.join(__dirname, '10_advanced_member_fields.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    await db.query(schemaSql);
    
    console.log('✅ Migration 10 chạy thành công!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Lỗi khi chạy migration 10:', error);
    process.exit(1);
  }
}

runMigration();
