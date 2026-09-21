const db = require('./db');
async function run() {
  const res = await db.query("DELETE FROM sessions WHERE title ILIKE '%TEST%' OR title ILIKE '%CONCURRENCY%' RETURNING id, title;");
  console.log("Deleted:", res.rows);
  process.exit(0);
}
run();
