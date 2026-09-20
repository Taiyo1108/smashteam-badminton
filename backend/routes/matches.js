const express = require('express');
const router = express.Router();
const db = require('../db');
const { calculateElo } = require('../utils/elo');
const { authenticateToken, isAdmin } = require('../middleware/auth');
const { addXpToUser, updateQuestProgress } = require('../utils/gamification');
const {
  simulateRecalculation,
  applyRecalculation,
  getMatchAuditLogs
} = require('../services/matchRecalculationService');

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
      const peak_col = isDoubles ? 'peak_elo_doubles' : 'peak_elo_singles';
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
             ${peak_col} = GREATEST(COALESCE(${peak_col}, 1000), $1),
             ${matches_col} = $2,
             ${win_col} = $3,
             ${loss_col} = $4,
             ${win_rate_col} = $5,
             ${streak_col} = $6,
             ${max_streak_col} = $7
         WHERE id = $8::uuid`,
        [newElo, newTotal, newWin, newLoss, newWinRate, newStreak, newMaxStreak, id]
      );

      // Award 15 XP for match and progress quest
      await addXpToUser(id, 15, db);
      await updateQuestProgress(id, 'play_matches', 1, db);
      if (won) {
        await updateQuestProgress(id, 'win_matches', 1, db);
      }
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
        score_p1, score_p2, p1_elo_before, p2_elo_before, p1_elo_after, p2_elo_after, 
        p1_partner_elo_before, p2_partner_elo_before, p1_partner_elo_after, p2_partner_elo_after,
        elo_exchanged
      ) 
       VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid, $5::uuid, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16) RETURNING *`,
      [
        player1_id, player2_id, player1_partner_id || null, player2_partner_id || null, winner_id,
        score_p1, score_p2, elo1, elo2, elo1New, elo2New,
        elo1_p, elo2_p, elo1_partnerNew, elo2_partnerNew,
        eloExchanged
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

// GET /api/matches/session-players - Lấy danh sách tuyển thủ khả dụng theo Buổi tập (hoặc toàn bộ CLB)
router.get('/session-players', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { session_id, use_all } = req.query;

    let players = [];
    if (session_id && use_all !== 'true') {
      const attendeesRes = await db.query(
        `SELECT 
          u.id, u.full_name, u.nickname, u.phone_zalo, u.avatar_url, 
          u.badminton_level, u.role,
          u.elo_singles, u.elo_doubles,
          u.matches_singles, u.matches_doubles,
          u.win_rate_singles, u.win_rate_doubles,
          u.streak_singles, u.streak_doubles,
          COALESCE(a.checked_in_at, a.created_at) AS checked_in_at
         FROM attendances a
         JOIN users u ON a.user_id = u.id
         WHERE a.session_id = $1 AND a.status IN ('going', 'CHECKED_IN') 
           AND u.status = 'active' AND (u.is_blocked IS FALSE OR u.is_blocked IS NULL)
         ORDER BY u.full_name ASC`,
        [session_id]
      );
      players = attendeesRes.rows;
    }

    // Nếu không có session_id hoặc session chưa có ai check-in hoặc use_all=true, fallback lấy toàn bộ active members
    if (players.length === 0) {
      const allMembersRes = await db.query(
        `SELECT 
          id, full_name, nickname, phone_zalo, avatar_url, 
          badminton_level, role,
          elo_singles, elo_doubles,
          matches_singles, matches_doubles,
          win_rate_singles, win_rate_doubles,
          streak_singles, streak_doubles,
          NULL AS checked_in_at
         FROM users
         WHERE status = 'active' AND (is_blocked IS FALSE OR is_blocked IS NULL)
         ORDER BY full_name ASC`
      );
      players = allMembersRes.rows;
    }

    res.json(players);
  } catch (error) {
    console.error('Error fetching session players:', error);
    res.status(500).json({ error: 'Lỗi nạp danh sách tuyển thủ.' });
  }
});

