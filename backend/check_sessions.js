const db = require('./db');
async function run() {
  const res = await db.query("SELECT id, title, created_at FROM sessions ORDER BY created_at DESC LIMIT 10");
  console.log(res.rows);
  process.exit(0);
}
run();
