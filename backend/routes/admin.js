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

// POST /api/admin/sessions - Tạo buổi tập mới
router.post('/sessions', async (req, res) => {
  try {
    const { title, date_time, location } = req.body;
    if (!title || !date_time || !location) {
      return res.status(400).json({ error: 'Vui lòng cung cấp tiêu đề, thời gian và địa điểm.' });
    }

    const result = await db.query(
      `INSERT INTO sessions (title, date_time, location) 
       VALUES ($1, $2, $3) RETURNING *`,
      [title, date_time, location]
    );

    res.status(201).json({ success: true, session: result.rows[0] });
  } catch (error) {
    console.error('Error creating session:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/admin/sessions/:id/attendees - Lấy danh sách thành viên check-in thực tế của buổi tập
router.get('/sessions/:id/attendees', async (req, res) => {
  try {
    const { id } = req.params;

    // Lấy thông tin session
    const sessionRes = await db.query('SELECT * FROM sessions WHERE id = $1', [id]);
    if (sessionRes.rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy buổi tập.' });
    }

    // Lấy danh sách thành viên tham gia (status = 'going')
    const attendeesRes = await db.query(
      `SELECT 
        u.id AS user_id,
        u.full_name,
        u.nickname,
        u.phone_zalo,
        u.avatar_url,
        a.created_at AS checked_in_at
       FROM attendances a
       JOIN users u ON a.user_id = u.id
       WHERE a.session_id = $1 AND a.status = 'going'
       ORDER BY a.created_at DESC`,
      [id]
    );

    res.json({
      session: sessionRes.rows[0],
      attendees: attendeesRes.rows
    });
  } catch (error) {
    console.error('Error fetching session attendees:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

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

module.exports = router;