// POST /api/matches/preview - Mô phỏng tính toán ELO thời gian thực (Zero Mutation, Read-only)
router.post('/preview', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { mode = 'doubles', player1_id, player2_id, player1_partner_id, player2_partner_id, score_p1, score_p2, winner_id } = req.body;

    if (!player1_id || !player2_id) {
      return res.status(400).json({ error: 'Cần chọn ít nhất 2 tuyển thủ chính.' });
    }

    const isDoubles = mode === 'doubles' && !!(player1_partner_id && player2_partner_id);

    const activeIds = [player1_id, player2_id];
    if (isDoubles) {
      activeIds.push(player1_partner_id, player2_partner_id);
    }

    if (new Set(activeIds).size !== activeIds.length) {
      return res.status(400).json({ error: 'Các tuyển thủ trong trận không được trùng lặp.' });
    }

    const pRes = await db.query(
      `SELECT id, full_name, elo_singles, elo_doubles, matches_singles, matches_doubles, streak_singles, streak_doubles
       FROM users WHERE id = ANY($1::uuid[])`,
      [activeIds]
    );

    const pMap = {};
    pRes.rows.forEach(r => { pMap[r.id] = r; });

    const p1 = pMap[player1_id];
    const p2 = pMap[player2_id];
    const p1_p = isDoubles ? pMap[player1_partner_id] : null;
    const p2_p = isDoubles ? pMap[player2_partner_id] : null;

    if (!p1 || !p2 || (isDoubles && (!p1_p || !p2_p))) {
      return res.status(404).json({ error: 'Không tìm thấy một số tuyển thủ trong cơ sở dữ liệu.' });
    }

    const elo1 = isDoubles ? p1.elo_doubles : p1.elo_singles;
    const elo2 = isDoubles ? p2.elo_doubles : p2.elo_singles;
    const matches1 = isDoubles ? p1.matches_doubles : p1.matches_singles;
    const matches2 = isDoubles ? p2.matches_doubles : p2.matches_singles;
    const streak1 = isDoubles ? p1.streak_doubles : p1.streak_singles;
    const streak2 = isDoubles ? p2.streak_doubles : p2.streak_singles;

    const elo1_p = isDoubles ? p1_p.elo_doubles : null;
    const elo2_p = isDoubles ? p2_p.elo_doubles : null;
    const matches1_p = isDoubles ? p1_p.matches_doubles : 0;
    const matches2_p = isDoubles ? p2_p.matches_doubles : 0;
    const streak1_p = isDoubles ? p1_p.streak_doubles : 0;
    const streak2_p = isDoubles ? p2_p.streak_doubles : 0;

    const actualWinnerId = winner_id || player1_id;

    const eloResult = calculateElo(
      elo1, elo2, player1_id, player2_id, actualWinnerId,
      streak1, streak2, matches1, matches2,
      elo1_p, elo2_p,
      streak1_p, streak2_p,
      matches1_p, matches2_p,
      player1_partner_id,
      player2_partner_id
    );

    const team1Elo = elo1_p !== null ? Math.round((elo1 + elo1_p) / 2) : elo1;
    const team2Elo = elo2_p !== null ? Math.round((elo2 + elo2_p) / 2) : elo2;
    const exp1 = 1 / (1 + Math.pow(10, (team2Elo - team1Elo) / 400));
    const exp2 = 1 - exp1;

    res.json({
      isValid: true,
      mode: isDoubles ? 'doubles' : 'singles',
      team1: {
        elo: team1Elo,
        winProb: Math.round(exp1 * 100)
      },
      team2: {
        elo: team2Elo,
        winProb: Math.round(exp2 * 100)
      },
      p1: { before: elo1, after: eloResult.elo1New, diff: eloResult.elo1New - elo1 },
      p1_partner: isDoubles ? { before: elo1_p, after: eloResult.elo1_partnerNew, diff: eloResult.elo1_partnerNew - elo1_p } : null,
      p2: { before: elo2, after: eloResult.elo2New, diff: eloResult.elo2New - elo2 },
      p2_partner: isDoubles ? { before: elo2_p, after: eloResult.elo2_partnerNew, diff: eloResult.elo2_partnerNew - elo2_p } : null,
      eloExchanged: eloResult.eloExchanged
    });
  } catch (error) {
    console.error('Error previewing match ELO:', error);
    res.status(500).json({ error: 'Lỗi tính toán mô phỏng ELO.' });
  }
});

