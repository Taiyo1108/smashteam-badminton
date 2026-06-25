const fs = require('fs');
const path = require('path');
const db = require('./index');

async function initializeDatabase() {
  try {
    console.log('Đang đọc file schema.sql...');
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    console.log('Đang kết nối và khởi tạo các bảng trên Supabase...');
    await db.query(schemaSql);
    
    console.log('✅ Khởi tạo Database thành công!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Lỗi khi khởi tạo Database:', error);
    process.exit(1);
  }
}

initializeDatabase();
