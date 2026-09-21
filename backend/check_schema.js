const db = require('./db');
async function run() {
  const res = await db.query(`
    SELECT column_name, is_nullable 
    FROM information_schema.columns 
    WHERE table_name = 'sessions' AND column_name = 'date_time'
  `);
  console.log(res.rows);
  process.exit(0);
}
run();
