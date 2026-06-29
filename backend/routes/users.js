const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, isAdmin } = require('../middleware/auth');

// POST /api/users/register - Đăng ký candidate mới
router.post('/register', async (req, res) => {
  try {
    const { full_name, phone_zalo, academic_info, badminton_level, soft_skills, casting_slot_id, gender } = req.body;
    
    if (!full_name || !phone_zalo || !academic_info || !badminton_level) {
      return res.status(400).json({ error: 'Vui lòng điền đầy đủ các thông tin bắt buộc.' });
    }

    // Kiểm tra trùng lặp số điện thoại (Unique Phone Check)
    const phoneCheck = await db.query(
      'SELECT id FROM users WHERE phone_zalo = $1',
      [phone_zalo]
    );

    if (phoneCheck.rows.length > 0) {
      return res.status(400).json({ error: 'Số điện thoại này đã được sử dụng hoặc đăng ký trước đó!' });
    }

    const result = await db.query(
      `INSERT INTO users (full_name, phone_zalo, academic_info, badminton_level, soft_skills, role, casting_slot_id, gender)
       VALUES ($1, $2, $3, $4, $5, 'candidate', $6, $7) RETURNING id, full_name, role`,
      [full_name, phone_zalo, academic_info, badminton_level, JSON.stringify(soft_skills), casting_slot_id, gender]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/users/leaderboard - Lấy danh sách Leaderboard
router.get('/leaderboard', async (req, res) => {
  try {
    const type = req.query.type || 'singles';
    const isDoubles = type === 'doubles';
    
    const elo_col = isDoubles ? 'elo_doubles' : 'elo_singles';
    const matches_col = isDoubles ? 'matches_doubles' : 'matches_singles';
    const win_rate_col = isDoubles ? 'win_rate_doubles' : 'win_rate_singles';

    const result = await db.query(
      `SELECT id, full_name, badminton_level, 
              ${elo_col} as elo_score, 
              ${matches_col} as total_matches, 
              ${win_rate_col} as win_rate 
       FROM users 
       WHERE role IN ('member', 'admin')
       ORDER BY ${elo_col} DESC`
    );
    
    // Gán nhãn Rank dựa trên Elo score
    const getRankName = (elo) => {
      if (elo >= 1800) return 'Challenger';
      if (elo >= 1600) return 'Diamond';
      if (elo >= 1400) return 'Platinum';
      if (elo >= 1200) return 'Gold';
      if (elo >= 1100) return 'Silver';
      return 'Bronze';
    };

    const rankedPlayers = result.rows.map(player => ({
      ...player,
      rank_name: getRankName(player.elo_score)
    }));

    res.json(rankedPlayers);
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/users/candidates - Lấy danh sách ứng viên (Requires Admin)
router.get('/candidates', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { search, level, slot_id } = req.query;
    
    let query = `
      SELECT u.id, u.full_name, u.gender, u.phone_zalo, u.academic_info, u.badminton_level, u.soft_skills, u.created_at, 
             u.casting_slot_id, c.casting_time, c.location 
      FROM users u
      LEFT JOIN casting_slots c ON u.casting_slot_id = c.id
      WHERE u.role = 'candidate'
    `;
    const params = [];
    let paramIndex = 1;

    if (search) {
      query += ` AND (u.full_name ILIKE $${paramIndex} OR u.phone_zalo ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (level && level !== 'all') {
      query += ` AND u.badminton_level = $${paramIndex}`;
      params.push(level);
      paramIndex++;
    }

    if (slot_id && slot_id !== 'all') {
      query += ` AND u.casting_slot_id = $${paramIndex}`;
      params.push(slot_id);
      paramIndex++;
    }

    query += ` ORDER BY u.created_at DESC`;

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/users/members - Lấy danh sách thành viên (Requires Admin)
router.get('/members', authenticateToken, isAdmin, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, full_name, phone_zalo, badminton_level, status, is_blocked, 
              hand_preference, play_style, joined_at, soft_skills, role,
              elo_singles, elo_doubles, 
              matches_singles, matches_doubles, 
              streak_singles, max_streak_singles, 
              streak_doubles, max_streak_doubles,
              win_singles, win_doubles, 
              loss_singles, loss_doubles
       FROM users 
       WHERE role IN ('member', 'admin') 
       ORDER BY full_name ASC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching members:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/users/:id/approve - Duyệt candidate thành member (Requires Admin)
router.put('/:id/approve', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { full_name, phone_zalo, academic_info, badminton_level, casting_notes } = req.body;

    if (!full_name || !phone_zalo || !academic_info || !badminton_level) {
      return res.status(400).json({ error: 'Vui lòng cung cấp đầy đủ thông tin bắt buộc.' });
    }

    // 1. Kiểm tra trùng lặp số điện thoại (Unique Phone Check)
    const phoneCheck = await db.query(
      'SELECT id FROM users WHERE phone_zalo = $1 AND id != $2',
      [phone_zalo, id]
    );

    if (phoneCheck.rows.length > 0) {
      return res.status(400).json({ 
        error: 'Số điện thoại này đã được sử dụng bởi một thành viên khác trong CLB!' 
      });
    }

    // 2. Định nghĩa điểm ELO khởi điểm động dựa trên trình độ
    let eloInit = 1000;
    if (badminton_level === 'Mới chơi') {
      eloInit = 900;
    } else if (badminton_level === 'Trung bình') {
      eloInit = 1000;
    } else if (badminton_level === 'Khá/Giỏi') {
      eloInit = 1150;
    }

    // 3. Thực hiện cập nhật ứng viên
    const result = await db.query(
      `UPDATE users 
       SET role = 'member',
           full_name = $1,
           phone_zalo = $2,
           academic_info = $3,
           badminton_level = $4,
           casting_notes = $5,
           elo_singles = $6,
           elo_doubles = $7
       WHERE id = $8 RETURNING id, full_name, role, elo_singles`,
      [full_name, phone_zalo, academic_info, badminton_level, casting_notes || null, eloInit, eloInit, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy ứng viên.' });
    }

    res.json({
      success: true,
      user: result.rows[0],
      elo_initialized: eloInit
    });
  } catch (error) {
    console.error('Error approving candidate:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/users/stats - Lấy thống kê cho Dashboard (Requires Admin)
router.get('/stats', authenticateToken, isAdmin, async (req, res) => {
  try {
    const [candidatesResult, membersResult, matchesResult, mediaResult] = await Promise.all([
      db.query(`SELECT COUNT(*) FROM users WHERE role = 'candidate'`),
      db.query(`SELECT COUNT(*) FROM users WHERE role IN ('member', 'admin')`),
      db.query(`SELECT COUNT(*) FROM matches`),
      db.query(`SELECT COUNT(*) FROM media_posts`)
    ]);
    
    res.json({
      candidatesCount: parseInt(candidatesResult.rows[0].count),
      membersCount: parseInt(membersResult.rows[0].count),
      matchesCount: parseInt(matchesResult.rows[0].count),
      mediaCount: parseInt(mediaResult.rows[0].count)
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
// DELETE /api/users/:id - Xóa/Loại bỏ user vĩnh viễn (Requires Admin)
router.delete('/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Chặn tự xóa chính mình
    if (id === req.user.id) {
      return res.status(400).json({ error: 'Bạn không thể tự xóa tài khoản của chính mình!' });
    }

    const result = await db.query(
      "DELETE FROM users WHERE id = $1 RETURNING id, full_name, role",
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy tài khoản người dùng.' });
    }
    res.json({ success: true, message: 'Đã xóa tài khoản vĩnh viễn khỏi hệ thống.', user: result.rows[0] });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
