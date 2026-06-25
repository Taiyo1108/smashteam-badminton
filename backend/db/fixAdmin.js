const db = require('./index');
const bcrypt = require('bcrypt');

async function fixAdminPassword() {
  try {
    const hash = await bcrypt.hash('admin123', 10);
    await db.query("UPDATE users SET password_hash = $1 WHERE role = 'admin'", [hash]);
    console.log("Đã cập nhật lại mật khẩu cho Admin thành công!");
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

fixAdminPassword();
