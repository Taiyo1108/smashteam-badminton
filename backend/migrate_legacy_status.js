const db = require('./db');
async function migrateLegacyStatus() {
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    // 1. Nếu session đã auto_confirm_processed = TRUE, chuyển 'going' thành 'CONFIRMED'
    const confirmRes = await client.query(`
      UPDATE attendances a
      SET status = 'CONFIRMED',
          confirmed_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      FROM sessions s
      WHERE a.session_id = s.id
        AND s.auto_confirm_processed = TRUE
        AND a.status = 'going'
      RETURNING a.id;
    `);
    console.log(`Đã chuyển ${confirmRes.rowCount} thành viên 'going' sang 'CONFIRMED' (do session đã chốt slot).`);

    // 2. Chuyển TẤT CẢ các 'going' còn lại thành 'RESERVED' để chuẩn hoá data
    const reserveRes = await client.query(`
      UPDATE attendances
      SET status = 'RESERVED',
          updated_at = CURRENT_TIMESTAMP
      WHERE status = 'going'
      RETURNING id;
    `);
    console.log(`Đã chuyển ${reserveRes.rowCount} thành viên 'going' sang 'RESERVED'.`);

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
  } finally {
    client.release();
    process.exit(0);
  }
}
migrateLegacyStatus();