// POST /api/matches/suggestions - Gợi ý đối thủ cân bằng ELO cho Match Desk
router.post('/suggestions', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { session_id, mode = 'doubles', team1_player_ids = [], excluded_player_ids = [] } = req.body;

    if (!Array.isArray(team1_player_ids) || team1_player_ids.length === 0) {
      return res.status(400).json({ error: 'Vui lòng chọn ít nhất 1 tuyển thủ ở Đội A để nhận gợi ý đối thủ.' });
    }

    const t1Res = await db.query(
      `SELECT id, full_name, nickname, avatar_url, elo_singles, elo_doubles, matches_singles, matches_doubles, win_rate_singles, win_rate_doubles, streak_singles, streak_doubles
       FROM users WHERE id = ANY($1::uuid[])`,
      [team1_player_ids]
    );

    if (t1Res.rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy tuyển thủ Đội A.' });
    }

    const player1 = t1Res.rows.find(p => p.id === team1_player_ids[0]);
    const partner1 = team1_player_ids[1] ? t1Res.rows.find(p => p.id === team1_player_ids[1]) : null;

    let candidateRows = [];
    if (session_id) {
      const sessionAttRes = await db.query(
        `SELECT u.id, u.full_name, u.nickname, u.avatar_url, u.badminton_level,
                u.elo_singles, u.elo_doubles, u.matches_singles, u.matches_doubles,
                u.win_rate_singles, u.win_rate_doubles, u.streak_singles, u.streak_doubles
         FROM attendances a
         JOIN users u ON a.user_id = u.id
         WHERE a.session_id = $1 AND a.status IN ('going', 'CHECKED_IN') AND u.status = 'active'
         ORDER BY u.full_name ASC`,
        [session_id]
      );
      candidateRows = sessionAttRes.rows;
    }

    if (candidateRows.length === 0) {
      const allActiveRes = await db.query(
        `SELECT id, full_name, nickname, avatar_url, badminton_level,
                elo_singles, elo_doubles, matches_singles, matches_doubles,
                win_rate_singles, win_rate_doubles, streak_singles, streak_doubles
         FROM users
         WHERE status = 'active' AND (is_blocked IS FALSE OR is_blocked IS NULL)
         ORDER BY full_name ASC`
      );
      candidateRows = allActiveRes.rows;
    }

    const allExcluded = new Set([...team1_player_ids, ...(excluded_player_ids || [])]);
    const availablePool = candidateRows.filter(p => !allExcluded.has(p.id));

    const { suggestSinglesOpponents, suggestDoublesOpponents, suggestDoublesPartners } = require('../services/matchmakerService');

    let suggestions = [];
    if (mode === 'singles') {
      suggestions = suggestSinglesOpponents(player1, availablePool);
    } else {
      if (partner1) {
        suggestions = suggestDoublesOpponents(player1, partner1, availablePool);
      } else {
        suggestions = suggestDoublesPartners(player1, availablePool);
      }
    }

    res.json({
      success: true,
      mode,
      team1: partner1 ? [player1, partner1] : [player1],
      suggestions
    });
  } catch (error) {
    console.error('Error in matchmaker suggestions:', error);
    res.status(500).json({ error: 'Lỗi thuật toán ghép trận thông minh.' });
  }
});

