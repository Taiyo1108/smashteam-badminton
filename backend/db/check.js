const db = require('./index');

async function checkAdmin() {
  try {
    const result = await db.query("SELECT * FROM users WHERE role = 'admin'");
    console.log("Admin users in DB:", result.rows);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkAdmin();
