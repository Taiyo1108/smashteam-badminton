const express = require('express');
const router = express.Router();
const db = require('../db');

// Helper to determine Rank name based on ELO
const getRankName = (elo) => {
  if (elo >= 1800) return 'Challenger';
  if (elo >= 1600) return 'Diamond';
  if (elo >= 1400) return 'Platinum';
  if (elo >= 1200) return 'Gold';
  if (elo >= 1100) return 'Silver';
  return 'Bronze';
};

// GET /api/homepage/live-stats - Unified homepage aggregator API
router.get('/live-stats', async (req, res) => {
  try {
    // Format current local time as YYYY-MM-DD HH:MM:SS to align with database timestamp without time zone
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const localNowStr = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;

    // 1. Get the closest session (upcoming or recently started)
    let sessionRes = await db.query(
      `SELECT id, title, date_time::text AS date_time_str, location 
       FROM sessions 
       WHERE date_time >= $1::timestamp - INTERVAL '2 hours' 
       ORDER BY date_time ASC 
       LIMIT 1`,
      [localNowStr]
    );
    
    let isUpcoming = true;
    if (sessionRes.rows.length === 0) {
      // Fallback to the most recent past session
      sessionRes = await db.query(
        `SELECT id, title, date_time::text AS date_time_str, location 
         FROM sessions 
         ORDER BY date_time DESC 
         LIMIT 1`
      );
      isUpcoming = false;
    }

    let session = null;
    let rsvpList = [];

    if (sessionRes.rows.length > 0) {
      session = sessionRes.rows[0];
      
      // Get members RSVPed 'going' for this session
      const rsvpRes = await db.query(
        `SELECT u.id, u.full_name, u.nickname, u.academic_info, u.avatar_url, GREATEST(u.elo_singles, u.elo_doubles) AS elo_score
         FROM attendances a
         JOIN users u ON a.user_id = u.id
         WHERE a.session_id = $1 AND a.status = 'going'
         ORDER BY a.created_at ASC`,
        [session.id]
      );
      
      rsvpList = rsvpRes.rows.map(user => ({
        ...user,
        rank_name: getRankName(user.elo_score)
      }));
    }

    // 2. Statistics for today
    const checkinsTodayRes = await db.query(
      `SELECT COUNT(DISTINCT user_id)::int AS count 
       FROM attendances 
       WHERE status = 'going' AND created_at >= CURRENT_DATE`
    );
    
    const matchesTodayRes = await db.query(
      `SELECT COUNT(*)::int AS count 
       FROM matches 
       WHERE created_at >= CURRENT_DATE`
    );

    const todayStats = {
      checkinsCount: checkinsTodayRes.rows[0]?.count || 0,
      matchesCount: matchesTodayRes.rows[0]?.count || 0
    };

    // 3. Dynamic Activity Feed (5 most recent items)
    const activities = [];

    // 3a. Recent Matches
    const recentMatchesRes = await db.query(
      `SELECT 
        m.id,
        m.score_p1,
        m.score_p2,
        m.winner_id,
        m.player1_id,
        m.player2_id,
        m.elo_exchanged,
        m.created_at,
        u1.full_name AS p1_name,
        u2.full_name AS p2_name,
        u1p.full_name AS p1_partner_name,
        u2p.full_name AS p2_partner_name
      FROM matches m
      JOIN users u1 ON m.player1_id = u1.id
      JOIN users u2 ON m.player2_id = u2.id
      LEFT JOIN users u1p ON m.player1_partner_id = u1p.id
      LEFT JOIN users u2p ON m.player2_partner_id = u2p.id
      ORDER BY m.created_at DESC
      LIMIT 5`
    );

    recentMatchesRes.rows.forEach(row => {
      const isDoubles = !!row.p1_partner_name && !!row.p2_partner_name;
      const t1 = isDoubles ? `${row.p1_name} và ${row.p1_partner_name}` : row.p1_name;
      const t2 = isDoubles ? `${row.p2_name} và ${row.p2_partner_name}` : row.p2_name;
      
      const t1Won = row.winner_id === row.player1_id;
      const winner = t1Won ? t1 : t2;
      const loser = t1Won ? t2 : t1;
      
      const scoreWinner = t1Won ? row.score_p1 : row.score_p2;
      const scoreLoser = t1Won ? row.score_p2 : row.score_p1;

      activities.push({
        id: `match-${row.id}`,
        text: `${winner} vừa chiến thắng kịch tính trước ${loser} với tỷ số ${scoreWinner}-${scoreLoser} (+${row.elo_exchanged} ELO) 🏸`,
        type: 'match',
        timestamp: row.created_at
      });
    });

    // 3b. Recent ELO Promotions (Users with ELO >= 1200)
    const recentPromosRes = await db.query(
      `SELECT id, full_name, GREATEST(elo_singles, elo_doubles) AS elo_score, created_at 
       FROM users 
       WHERE GREATEST(elo_singles, elo_doubles) >= 1200 AND role = 'member'
       ORDER BY GREATEST(elo_singles, elo_doubles) DESC 
       LIMIT 3`
    );

    recentPromosRes.rows.forEach((row, i) => {
      activities.push({
        id: `promo-${row.id}`,
        text: `${row.full_name} vừa xuất sắc thăng hạng lên Rank ${getRankName(row.elo_score)} hoàng gia! 👑`,
        type: 'promotion',
        // Slight mock offset in past to sort naturally
        timestamp: new Date(Date.now() - (i + 1) * 3600000) 
      });
    });

    // 3c. Check-in Streaks
    const recentStreaksRes = await db.query(
      `SELECT id, full_name, current_streak, created_at 
       FROM users 
       WHERE current_streak >= 3 AND role = 'member'
       ORDER BY current_streak DESC 
       LIMIT 3`
    );

    recentStreaksRes.rows.forEach((row, i) => {
      activities.push({
        id: `streak-${row.id}`,
        text: `${row.full_name} vừa đạt chuỗi ${row.current_streak} ngày điểm danh liên tục! 🔥`,
        type: 'streak',
        timestamp: new Date(Date.now() - (i + 1) * 1800000)
      });
    });

    // Sort combined activities by timestamp DESC and pick top 5
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    const finalActivities = activities.slice(0, 5);

    // 4. Hall of Fame Top 3 Categories
    // Category 1: Top Elo
    const topEloRes = await db.query(
      `SELECT id, full_name, avatar_url, GREATEST(elo_singles, elo_doubles) AS score, GREATEST(elo_singles, elo_doubles) AS elo_score
       FROM users 
       WHERE role = 'member' 
       ORDER BY score DESC 
       LIMIT 3`
    );
    const topElo = topEloRes.rows.map(user => ({
      ...user,
      rank_name: getRankName(user.score)
    }));

    // Category 2: Top Attendance
    const topAttendanceRes = await db.query(
      `SELECT u.id, u.full_name, u.avatar_url, COUNT(a.id)::int AS score, GREATEST(u.elo_singles, u.elo_doubles) AS elo_score
       FROM attendances a
       JOIN users u ON a.user_id = u.id
       WHERE a.status = 'going' AND u.role = 'member'
       GROUP BY u.id, u.full_name, u.avatar_url, u.elo_singles, u.elo_doubles
       ORDER BY score DESC
       LIMIT 3`
    );
    const topAttendance = topAttendanceRes.rows.map(user => ({
      ...user,
      rank_name: getRankName(user.elo_score)
    }));

    // Category 3: Rookie of the Month (Newest members sorted by signup date + attendance count)
    const topRookiesRes = await db.query(
      `SELECT u.id, u.full_name, u.avatar_url, COUNT(a.id)::int AS score, GREATEST(u.elo_singles, u.elo_doubles) AS elo_score, u.created_at
       FROM users u
       LEFT JOIN attendances a ON a.user_id = u.id AND a.status = 'going'
       WHERE u.role = 'member'
       GROUP BY u.id, u.full_name, u.avatar_url, u.elo_singles, u.elo_doubles, u.created_at
       ORDER BY u.created_at DESC, score DESC
       LIMIT 3`
    );
    const topRookies = topRookiesRes.rows.map(user => ({
      ...user,
      rank_name: getRankName(user.elo_score)
    }));

    // Category 4: Community Hero / Quest Masters (Completed quests)
    let topCommunityRes = await db.query(
      `SELECT u.id, u.full_name, u.avatar_url, COUNT(uq.id)::int AS score, GREATEST(u.elo_singles, u.elo_doubles) AS elo_score
       FROM user_quests uq
       JOIN users u ON uq.user_id = u.id
       WHERE uq.status IN ('completed', 'claimed') AND u.role = 'member'
       GROUP BY u.id, u.full_name, u.avatar_url, u.elo_singles, u.elo_doubles
       ORDER BY score DESC
       LIMIT 3`
    );
    
    // Fallback if no quests completed yet
    if (topCommunityRes.rows.length === 0) {
      topCommunityRes = await db.query(
        `SELECT id, full_name, avatar_url, smash_coins AS score, GREATEST(elo_singles, elo_doubles) AS elo_score
         FROM users 
         WHERE role = 'member'
         ORDER BY smash_coins DESC
         LIMIT 3`
      );
    }
    const topCommunity = topCommunityRes.rows.map(user => ({
      ...user,
      rank_name: getRankName(user.elo_score)
    }));

    res.json({
      session,
      isUpcoming,
      rsvpList,
      todayStats,
      activities: finalActivities,
      hallOfFame: {
        topElo,
        topAttendance,
        topRookies,
        topCommunity
      }
    });

  } catch (error) {
    console.error('Error fetching homepage live stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
