const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/stats - Số liệu thật cho trang chủ (public, không cần đăng nhập)
// Trả về: hội viên đang hoạt động, trận đấu đã ghi nhận,
// buổi tập trong tuần hiện tại, số giải đấu, top ELO, số bậc xếp hạng Elo.
router.get('/', async (req, res) => {
  // Truy vấn an toàn: bảng chưa migrate (VD: club_events) thì trả 0
  // thay vì làm sập cả endpoint.
  async function safeStat(queryText, field) {
    try {
      const r = await db.query(queryText);
      return r.rows[0]?.[field] ?? 0;
    } catch (e) {
      console.warn('Stats fallback 0 cho truy vấn:', queryText.split('\n')[0], '-', e.message);
      return 0;
    }
  }

  try {
    const [activeMembers, recordedMatches, weeklySessions, eventsCount, topElo] = await Promise.all([
      // Hội viên đang hoạt động: role member/admin, status active, không bị block,
      // loại trừ tài khoản Super Admin kỹ thuật (đồng bộ logic với leaderboard).
      safeStat(
        `SELECT COUNT(*)::int AS count FROM users
         WHERE role IN ('member', 'admin')
           AND COALESCE(status, 'active') = 'active'
           AND COALESCE(is_blocked, false) = false
           AND full_name != 'Super Admin'
           AND phone_zalo != '0999999999'`,
        'count'
      ),
      // Tổng số trận đấu đã ghi nhận trong bảng matches.
      safeStat(`SELECT COUNT(*)::int AS count FROM matches`, 'count'),
      // Buổi tập của tuần hiện tại (Thứ 2 - Chủ nhật theo giờ của DB).
      safeStat(
        `SELECT COUNT(*)::int AS count FROM sessions
         WHERE date_time >= date_trunc('week', NOW())
           AND date_time < date_trunc('week', NOW()) + INTERVAL '7 days'`,
        'count'
      ),
      // Tổng số giải đấu / sự kiện của CLB.
      safeStat(`SELECT COUNT(*)::int AS count FROM club_events`, 'count'),
      // ELO cao nhất (đơn hoặc đôi) của hội viên đang hoạt động.
      safeStat(
        `SELECT GREATEST(COALESCE(MAX(elo_singles), 0), COALESCE(MAX(elo_doubles), 0))::int AS top FROM users
         WHERE role IN ('member', 'admin')
           AND COALESCE(status, 'active') = 'active'
           AND COALESCE(is_blocked, false) = false
           AND full_name != 'Super Admin'
           AND phone_zalo != '0999999999'`,
        'top'
      ),
    ]);

    res.json({
      activeMembers,
      recordedMatches,
      weeklySessions,
      eventsCount,
      topElo,
      // Số bậc Elo cố định theo thang của CLB (Bronze -> Challenger).
      eloTiers: 6,
    });
  } catch (error) {
    console.error('Error fetching public stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
