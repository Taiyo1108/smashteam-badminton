const db = require('./db');
async function run() {
  const res = await db.query('SELECT checkin_open_at FROM sessions LIMIT 1');
  if (res.rows.length > 0) {
    console.log(res.rows[0].checkin_open_at);
    console.log(typeof res.rows[0].checkin_open_at);
    if (res.rows[0].checkin_open_at instanceof Date) {
      console.log(res.rows[0].checkin_open_at.toISOString());
    }
  }
  process.exit(0);
}
run();