// POST /api/matches/batch - Ghi nhận đồng loạt nhiều trận đấu trong 1 Database Transaction nguyên tử (All-or-Nothing)
router.post('/batch', authenticateToken, isAdmin, async (req, res) => {
  const { session_id, matches } = req.body;

  if (!Array.isArray(matches) || matches.length === 0) {
    return res.status(400).json({ error: 'Danh sách trận đấu trống.' });
  }

  if (matches.length > 10) {
    return res.status(400).json({ error: 'Mỗi lượt batch tối đa 10 trận đấu.' });
  }

  // 1. Kiểm tra validation cấu trúc từng trận và Quy tắc bắt buộc: ONE PLAYER = ONE MATCH PER BATCH
  const allBatchPlayerIds = [];
  for (let idx = 0; idx < matches.length; idx++) {
    const m = matches[idx];
    const courtLabel = m.court_id || `Sân ${idx + 1}`;

    if (!m.player1_id || !m.player2_id || m.score_p1 === undefined || m.score_p2 === undefined || !m.winner_id) {
      return res.status(400).json({ 
        error: `Trận đấu tại ${courtLabel} bị thiếu thông tin người chơi, điểm số hoặc đội thắng.` 
      });
    }

    const s1 = Number(m.score_p1);
    const s2 = Number(m.score_p2);
    if (isNaN(s1) || isNaN(s2) || s1 < 0 || s2 < 0 || (s1 === 0 && s2 === 0)) {
      return res.status(400).json({ 
        error: `Điểm số tại ${courtLabel} không hợp lệ (Điểm: ${m.score_p1} - ${m.score_p2}).` 
      });
    }

    const isDoubles = !!(m.player1_partner_id && m.player2_partner_id);
    const matchPlayers = [m.player1_id, m.player2_id];
    if (m.player1_partner_id) matchPlayers.push(m.player1_partner_id);
    if (m.player2_partner_id) matchPlayers.push(m.player2_partner_id);

    // Không được self-match trong cùng 1 trận
    if (new Set(matchPlayers).size !== matchPlayers.length) {
      return res.status(400).json({ 
        error: `Tại ${courtLabel}, có tuyển thủ bị chọn trùng lặp ở cả 2 bên.` 
      });
    }

    // Đảm bảo winner_id là một trong các player tham gia
    if (!matchPlayers.includes(m.winner_id)) {
      return res.status(400).json({ 
        error: `Tại ${courtLabel}, đội thắng không thuộc danh sách tuyển thủ thi đấu.` 
      });
    }

    allBatchPlayerIds.push(...matchPlayers);
  }

  // Kiểm tra vi phạm: ONE PLAYER = ONE MATCH PER BATCH
  const seenPlayerIds = new Set();
  for (const pId of allBatchPlayerIds) {
    if (seenPlayerIds.has(pId)) {
      return res.status(400).json({
        error: `Vi phạm nguyên tắc Batch: Một tuyển thủ không được thi đấu ở nhiều sân trong cùng một lượt commit! Hãy commit từng trận hoặc tách người chơi.`
      });
    }
    seenPlayerIds.add(pId);
  }

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    // 2. Pessimistic Row Locking: Khóa dòng toàn bộ tuyển thủ trong batch theo thứ tự ID (tránh deadlock)
    const sortedUniqueIds = Array.from(seenPlayerIds).sort();
    const lockedUsersRes = await client.query(
      `SELECT id, full_name, elo_singles, elo_doubles, 
              matches_singles, matches_doubles,
              win_singles, loss_singles,
              win_doubles, loss_doubles,
              streak_singles, max_streak_singles,
              streak_doubles, max_streak_doubles
       FROM users WHERE id = ANY($1::uuid[]) FOR UPDATE`,
      [sortedUniqueIds]
    );

    if (lockedUsersRes.rows.length !== sortedUniqueIds.length) {
      throw new Error('Một số tuyển thủ trong batch không tồn tại trong hệ thống.');
    }

    const playersMap = {};
    lockedUsersRes.rows.forEach(u => { playersMap[u.id] = u; });

    // Helper cập nhật thống kê người chơi (sử dụng PostgreSQL client trong transaction)
    const updateUserStats = async (id, currentStats, newElo, won, isDoubles) => {
      const matches_col = isDoubles ? 'matches_doubles' : 'matches_singles';
      const elo_col = isDoubles ? 'elo_doubles' : 'elo_singles';
      const peak_col = isDoubles ? 'peak_elo_doubles' : 'peak_elo_singles';
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

      await client.query(
        `UPDATE users 
         SET ${elo_col} = $1, 
             ${peak_col} = GREATEST(COALESCE(${peak_col}, 1000), $1),
             ${matches_col} = $2,
             ${win_col} = $3,
             ${loss_col} = $4,
             ${win_rate_col} = $5,
             ${streak_col} = $6,
             ${max_streak_col} = $7
         WHERE id = $8::uuid`,
        [newElo, newTotal, newWin, newLoss, newWinRate, newStreak, newMaxStreak, id]
      );

      // Thưởng XP và Quest đồng bộ trong transaction
      await addXpToUser(id, 15, client);
      await updateQuestProgress(id, 'play_matches', 1, client);
      if (won) {
        await updateQuestProgress(id, 'win_matches', 1, client);
      }
    };

    const committedMatches = [];
    const updatedPlayers = [];

    // 3. Xử lý tuần tự từng trận trong batch
    for (let idx = 0; idx < matches.length; idx++) {
      const m = matches[idx];
      const isDoubles = !!(m.player1_partner_id && m.player2_partner_id);

      const p1 = playersMap[m.player1_id];
      const p2 = playersMap[m.player2_id];
      const p1_p = isDoubles ? playersMap[m.player1_partner_id] : null;
      const p2_p = isDoubles ? playersMap[m.player2_partner_id] : null;

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

      const eloResult = calculateElo(
        elo1, elo2, m.player1_id, m.player2_id, m.winner_id,
        streak1, streak2, matches1, matches2,
        elo1_p, elo2_p,
        streak1_p, streak2_p,
        matches1_p, matches2_p,
        m.player1_partner_id,
        m.player2_partner_id
      );

      const team1Won = m.winner_id === m.player1_id || (m.player1_partner_id && m.winner_id === m.player1_partner_id);
      const team2Won = !team1Won;

      await updateUserStats(m.player1_id, p1, eloResult.elo1New, team1Won, isDoubles);
      await updateUserStats(m.player2_id, p2, eloResult.elo2New, team2Won, isDoubles);

      updatedPlayers.push(
        { id: m.player1_id, eloBefore: elo1, eloAfter: eloResult.elo1New, diff: eloResult.elo1New - elo1 },
        { id: m.player2_id, eloBefore: elo2, eloAfter: eloResult.elo2New, diff: eloResult.elo2New - elo2 }
      );

      if (isDoubles && m.player1_partner_id && p1_p) {
        await updateUserStats(m.player1_partner_id, p1_p, eloResult.elo1_partnerNew, team1Won, isDoubles);
        updatedPlayers.push({ id: m.player1_partner_id, eloBefore: elo1_p, eloAfter: eloResult.elo1_partnerNew, diff: eloResult.elo1_partnerNew - elo1_p });
      }
      if (isDoubles && m.player2_partner_id && p2_p) {
        await updateUserStats(m.player2_partner_id, p2_p, eloResult.elo2_partnerNew, team2Won, isDoubles);
        updatedPlayers.push({ id: m.player2_partner_id, eloBefore: elo2_p, eloAfter: eloResult.elo2_partnerNew, diff: eloResult.elo2_partnerNew - elo2_p });
      }

      // INSERT vào matches
      const insertMatchRes = await client.query(
        `INSERT INTO matches (
          player1_id, player2_id, player1_partner_id, player2_partner_id, winner_id, 
          score_p1, score_p2, p1_elo_before, p2_elo_before, p1_elo_after, p2_elo_after, 
          p1_partner_elo_before, p2_partner_elo_before, p1_partner_elo_after, p2_partner_elo_after,
          elo_exchanged
        ) 
         VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid, $5::uuid, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16) RETURNING *`,
        [
          m.player1_id, m.player2_id, m.player1_partner_id || null, m.player2_partner_id || null, m.winner_id,
          m.score_p1, m.score_p2, elo1, elo2, eloResult.elo1New, eloResult.elo2New,
          elo1_p, elo2_p, eloResult.elo1_partnerNew, eloResult.elo2_partnerNew,
          eloResult.eloExchanged
        ]
      );

      committedMatches.push({
        court_id: m.court_id || `Sân ${idx + 1}`,
        match: insertMatchRes.rows[0]
      });
    }

    await client.query('COMMIT');

    const crypto = require('crypto');
    const batchId = 'batch_' + crypto.randomBytes(6).toString('hex');

    res.status(201).json({
      success: true,
      batchId,
      committedMatches,
      updatedPlayers,
      summary: {
        matchesCount: committedMatches.length,
        playersCount: updatedPlayers.length
      },
      message: `Đã commit thành công ${committedMatches.length} trận đấu.`
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error in batch matches commit:', error);
    res.status(400).json({ 
      success: false,
      error: `Batch thất bại: ${error.message || 'Lỗi xử lý transaction'}. Toàn bộ batch đã bị hủy, không có trận nào được ghi nhận.` 
    });
  } finally {
    client.release();
  }
});

// GET /api/matches/history - Lấy danh sách lịch sử trận đấu có phân trang, lọc theo thể thức và tìm kiếm
router.get('/history', authenticateToken, isAdmin, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 15));
    const offset = (page - 1) * limit;
    const { mode = 'all', status = 'all', search = '' } = req.query;

    let whereClauses = [];
    let params = [];
    let paramIdx = 1;

    // Lọc thể thức (Đơn / Đôi)
    if (mode === 'doubles') {
      whereClauses.push(`m.player1_partner_id IS NOT NULL AND m.player2_partner_id IS NOT NULL`);
    } else if (mode === 'singles') {
      whereClauses.push(`m.player1_partner_id IS NULL AND m.player2_partner_id IS NULL`);
    }

    // Lọc trạng thái (approved / voided)
    if (status === 'approved') {
      whereClauses.push(`m.status = 'approved'`);
    } else if (status === 'voided') {
      whereClauses.push(`m.status = 'voided'`);
    }

    // Tìm kiếm theo tên hoặc SĐT của người chơi
    if (search && search.trim()) {
      const q = `%${search.trim().toLowerCase()}%`;
      params.push(q);
      whereClauses.push(`(
        LOWER(u1.full_name) LIKE $${paramIdx} OR LOWER(COALESCE(u1.nickname, '')) LIKE $${paramIdx} OR COALESCE(u1.phone_zalo, '') LIKE $${paramIdx} OR
        LOWER(u2.full_name) LIKE $${paramIdx} OR LOWER(COALESCE(u2.nickname, '')) LIKE $${paramIdx} OR COALESCE(u2.phone_zalo, '') LIKE $${paramIdx} OR
        LOWER(COALESCE(up1.full_name, '')) LIKE $${paramIdx} OR LOWER(COALESCE(up2.full_name, '')) LIKE $${paramIdx}
      )`);
      paramIdx++;
    }

    const whereStr = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Đếm tổng số trận thỏa mãn điều kiện
    const countQuery = `
      SELECT count(*) as total
      FROM matches m
      JOIN users u1 ON m.player1_id = u1.id
      JOIN users u2 ON m.player2_id = u2.id
      LEFT JOIN users up1 ON m.player1_partner_id = up1.id
      LEFT JOIN users up2 ON m.player2_partner_id = up2.id
      JOIN users w ON m.winner_id = w.id
      ${whereStr};
    `;
    const countRes = await db.query(countQuery, params);
    const total = parseInt(countRes.rows[0].total, 10);
    const totalPages = Math.ceil(total / limit) || 1;

    // Lấy danh sách trận đấu trang hiện tại
    params.push(limit, offset);
    const dataQuery = `
      SELECT m.id, m.score_p1, m.score_p2, m.elo_exchanged, m.created_at, m.status,
             m.p1_elo_before, m.p2_elo_before, m.p1_elo_after, m.p2_elo_after,
             m.p1_partner_elo_before, m.p2_partner_elo_before, m.p1_partner_elo_after, m.p2_partner_elo_after,
             m.player1_id, m.player2_id, m.player1_partner_id, m.player2_partner_id, m.winner_id,
             u1.full_name as player1_name, u1.nickname as player1_nickname, u1.avatar_url as player1_avatar,
             u2.full_name as player2_name, u2.nickname as player2_nickname, u2.avatar_url as player2_avatar,
             up1.full_name as player1_partner_name, up1.nickname as player1_partner_nickname, up1.avatar_url as player1_partner_avatar,
             up2.full_name as player2_partner_name, up2.nickname as player2_partner_nickname, up2.avatar_url as player2_partner_avatar,
             w.full_name as winner_name
      FROM matches m
      JOIN users u1 ON m.player1_id = u1.id
      JOIN users u2 ON m.player2_id = u2.id
      LEFT JOIN users up1 ON m.player1_partner_id = up1.id
      LEFT JOIN users up2 ON m.player2_partner_id = up2.id
      JOIN users w ON m.winner_id = w.id
      ${whereStr}
      ORDER BY m.created_at DESC, m.id DESC
      LIMIT $${paramIdx} OFFSET $${paramIdx + 1};
    `;
    const dataRes = await db.query(dataQuery, params);

    res.json({
      matches: dataRes.rows,
      total,
      page,
      limit,
      totalPages
    });
  } catch (error) {
    console.error('Error fetching matches history:', error);
    res.status(500).json({ error: 'Lỗi nạp lịch sử trận đấu.' });
  }
});

