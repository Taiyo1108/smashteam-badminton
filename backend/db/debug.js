const db = require('./index');

async function debug() {
  try {
    const campaigns = await db.query("SELECT id, name, start_date, end_date, is_active, CURRENT_TIMESTAMP as now FROM recruitment_campaigns");
    console.log("Campaigns:", campaigns.rows);

    const active = await db.query(`SELECT * FROM recruitment_campaigns WHERE is_active = true AND start_date <= CURRENT_TIMESTAMP AND end_date >= CURRENT_TIMESTAMP ORDER BY start_date DESC LIMIT 1`);
    console.log("Active Query Result:", active.rows);

    const slots = await db.query("SELECT * FROM casting_slots");
    console.log("Slots:", slots.rows);

    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
}
debug();
