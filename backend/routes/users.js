const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, isAdmin } = require('../middleware/auth');
const { sendWelcomeEmail } = require('../utils/emailService');
const { getRankName } = require('../utils/elo');

// POST /api/users/register - Đăng ký candidate mới
router.post('/register', async (req, res) => {
  try {
    const { full_name, phone_zalo, email, academic_info, badminton_level, soft_skills, casting_slot_id, gender, extra_answers } = req.body;
    
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

    // Kiểm tra trùng lặp email (Unique Email Check)
    if (email) {
      const emailCheck = await db.query(
        'SELECT id FROM users WHERE email = $1',
        [email]
      );
      if (emailCheck.rows.length > 0) {
        return res.status(400).json({ error: 'Email này đã được sử dụng để đăng ký tuyển chọn trước đó!' });
      }
    }

    // Bắt buộc chọn ca casting ngay lúc đăng ký (ID ca là UUID, không ép kiểu số)
    if (!casting_slot_id) {
      return res.status(400).json({ error: 'Vui lòng chọn ca casting trước khi gửi đơn!' });
    }
    const slotCheck = await db.query(
      'SELECT id, max_capacity, is_active FROM casting_slots WHERE id = $1',
      [casting_slot_id]
    );
    if (slotCheck.rows.length === 0) {
      return res.status(400).json({ error: 'Ca casting bạn chọn không tồn tại. Vui lòng chọn lại!' });
    }
    if (slotCheck.rows[0].is_active === false) {
      return res.status(400).json({ error: 'Ca casting này đã đóng nhận đăng ký. Vui lòng chọn ca khác!' });
    }
    const slotCountRes = await db.query(
      "SELECT COUNT(*) FROM users WHERE casting_slot_id = $1 AND role = 'candidate'",
      [casting_slot_id]
    );
    if (parseInt(slotCountRes.rows[0].count, 10) >= (slotCheck.rows[0].max_capacity || 0)) {
      return res.status(400).json({ error: 'Ca casting này đã đủ người. Vui lòng chọn ca khác!' });
    }

    const extraAnswersJson = extra_answers
      ? (typeof extra_answers === 'string' ? extra_answers : JSON.stringify(extra_answers))
      : null;

    let result;
    try {
      result = await db.query(
        `INSERT INTO users (full_name, phone_zalo, email, academic_info, badminton_level, soft_skills, role, casting_slot_id, gender, extra_answers)
         VALUES ($1, $2, $3, $4, $5, $6, 'candidate', $7, $8, $9) RETURNING id, full_name, role`,
        [full_name, phone_zalo, email || null, academic_info, badminton_level, JSON.stringify(soft_skills), casting_slot_id, gender, extraAnswersJson]
      );
    } catch (e) {
      // Fallback cho DB chưa chạy migration 19 (thiếu cột extra_answers)
      if (e && e.code === '42703') {
        result = await db.query(
          `INSERT INTO users (full_name, phone_zalo, email, academic_info, badminton_level, soft_skills, role, casting_slot_id, gender)
           VALUES ($1, $2, $3, $4, $5, $6, 'candidate', $7, $8) RETURNING id, full_name, role`,
          [full_name, phone_zalo, email || null, academic_info, badminton_level, JSON.stringify(soft_skills), casting_slot_id, gender]
        );
      } else {
        throw e;
      }
    }

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
       WHERE role IN ('member', 'admin') AND full_name != 'Super Admin' AND phone_zalo != '0999999999'
       ORDER BY ${elo_col} DESC`
    );
    
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
    const { search, level, slot_id, campaign_id } = req.query;
    
    let query = `
      SELECT u.id, u.full_name, u.gender, u.phone_zalo, COALESCE(u.email, '') as email, u.academic_info, u.badminton_level, u.soft_skills, u.created_at,
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

    if (campaign_id && campaign_id !== 'all') {
      query += ` AND c.campaign_id = $${paramIndex}`;
      params.push(campaign_id);
      paramIndex++;
    }

    query += ` ORDER BY u.created_at DESC`;

    // Ưu tiên kèm câu trả lời tùy chỉnh; rớt về query cũ nếu DB chưa có cột extra_answers
    let result;
    try {
      result = await db.query(query.replace('u.casting_slot_id,', 'u.casting_slot_id, u.extra_answers,'), params);
    } catch (e) {
      if (e && e.code === '42703') {
        result = await db.query(query, params);
      } else {
        throw e;
      }
    }
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/users/members - Lấy danh sách thành viên (Requires Admin)
// Hỗ trợ ?campaign_id= để chỉ lấy thành viên được duyệt từ đợt casting đó
// (member giữ nguyên casting_slot_id sau khi duyệt, join qua casting_slots.campaign_id)
router.get('/members', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { campaign_id } = req.query;
    let join = '';
    let extraWhere = '';
    const params = [];
    if (campaign_id && campaign_id !== 'all') {
      join = 'LEFT JOIN casting_slots c ON users.casting_slot_id = c.id';
      extraWhere = ' AND c.campaign_id = $1';
      params.push(campaign_id);
    }
    const query = `
      WITH discipline_summary AS (
        SELECT 
          user_id,
          COUNT(id) FILTER (WHERE type = 'YELLOW' AND status = 'ACTIVE') as active_yellow_cards,
          COUNT(id) FILTER (WHERE type = 'RED' AND status = 'ACTIVE') as active_red_cards,
          COUNT(id) FILTER (WHERE type = 'WARNING' AND status = 'ACTIVE') as active_warnings
        FROM member_discipline_records
        GROUP BY user_id
      ),
      attendance_summary AS (
        SELECT 
          user_id,
          COUNT(id) as total_reservations,
          COUNT(id) FILTER (WHERE status IN ('CHECKED_IN', 'CHECKED_OUT', 'MISSING_CHECKOUT', 'going')) as attended_count,
          COUNT(id) FILTER (WHERE status = 'NO_SHOW') as no_show_count,
          COUNT(id) FILTER (WHERE is_late_cancellation = true OR (status = 'CANCELLED' AND is_late_cancellation = true)) as late_cancel_count,
          COUNT(id) FILTER (WHERE status = 'MISSING_CHECKOUT') as missing_checkout_count,
          MAX(checked_in_at) as last_attendance_date
        FROM attendances
        GROUP BY user_id
      )
      SELECT 
        users.id, users.casting_slot_id, users.full_name, users.nickname, users.phone_zalo, users.email, 
        users.badminton_level, users.academic_info, users.status, users.is_blocked, 
        users.hand_preference, users.play_style, users.joined_at, users.soft_skills, users.role,
        users.avatar_url, users.tags, users.level, users.xp, users.smash_coins, users.last_active_date,
        users.elo_singles, users.elo_doubles, 
        users.matches_singles, users.matches_doubles, 
        users.streak_singles, users.max_streak_singles, 
        users.streak_doubles, users.max_streak_doubles, 
        users.win_singles, users.win_doubles, 
        users.loss_singles, users.loss_doubles,
        (users.password_hash IS NOT NULL) AS is_activated,
        COALESCE(disc.active_yellow_cards, 0) as active_yellow_cards,
        COALESCE(disc.active_red_cards, 0) as active_red_cards,
        COALESCE(disc.active_warnings, 0) as active_warnings,
        COALESCE(att.total_reservations, 0) as total_reservations,
        COALESCE(att.attended_count, 0) as attended_count,
        COALESCE(att.no_show_count, 0) as no_show_count,
        COALESCE(att.late_cancel_count, 0) as late_cancel_count,
        COALESCE(att.missing_checkout_count, 0) as missing_checkout_count,
        att.last_attendance_date
      FROM users
      ${join}
      LEFT JOIN discipline_summary disc ON users.id = disc.user_id
      LEFT JOIN attendance_summary att ON users.id = att.user_id
      WHERE users.role IN ('member', 'admin') AND users.full_name != 'Super Admin' AND users.phone_zalo != '0999999999'${extraWhere}
      ORDER BY users.full_name ASC
    `;

    const result = await db.query(query, params);

    const rankedMembers = result.rows.map(m => {
      const eloSingles = m.elo_singles ?? 1000;
      const eloDoubles = m.elo_doubles ?? 1000;
      
      const noShowCount = parseInt(m.no_show_count, 10) || 0;
      const lateCancelCount = parseInt(m.late_cancel_count, 10) || 0;
      const yellowCards = parseInt(m.active_yellow_cards, 10) || 0;
      const redCards = parseInt(m.active_red_cards, 10) || 0;
      const missingCheckoutCount = parseInt(m.missing_checkout_count, 10) || 0;
      const attendedCount = parseInt(m.attended_count, 10) || 0;
      const totalReservations = parseInt(m.total_reservations, 10) || 0;

      // Derived reliability score formula
      const rawScore = 100 
        - (noShowCount * 20) 
        - (lateCancelCount * 10) 
        - (yellowCards * 15) 
        - (redCards * 40) 
        - (missingCheckoutCount * 5) 
        + (attendedCount * 2);

      const boundedScore = Math.max(0, Math.min(100, Math.round(rawScore)));

      let reliabilityLabel = 'Xuất sắc';
      let reliabilityLevel = 'excellent';
      let reliabilityColor = 'emerald';
      if (boundedScore >= 90) {
        reliabilityLabel = 'Xuất sắc';
        reliabilityLevel = 'excellent';
        reliabilityColor = 'emerald';
      } else if (boundedScore >= 75) {
        reliabilityLabel = 'Tốt';
        reliabilityLevel = 'good';
        reliabilityColor = 'blue';
      } else if (boundedScore >= 50) {
        reliabilityLabel = 'Trung bình';
        reliabilityLevel = 'fair';
        reliabilityColor = 'amber';
      } else {
        reliabilityLabel = 'Nguy cơ';
        reliabilityLevel = 'risk';
        reliabilityColor = 'rose';
      }

      const attendanceRate = totalReservations > 0 
        ? Math.round((attendedCount / totalReservations) * 100) 
        : 100;

      const lastActive = m.last_attendance_date || m.last_active_date || m.joined_at || null;

      return {
        ...m,
        is_activated: Boolean(m.is_activated),
        tags: Array.isArray(m.tags) ? m.tags : [],
        smash_coins: m.smash_coins || 0,
        level: m.level || 1,
        xp: m.xp || 0,
        elo_singles: eloSingles,
        elo_doubles: eloDoubles,
        rank_singles: getRankName(eloSingles),
        rank_doubles: getRankName(eloDoubles),
        rank_name: getRankName(Math.max(eloSingles, eloDoubles)),
        active_yellow_cards: yellowCards,
        active_red_cards: redCards,
        total_reservations: totalReservations,
        attended_count: attendedCount,
        no_show_count: noShowCount,
        late_cancel_count: lateCancelCount,
        missing_checkout_count: missingCheckoutCount,
        attendance_rate: attendanceRate,
        reliability_score: boundedScore,
        reliability_label: reliabilityLabel,
        reliability_level: reliabilityLevel,
        reliability_color: reliabilityColor,
        last_active: lastActive
      };
    });

    res.json(rankedMembers);
  } catch (error) {
    console.error('Error fetching members:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/users/:id/approve - Duyệt candidate thành member (Requires Admin)
router.put('/:id/approve', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { full_name, phone_zalo, email, academic_info, badminton_level, stars, casting_notes } = req.body;

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

    // 2. Kiểm tra trùng lặp email (Unique Email Check)
    if (email) {
      const emailCheck = await db.query(
        'SELECT id FROM users WHERE email = $1 AND id != $2',
        [email, id]
      );
      if (emailCheck.rows.length > 0) {
        return res.status(400).json({ 
          error: 'Email này đã được sử dụng bởi một thành viên khác trong CLB!' 
        });
      }
    }

    // 3. Định nghĩa điểm ELO khởi điểm động dựa trên trình độ
    let eloInit = 1000;
    if (badminton_level === 'Mới chơi') {
      eloInit = 900;
    } else if (badminton_level === 'Trung bình') {
      eloInit = 1000;
    } else if (badminton_level === 'Khá/Giỏi') {
      eloInit = 1150;
    }

    // 4. Thực hiện cập nhật ứng viên
    const result = await db.query(
      `UPDATE users 
       SET role = 'member',
           full_name = $1,
           phone_zalo = $2,
           email = $3,
           academic_info = $4,
           badminton_level = $5,
           casting_notes = $6,
           elo_singles = $7,
           elo_doubles = $8
       WHERE id = $9 RETURNING id, full_name, role, elo_singles, email`,
      [full_name, phone_zalo, email || null, academic_info, badminton_level, casting_notes || null, eloInit, eloInit, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy ứng viên.' });
    }

    // 5. Gửi email chào mừng chạy ngầm (non-blocking) để tránh chậm API
    if (email) {
      const emailStars = stars || (badminton_level === 'Mới chơi' ? 2 : badminton_level === 'Trung bình' ? 3 : 4);
      sendWelcomeEmail(email, full_name, emailStars, eloInit);
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
});

// DELETE /api/users/:id - Xóa hoặc Lưu trữ (Archive) tài khoản an toàn (Requires Admin)
router.delete('/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const reason = req.body?.reason || req.query?.reason || 'Quản trị viên thực hiện xóa/lưu trữ';

    // Chặn tự xóa chính mình
    if (id === req.user.id) {
      return res.status(400).json({ error: 'Bạn không thể tự xóa tài khoản của chính mình!' });
    }

    const { safeArchiveOrDeleteMember } = require('../services/memberManagementService');
    const result = await safeArchiveOrDeleteMember({
      userId: id,
      adminId: req.user.id,
      reason
    });

    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Error deleting/archiving user:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

module.exports = router;
