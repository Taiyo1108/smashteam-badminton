const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { addXpToUser, updateQuestProgress } = require('../utils/gamification');
const { upload: uploadAvatar, uploadBufferToImageKit, deleteImageByUrl } = require('../utils/imagekit');

// GET /api/profile/me - Lấy thông tin cá nhân của user đang đăng nhập
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // 0. Tự động dọn dẹp các vật phẩm đã hết hạn
    await db.query(
      `WITH expired_items AS (
         UPDATE user_inventory 
         SET is_equipped = false 
         WHERE user_id = $1 AND expires_at <= NOW() AND is_equipped = true
         RETURNING item_type
       )
       UPDATE users
       SET 
         selected_avatar_frame = CASE WHEN EXISTS (SELECT 1 FROM expired_items WHERE item_type = 'avatar_frame') THEN NULL ELSE selected_avatar_frame END,
         selected_title = CASE WHEN EXISTS (SELECT 1 FROM expired_items WHERE item_type = 'title') THEN NULL ELSE selected_title END
       WHERE id = $1`,
      [userId]
    );

    // 1. Fetch thông tin cá nhân
    const userRes = await db.query(
      `SELECT id, full_name, nickname, phone_zalo, academic_info, badminton_level, soft_skills, role, avatar_url,
              selected_avatar_frame, selected_title,
              elo_singles, matches_singles, win_rate_singles, win_singles, loss_singles, streak_singles, max_streak_singles,
              elo_doubles, matches_doubles, win_rate_doubles, win_doubles, loss_doubles, streak_doubles, max_streak_doubles,
              created_at
       FROM users
       WHERE id = $1`,
      [userId]
    );

    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const player = userRes.rows[0];

    // 2. Fetch 5 trận gần nhất
    const matchesRes = await db.query(
      `SELECT m.id, m.score_p1, m.score_p2, m.elo_exchanged, m.created_at,
              m.player1_id, m.player2_id, m.player1_partner_id, m.player2_partner_id, m.winner_id,
              m.p1_elo_before, m.p2_elo_before, m.p1_elo_after, m.p2_elo_after,
              u1.full_name as player1_name, u2.full_name as player2_name, w.full_name as winner_name,
              up1.full_name as player1_partner_name, up2.full_name as player2_partner_name
       FROM matches m
       JOIN users u1 ON m.player1_id = u1.id
       JOIN users u2 ON m.player2_id = u2.id
       LEFT JOIN users up1 ON m.player1_partner_id = up1.id
       LEFT JOIN users up2 ON m.player2_partner_id = up2.id
       JOIN users w ON m.winner_id = w.id
       WHERE m.player1_id = $1 OR m.player2_id = $1 OR m.player1_partner_id = $1 OR m.player2_partner_id = $1
       ORDER BY m.created_at DESC LIMIT 5`,
      [userId]
    );

    const formattedMatches = matchesRes.rows.map(m => {
      const isTeam1 = (m.player1_id === userId || m.player1_partner_id === userId);
      const isDoubles = (m.player1_partner_id !== null && m.player2_partner_id !== null);
      
      const team1Won = (m.winner_id === m.player1_id || m.winner_id === m.player1_partner_id);
      const won = isTeam1 ? team1Won : !team1Won;

      // Tính ELO biến động
      let eloChange = 0;
      if (isTeam1) {
        eloChange = m.p1_elo_after - m.p1_elo_before;
      } else {
        eloChange = m.p2_elo_after - m.p2_elo_before;
      }

      // Xác định đối thủ
      let opponent = '';
      if (isTeam1) {
        opponent = isDoubles 
          ? `${m.player2_name} / ${m.player2_partner_name || ''}` 
          : m.player2_name;
      } else {
        opponent = isDoubles 
          ? `${m.player1_name} / ${m.player1_partner_name || ''}` 
          : m.player1_name;
      }

      // Điểm số theo góc nhìn người chơi
      const playerScore = isTeam1 ? m.score_p1 : m.score_p2;
      const opponentScore = isTeam1 ? m.score_p2 : m.score_p1;

      return {
        id: m.id,
        isDoubles,
        opponent,
        score: `${playerScore} - ${opponentScore}`,
        won,
        eloChange,
        created_at: m.created_at
      };
    });

    // 3. Fetch buổi tập sắp tới gần nhất (date_time >= NOW() - 2 hours)
    const upcomingSessionRes = await db.query(
      `SELECT s.id, s.title, s.date_time, s.location,
              a.status as rsvp_status
       FROM sessions s
       LEFT JOIN attendances a ON s.id = a.session_id AND a.user_id = $1
       WHERE s.date_time >= NOW() - INTERVAL '2 hours'
       ORDER BY s.date_time ASC LIMIT 1`,
      [userId]
    );
    const upcomingSession = upcomingSessionRes.rows[0] || null;

    // 4. Fetch lịch sử điểm danh của người chơi
    const attendanceHistoryRes = await db.query(
      `SELECT a.status, s.title, s.date_time, s.location, a.created_at as rsvp_date
       FROM attendances a
       JOIN sessions s ON a.session_id = s.id
       WHERE a.user_id = $1
       ORDER BY s.date_time DESC`,
      [userId]
    );
    const attendanceHistory = attendanceHistoryRes.rows;

    res.json({
      player,
      matches: formattedMatches,
      upcomingSession,
      attendanceHistory
    });
  } catch (error) {
    console.error('Error fetching player profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/profile/rsvp - Điểm danh / RSVP buổi tập
router.post('/rsvp', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { session_id, status } = req.body;

    if (!session_id || !status) {
      return res.status(400).json({ error: 'Vui lòng cung cấp session_id và status.' });
    }

    if (!['going', 'absent'].includes(status)) {
      return res.status(400).json({ error: 'Status không hợp lệ (chỉ chấp nhận đi hoặc vắng).' });
    }

    // Kiểm tra buổi tập tồn tại
    const sessionRes = await db.query('SELECT id FROM sessions WHERE id = $1', [session_id]);
    if (sessionRes.rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy buổi tập này.' });
    }

    // Kiểm tra trạng thái RSVP trước đó để tránh nhận thưởng trùng
    const existingRes = await db.query(
      'SELECT status FROM attendances WHERE session_id = $1 AND user_id = $2',
      [session_id, userId]
    );
    const wasGoing = existingRes.rows.length > 0 && existingRes.rows[0].status === 'going';

    // ON CONFLICT DO UPDATE đảm bảo cập nhật an toàn không trùng lặp
    const result = await db.query(
      `INSERT INTO attendances (session_id, user_id, status)
       VALUES ($1, $2, $3)
       ON CONFLICT (session_id, user_id)
       DO UPDATE SET status = EXCLUDED.status, created_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [session_id, userId, status]
    );

    res.json({ success: true, attendance: result.rows[0] });
  } catch (error) {
    console.error('Error handling RSVP:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/profile/update - Cập nhật thông tin chi tiết hồ sơ
router.put('/update', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { full_name, nickname, academic_info, soft_skills } = req.body;

    if (!full_name) {
      return res.status(400).json({ error: 'Họ và tên bắt buộc không được để trống.' });
    }

    const softSkillsJson = Array.isArray(soft_skills) ? JSON.stringify(soft_skills) : JSON.stringify([]);

    const result = await db.query(
      `UPDATE users 
       SET full_name = $1, nickname = $2, academic_info = $3, soft_skills = $4
       WHERE id = $5 RETURNING *`,
      [full_name.trim(), nickname ? nickname.trim() : null, academic_info ? academic_info.trim() : null, softSkillsJson, userId]
    );

    res.json({ success: true, player: result.rows[0] });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/profile/upload-avatar - Tải lên avatar cá nhân lên ImageKit
router.post('/upload-avatar', authenticateToken, uploadAvatar.single('avatar'), async (req, res) => {
  try {
    const userId = req.user.id;

    if (!req.file) {
      return res.status(400).json({ error: 'Không tìm thấy file ảnh tải lên.' });
    }

    const uploaded = await uploadBufferToImageKit(req.file.buffer, req.file.originalname, '/smashteam/avatars');
    const newAvatarUrl = uploaded.url;

    // Lấy thông tin avatar cũ để xóa dọn dẹp dung lượng ImageKit
    const oldAvatarRes = await db.query('SELECT avatar_url FROM users WHERE id = $1', [userId]);
    const oldAvatarUrl = oldAvatarRes.rows[0]?.avatar_url;

    if (oldAvatarUrl) {
      await deleteImageByUrl(oldAvatarUrl).catch(err => {
        console.error('Error deleting old avatar:', err);
      });
    }

    // Cập nhật URL ảnh mới vào DB
    const result = await db.query(
      'UPDATE users SET avatar_url = $1 WHERE id = $2 RETURNING id, avatar_url',
      [newAvatarUrl, userId]
    );

    res.json({ success: true, avatar_url: result.rows[0].avatar_url });
  } catch (error) {
    console.error('Error uploading avatar:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/profile/change-password - Đổi mật khẩu thành viên
router.put('/change-password', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { old_password, new_password } = req.body;

    if (!old_password || !new_password) {
      return res.status(400).json({ error: 'Vui lòng điền đầy đủ mật khẩu cũ và mật khẩu mới.' });
    }

    if (new_password.length < 6) {
      return res.status(400).json({ error: 'Mật khẩu mới phải đạt độ dài tối thiểu là 6 ký tự.' });
    }

    // Lấy password_hash hiện tại
    const userRes = await db.query('SELECT password_hash FROM users WHERE id = $1', [userId]);
    const user = userRes.rows[0];

    if (!user || !user.password_hash) {
      return res.status(400).json({ error: 'Không tìm thấy tài khoản để cập nhật mật khẩu.' });
    }

    // Xác thực mật khẩu cũ
    const isValid = await bcrypt.compare(old_password, user.password_hash);
    if (!isValid) {
      return res.status(400).json({ error: 'Mật khẩu cũ không chính xác.' });
    }

    // Mã hóa mật khẩu mới
    const saltRounds = 10;
    const newHash = await bcrypt.hash(new_password, saltRounds);

    // Cập nhật DB
    await db.query(
      'UPDATE users SET password_hash = $1 WHERE id = $2',
      [newHash, userId]
    );

    res.json({ success: true, message: 'Đổi mật khẩu thành công.' });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
