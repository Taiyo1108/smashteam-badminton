const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');
const {
  getSessionDetails,
  reserveSession,
  joinWaitlist,
  cancelReservation,
  requestLateCancel,
  claimWaitlistOffer,
  processQrCheckIn
} = require('../services/sessionReservationService');

// Middleware giải mã token tùy chọn (nếu có)
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (token) {
    try {
      req.user = jwt.verify(token, process.env.JWT_SECRET);
    } catch (e) {
      // Bỏ qua lỗi token hết hạn khi xem công khai
    }
  }
  next();
};

// GET /api/sessions - Lấy danh sách các buổi tập kèm số liệu slots, waitlist và trạng thái của user
router.get('/', optionalAuth, async (req, res) => {
  const showHistory = req.query.history === 'true';
  const userId = req.user?.id || null;

  try {
    let queryText = '';
    if (showHistory) {
      queryText = `
        SELECT s.*, 
               s.date_time::text AS date_time_str,
               s.session_start::text AS session_start_str,
               s.session_end::text AS session_end_str,
               s.reservation_open_at::text AS reservation_open_at_str,
               s.reservation_deadline::text AS reservation_deadline_str,
               s.checkin_open_at::text AS checkin_open_at_str,
               s.checkin_close_at::text AS checkin_close_at_str,
               COALESCE(att.active_count, 0) AS active_reservations_count,
               COALESCE(wl.waiting_count, 0) AS waitlist_count
        FROM sessions s
        LEFT JOIN (
          SELECT session_id, COUNT(*) AS active_count
          FROM attendances
          WHERE status IN ('RESERVED', 'CONFIRMED', 'CHECKED_IN', 'going')
          GROUP BY session_id
        ) att ON s.id = att.session_id
        LEFT JOIN (
          SELECT session_id, COUNT(*) AS waiting_count
          FROM session_waitlist
          WHERE status IN ('WAITING', 'OFFERED')
          GROUP BY session_id
        ) wl ON s.id = wl.session_id
        ORDER BY s.date_time DESC;
      `;
    } else {
      queryText = `
        SELECT s.*, 
               s.date_time::text AS date_time_str,
               s.session_start::text AS session_start_str,
               s.session_end::text AS session_end_str,
               s.reservation_open_at::text AS reservation_open_at_str,
               s.reservation_deadline::text AS reservation_deadline_str,
               s.checkin_open_at::text AS checkin_open_at_str,
               s.checkin_close_at::text AS checkin_close_at_str,
               COALESCE(att.active_count, 0) AS active_reservations_count,
               COALESCE(wl.waiting_count, 0) AS waitlist_count
        FROM sessions s
        LEFT JOIN (
          SELECT session_id, COUNT(*) AS active_count
          FROM attendances
          WHERE status IN ('RESERVED', 'CONFIRMED', 'CHECKED_IN', 'going')
          GROUP BY session_id
        ) att ON s.id = att.session_id
        LEFT JOIN (
          SELECT session_id, COUNT(*) AS waiting_count
          FROM session_waitlist
          WHERE status IN ('WAITING', 'OFFERED')
          GROUP BY session_id
        ) wl ON s.id = wl.session_id
        WHERE s.date_time >= NOW() - INTERVAL '2 hours' 
        ORDER BY s.date_time ASC LIMIT 10;
      `;
    }

    const result = await db.query(queryText);
    const sessions = result.rows;

    // Nếu user đã đăng nhập, gắn thêm trạng thái đặt chỗ của user vào từng buổi
    if (userId && sessions.length > 0) {
      const sessionIds = sessions.map(s => s.id);

      const userAttRes = await db.query(
        `SELECT session_id, status, cancellation_request_pending 
         FROM attendances 
         WHERE user_id = $1::uuid AND session_id = ANY($2::uuid[]);`,
        [userId, sessionIds]
      );
      const userAttMap = {};
      userAttRes.rows.forEach(r => { userAttMap[r.session_id] = r; });

      const userWlRes = await db.query(
        `SELECT session_id, status, position, offer_expires_at::text as offer_expires_at_str 
         FROM session_waitlist 
         WHERE user_id = $1::uuid AND session_id = ANY($2::uuid[]);`,
        [userId, sessionIds]
      );
      const userWlMap = {};
      userWlRes.rows.forEach(r => { userWlMap[r.session_id] = r; });

      sessions.forEach(s => {
        s.user_attendance = userAttMap[s.id] || null;
        s.user_waitlist = userWlMap[s.id] || null;
        s.available_slots = Math.max(0, (s.capacity || 40) - parseInt(s.active_reservations_count, 10));
        s.is_full = s.available_slots === 0;
      });
    } else {
      sessions.forEach(s => {
        s.available_slots = Math.max(0, (s.capacity || 40) - parseInt(s.active_reservations_count, 10));
        s.is_full = s.available_slots === 0;
      });
    }

    res.json(sessions);
  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/sessions/:id - Lấy chi tiết buổi tập kèm số liệu slots, timing và trạng thái cá nhân
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || null;
    const data = await getSessionDetails(id, userId);
    res.json(data);
  } catch (error) {
    console.error('Error fetching session details:', error);
    res.status(404).json({ error: error.message || 'Không tìm thấy buổi tập.' });
  }
});

