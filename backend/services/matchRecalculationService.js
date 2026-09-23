const db = require('../db');
const { calculateElo } = require('../utils/elo');

/**
 * Helper lấy ELO khởi điểm mặc định theo cấp độ kỹ năng (badminton_level)
 */
function getPlayerInitialElo(level) {
  if (level === 'Mới chơi') return 900;
  if (level === 'Khá/Giỏi') return 1150;
  return 1000;
}

/**
 * Xác định chính xác Baseline ELO và thống kê của một người chơi NGAY TRƯỚC một trận đấu Match X.
 * 
 * NGUYÊN TẮC:
 * 1. Tìm tất cả các trận đấu hợp lệ (status = 'approved') của player theo thể thức (Đơn/Đôi)
 *    diễn ra TRƯỚC Match X (theo thứ tự created_at < targetMatch.created_at OR (created_at = targetMatch.created_at AND id < targetMatch.id)).
 * 2. Nếu đã có trận trước:
 *    - ELO baseline = elo_after của trận đấu gần nhất trước đó.
 *    - Thống kê (matches, wins, losses, streak, maxStreak, peak) = tích lũy từ các trận trước đó.
 * 3. Nếu chưa có trận nào trước Match X:
 *    - ELO baseline = Initial ELO theo badminton_level (900 / 1000 / 1150).
 *    - matches = 0, wins = 0, losses = 0, streak = 0, maxStreak = 0, peak = ELO baseline.
 */
async function resolvePlayerBaselineBeforeMatch(client, playerId, isDoubles, targetMatch) {
  const userRes = await client.query(
    `SELECT id, full_name, badminton_level, elo_singles, elo_doubles, 
            peak_elo_singles, peak_elo_doubles,
            matches_singles, matches_doubles,
            win_singles, loss_singles, win_doubles, loss_doubles,
            streak_singles, streak_doubles, max_streak_singles, max_streak_doubles
     FROM users WHERE id = $1::uuid;`,
    [playerId]
  );
  if (userRes.rows.length === 0) {
    throw new Error(`Tuyển thủ với ID ${playerId} không tồn tại.`);
  }
  const user = userRes.rows[0];
  const initialElo = getPlayerInitialElo(user.badminton_level);

  // Lấy các trận đấu trước Match X theo thứ tự thời gian
  const priorMatchesRes = await client.query(
    `SELECT id, created_at, player1_id, player2_id, player1_partner_id, player2_partner_id,
            winner_id, score_p1, score_p2,
            p1_elo_before, p1_elo_after, p2_elo_before, p2_elo_after,
            p1_partner_elo_before, p1_partner_elo_after, p2_partner_elo_before, p2_partner_elo_after
     FROM matches
     WHERE status = 'approved'
       AND (player1_id = $1::uuid OR player2_id = $1::uuid OR player1_partner_id = $1::uuid OR player2_partner_id = $1::uuid)
       AND (player1_partner_id IS NOT NULL AND player2_partner_id IS NOT NULL) = $2
       AND (created_at < $3 OR (created_at = $3 AND id < $4::uuid))
     ORDER BY created_at ASC, id ASC;`,
    [playerId, isDoubles, targetMatch.created_at, targetMatch.id]
  );

  const priorMatches = priorMatchesRes.rows;

  let currentElo = initialElo;
  let matchesCount = 0;
  let winsCount = 0;
  let lossesCount = 0;
  let currentStreak = 0;
  let maxStreak = 0;
  let peakElo = initialElo;

  for (const m of priorMatches) {
    matchesCount++;
    const isTeam1 = (m.player1_id === playerId || m.player1_partner_id === playerId);
    const won = isTeam1 
      ? (m.winner_id === m.player1_id || m.winner_id === m.player1_partner_id)
      : (m.winner_id === m.player2_id || m.winner_id === m.player2_partner_id);

    if (won) {
      winsCount++;
      currentStreak = currentStreak >= 0 ? currentStreak + 1 : 1;
    } else {
      lossesCount++;
      currentStreak = currentStreak <= 0 ? currentStreak - 1 : -1;
    }
    if (currentStreak > 0) maxStreak = Math.max(maxStreak, currentStreak);

    // Lấy elo_after của player trong trận này
    let playerEloAfter = currentElo;
    if (m.player1_id === playerId) playerEloAfter = m.p1_elo_after;
    else if (m.player2_id === playerId) playerEloAfter = m.p2_elo_after;
    else if (m.player1_partner_id === playerId) {
      playerEloAfter = m.p1_partner_elo_after !== null ? m.p1_partner_elo_after : (m.p1_partner_elo_before + (m.p1_elo_after - m.p1_elo_before));
    } else if (m.player2_partner_id === playerId) {
      playerEloAfter = m.p2_partner_elo_after !== null ? m.p2_partner_elo_after : (m.p2_partner_elo_before + (m.p2_elo_after - m.p2_elo_before));
    }

    currentElo = playerEloAfter;
    peakElo = Math.max(peakElo, currentElo);
  }

  return {
    id: user.id,
    full_name: user.full_name,
    badminton_level: user.badminton_level,
    initialElo,
    elo: currentElo,
    matches: matchesCount,
    wins: winsCount,
    losses: lossesCount,
    streak: currentStreak,
    maxStreak,
    peakElo
  };
}

