const db = require('./db');
async function run() {
  const res = await db.query(`
    SELECT trigger_name 
    FROM information_schema.triggers 
    WHERE event_object_table = 'sessions'
  `);
  console.log(res.rows);
  process.exit(0);
}
run();