// GET /api/matches/:id - Lấy chi tiết 1 trận đấu kèm logs
router.get('/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const matchRes = await db.query(
      `SELECT m.*, 
              u1.full_name as player1_name, u1.nickname as player1_nickname,
              u2.full_name as player2_name, u2.nickname as player2_nickname,
              up1.full_name as player1_partner_name, up1.nickname as player1_partner_nickname,
              up2.full_name as player2_partner_name, up2.nickname as player2_partner_nickname,
              w.full_name as winner_name
       FROM matches m
       JOIN users u1 ON m.player1_id = u1.id
       JOIN users u2 ON m.player2_id = u2.id
       LEFT JOIN users up1 ON m.player1_partner_id = up1.id
       LEFT JOIN users up2 ON m.player2_partner_id = up2.id
       JOIN users w ON m.winner_id = w.id
       WHERE m.id = $1::uuid;`,
      [id]
    );

    if (matchRes.rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy trận đấu này.' });
    }

    const auditLogs = await getMatchAuditLogs(id);

    res.json({
      match: matchRes.rows[0],
      auditLogs
    });
  } catch (error) {
    console.error('Error fetching match details:', error);
    res.status(500).json({ error: 'Lỗi tải thông tin chi tiết trận đấu.' });
  }
});

// POST /api/matches/:id/preview-edit - Xem trước tác động tính lại ELO (Zero Mutation, Read-Only)
router.post('/:id/preview-edit', authenticateToken, isAdmin, async (req, res) => {
  const client = await db.connect();
  try {
    const { id } = req.params;
    const {
      player1_id,
      player2_id,
      player1_partner_id,
      player2_partner_id,
      score_p1,
      score_p2,
      winner_id,
      is_void = false
    } = req.body;

    const newMatchData = !is_void ? {
      player1_id,
      player2_id,
      player1_partner_id: player1_partner_id || null,
      player2_partner_id: player2_partner_id || null,
      score_p1: parseInt(score_p1, 10),
      score_p2: parseInt(score_p2, 10),
      winner_id
    } : null;

    if (!is_void) {
      if (!player1_id || !player2_id || isNaN(newMatchData.score_p1) || isNaN(newMatchData.score_p2) || !winner_id) {
        return res.status(400).json({ error: 'Vui lòng điền đầy đủ tuyển thủ, tỉ số và đội thắng.' });
      }
    }

    const preview = await simulateRecalculation(client, {
      matchId: id,
      newMatchData,
      isVoid: is_void
    });

    // Tạo checksum token để phòng chống xung đột concurrency
    const currentMatch = preview.targetMatch;
    const checksum = `${currentMatch.p1_elo_after}_${currentMatch.score_p1}_${currentMatch.score_p2}_${currentMatch.status}`;

    res.json({
      ...preview,
      checksum
    });
  } catch (error) {
    console.error('Error simulating match edit:', error);
    res.status(400).json({ error: error.message || 'Lỗi tính toán xem trước tác động.' });
  } finally {
    client.release();
  }
});

