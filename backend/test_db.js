const db = require('./db');
async function run() {
  const res = await db.query(`
    SELECT a.session_id, a.user_id, a.status, s.title, s.auto_confirm_processed, s.reservation_deadline
    FROM attendances a
    JOIN sessions s ON a.session_id = s.id
    WHERE s.reservation_deadline <= CURRENT_TIMESTAMP
      AND a.status = 'RESERVED'
  `);
  console.log(res.rows);
  process.exit(0);
}
run();
