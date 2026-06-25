const fs = require('fs');
const path = require('path');
const db = require('../index');

async function runMigration() {
  try {
    console.log('Running Migration...');
    const schemaPath = path.join(__dirname, '01_campaigns_slots.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    await db.query(schemaSql);
    
    console.log('✅ Migration chạy thành công!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Lỗi khi chạy migration:', error);
    process.exit(1);
  }
}

runMigration();