/**
 * Mô phỏng tính toán lại chuỗi ELO thời gian thực (Zero Mutation, Read-Only Preview)
 */
async function simulateRecalculation(client, { matchId, newMatchData = null, isVoid = false }) {
  // 1. Lấy thông tin trận đấu Match X cần sửa/hủy
  const targetRes = await client.query(
    `SELECT m.*, 
            u1.full_name as player1_name, u2.full_name as player2_name,
            up1.full_name as player1_partner_name, up2.full_name as player2_partner_name,
            w.full_name as winner_name
     FROM matches m
     JOIN users u1 ON m.player1_id = u1.id
     JOIN users u2 ON m.player2_id = u2.id
     LEFT JOIN users up1 ON m.player1_partner_id = up1.id
     LEFT JOIN users up2 ON m.player2_partner_id = up2.id
     JOIN users w ON m.winner_id = w.id
     WHERE m.id = $1::uuid;`,
    [matchId]
  );

  if (targetRes.rows.length === 0) {
    throw new Error(`Trận đấu với ID ${matchId} không tồn tại.`);
  }

  const targetMatch = targetRes.rows[0];
  const isDoubles = newMatchData 
    ? !!(newMatchData.player1_partner_id && newMatchData.player2_partner_id)
    : !!(targetMatch.player1_partner_id && targetMatch.player2_partner_id);

  // 2. Thu thập danh sách tất cả các trận cùng thể thức từ Match X trở đi
  const subsequentMatchesRes = await client.query(
    `SELECT m.*,
            u1.full_name as player1_name, u2.full_name as player2_name,
            up1.full_name as player1_partner_name, up2.full_name as player2_partner_name
     FROM matches m
     JOIN users u1 ON m.player1_id = u1.id
     JOIN users u2 ON m.player2_id = u2.id
     LEFT JOIN users up1 ON m.player1_partner_id = up1.id
     LEFT JOIN users up2 ON m.player2_partner_id = up2.id
     WHERE (m.player1_partner_id IS NOT NULL AND m.player2_partner_id IS NOT NULL) = $1
       AND (m.created_at > $2 OR (m.created_at = $2 AND m.id >= $3::uuid))
     ORDER BY m.created_at ASC, m.id ASC;`,
    [isDoubles, targetMatch.created_at, targetMatch.id]
  );

  const timelineMatches = subsequentMatchesRes.rows;

  // 3. Khởi tạo playerStates cache
  const playerStates = {};

  const ensurePlayerState = async (pId) => {
    if (!pId) return null;
    if (!playerStates[pId]) {
      playerStates[pId] = await resolvePlayerBaselineBeforeMatch(client, pId, isDoubles, targetMatch);
    }
    return playerStates[pId];
  };

  // Nạp baseline cho các player có mặt trong Match X
  await ensurePlayerState(targetMatch.player1_id);
  await ensurePlayerState(targetMatch.player2_id);
  if (targetMatch.player1_partner_id) await ensurePlayerState(targetMatch.player1_partner_id);
  if (targetMatch.player2_partner_id) await ensurePlayerState(targetMatch.player2_partner_id);

  if (newMatchData) {
    await ensurePlayerState(newMatchData.player1_id);
    await ensurePlayerState(newMatchData.player2_id);
    if (newMatchData.player1_partner_id) await ensurePlayerState(newMatchData.player1_partner_id);
    if (newMatchData.player2_partner_id) await ensurePlayerState(newMatchData.player2_partner_id);
  }

  // Nạp baseline cho các player trong các trận sau đó
  for (const m of timelineMatches) {
    await ensurePlayerState(m.player1_id);
    await ensurePlayerState(m.player2_id);
    if (m.player1_partner_id) await ensurePlayerState(m.player1_partner_id);
    if (m.player2_partner_id) await ensurePlayerState(m.player2_partner_id);
  }

  // Chụp snapshot trạng thái trước khi recalculation
  const initialPlayerStatesSnapshot = {};
  for (const [pId, state] of Object.entries(playerStates)) {
    initialPlayerStatesSnapshot[pId] = { ...state };
  }

  const affectedMatches = [];
  let simulatedTargetMatchResult = null;

  // 4. Mô phỏng tuần tự theo thứ tự thời gian nghiêm ngặt
  for (const m of timelineMatches) {
    const isCurrentTarget = (m.id === targetMatch.id);

    // Kịch bản 1: Trận Match X bị VOID
    if (isCurrentTarget && isVoid) {
      simulatedTargetMatchResult = {
        ...m,
        status: 'voided',
        action: 'VOID'
      };
      // Khi VOID: Bỏ qua trận này, không cập nhật playerStates
      continue;
    }

    // Kịch bản 2: Bỏ qua các trận đã bị void trước đó trong DB
    if (!isCurrentTarget && m.status === 'voided') {
      continue;
    }

    // Xác định dữ liệu trận đấu (nếu là Match X được sửa thì dùng newMatchData, còn lại giữ nguyên cấu hình trận)
    const effectiveMatch = (isCurrentTarget && newMatchData) ? { ...m, ...newMatchData } : m;

    const p1_id = effectiveMatch.player1_id;
    const p2_id = effectiveMatch.player2_id;
    const p1p_id = isDoubles ? effectiveMatch.player1_partner_id : null;
    const p2p_id = isDoubles ? effectiveMatch.player2_partner_id : null;
    const winner_id = effectiveMatch.winner_id;

    const p1 = playerStates[p1_id];
    const p2 = playerStates[p2_id];
    const p1p = p1p_id ? playerStates[p1p_id] : null;
    const p2p = p2p_id ? playerStates[p2p_id] : null;

    const elo1_before = p1.elo;
    const elo2_before = p2.elo;
    const elo1p_before = p1p ? p1p.elo : null;
    const elo2p_before = p2p ? p2p.elo : null;

    const eloResult = calculateElo(
      elo1_before, elo2_before, p1_id, p2_id, winner_id,
      p1.streak, p2.streak, p1.matches, p2.matches,
      elo1p_before, elo2p_before,
      p1p ? p1p.streak : 0, p2p ? p2p.streak : 0,
      p1p ? p1p.matches : 0, p2p ? p2p.matches : 0,
      p1p_id, p2p_id
    );

    const team1Won = winner_id === p1_id || (p1p_id && winner_id === p1p_id);
    const team2Won = !team1Won;

    // Kiểm tra xem trận đấu này có bị biến động ELO trước/sau so với DB hiện tại không
    const isModified = (
      m.p1_elo_before !== elo1_before ||
      m.p2_elo_before !== elo2_before ||
      m.p1_elo_after !== eloResult.elo1New ||
      m.p2_elo_after !== eloResult.elo2New ||
      (isDoubles && m.p1_partner_elo_after !== eloResult.elo1_partnerNew) ||
      (isDoubles && m.p2_partner_elo_after !== eloResult.elo2_partnerNew) ||
      isCurrentTarget
    );

    const simulatedMatchObj = {
      id: m.id,
      created_at: m.created_at,
      isTarget: isCurrentTarget,
      player1_id: p1_id,
      player2_id: p2_id,
      player1_partner_id: p1p_id,
      player2_partner_id: p2p_id,
      player1_name: p1.full_name,
      player2_name: p2.full_name,
      player1_partner_name: p1p?.full_name,
      player2_partner_name: p2p?.full_name,
      score_p1: effectiveMatch.score_p1,
      score_p2: effectiveMatch.score_p2,
      winner_id,
      p1_elo_before: elo1_before,
      p2_elo_before: elo2_before,
      p1_partner_elo_before: elo1p_before,
      p2_partner_elo_before: elo2p_before,
      p1_elo_after: eloResult.elo1New,
      p2_elo_after: eloResult.elo2New,
      p1_partner_elo_after: eloResult.elo1_partnerNew,
      p2_partner_elo_after: eloResult.elo2_partnerNew,
      elo_exchanged: eloResult.eloExchanged,
      old_p1_elo_after: m.p1_elo_after,
      old_p2_elo_after: m.p2_elo_after,
      old_p1_partner_elo_after: m.p1_partner_elo_after,
      old_p2_partner_elo_after: m.p2_partner_elo_after,
      isModified
    };

    if (isCurrentTarget) {
      simulatedTargetMatchResult = simulatedMatchObj;
    } else if (isModified) {
      affectedMatches.push(simulatedMatchObj);
    }

    // Tiến hành cập nhật in-memory playerStates cho các tuyển thủ tham gia
    const advancePlayer = (p, newElo, won) => {
      p.elo = newElo;
      p.matches += 1;
      if (won) {
        p.wins += 1;
        p.streak = p.streak >= 0 ? p.streak + 1 : 1;
      } else {
        p.losses += 1;
        p.streak = p.streak <= 0 ? p.streak - 1 : -1;
      }
      if (p.streak > 0) p.maxStreak = Math.max(p.maxStreak, p.streak);
      p.peakElo = Math.max(p.peakElo, newElo);
    };

    advancePlayer(p1, eloResult.elo1New, team1Won);
    advancePlayer(p2, eloResult.elo2New, team2Won);
    if (isDoubles && p1p) advancePlayer(p1p, eloResult.elo1_partnerNew, team1Won);
    if (isDoubles && p2p) advancePlayer(p2p, eloResult.elo2_partnerNew, team2Won);
  }

  // 5. Tính toán biến động chỉ số người chơi (Player Impacts)
  const playerImpacts = {};
  for (const [pId, finalState] of Object.entries(playerStates)) {
    // Lấy ELO thực tế hiện tại của user trong DB để làm mốc so sánh
    const uRes = await client.query(
      `SELECT full_name, 
              ${isDoubles ? 'elo_doubles' : 'elo_singles'} as current_elo,
              ${isDoubles ? 'peak_elo_doubles' : 'peak_elo_singles'} as current_peak,
              ${isDoubles ? 'matches_doubles' : 'matches_singles'} as current_matches,
              ${isDoubles ? 'win_doubles' : 'win_singles'} as current_wins,
              ${isDoubles ? 'loss_doubles' : 'loss_singles'} as current_losses,
              ${isDoubles ? 'win_rate_doubles' : 'win_rate_singles'} as current_win_rate,
              ${isDoubles ? 'streak_doubles' : 'streak_singles'} as current_streak
       FROM users WHERE id = $1::uuid;`,
      [pId]
    );
    const u = uRes.rows[0];
    const newWinRate = finalState.matches > 0 ? ((finalState.wins / finalState.matches) * 100).toFixed(2) : '0.00';

    const hasChanged = (
      u.current_elo !== finalState.elo ||
      u.current_matches !== finalState.matches ||
      u.current_wins !== finalState.wins ||
      u.current_losses !== finalState.losses ||
      u.current_streak !== finalState.streak ||
      Number(u.current_win_rate).toFixed(2) !== Number(newWinRate).toFixed(2)
    );

    if (hasChanged) {
      playerImpacts[pId] = {
        id: pId,
        full_name: u.full_name,
        currentElo: u.current_elo,
        newElo: finalState.elo,
        eloDiff: finalState.elo - u.current_elo,
        currentMatches: u.current_matches,
        newMatches: finalState.matches,
        currentWins: u.current_wins,
        newWins: finalState.wins,
        currentLosses: u.current_losses,
        newLosses: finalState.losses,
        currentWinRate: Number(u.current_win_rate || 0).toFixed(1),
        newWinRate: Number(newWinRate).toFixed(1),
        currentStreak: u.current_streak,
        newStreak: finalState.streak,
        currentPeak: u.current_peak,
        newPeak: finalState.peakElo
      };
    }
  }

  return {
    mode: isDoubles ? 'doubles' : 'singles',
    targetMatch,
    before: {
      id: targetMatch.id,
      score_p1: targetMatch.score_p1,
      score_p2: targetMatch.score_p2,
      winner_id: targetMatch.winner_id,
      winner_name: targetMatch.winner_name,
      p1_elo_before: targetMatch.p1_elo_before,
      p2_elo_before: targetMatch.p2_elo_before,
      p1_elo_after: targetMatch.p1_elo_after,
      p2_elo_after: targetMatch.p2_elo_after,
      p1_partner_elo_before: targetMatch.p1_partner_elo_before,
      p2_partner_elo_before: targetMatch.p2_partner_elo_before,
      p1_partner_elo_after: targetMatch.p1_partner_elo_after,
      p2_partner_elo_after: targetMatch.p2_partner_elo_after,
      elo_exchanged: targetMatch.elo_exchanged,
      status: targetMatch.status
    },
    after: simulatedTargetMatchResult,
    isVoid,
    affectedMatchesCount: affectedMatches.length,
    affectedMatches: affectedMatches.map(m => ({
      id: m.id,
      created_at: m.created_at,
      player1_name: m.player1_name,
      player2_name: m.player2_name,
      player1_partner_name: m.player1_partner_name,
      player2_partner_name: m.player2_partner_name,
      score_p1: m.score_p1,
      score_p2: m.score_p2,
      p1_elo_after_old: m.old_p1_elo_after,
      p1_elo_after_new: m.p1_elo_after,
      p2_elo_after_old: m.old_p2_elo_after,
      p2_elo_after_new: m.p2_elo_after,
      elo_exchanged: m.elo_exchanged
    })),
    playerImpacts,
    playerStates,
    warning: "⚠️ Thay đổi kết quả trận đấu sẽ cập nhật lại ELO và thống kê của các đấu thủ liên quan trong các trận đấu tiếp theo theo thứ tự thời gian."
  };
}

