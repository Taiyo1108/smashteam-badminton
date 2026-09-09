const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/stats - Số liệu thật cho trang chủ (public, không cần đăng nhập)
// Trả về: hội viên đang hoạt động, trận đấu đã ghi nhận,
// buổi tập trong tuần hiện tại, số bậc xếp hạng Elo.
router.get('/', async (req, res) => {
  try {
    const [membersRes, matchesRes, sessionsRes] = await Promise.all([
      // Hội viên đang hoạt động: role member/admin, status active, không bị block,
      // loại trừ tài khoản Super Admin kỹ thuật (đồng bộ logic với leaderboard).
      db.query(
        `SELECT COUNT(*)::int AS count FROM users
         WHERE role IN ('member', 'admin')
           AND COALESCE(status, 'active') = 'active'
           AND COALESCE(is_blocked, false) = false
           AND full_name != 'Super Admin'
           AND phone_zalo != '0999999999'`
      ),
      // Tổng số trận đấu đã ghi nhận trong bảng matches.
      db.query(`SELECT COUNT(*)::int AS count FROM matches`),
      // Buổi tập của tuần hiện tại (Thứ 2 - Chủ nhật theo giờ của DB).
      db.query(
        `SELECT COUNT(*)::int AS count FROM sessions
         WHERE date_time >= date_trunc('week', NOW())
           AND date_time < date_trunc('week', NOW()) + INTERVAL '7 days'`
      ),
    ]);

    res.json({
      activeMembers: membersRes.rows[0].count,
      recordedMatches: matchesRes.rows[0].count,
      weeklySessions: sessionsRes.rows[0].count,
      // Số bậc Elo cố định theo thang của CLB (Bronze -> Challenger).
      eloTiers: 6,
    });
  } catch (error) {
    console.error('Error fetching public stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