// POST /api/sessions/:id/reserve - Thành viên đăng ký giữ chỗ (RESERVED)
router.post('/:id/reserve', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const result = await reserveSession(id, userId);
    res.json(result);
  } catch (error) {
    if (error.code === 'SESSION_FULL') {
      return res.status(409).json({ 
        error: error.message,
        isFull: true,
        canJoinWaitlist: true 
      });
    }
    console.error('Error in reserveSession:', error);
    res.status(400).json({ error: error.message || 'Đăng ký giữ chỗ thất bại.' });
  }
});

// POST /api/sessions/:id/reserve/cancel - Hủy đặt chỗ trước hạn chót (Release slot & Offer Waitlist)
router.post('/:id/reserve/cancel', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { reason = 'Thành viên tự hủy' } = req.body;
    const result = await cancelReservation(id, userId, reason);
    res.json(result);
  } catch (error) {
    if (error.code === 'LATE_CANCELLATION_DEADLINE_PASSED') {
      return res.status(403).json({
        error: error.message,
        deadlinePassed: true,
        canRequestLateCancel: true
      });
    }
    console.error('Error cancelling reservation:', error);
    res.status(400).json({ error: error.message || 'Hủy giữ chỗ thất bại.' });
  }
});

// POST /api/sessions/:id/reserve/request-late-cancel - Gửi yêu cầu hủy muộn sau hạn chót (Cần Admin duyệt)
router.post('/:id/reserve/request-late-cancel', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { reason } = req.body;
    const result = await requestLateCancel(id, userId, reason);
    res.json(result);
  } catch (error) {
    console.error('Error requesting late cancel:', error);
    res.status(400).json({ error: error.message || 'Không thể gửi yêu cầu hủy muộn.' });
  }
});

// POST /api/sessions/:id/waitlist/join - Tham gia hàng chờ Waitlist FIFO
router.post('/:id/waitlist/join', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const result = await joinWaitlist(id, userId);
    res.json(result);
  } catch (error) {
    console.error('Error joining waitlist:', error);
    res.status(400).json({ error: error.message || 'Không thể tham gia hàng chờ.' });
  }
});

// POST /api/sessions/:id/waitlist/leave - Rút khỏi hàng chờ Waitlist
router.post('/:id/waitlist/leave', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    await db.query(
      `UPDATE session_waitlist 
       SET status = 'CANCELLED', updated_at = CURRENT_TIMESTAMP
       WHERE session_id = $1::uuid AND user_id = $2::uuid;`,
      [id, userId]
    );

    res.json({ success: true, message: 'Bạn đã rời khỏi danh sách chờ.' });
  } catch (error) {
    console.error('Error leaving waitlist:', error);
    res.status(400).json({ error: error.message || 'Lỗi rút khỏi danh sách chờ.' });
  }
});

// POST /api/sessions/:id/waitlist/claim - Xác nhận nhận slot từ Waitlist khi được OFFERED
router.post('/:id/waitlist/claim', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const result = await claimWaitlistOffer(id, userId);
    res.json(result);
  } catch (error) {
    console.error('Error claiming waitlist offer:', error);
    res.status(400).json({ error: error.message || 'Không thể xác nhận slot chờ.' });
  }
});

// POST /api/sessions/:id/qr-check-in - Thành viên quét mã QR điểm danh tại sân
router.post('/:id/qr-check-in', authenticateToken, async (req, res) => {
  try {
    const sessionId = req.params.id;
    const userId = req.user.id;
    const code = req.body.code || req.body.token || req.query.code || '';
    const isAdmin = req.user && req.user.role === 'admin';

    const result = await processQrCheckIn({
      sessionId,
      userId,
      clientTokenOrCode: code,
      allowWalkIn: false,
      adminId: isAdmin ? userId : null
    });

    res.json(result);
  } catch (error) {
    console.error('Error in QR check-in:', error);
    res.status(400).json({ error: error.message || 'Điểm danh thất bại.' });
  }
});

// POST /api/sessions/code-check-in - Điểm danh bằng mã 5 ký tự thủ công
router.post('/code-check-in', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const rawCode = (req.body.code || '').trim().toUpperCase();

  if (!rawCode || rawCode.length < 4) {
    return res.status(400).json({ error: 'Vui lòng nhập mã điểm danh hợp lệ (5 ký tự).' });
  }

  try {
    // Tìm buổi tập có checkin_code hoặc qr_code khớp
    const sessionRes = await db.query(
      `SELECT id, title 
       FROM sessions 
       WHERE UPPER(checkin_code) = $1 OR UPPER(qr_code) = $1 OR UPPER(qr_secret_token) = $1
       ORDER BY ABS(EXTRACT(EPOCH FROM (date_time - NOW()))) ASC 
       LIMIT 1;`,
      [rawCode]
    );

    if (sessionRes.rows.length === 0) {
      return res.status(404).json({ 
        error: `Không tìm thấy buổi tập với mã "${rawCode}". Vui lòng kiểm tra lại mã code trên màn hình sân tập.` 
      });
    }

    const sessionId = sessionRes.rows[0].id;
    const isAdmin = req.user && req.user.role === 'admin';

    const result = await processQrCheckIn({
      sessionId,
      userId,
      clientTokenOrCode: rawCode,
      allowWalkIn: false,
      adminId: isAdmin ? userId : null
    });

    res.json({
      ...result,
      session: sessionRes.rows[0]
    });
  } catch (error) {
    console.error('Error in code check-in:', error);
    res.status(400).json({ error: error.message || 'Điểm danh bằng mã code thất bại.' });
  }
});

module.exports = router;
