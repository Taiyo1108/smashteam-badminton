const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { addXpToUser, trackActivity } = require('../utils/gamification');

// GET /api/sessions - Lấy danh sách các buổi tập (Hỗ trợ lấy lịch sử)
router.get('/', async (req, res) => {
  const showHistory = req.query.history === 'true';
  try {
    let queryText = '';
    if (showHistory) {
      // Lấy toàn bộ các buổi tập đã qua và sắp tới để lưu trữ lịch sử
      queryText = `SELECT * FROM sessions ORDER BY date_time DESC`;
    } else {
      // Chỉ lấy các buổi tập sắp diễn ra
      queryText = `SELECT * FROM sessions 
                   WHERE date_time >= NOW() - INTERVAL '2 hours' 
                   ORDER BY date_time ASC LIMIT 10`;
    }
    const result = await db.query(queryText);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/sessions/code-check-in - Thành viên điểm danh bằng mã code 5 ký tự (khi không có camera)
router.post('/code-check-in', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const rawCode = (req.body.code || '').trim().toUpperCase();

  if (!rawCode || rawCode.length < 4) {
    return res.status(400).json({ error: 'Vui lòng nhập mã điểm danh hợp lệ (5 ký tự).' });
  }

  try {
    // 1. Tìm buổi tập có checkin_code hoặc qr_code khớp với mã nhập vào
    // Ưu tiên buổi tập có thời gian gần hiện tại nhất
    const sessionRes = await db.query(
      `SELECT id, title, date_time::text AS date_time_str, location, qr_code, checkin_code 
       FROM sessions 
       WHERE UPPER(checkin_code) = $1 OR UPPER(qr_code) = $1 OR UPPER(qr_code) LIKE $2
       ORDER BY ABS(EXTRACT(EPOCH FROM (date_time - NOW()))) ASC 
       LIMIT 1`,
      [rawCode, `%${rawCode}%`]
    );

    if (sessionRes.rows.length === 0) {
      return res.status(404).json({ 
        error: `Không tìm thấy buổi tập với mã "${rawCode}". Vui lòng kiểm tra lại mã code trên màn hình sân tập.` 
      });
    }

    const session = sessionRes.rows[0];
    const sessionId = session.id;

    // 2. Kiểm tra Active Time Window (Admin luôn được test; Thành viên được mở trong ngày: từ 12 tiếng trước đến 6 tiếng sau)
    const isAdminUser = req.user && req.user.role === 'admin';
    const tStart = new Date(session.date_time_str + ' +07:00');
    const tCurrent = new Date();
    const diffMinutesStart = (tCurrent - tStart) / (1000 * 60);

    if (!isAdminUser && (diffMinutesStart < -720 || diffMinutesStart > 360)) {
      const pad = (n) => String(n).padStart(2, '0');
      const formattedTime = `${pad(tStart.getDate())}/${pad(tStart.getMonth() + 1)}/${tStart.getFullYear()} ${pad(tStart.getHours())}:${pad(tStart.getMinutes())}`;
      return res.status(400).json({ 
        error: `Buổi sinh hoạt "${session.title}" diễn ra lúc ${formattedTime}. Cổng điểm danh sẽ mở trong ngày diễn ra buổi sinh hoạt.` 
      });
    }

    // 3. Kiểm tra xem thành viên đã điểm danh chưa
    const existingRes = await db.query(
      'SELECT status FROM attendances WHERE session_id = $1 AND user_id = $2',
      [sessionId, userId]
    );

    const wasGoing = existingRes.rows.length > 0 && existingRes.rows[0].status === 'going';
    if (wasGoing) {
      return res.status(400).json({ 
        error: `Bạn đã điểm danh thành công cho buổi tập "${session.title}" rồi.` 
      });
    }

    // 4. Ghi nhận điểm danh
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
      message: `Điểm danh thành công buổi tập "${session.title}"!`,
      session: {
        id: session.id,
        title: session.title,
        location: session.location,
        checkin_code: session.checkin_code
      },
      xp_awarded: 25,
      coins_awarded: 10,
      level_up: lvlUpRes
    });
  } catch (error) {
    console.error('Error in code check-in:', error);
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
      `SELECT id, title, date_time::text AS date_time_str, location, qr_code, checkin_code FROM sessions WHERE id = $1`,
      [sessionId]
    );
    if (sessionRes.rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy buổi tập này.' });
    }

    const session = sessionRes.rows[0];

    // Xác thực mã QR hoặc mã 5 ký tự nếu buổi tập đã được cấp mã riêng
    const clientCode = (req.body.code || req.query.code || '').trim().toUpperCase();
    if (clientCode) {
      const matchQr = session.qr_code && clientCode === session.qr_code.toUpperCase();
      const matchCheckin = session.checkin_code && clientCode === session.checkin_code.toUpperCase();
      if ((session.qr_code || session.checkin_code) && !matchQr && !matchCheckin) {
        return res.status(400).json({ error: 'Mã QR hoặc mã điểm danh không hợp lệ hoặc đã được làm mới.' });
      }
    }

    // Khởi tạo tStart bắt buộc theo giờ Việt Nam (+07:00) tránh lệch múi giờ trên Render (UTC)
    const tStart = new Date(session.date_time_str + ' +07:00');
    const tCurrent = new Date();

    // 2. Kiểm tra Active Time Window (Admin luôn được test; Thành viên được mở trong ngày: từ 12 tiếng trước đến 6 tiếng sau)
    const isAdminUser = req.user && req.user.role === 'admin';
    const diffMinutesStart = (tCurrent - tStart) / (1000 * 60);

    if (!isAdminUser && (diffMinutesStart < -720 || diffMinutesStart > 360)) {
      const pad = (n) => String(n).padStart(2, '0');
      const formattedTime = `${pad(tStart.getDate())}/${pad(tStart.getMonth() + 1)}/${tStart.getFullYear()} ${pad(tStart.getHours())}:${pad(tStart.getMinutes())}`;
      return res.status(400).json({ 
        error: `Buổi sinh hoạt "${session.title}" diễn ra lúc ${formattedTime}. Cổng điểm danh sẽ mở trong ngày diễn ra buổi sinh hoạt.` 
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
