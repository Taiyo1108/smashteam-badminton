const fs = require('fs');
const path = require('path');
const db = require('../index');

function generate5CharCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

async function runMigration() {
  try {
    console.log('Running Migration 16 (Add 5-char checkin_code to Sessions)...');
    const schemaPath = path.join(__dirname, '16_session_checkin_code.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    await db.query(schemaSql);

    // Điền mã 5 ký tự cho các session hiện có nếu chưa có
    const emptySessions = await db.query('SELECT id, title, checkin_code FROM sessions WHERE checkin_code IS NULL OR checkin_code = \'\'');
    console.log(`Tìm thấy ${emptySessions.rows.length} buổi tập chưa có mã 5 ký tự.`);

    for (const sess of emptySessions.rows) {
      const code = generate5CharCode();
      await db.query('UPDATE sessions SET checkin_code = $1 WHERE id = $2', [code, sess.id]);
      console.log(`- Buổi tập "${sess.title}": Gán mã ${code}`);
    }
    
    console.log('✅ Migration 16 chạy thành công! Cột checkin_code đã sẵn sàng.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Lỗi khi chạy migration 16:', error);
    process.exit(1);
  }
}

runMigration();