// PUT /api/matches/:id - Xác nhận cập nhật trận và tự động recalculate ELO
router.put('/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      player1_id,
      player2_id,
      player1_partner_id,
      player2_partner_id,
      score_p1,
      score_p2,
      winner_id,
      reason,
      checksum
    } = req.body;

    if (!reason || !reason.trim()) {
      return res.status(400).json({ error: 'Vui lòng nhập lý do chỉnh sửa trận đấu.' });
    }

    const newMatchData = {
      player1_id,
      player2_id,
      player1_partner_id: player1_partner_id || null,
      player2_partner_id: player2_partner_id || null,
      score_p1: parseInt(score_p1, 10),
      score_p2: parseInt(score_p2, 10),
      winner_id
    };

    const result = await applyRecalculation({
      matchId: id,
      newMatchData,
      isVoid: false,
      reason: reason.trim(),
      adminUserId: req.user.id,
      expectedChecksum: checksum
    });

    res.json(result);
  } catch (error) {
    if (error.code === 'CONCURRENCY_CONFLICT') {
      return res.status(409).json({ error: error.message });
    }
    console.error('Error updating match:', error);
    res.status(400).json({ error: error.message || 'Cập nhật trận đấu thất bại. Dữ liệu chưa bị thay đổi.' });
  }
});

// POST /api/matches/:id/void - Xác nhận hủy trận (Void) và tự động recalculate ELO
router.post('/:id/void', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, checksum } = req.body;

    if (!reason || !reason.trim()) {
      return res.status(400).json({ error: 'Vui lòng nhập lý do hủy trận đấu.' });
    }

    const result = await applyRecalculation({
      matchId: id,
      newMatchData: null,
      isVoid: true,
      reason: reason.trim(),
      adminUserId: req.user.id,
      expectedChecksum: checksum
    });

    res.json(result);
  } catch (error) {
    if (error.code === 'CONCURRENCY_CONFLICT') {
      return res.status(409).json({ error: error.message });
    }
    console.error('Error voiding match:', error);
    res.status(400).json({ error: error.message || 'Hủy trận đấu thất bại. Dữ liệu chưa bị thay đổi.' });
  }
});

// GET /api/matches/:id/audit-logs - Lấy lịch sử chỉnh sửa / hủy trận đấu
router.get('/:id/audit-logs', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const logs = await getMatchAuditLogs(id);
    res.json(logs);
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ error: 'Lỗi tải nhật ký chỉnh sửa.' });
  }
});

module.exports = router;

