const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, isAdmin } = require('../middleware/auth');
const { toVietnamIso } = require('../utils/date');
const {
  getSessionDetails,
  getAdminSessionDashboard,
  adminApproveLateCancel,
  adminRejectLateCancel,
  processQrCheckIn
} = require('../services/sessionReservationService');

// Protect all admin routes
router.use(authenticateToken);
router.use(isAdmin);

// PUT /api/admin/users/:id/status-block - Cập nhật status hoặc is_blocked
router.post('/users/:id/status-block', async (req, res) => { // supporting both POST and PUT for flexibility
  return handleStatusBlock(req, res);
});
router.put('/users/:id/status-block', async (req, res) => {
  return handleStatusBlock(req, res);
});

async function handleStatusBlock(req, res) {
  try {
    const { id } = req.params;
    const { status, is_blocked } = req.body;

    const fields = [];
    const params = [];
    let paramIndex = 1;

    if (status !== undefined) {
      if (!['active', 'inactive', 'left'].includes(status)) {
        return res.status(400).json({ error: 'Trạng thái không hợp lệ.' });
      }
      fields.push(`status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    if (is_blocked !== undefined) {
      fields.push(`is_blocked = $${paramIndex}`);
      params.push(is_blocked);
      paramIndex++;
    }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'Không có trường nào để cập nhật.' });
    }

    params.push(id);
    const query = `UPDATE users SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING id, status, is_blocked`;
    const result = await db.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy người dùng.' });
    }

    res.json({ success: true, user: result.rows[0] });
  } catch (error) {
    console.error('Error status-block:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// PUT /api/admin/users/:id/adjust-elo - Điều chỉnh điểm Elo trực tiếp
router.put('/users/:id/adjust-elo', async (req, res) => {
  try {
    const { id } = req.params;
    const { type, amount, reason } = req.body;

    if (!['singles', 'doubles'].includes(type)) {
      return res.status(400).json({ error: 'Loại ELO không hợp lệ.' });
    }

    const changeVal = parseInt(amount, 10);
    if (isNaN(changeVal)) {
      return res.status(400).json({ error: 'Điểm ELO thay đổi phải là số.' });
    }

    const eloColumn = type === 'doubles' ? 'elo_doubles' : 'elo_singles';

    const result = await db.query(
      `UPDATE users SET ${eloColumn} = GREATEST(0, ${eloColumn} + $1) WHERE id = $2 RETURNING id, full_name, elo_singles, elo_doubles`,
      [changeVal, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy người dùng.' });
    }

    // Optional: Log Elo change history if table existed (not requested, but we return success)
    res.json({ success: true, user: result.rows[0], message: `Đã điều chỉnh ${changeVal} điểm Elo (${type}) vì lý do: ${reason || 'Không có lý do'}` });
  } catch (error) {
    console.error('Error adjusting ELO:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/admin/users/:id/role - Thay đổi quyền hạn (role)
router.put('/users/:id/role', async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!['candidate', 'member', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Quyền hạn không hợp lệ.' });
    }

    const result = await db.query(
      'UPDATE users SET role = $1 WHERE id = $2 RETURNING id, full_name, role',
      [role, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy người dùng.' });
    }

    res.json({ success: true, user: result.rows[0] });
  } catch (error) {
    console.error('Error changing role:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/admin/users/:id/attendance-stats - Lấy thống kê chuyên cần chi tiết
router.get('/users/:id/attendance-stats', async (req, res) => {
  try {
    const { id } = req.params;

    // Fetch user details first
    const userResult = await db.query('SELECT id, full_name FROM users WHERE id = $1', [id]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy người dùng.' });
    }

    // Fetch all sessions and user's RSVP status
    const result = await db.query(
      `SELECT 
        s.id AS session_id,
        s.title,
        s.date_time,
        s.location,
        a.status AS attendance_status
       FROM sessions s
       LEFT JOIN attendances a ON s.id = a.session_id AND a.user_id = $1
       ORDER BY s.date_time DESC`,
      [id]
    );

    const history = result.rows;
    const total_sessions = history.length;
    const attended_sessions = history.filter(h => h.attendance_status === 'going').length;
    const absent_sessions = history.filter(h => h.attendance_status === 'absent').length;
    const no_rsvp_sessions = total_sessions - attended_sessions - absent_sessions;

    const attendance_rate = total_sessions > 0 
      ? Math.round((attended_sessions / total_sessions) * 100) 
      : 0;

    res.json({
      user: userResult.rows[0],
      stats: {
        total_sessions,
        attended_sessions,
        absent_sessions,
        no_rsvp_sessions,
        attendance_rate
      },
      history
    });
  } catch (error) {
    console.error('Error fetching attendance stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

function generateCheckinCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// POST /api/admin/sessions - Tạo buổi tập mới (Tự động cấp mã QR, Secret Token và lưu DB)
router.post('/sessions', async (req, res) => {
  try {
    const {
      title,
      date_time,
      location,
      capacity = 40,
      session_start,
      session_end,
      reservation_open_at,
      reservation_deadline,
      checkin_open_at,
      checkin_close_at,
      checkout_open_at,
      checkout_close_at,
      waitlist_offer_duration_minutes = 10
    } = req.body;

    const sessionDateTime = date_time || session_start;
    if (!title || !sessionDateTime || !location) {
      return res.status(400).json({ error: 'Vui lòng cung cấp tiêu đề, thời gian và địa điểm.' });
    }

    const tStart = session_start ? toVietnamIso(session_start) : toVietnamIso(sessionDateTime);
    const startDateObj = new Date(tStart);
    const tEnd = session_end ? toVietnamIso(session_end) : new Date(startDateObj.getTime() + 2 * 3600000).toISOString();
    const resOpen = reservation_open_at ? toVietnamIso(reservation_open_at) : new Date(startDateObj.getTime() - 3 * 86400000).toISOString();
    const resDeadline = reservation_deadline ? toVietnamIso(reservation_deadline) : new Date(startDateObj.getTime() - 2 * 3600000).toISOString();
    const checkinOpen = checkin_open_at ? toVietnamIso(checkin_open_at) : new Date(startDateObj.getTime() - 30 * 60000).toISOString();
    const checkinClose = checkin_close_at ? toVietnamIso(checkin_close_at) : new Date(startDateObj.getTime() + 30 * 60000).toISOString();
    const checkoutOpen = checkout_open_at ? toVietnamIso(checkout_open_at) : new Date(startDateObj.getTime() + 30 * 60000).toISOString();
    const checkoutClose = checkout_close_at ? toVietnamIso(checkout_close_at) : new Date(new Date(tEnd).getTime() + 60 * 60000).toISOString();

    // Tự động cấp mã QR, mã 5 ký tự và Secret Token chống giả mạo
    const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase();
    const newQrCode = `SMASH_${Date.now().toString(36).toUpperCase()}_${randomSuffix}`;
    const newCheckinCode = generateCheckinCode();
    const secretToken = `SEC_${Date.now().toString(36).toUpperCase()}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const checkoutSecretToken = `SEC_OUT_${Date.now().toString(36).toUpperCase()}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    const result = await db.query(
      `INSERT INTO sessions (
        title, date_time, location, qr_code, qr_created_at, checkin_code,
        session_start, session_end, reservation_open_at, reservation_deadline,
        checkin_open_at, checkin_close_at, checkout_open_at, checkout_close_at,
        capacity, qr_secret_token, qr_checkout_secret_token,
        waitlist_offer_duration_minutes
      ) 
      VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17) 
      RETURNING *`,
      [
        title, toVietnamIso(sessionDateTime), location, newQrCode, newCheckinCode,
        tStart, tEnd, resOpen, resDeadline, checkinOpen, checkinClose, checkoutOpen, checkoutClose,
        parseInt(capacity, 10) || 40, secretToken, checkoutSecretToken, parseInt(waitlist_offer_duration_minutes, 10) || 10
      ]
    );

    res.status(201).json({ success: true, session: result.rows[0] });
  } catch (error) {
    console.error('Error creating session:', error);
    res.status(500).json({ error: error.message || 'Không thể tạo buổi tập.' });
  }
});

// DELETE /api/admin/sessions/:id - Xóa buổi tập
router.delete('/sessions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query('DELETE FROM sessions WHERE id = $1 RETURNING id', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy buổi tập.' });
    }
    
    res.json({ success: true, message: 'Đã xóa buổi tập thành công.' });
  } catch (error) {
    console.error('Error deleting session:', error);
    res.status(500).json({ error: error.message || 'Lỗi khi xóa buổi tập.' });
  }
});

// PUT /api/admin/sessions/:id - Chỉnh sửa thông số buổi tập
router.put('/sessions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      date_time,
      location,
      capacity,
      session_start,
      session_end,
      reservation_open_at,
      reservation_deadline,
      checkin_open_at,
      checkin_close_at,
      checkout_open_at,
      checkout_close_at,
      waitlist_offer_duration_minutes,
      is_closed
    } = req.body;

    const sessionRes = await db.query('SELECT * FROM sessions WHERE id = $1::uuid', [id]);
    if (sessionRes.rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy buổi tập.' });
    }
    const current = sessionRes.rows[0];

    const result = await db.query(
      `UPDATE sessions
       SET title = COALESCE($1, title),
           date_time = COALESCE($2, date_time),
           location = COALESCE($3, location),
           capacity = COALESCE($4, capacity),
           session_start = COALESCE($5, session_start),
           session_end = COALESCE($6, session_end),
           reservation_open_at = COALESCE($7, reservation_open_at),
           reservation_deadline = COALESCE($8, reservation_deadline),
           checkin_open_at = COALESCE($9, checkin_open_at),
           checkin_close_at = COALESCE($10, checkin_close_at),
           checkout_open_at = COALESCE($11, checkout_open_at),
           checkout_close_at = COALESCE($12, checkout_close_at),
           waitlist_offer_duration_minutes = COALESCE($13, waitlist_offer_duration_minutes),
           is_closed = COALESCE($14, is_closed),
           auto_confirm_processed = FALSE,
           no_show_processed = FALSE,
           missing_checkout_processed = FALSE
       WHERE id = $15::uuid
       RETURNING *;`,
      [
        title,
        (date_time || session_start) ? toVietnamIso(date_time || session_start) : null,
        location,
        capacity !== undefined ? parseInt(capacity, 10) : null,
        session_start ? toVietnamIso(session_start) : null,
        session_end ? toVietnamIso(session_end) : null,
        reservation_open_at ? toVietnamIso(reservation_open_at) : null,
        reservation_deadline ? toVietnamIso(reservation_deadline) : null,
        checkin_open_at ? toVietnamIso(checkin_open_at) : null,
        checkin_close_at ? toVietnamIso(checkin_close_at) : null,
        checkout_open_at ? toVietnamIso(checkout_open_at) : null,
        checkout_close_at ? toVietnamIso(checkout_close_at) : null,
        waitlist_offer_duration_minutes !== undefined ? parseInt(waitlist_offer_duration_minutes, 10) : null,
        is_closed !== undefined ? is_closed : null,
        id
      ]
    );

    const updatedSession = result.rows[0];

    // Nếu session được đóng (is_closed = true), tự động kích hoạt phạt Thẻ vàng No-show cho người không điểm danh
    if (updatedSession && updatedSession.is_closed) {
      try {
        const { processNoShowDisciplineForClosedSession } = require('../services/memberManagementService');
        await processNoShowDisciplineForClosedSession(id, req.user.id);
      } catch (discErr) {
        console.error('Error processing no-show discipline for closed session:', discErr);
      }
    }

    res.json({ success: true, session: updatedSession });
  } catch (error) {
    console.error('Error updating session:', error);
    res.status(500).json({ error: error.message || 'Lỗi cập nhật buổi tập.' });
  }
});

// POST /api/admin/sessions/:id/check-out - Admin ghi nhận Check-out thủ công
router.post('/sessions/:id/check-out', async (req, res) => {
  try {
    const sessionId = req.params.id;
    const adminId = req.user.id;
    const { target_user_id, checkout_time, reason } = req.body;

    if (!target_user_id) {
      return res.status(400).json({ error: 'Vui lòng chọn thành viên cần check-out.' });
    }

    const { processQrCheckOut } = require('../services/sessionReservationService');
    const result = await processQrCheckOut({
      sessionId,
      userId: target_user_id,
      adminId,
      checkoutTime: checkout_time || null,
      reason: reason || 'Admin ghi nhận Check-out thủ công'
    });

    res.json(result);
  } catch (error) {
    console.error('Error in admin checkout:', error);
    res.status(400).json({ error: error.message || 'Lỗi Check-out thủ công.' });
  }
});

// GET /api/admin/sessions/:id/dashboard - Lấy toàn bộ số liệu thống kê & danh sách reservation cho Admin Dashboard
router.get('/sessions/:id/dashboard', async (req, res) => {
  try {
    const { id } = req.params;
    const data = await getAdminSessionDashboard(id);
    res.json(data);
  } catch (error) {
    console.error('Error fetching session dashboard:', error);
    res.status(500).json({ error: error.message || 'Lỗi tải dashboard buổi tập.' });
  }
});

// POST /api/admin/sessions/:id/late-cancel/approve - Admin duyệt yêu cầu hủy muộn
router.post('/sessions/:id/late-cancel/approve', async (req, res) => {
  try {
    const { id } = req.params;
    const { target_user_id, reason = 'Admin phê duyệt hủy muộn' } = req.body;
    if (!target_user_id) {
      return res.status(400).json({ error: 'Vui lòng cung cấp target_user_id.' });
    }
    const result = await adminApproveLateCancel(id, target_user_id, req.user.id, reason);
    res.json(result);
  } catch (error) {
    console.error('Error approving late cancel:', error);
    res.status(400).json({ error: error.message || 'Lỗi duyệt hủy muộn.' });
  }
});

// POST /api/admin/sessions/:id/late-cancel/reject - Admin từ chối yêu cầu hủy muộn
router.post('/sessions/:id/late-cancel/reject', async (req, res) => {
  try {
    const { id } = req.params;
    const { target_user_id, reason = 'Admin từ chối yêu cầu hủy muộn' } = req.body;
    if (!target_user_id) {
      return res.status(400).json({ error: 'Vui lòng cung cấp target_user_id.' });
    }
    const result = await adminRejectLateCancel(id, target_user_id, req.user.id, reason);
    res.json(result);
  } catch (error) {
    console.error('Error rejecting late cancel:', error);
    res.status(400).json({ error: error.message || 'Lỗi từ chối hủy muộn.' });
  }
});

// POST /api/admin/sessions/:id/walk-in - Admin check-in trực tiếp cho khách vãng lai
router.post('/sessions/:id/walk-in', async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id, reason = 'Admin check-in vãng lai trực tiếp tại sân' } = req.body;
    if (!user_id) {
      return res.status(400).json({ error: 'Vui lòng cung cấp user_id.' });
    }

    const result = await processQrCheckIn({
      sessionId: id,
      userId: user_id,
      clientTokenOrCode: '',
      allowWalkIn: true,
      adminId: req.user.id,
      walkInReason: reason
    });

    res.json(result);
  } catch (error) {
    console.error('Error in admin walk-in check-in:', error);
    res.status(400).json({ error: error.message || 'Lỗi check-in vãng lai.' });
  }
});

// POST /api/admin/sessions/:id/participants/manual-add - Admin thêm trực tiếp thành viên vào session
router.post('/sessions/:id/participants/manual-add', async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id, status = 'CONFIRMED', reason = 'Admin thêm trực tiếp vào buổi tập' } = req.body;
    if (!user_id) {
      return res.status(400).json({ error: 'Vui lòng cung cấp user_id.' });
    }

    const upsertRes = await db.query(
      `INSERT INTO attendances (
        session_id, user_id, status, confirmed_at, reserved_at, updated_at
      )
      VALUES ($1::uuid, $2::uuid, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT (session_id, user_id)
      DO UPDATE SET
        status = EXCLUDED.status,
        confirmed_at = CURRENT_TIMESTAMP,
        cancelled_at = NULL,
        cancellation_reason = NULL,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *;`,
      [id, user_id, status]
    );

    // Ghi audit log
    await db.query(
      `INSERT INTO session_audit_logs (
        session_id, admin_user_id, target_user_id, action, before_status, after_status, reason
      ) VALUES ($1::uuid, $2::uuid, $3::uuid, 'ADMIN_ADD_PARTICIPANT', 'NONE', $4, $5);`,
      [id, req.user.id, user_id, status, reason]
    );

    res.json({ success: true, message: 'Đã thêm thành viên vào buổi tập thành công.', attendance: upsertRes.rows[0] });
  } catch (error) {
    console.error('Error manually adding participant:', error);
    res.status(400).json({ error: error.message || 'Lỗi thêm thành viên.' });
  }
});

// POST /api/admin/sessions/:id/participants/manual-remove - Admin hủy/xóa thành viên khỏi session
router.post('/sessions/:id/participants/manual-remove', async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id, reason = 'Admin hủy lượt tham gia của thành viên' } = req.body;
    if (!user_id) {
      return res.status(400).json({ error: 'Vui lòng cung cấp user_id.' });
    }

    const prevRes = await db.query(
      `SELECT status FROM attendances WHERE session_id = $1::uuid AND user_id = $2::uuid;`,
      [id, user_id]
    );
    const beforeStatus = prevRes.rows[0]?.status || 'UNKNOWN';

    await db.query(
      `UPDATE attendances
       SET status = 'CANCELLED',
           cancelled_at = CURRENT_TIMESTAMP,
           cancellation_reason = $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE session_id = $2::uuid AND user_id = $3::uuid;`,
      [reason, id, user_id]
    );

    // Ghi audit log
    await db.query(
      `INSERT INTO session_audit_logs (
        session_id, admin_user_id, target_user_id, action, before_status, after_status, reason
      ) VALUES ($1::uuid, $2::uuid, $3::uuid, 'ADMIN_REMOVE_PARTICIPANT', $4, 'CANCELLED', $5);`,
      [id, req.user.id, user_id, beforeStatus, reason]
    );

    res.json({ success: true, message: 'Đã xóa thành viên khỏi danh sách buổi tập.' });
  } catch (error) {
    console.error('Error manually removing participant:', error);
    res.status(400).json({ error: error.message || 'Lỗi xóa thành viên.' });
  }
});

// GET /api/admin/sessions/:id/attendees - Lấy danh sách thành viên check-in thực tế của buổi tập (Tương thích ngược)
router.get('/sessions/:id/attendees', async (req, res) => {
  try {
    const { id } = req.params;

    // Lấy thông tin session
    const sessionRes = await db.query('SELECT * FROM sessions WHERE id = $1', [id]);
    if (sessionRes.rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy buổi tập.' });
    }

    // Lấy danh sách thành viên tham gia (status IN ('going', 'CHECKED_IN'))
    const attendeesRes = await db.query(
      `SELECT 
        u.id AS user_id,
        u.full_name,
        u.nickname,
        u.phone_zalo,
        u.avatar_url,
        a.status,
        COALESCE(a.checked_in_at, a.created_at) AS checked_in_at
       FROM attendances a
       JOIN users u ON a.user_id = u.id
       WHERE a.session_id = $1 AND a.status IN ('going', 'CHECKED_IN')
       ORDER BY a.checked_in_at DESC`,
      [id]
    );

    res.json({
      session: sessionRes.rows[0],
      attendees: attendeesRes.rows,
      total_checked_in: attendeesRes.rows.length
    });
  } catch (error) {
    console.error('Error fetching session attendees:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/admin/sessions/:id/qr - Lấy hoặc tạo mã QR điểm danh từng buổi tập (Cập nhật DB)
router.get('/sessions/:id/qr', async (req, res) => {
  return handleGenerateSessionQr(req, res);
});

// POST /api/admin/sessions/:id/qr - Tạo mới hoặc làm mới mã QR điểm danh (Cập nhật DB)
router.post('/sessions/:id/qr', async (req, res) => {
  return handleGenerateSessionQr(req, res);
});

async function handleGenerateSessionQr(req, res) {
  try {
    const { id } = req.params;
    const forceRefresh = req.query.refresh === 'true' || req.method === 'POST';

    // 1. Kiểm tra session có tồn tại không
    const sessionRes = await db.query('SELECT * FROM sessions WHERE id = $1', [id]);
    if (sessionRes.rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy buổi tập này.' });
    }

    let session = sessionRes.rows[0];

    // Đảm bảo session luôn có checkin_code 5 ký tự
    if (!session.checkin_code) {
      const generatedCode = generateCheckinCode();
      await db.query('UPDATE sessions SET checkin_code = $1 WHERE id = $2', [generatedCode, id]);
      session.checkin_code = generatedCode;
    }

    // 2. Nếu đã có qr_code và không yêu cầu force refresh, trả về mã hiện tại
    if (session.qr_code && !forceRefresh) {
      const origin = req.headers.origin || (req.headers.referer ? new URL(req.headers.referer).origin : 'http://localhost:3000');
      const checkinUrl = `${origin}/check-in?session_id=${session.id}&code=${session.qr_code}`;
      return res.json({
        success: true,
        session_id: session.id,
        qr_code: session.qr_code,
        checkin_code: session.checkin_code,
        qr_url: checkinUrl,
        qr_created_at: session.qr_created_at,
        session
      });
    }

    // 3. Tạo mã QR điểm danh mới độc nhất
    const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase();
    const newQrCode = `SMASH_${session.id.toString().slice(0, 4)}_${Date.now().toString(36).toUpperCase()}_${randomSuffix}`;
    const newCheckinCode = session.checkin_code || generateCheckinCode();

    // 4. Cập nhật mã QR và checkin_code vào cơ sở dữ liệu
    const updateRes = await db.query(
      `UPDATE sessions 
       SET qr_code = $1, qr_created_at = CURRENT_TIMESTAMP, checkin_code = $2 
       WHERE id = $3 
       RETURNING *`,
      [newQrCode, newCheckinCode, id]
    );

    const updatedSession = updateRes.rows[0];
    const origin = req.headers.origin || (req.headers.referer ? new URL(req.headers.referer).origin : 'http://localhost:3000');
    const checkinUrl = `${origin}/check-in?session_id=${updatedSession.id}&code=${newQrCode}`;

    res.json({
      success: true,
      message: 'Đã tạo mã QR điểm danh mới cho buổi tập thành công và cập nhật DB!',
      session_id: updatedSession.id,
      qr_code: newQrCode,
      checkin_code: newCheckinCode,
      qr_url: checkinUrl,
      qr_created_at: updatedSession.qr_created_at,
      session: updatedSession
    });
  } catch (error) {
    console.error('Error generating session QR code:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// POST /api/admin/quests - Tạo nhiệm vụ mới
router.post('/quests', async (req, res) => {
  try {
    const { title, quest_type, xp_reward, coin_reward, action_type, target_count } = req.body;
    if (!title || !quest_type || !xp_reward || !coin_reward || !action_type || !target_count) {
      return res.status(400).json({ error: 'Vui lòng cung cấp đầy đủ thông tin nhiệm vụ.' });
    }

    const result = await db.query(
      `INSERT INTO quests (title, quest_type, xp_reward, coin_reward, action_type, target_count, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, true) RETURNING *`,
      [title, quest_type, xp_reward, coin_reward, action_type, target_count]
    );

    res.status(201).json({ success: true, quest: result.rows[0] });
  } catch (error) {
    console.error('Error creating quest:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/admin/quests - Lấy danh sách tất cả nhiệm vụ để quản trị
router.get('/quests', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM quests ORDER BY id DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching quests for admin:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/admin/quests/:id/toggle - Bật/Tắt hoạt động nhiệm vụ
router.put('/quests/:id/toggle', async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    if (is_active === undefined) {
      return res.status(400).json({ error: 'Vui lòng cung cấp trạng thái is_active.' });
    }

    const result = await db.query(
      'UPDATE quests SET is_active = $1 WHERE id = $2 RETURNING *',
      [is_active, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy nhiệm vụ.' });
    }

    res.json({ success: true, quest: result.rows[0] });
  } catch (error) {
    console.error('Error toggling quest:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/admin/quests/:id - Cập nhật toàn bộ thông tin nhiệm vụ
router.put('/quests/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, quest_type, xp_reward, coin_reward, action_type, target_count, is_active } = req.body;

    const result = await db.query(
      `UPDATE quests
       SET title = $1, quest_type = $2, xp_reward = $3, coin_reward = $4, action_type = $5, target_count = $6, is_active = $7
       WHERE id = $8
       RETURNING *`,
      [
        title,
        quest_type,
        parseInt(xp_reward) || 0,
        parseInt(coin_reward) || 0,
        action_type,
        parseInt(target_count) || 1,
        is_active !== undefined ? is_active : true,
        id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy nhiệm vụ.' });
    }

    res.json({ success: true, message: 'Cập nhật nhiệm vụ thành công!', quest: result.rows[0] });
  } catch (error) {
    console.error('Error updating quest:', error);
    res.status(500).json({ error: 'Lỗi hệ thống khi cập nhật nhiệm vụ.' });
  }
});

// DELETE /api/admin/quests/:id - Xóa nhiệm vụ
router.delete('/quests/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query('DELETE FROM quests WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Nhiệm vụ không tồn tại.' });
    }

    res.json({ success: true, message: 'Xóa nhiệm vụ thành công!' });
  } catch (error) {
    console.error('Error deleting quest:', error);
    res.status(500).json({ error: 'Lỗi hệ thống khi xóa nhiệm vụ.' });
  }
});

// ==========================================
// MEMBER MANAGEMENT HUB - 360° APIs
// ==========================================

// GET /api/admin/members/:id/360/overview - Tab 1: Tổng quan 360
router.get('/members/:id/360/overview', async (req, res) => {
  try {
    const { id } = req.params;
    const memberService = require('../services/memberManagementService');
    const data = await memberService.getMemberOverview(id);
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching member 360 overview:', error);
    res.status(error.message === 'Thành viên không tồn tại.' ? 404 : 500).json({ error: error.message || 'Lỗi tải tổng quan thành viên.' });
  }
});

// GET /api/admin/members/:id/360/attendance - Tab 3: Chuyên cần (Lazy Loaded)
router.get('/members/:id/360/attendance', async (req, res) => {
  try {
    const { id } = req.params;
    const memberService = require('../services/memberManagementService');
    const data = await memberService.getMemberAttendanceDetails(id);
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching member attendance details:', error);
    res.status(500).json({ error: error.message || 'Lỗi tải thông tin chuyên cần.' });
  }
});

// GET /api/admin/members/:id/360/competitive - Tab 4: Thi đấu (Lazy Loaded)
router.get('/members/:id/360/competitive', async (req, res) => {
  try {
    const { id } = req.params;
    const memberService = require('../services/memberManagementService');
    const data = await memberService.getMemberCompetitiveDetails(id);
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching member competitive details:', error);
    res.status(500).json({ error: error.message || 'Lỗi tải thông số thi đấu.' });
  }
});

// GET /api/admin/members/:id/360/gamification - Tab 5: Gamification & Xu (Lazy Loaded)
router.get('/members/:id/360/gamification', async (req, res) => {
  try {
    const { id } = req.params;
    const memberService = require('../services/memberManagementService');
    const data = await memberService.getMemberGamificationDetails(id);
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching member gamification details:', error);
    res.status(500).json({ error: error.message || 'Lỗi tải dữ liệu gamification.' });
  }
});

// GET /api/admin/members/:id/360/timeline - Tab 6: Dòng hoạt động (Lazy Loaded)
router.get('/members/:id/360/timeline', async (req, res) => {
  try {
    const { id } = req.params;
    const limit = parseInt(req.query.limit, 10) || 50;
    const memberService = require('../services/memberManagementService');
    const data = await memberService.getMemberActivityTimeline(id, limit);
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching member timeline:', error);
    res.status(500).json({ error: error.message || 'Lỗi tải dòng hoạt động.' });
  }
});

// GET /api/admin/members/:id/360/audit - Tab 7: Lịch sử kiểm toán (Lazy Loaded)
router.get('/members/:id/360/audit', async (req, res) => {
  try {
    const { id } = req.params;
    const limit = parseInt(req.query.limit, 10) || 50;
    const memberService = require('../services/memberManagementService');
    const data = await memberService.getMemberAuditHistory(id, limit);
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching member audit history:', error);
    res.status(500).json({ error: error.message || 'Lỗi tải lịch sử kiểm toán.' });
  }
});

// PUT /api/admin/members/:id/personal-info - Tab 2: Cập nhật thông tin thành viên (kèm audit log)
router.put('/members/:id/personal-info', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, ...updates } = req.body;
    const memberService = require('../services/memberManagementService');
    const updatedUser = await memberService.updateMemberPersonalInfo({
      userId: id,
      adminId: req.user.id,
      updates,
      reason: reason || 'Quản trị viên cập nhật hồ sơ thành viên'
    });
    res.json({ success: true, message: 'Cập nhật thông tin thành viên thành công!', user: updatedUser });
  } catch (error) {
    console.error('Error updating member personal info:', error);
    res.status(400).json({ error: error.message || 'Lỗi cập nhật thông tin thành viên.' });
  }
});

// POST /api/admin/members/:id/coins/adjust - Điều chỉnh số dư Smash Coins (Transaction + Ledger + Audit)
router.post('/members/:id/coins/adjust', async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, reason } = req.body;
    const changeVal = parseInt(amount, 10);
    if (isNaN(changeVal) || changeVal === 0) {
      return res.status(400).json({ error: 'Số xu điều chỉnh phải là số khác 0.' });
    }
    if (!reason || !reason.trim()) {
      return res.status(400).json({ error: 'Bắt buộc nhập lý do điều chỉnh số dư xu.' });
    }
    const memberService = require('../services/memberManagementService');
    const result = await memberService.adjustUserCoins({
      userId: id,
      amount: changeVal,
      source: 'MANUAL_ADMIN',
      reason: reason.trim(),
      adminId: req.user.id
    });
    res.json({ success: true, message: 'Điều chỉnh số dư xu thành công!', ...result });
  } catch (error) {
    console.error('Error adjusting member coins:', error);
    res.status(400).json({ error: error.message || 'Lỗi điều chỉnh xu.' });
  }
});

// POST /api/admin/members/:id/discipline - Phạt kỷ luật (Thẻ vàng, Thẻ đỏ, Cảnh cáo)
router.post('/members/:id/discipline', async (req, res) => {
  try {
    const { id } = req.params;
    const { type, reason, note, session_id, expires_at } = req.body;
    if (!['WARNING', 'YELLOW', 'RED'].includes(type)) {
      return res.status(400).json({ error: 'Loại kỷ luật không hợp lệ (WARNING, YELLOW, RED).' });
    }
    if (!reason || !reason.trim()) {
      return res.status(400).json({ error: 'Bắt buộc nhập lý do xử phạt kỷ luật.' });
    }
    const memberService = require('../services/memberManagementService');
    const record = await memberService.issueDisciplineRecord({
      userId: id,
      adminId: req.user.id,
      type,
      reason: reason.trim(),
      note: note || null,
      sessionId: session_id || null,
      expiresAt: expires_at || null
    });
    res.json({ success: true, message: `Đã phạt ${type === 'YELLOW' ? 'Thẻ vàng' : type === 'RED' ? 'Thẻ đỏ' : 'Cảnh cáo'} thành công!`, record });
  } catch (error) {
    console.error('Error issuing discipline record:', error);
    res.status(400).json({ error: error.message || 'Lỗi xử phạt kỷ luật.' });
  }
});

// PUT /api/admin/members/:id/discipline/:recordId/revoke - Gỡ bỏ / Xóa án kỷ luật (kèm lý do)
router.put('/members/:id/discipline/:recordId/revoke', async (req, res) => {
  try {
    const { recordId } = req.params;
    const { reason } = req.body;
    if (!reason || !reason.trim()) {
      return res.status(400).json({ error: 'Bắt buộc nhập lý do gỡ kỷ luật / xóa án phạt.' });
    }
    const memberService = require('../services/memberManagementService');
    const record = await memberService.revokeDisciplineRecord({
      recordId,
      adminId: req.user.id,
      reason: reason.trim()
    });
    res.json({ success: true, message: 'Đã gỡ án kỷ luật thành công!', record });
  } catch (error) {
    console.error('Error revoking discipline record:', error);
    res.status(400).json({ error: error.message || 'Lỗi gỡ kỷ luật.' });
  }
});

module.exports = router;
