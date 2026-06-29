const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { addXpToUser, trackActivity } = require('../utils/gamification');

// GET /api/sessions - Lấy danh sách các buổi tập sắp diễn ra
router.get('/', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT * FROM sessions 
       WHERE date_time >= NOW() - INTERVAL '2 hours' 
       ORDER BY date_time ASC LIMIT 10`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/sessions/:id/qr-check-in - Thành viên điểm danh nhanh qua mã QR tại sân
router.post('/:id/qr-check-in', authenticateToken, async (req, res) => {
  const sessionId = req.params.id;
  const userId = req.user.id;

  try {
    // 1. Lấy thông tin buổi tập (ép kiểu TEXT để lấy chuỗi ngày giờ thô không múi giờ)
    const sessionRes = await db.query(
      `SELECT id, title, date_time::text AS date_time_str, location FROM sessions WHERE id = $1`,
      [sessionId]
    );
    if (sessionRes.rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy buổi tập này.' });
    }

    const session = sessionRes.rows[0];
    // Khởi tạo tStart bắt buộc theo giờ Việt Nam (+07:00) tránh lệch múi giờ trên Render (UTC)
    const tStart = new Date(session.date_time_str + ' +07:00');
    const tCurrent = new Date();

    // 2. Kiểm tra Active Time Window (t_start - 30 phút <= t_current <= t_start + 120 phút)
    const diffMinutesStart = (tCurrent - tStart) / (1000 * 60);

    if (diffMinutesStart < -30 || diffMinutesStart > 120) {
      const formattedTime = tStart.toLocaleString("vi-VN", {
        timeZone: "Asia/Ho_Chi_Minh",
        weekday: "long",
        day: "numeric",
        month: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
      return res.status(400).json({ 
        error: `Cổng điểm danh đã đóng hoặc chưa mở. Buổi sinh hoạt diễn ra từ ${formattedTime}.` 
      });
    }

    // 3. Kiểm tra xem thành viên đã điểm danh thành công trước đó chưa
    const existingRes = await db.query(
      'SELECT status FROM attendances WHERE session_id = $1 AND user_id = $2',
      [sessionId, userId]
    );

    const wasGoing = existingRes.rows.length > 0 && existingRes.rows[0].status === 'going';
    if (wasGoing) {
      return res.status(400).json({ error: 'Bạn đã điểm danh thành công cho buổi tập này rồi.' });
    }

    // 4. Thực hiện UPSERT ghi nhận điểm danh status = 'going'
    await db.query(
      `INSERT INTO attendances (session_id, user_id, status)
       VALUES ($1, $2, 'going')
       ON CONFLICT (session_id, user_id)
       DO UPDATE SET status = 'going', created_at = CURRENT_TIMESTAMP`,
      [sessionId, userId]
    );

    // 5. Thưởng +25 XP, +10 Smash Coins và cập nhật tiến trình quest
    const lvlUpRes = await addXpToUser(userId, 25);
    await db.query('UPDATE users SET smash_coins = smash_coins + 10 WHERE id = $1', [userId]);
    await trackActivity(userId, 'check_in');

    res.json({
      success: true,
      message: 'Điểm danh quét mã QR thành công!',
      xp_awarded: 25,
      coins_awarded: 10,
      level_up: lvlUpRes
    });

  } catch (error) {
    console.error('Error in QR check-in:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
