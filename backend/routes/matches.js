const express = require('express');
const router = express.Router();
const db = require('../db');
const { calculateElo } = require('../utils/elo');
const { authenticateToken, isAdmin } = require('../middleware/auth');

// GET /api/matches - Lấy lịch sử đấu (Đơn & Đôi)
router.get('/', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT m.id, m.score_p1, m.score_p2, m.elo_exchanged, m.created_at,
              m.p1_elo_before, m.p2_elo_before, m.p1_elo_after, m.p2_elo_after,
              m.player1_partner_id, m.player2_partner_id,
              u1.full_name as player1_name, u2.full_name as player2_name, w.full_name as winner_name,
              up1.full_name as player1_partner_name, up2.full_name as player2_partner_name
       FROM matches m
       JOIN users u1 ON m.player1_id = u1.id
       JOIN users u2 ON m.player2_id = u2.id
       LEFT JOIN users up1 ON m.player1_partner_id = up1.id
       LEFT JOIN users up2 ON m.player2_partner_id = up2.id
       JOIN users w ON m.winner_id = w.id
       ORDER BY m.created_at DESC LIMIT 50`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching matches:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/matches - Nhập kết quả trận đấu (Đơn hoặc Đôi), tính Elo và cập nhật thống kê (tách biệt Đơn/Đôi)
router.post('/', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { player1_id, player2_id, player1_partner_id, player2_partner_id, score_p1, score_p2, winner_id } = req.body;

    if (!player1_id || !player2_id || score_p1 === undefined || score_p2 === undefined || !winner_id) {
      return res.status(400).json({ error: 'Missing required match details' });
    }

    const isDoubles = !!(player1_partner_id && player2_partner_id);

    // Thu thập danh sách ID người chơi thực tế
    const activePlayerIds = [player1_id, player2_id];
    if (player1_partner_id) activePlayerIds.push(player1_partner_id);
    if (player2_partner_id) activePlayerIds.push(player2_partner_id);

    // Xác nhận không trùng ID người chơi
    const uniqueIds = new Set(activePlayerIds);
    if (uniqueIds.size !== activePlayerIds.length) {
      return res.status(400).json({ error: 'All player IDs in a match must be unique' });
    }

    // Đội 1: player1_id & player1_partner_id
    // Đội 2: player2_id & player2_partner_id
    const team1Ids = [player1_id];
    if (player1_partner_id) team1Ids.push(player1_partner_id);

    const team2Ids = [player2_id];
    if (player2_partner_id) team2Ids.push(player2_partner_id);

    const team1Won = team1Ids.includes(winner_id);
    const team2Won = team2Ids.includes(winner_id);

    if (!team1Won && !team2Won) {
      return res.status(400).json({ error: 'Winner must be one of the active players' });
    }

    // Bắt đầu một transaction
    await db.query('BEGIN');

    // Truy vấn khóa dòng (FOR UPDATE) cho tất cả người chơi hoạt động
    const playersData = {};
    for (const pId of activePlayerIds) {
      const pRes = await db.query(
        `SELECT elo_singles, elo_doubles, 
                matches_singles, matches_doubles,
                win_singles, loss_singles,
                win_doubles, loss_doubles,
                streak_singles, max_streak_singles,
                streak_doubles, max_streak_doubles
         FROM users WHERE id = $1::uuid FOR UPDATE`, 
        [pId]
      );
      if (pRes.rows.length === 0) {
        await db.query('ROLLBACK');
        return res.status(404).json({ error: `Player with ID ${pId} not found` });
      }
      playersData[pId] = pRes.rows[0];
    }

    const p1 = playersData[player1_id];
    const p2 = playersData[player2_id];
    const p1_p = player1_partner_id ? playersData[player1_partner_id] : null;
    const p2_p = player2_partner_id ? playersData[player2_partner_id] : null;

    // Phân tách Elo và chỉ số đầu vào dựa trên thể thức Đơn/Đôi
    const elo1 = isDoubles ? p1.elo_doubles : p1.elo_singles;
    const elo2 = isDoubles ? p2.elo_doubles : p2.elo_singles;
    const matches1 = isDoubles ? p1.matches_doubles : p1.matches_singles;
    const matches2 = isDoubles ? p2.matches_doubles : p2.matches_singles;
    const streak1 = isDoubles ? p1.streak_doubles : p1.streak_singles;
    const streak2 = isDoubles ? p2.streak_doubles : p2.streak_singles;

    const elo1_p = isDoubles && p1_p ? p1_p.elo_doubles : null;
    const elo2_p = isDoubles && p2_p ? p2_p.elo_doubles : null;
    const matches1_p = isDoubles && p1_p ? p1_p.matches_doubles : 0;
    const matches2_p = isDoubles && p2_p ? p2_p.matches_doubles : 0;
    const streak1_p = isDoubles && p1_p ? p1_p.streak_doubles : 0;
    const streak2_p = isDoubles && p2_p ? p2_p.streak_doubles : 0;

    // Tính Elo bằng helper calculateElo
    const { elo1New, elo2New, elo1_partnerNew, elo2_partnerNew, eloExchanged } = calculateElo(
      elo1, elo2, player1_id, player2_id, winner_id,
      streak1, streak2, matches1, matches2,
      elo1_p, elo2_p,
      streak1_p, streak2_p,
      matches1_p, matches2_p,
      player1_partner_id,
      player2_partner_id
    );

    // Hàm cập nhật thống kê người chơi (tách biệt Đơn/Đôi)
    const updateUserStats = async (id, currentStats, newElo, won) => {
      // Xác định tên cột dựa trên thể thức
      const matches_col = isDoubles ? 'matches_doubles' : 'matches_singles';
      const elo_col = isDoubles ? 'elo_doubles' : 'elo_singles';
      const win_col = isDoubles ? 'win_doubles' : 'win_singles';
      const loss_col = isDoubles ? 'loss_doubles' : 'loss_singles';
      const win_rate_col = isDoubles ? 'win_rate_doubles' : 'win_rate_singles';
      const streak_col = isDoubles ? 'streak_doubles' : 'streak_singles';
      const max_streak_col = isDoubles ? 'max_streak_doubles' : 'max_streak_singles';

      const prevMatches = isDoubles ? currentStats.matches_doubles : currentStats.matches_singles;
      const prevWin = isDoubles ? currentStats.win_doubles : currentStats.win_singles;
      const prevLoss = isDoubles ? currentStats.loss_doubles : currentStats.loss_singles;
      const prevStreak = isDoubles ? currentStats.streak_doubles : currentStats.streak_singles;
      const prevMaxStreak = isDoubles ? currentStats.max_streak_doubles : currentStats.max_streak_singles;

      const newTotal = prevMatches + 1;
      const newWin = won ? prevWin + 1 : prevWin;
      const newLoss = !won ? prevLoss + 1 : prevLoss;
      const newWinRate = (newWin / newTotal) * 100;

      let newStreak = 0;
      if (won) {
        newStreak = prevStreak >= 0 ? prevStreak + 1 : 1;
      } else {
        newStreak = prevStreak <= 0 ? prevStreak - 1 : -1;
      }
      const newMaxStreak = newStreak > 0 ? Math.max(prevMaxStreak, newStreak) : prevMaxStreak;

      await db.query(
        `UPDATE users 
         SET ${elo_col} = $1, 
             ${matches_col} = $2,
             ${win_col} = $3,
             ${loss_col} = $4,
             ${win_rate_col} = $5,
             ${streak_col} = $6,
             ${max_streak_col} = $7
         WHERE id = $8::uuid`,
        [newElo, newTotal, newWin, newLoss, newWinRate, newStreak, newMaxStreak, id]
      );
    };

    // Thực hiện cập nhật cho các người chơi
    await updateUserStats(player1_id, p1, elo1New, team1Won);
    await updateUserStats(player2_id, p2, elo2New, team2Won);

    if (player1_partner_id && p1_p) {
      await updateUserStats(player1_partner_id, p1_p, elo1_partnerNew, team1Won);
    }
    if (player2_partner_id && p2_p) {
      await updateUserStats(player2_partner_id, p2_p, elo2_partnerNew, team2Won);
    }

    // Lưu trận đấu vào DB
    const matchResult = await db.query(
      `INSERT INTO matches (
        player1_id, player2_id, player1_partner_id, player2_partner_id, winner_id, 
        score_p1, score_p2, p1_elo_before, p2_elo_before, p1_elo_after, p2_elo_after, elo_exchanged
      ) 
       VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid, $5::uuid, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
      [
        player1_id, player2_id, player1_partner_id || null, player2_partner_id || null, winner_id,
        score_p1, score_p2, elo1, elo2, elo1New, elo2New, eloExchanged
      ]
    );

    await db.query('COMMIT');
    res.status(201).json(matchResult.rows[0]);
  } catch (error) {
    await db.query('ROLLBACK');
    console.error('Error inserting match:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
