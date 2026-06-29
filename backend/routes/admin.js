const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, isAdmin } = require('../middleware/auth');

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

module.exports = router;
