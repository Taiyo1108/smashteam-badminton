const db = require('./db');
async function run() {
  const res = await db.query(`
    SELECT column_name, data_type
    FROM information_schema.columns 
    WHERE table_name = 'sessions' AND column_name IN ('date_time', 'checkin_open_at', 'session_start')
  `);
  console.log(res.rows);
  process.exit(0);
}
run();
