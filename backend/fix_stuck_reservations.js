const db = require('./db');
async function fixStuckReservations() {
  const client = await db.connect();
  try {
    // Tìm các attendance đang bị kẹt ở RESERVED cho các buổi tập đã qua hạn chót hủy
    const res = await client.query(`
      UPDATE attendances a
      SET status = 'CONFIRMED',
          confirmed_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      FROM sessions s
      WHERE a.session_id = s.id
        AND s.reservation_deadline <= CURRENT_TIMESTAMP
        AND a.status = 'RESERVED'
      RETURNING a.id, a.user_id, s.title;
    `);
    console.log(`Đã fix ${res.rowCount} thành viên bị kẹt ở trạng thái RESERVED.`);
  } catch (error) {
    console.error(error);
  } finally {
    client.release();
    process.exit(0);
  }
}
fixStuckReservations();
