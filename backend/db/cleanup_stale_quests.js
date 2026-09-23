const db = require('../db');

async function cleanupStaleQuests() {
  try {
    const res = await db.query(`
      UPDATE user_quests
      SET current_count = 0, is_completed = false, is_claimed = false, updated_at = CURRENT_TIMESTAMP
      WHERE quest_id = 1
        AND user_id NOT IN (
          SELECT user_id FROM attendances
          WHERE status IN ('CHECKED_IN', 'CHECKED_OUT')
            AND to_char(COALESCE(checked_in_at, created_at) AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYYY-MM-DD') = to_char(CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYYY-MM-DD')
        )
    `);
    console.log('Reset stale quest_id=1 rows count:', res.rowCount);

    const check = await db.query(`
      SELECT uq.user_id, uq.quest_id, uq.current_count, uq.is_completed, uq.is_claimed, u.full_name
      FROM user_quests uq
      JOIN users u ON u.id = uq.user_id
      WHERE uq.quest_id = 1
    `);
    console.log('Current quest_id=1 rows:', check.rows);
  } catch (error) {
    console.error('Error during cleanup:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

cleanupStaleQuests();