/**
 * Thực thi Recalculation và Commit an toàn trong 1 Database Transaction nguyên tử
 */
async function applyRecalculation({
  matchId,
  newMatchData = null,
  isVoid = false,
  reason = '',
  adminUserId = null,
  expectedChecksum = null
}) {
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    // 1. Transaction Advisory Lock: Đảm bảo độc quyền 1 tiến trình recalculation tại 1 thời điểm
    await client.query(`SELECT pg_advisory_xact_lock(hashtext('match_recalculation_lock'));`);

    // 2. Lock dòng trận đấu Match X
    const lockMatchRes = await client.query(
      `SELECT * FROM matches WHERE id = $1::uuid FOR UPDATE;`,
      [matchId]
    );
    if (lockMatchRes.rows.length === 0) {
      throw new Error(`Trận đấu với ID ${matchId} không tồn tại.`);
    }
    const currentLockedMatch = lockMatchRes.rows[0];

    // Concurrency Verification (Chống xung đột nếu có Admin khác vừa sửa)
    if (expectedChecksum) {
      const actualChecksum = `${currentLockedMatch.p1_elo_after}_${currentLockedMatch.score_p1}_${currentLockedMatch.score_p2}_${currentLockedMatch.status}`;
      if (expectedChecksum !== actualChecksum) {
        const conflictErr = new Error('Dữ liệu trận đấu đã bị thay đổi bởi Admin khác kể từ lúc bạn xem Preview. Vui lòng tải lại và xem trước trước khi xác nhận.');
        conflictErr.code = 'CONCURRENCY_CONFLICT';
        throw conflictErr;
      }
    }

    // 3. Chạy mô phỏng tính toán chuỗi ELO
    const simResult = await simulateRecalculation(client, {
      matchId,
      newMatchData,
      isVoid
    });

    const isDoubles = simResult.mode === 'doubles';

    // 4. Cập nhật Match X
    if (isVoid) {
      await client.query(
        `UPDATE matches SET status = 'voided' WHERE id = $1::uuid;`,
        [matchId]
      );
    } else if (newMatchData) {
      const after = simResult.after;
      await client.query(
        `UPDATE matches
         SET player1_id = $1::uuid,
             player2_id = $2::uuid,
             player1_partner_id = $3::uuid,
             player2_partner_id = $4::uuid,
             score_p1 = $5,
             score_p2 = $6,
             winner_id = $7::uuid,
             p1_elo_before = $8,
             p2_elo_before = $9,
             p1_elo_after = $10,
             p2_elo_after = $11,
             p1_partner_elo_before = $12,
             p2_partner_elo_before = $13,
             p1_partner_elo_after = $14,
             p2_partner_elo_after = $15,
             elo_exchanged = $16,
             status = 'approved'
         WHERE id = $17::uuid;`,
        [
          after.player1_id,
          after.player2_id,
          after.player1_partner_id || null,
          after.player2_partner_id || null,
          after.score_p1,
          after.score_p2,
          after.winner_id,
          after.p1_elo_before,
          after.p2_elo_before,
          after.p1_elo_after,
          after.p2_elo_after,
          after.p1_partner_elo_before || null,
          after.p2_partner_elo_before || null,
          after.p1_partner_elo_after || null,
          after.p2_partner_elo_after || null,
          after.elo_exchanged,
          matchId
        ]
      );
    }

    // 5. Cập nhật các trận sau có ELO thực sự thay đổi (Bỏ qua các trận không đổi)
    for (const m of simResult.affectedMatches) {
      await client.query(
        `UPDATE matches
         SET p1_elo_before = $1,
             p2_elo_before = $2,
             p1_elo_after = $3,
             p2_elo_after = $4,
             p1_partner_elo_before = $5,
             p2_partner_elo_before = $6,
             p1_partner_elo_after = $7,
             p2_partner_elo_after = $8,
             elo_exchanged = $9
         WHERE id = $10::uuid;`,
        [
          m.p1_elo_before,
          m.p2_elo_before,
          m.p1_elo_after_new,
          m.p2_elo_after_new,
          m.p1_partner_elo_before || null,
          m.p2_partner_elo_before || null,
          m.p1_partner_elo_after || null,
          m.p2_partner_elo_after || null,
          m.elo_exchanged,
          m.id
        ]
      );
    }

    // 6. Cập nhật dữ liệu users cho các tuyển thủ bị ảnh hưởng
    for (const [pId, state] of Object.entries(simResult.playerStates)) {
      const winRate = state.matches > 0 ? ((state.wins / state.matches) * 100).toFixed(2) : 0;
      if (isDoubles) {
        await client.query(
          `UPDATE users
           SET elo_doubles = $1,
               peak_elo_doubles = GREATEST(COALESCE(peak_elo_doubles, 1000), $2),
               matches_doubles = $3,
               win_doubles = $4,
               loss_doubles = $5,
               win_rate_doubles = $6,
               streak_doubles = $7,
               max_streak_doubles = $8
           WHERE id = $9::uuid;`,
          [
            state.elo,
            state.peakElo,
            state.matches,
            state.wins,
            state.losses,
            winRate,
            state.streak,
            state.maxStreak,
            pId
          ]
        );
      } else {
        await client.query(
          `UPDATE users
           SET elo_singles = $1,
               peak_elo_singles = GREATEST(COALESCE(peak_elo_singles, 1000), $2),
               matches_singles = $3,
               win_singles = $4,
               loss_singles = $5,
               win_rate_singles = $6,
               streak_singles = $7,
               max_streak_singles = $8
           WHERE id = $9::uuid;`,
          [
            state.elo,
            state.peakElo,
            state.matches,
            state.wins,
            state.losses,
            winRate,
            state.streak,
            state.maxStreak,
            pId
          ]
        );
      }
    }

    // 7. Ghi Audit Log vào match_edit_logs
    await client.query(
      `INSERT INTO match_edit_logs (
        match_id, admin_user_id, action, reason, 
        before_data, after_data, affected_matches_count
      ) VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6, $7);`,
      [
        matchId,
        adminUserId || null,
        isVoid ? 'VOID' : 'EDIT',
        reason || (isVoid ? 'Hủy trận đấu' : 'Cập nhật tỉ số/kết quả'),
        JSON.stringify({ match: simResult.before }),
        JSON.stringify({ match: simResult.after, playerImpacts: simResult.playerImpacts }),
        simResult.affectedMatchesCount
      ]
    );

    await client.query('COMMIT');

    return {
      success: true,
      matchId,
      action: isVoid ? 'VOID' : 'EDIT',
      affectedMatchesCount: simResult.affectedMatchesCount,
      playerImpacts: simResult.playerImpacts,
      message: isVoid 
        ? `Đã hủy trận đấu thành công. ${simResult.affectedMatchesCount} trận đấu tiếp theo đã được tính lại ELO.`
        : `Đã cập nhật trận đấu thành công. ${simResult.affectedMatchesCount} trận đấu tiếp theo đã được tính lại ELO.`
    };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Recalculation and commit error:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Lấy danh sách Audit Logs của 1 trận đấu
 */
async function getMatchAuditLogs(matchId) {
  const res = await db.query(
    `SELECT l.*, u.full_name as admin_name
     FROM match_edit_logs l
     LEFT JOIN users u ON l.admin_user_id = u.id
     WHERE l.match_id = $1::uuid
     ORDER BY l.created_at DESC;`,
    [matchId]
  );
  return res.rows;
}

module.exports = {
  resolvePlayerBaselineBeforeMatch,
  simulateRecalculation,
  applyRecalculation,
  getMatchAuditLogs
};
