const fs = require('fs');
const path = require('path');
const db = require('../index');

async function runMigration() {
  try {
    console.log('Running Migration 15 (Add QR Code to Sessions)...');
    const schemaPath = path.join(__dirname, '15_session_qr_code.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    await db.query(schemaSql);
    
    console.log('✅ Migration 15 chạy thành công! Bảng sessions đã được cập nhật cột qr_code và qr_created_at.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Lỗi khi chạy migration 15:', error);
    process.exit(1);
  }
}

runMigration();
