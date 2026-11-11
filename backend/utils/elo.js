/**
 * Calculates new Elo ratings for two teams (Singles or Doubles)
 * @param {number} elo1 - Player 1's current Elo
 * @param {number} elo2 - Player 2's current Elo
 * @param {string} player1_id - Player 1's ID
 * @param {string} player2_id - Player 2's ID
 * @param {string} winner_id - ID of any player on the winning team
 * @param {number} streak1 - Player 1's current streak
 * @param {number} streak2 - Player 2's current streak
 * @param {number} matches1 - Player 1's total matches
 * @param {number} matches2 - Player 2's total matches
 * @param {number|null} elo1_partner - Partner 1's Elo (null if Singles)
 * @param {number|null} elo2_partner - Partner 2's Elo (null if Singles)
 * @param {number} streak1_partner - Partner 1's current streak
 * @param {number} streak2_partner - Partner 2's current streak
 * @param {number} matches1_partner - Partner 1's total matches
 * @param {number} matches2_partner - Partner 2's total matches
 * @param {string|null} player1_partner_id - Partner 1's ID (null if Singles)
 * @param {string|null} player2_partner_id - Partner 2's ID (null if Singles)
 * @returns {object} { elo1New, elo2New, elo1_partnerNew, elo2_partnerNew, eloExchanged }
 */
/**
 * Thang K-factor mới của SmashTeam dựa trên số trận đã đấu:
 * - 0–5 matches: K = 40 (Provisional / Calibrating)
 * - 6–10 matches: K = 38
 * - 11–25 matches: K = 36
 * - 26–50 matches: K = 32
 * - 51–100 matches: K = 28
 * - 100+ matches: K = 26
 */
function getK(matches) {
  const m = Number(matches) || 0;
  if (m <= 5) return 40;
  if (m <= 10) return 38;
  if (m <= 25) return 36;
  if (m <= 50) return 32;
  if (m <= 100) return 28;
  return 26;
}

function calculateElo(
  elo1, elo2, player1_id, player2_id, winner_id,
  streak1 = 0, streak2 = 0, matches1 = 0, matches2 = 0,
  elo1_partner = null, elo2_partner = null,
  streak1_partner = 0, streak2_partner = 0,
  matches1_partner = 0, matches2_partner = 0,
  player1_partner_id = null, player2_partner_id = null,
  grindInfo = {},
  itemEffects = {}
) {
  // 1. Calculate Team Ratings (Averages)
  const T1 = elo1_partner !== null ? (elo1 + elo1_partner) / 2 : elo1;
  const T2 = elo2_partner !== null ? (elo2 + elo2_partner) / 2 : elo2;

  // 2. Calculate Individual K-factors
  const K1 = getK(matches1);
  const K2 = getK(matches2);

  // 3. Calculate Team K-factors (Averages if Doubles)
  let K_team1 = K1;
  if (elo1_partner !== null) {
    const K1_p = getK(matches1_partner);
    K_team1 = (K1 + K1_p) / 2;
  }

  let K_team2 = K2;
  if (elo2_partner !== null) {
    const K2_p = getK(matches2_partner);
    K_team2 = (K2 + K2_p) / 2;
  }

  // K chung cho trận đấu để đảm bảo điểm cơ bản (base exchange) đối xứng và công bằng
  const K_match = (K_team1 + K_team2) / 2;

  // 4. Expected Scores
  const E1 = 1 / (1 + Math.pow(10, (T2 - T1) / 400));
  const E2 = 1 - E1;

  // 5. Actual Scores
  const team1Won = winner_id === player1_id || (player1_partner_id && winner_id === player1_partner_id);

  // 6. Điểm cơ bản (Base Delta): Giới hạn an toàn trong khoảng [8, 40]
  const clampDelta = (d) => Math.max(-40, Math.min(40, d));
  const expectedWinnerScore = team1Won ? E1 : E2;
  const baseDelta = Math.max(8, clampDelta(Math.round(K_match * (1 - expectedWinnerScore))));

  // 7. Hàm tính toán kết quả riêng biệt cho từng người chơi áp dụng quy tắc Cày Cuốc & Vật phẩm Hope Star:
  // - Hoàn thành mỗi 5 trận -> trận thắng đầu tiên được x2 ELO
  // - Tích lũy 5 trận thua -> trận thua đầu tiên được miễn trừ ELO (0 ELO lost)
  // - Ngôi Sao Hy Vọng (Hope Star): Thắng trận nhận bonus = min(max(base_elo_delta, 0), 20). Thua không nhận bonus.
  const computePlayerOutcome = (playerWon, playerGrind, playerItem) => {
    const matchesCount = Math.max(0, Math.min(5, Number(playerGrind?.matchesCount) || 0));
    const lossCount = Math.max(0, Math.min(5, Number(playerGrind?.lossCount) || 0));

    let delta = 0;
    let isWinBoost = false;
    let isLossShield = false;
    let nextMatchesCount = matchesCount;
    let nextLossCount = lossCount;

    if (playerWon) {
      // 1. Thắng trận:
      if (matchesCount >= 5) {
        isWinBoost = true;
        delta = baseDelta * 2; // THƯỞNG X2 ELO CÀY CUỐC!
        nextMatchesCount = 0;   // Reset chu kỳ 5 trận
      } else {
        delta = baseDelta;
        nextMatchesCount = Math.min(5, matchesCount + 1);
      }
      nextLossCount = lossCount; // Giữ nguyên số trận thua
    } else {
      // 2. Thua trận:
      // Tích lũy số trận hoàn thành (thua vẫn tính là hoàn thành 1 trận)
      if (matchesCount < 5) {
        nextMatchesCount = matchesCount + 1;
      } else {
        nextMatchesCount = 5; // Giữ nguyên 5 chờ trận thắng để nhận x2
      }

      // Kiểm tra Khiên Bảo Hộ Thua
      if (lossCount >= 5) {
        isLossShield = true;
        delta = 0; // MIỄN TRỪ 100% ELO (0 ELO lost)
        nextLossCount = 0; // Reset khiên bảo hộ
      } else {
        delta = -baseDelta;
        nextLossCount = Math.min(5, lossCount + 1);
      }
    }

    // NGÔI SAO HY VỌNG (HOPE STAR):
    // Thắng: bonus bằng base_elo_delta, trần tối đa +20 ELO
    // Thua: không nhận bonus; vẫn mất ELO theo công thức bình thường
    let itemBonus = 0;
    const hasHopeStar = !!playerItem?.hopeStar;
    if (hasHopeStar) {
      if (playerWon) {
        itemBonus = Math.min(Math.max(baseDelta, 0), 20);
        delta += itemBonus;
      } else {
        itemBonus = 0;
      }
    }

    return {
      delta,
      baseDelta,
      itemBonus,
      hasHopeStar,
      isWinBoost,
      isLossShield,
      nextMatchesCount,
      nextLossCount
    };
  };

  const p1Outcome = computePlayerOutcome(team1Won, grindInfo?.p1, itemEffects?.p1);
  const p2Outcome = computePlayerOutcome(!team1Won, grindInfo?.p2, itemEffects?.p2);
  const p1pOutcome = elo1_partner !== null ? computePlayerOutcome(team1Won, grindInfo?.p1p, itemEffects?.p1p) : null;
  const p2pOutcome = elo2_partner !== null ? computePlayerOutcome(!team1Won, grindInfo?.p2p, itemEffects?.p2p) : null;

  const delta1 = p1Outcome.delta;
  const delta2 = p2Outcome.delta;
  const delta1_p = p1pOutcome ? p1pOutcome.delta : 0;
  const delta2_p = p2pOutcome ? p2pOutcome.delta : 0;

  // 8. Tính ELO mới (Điểm tối thiểu 100)
  const elo1New = Math.max(100, Math.round(elo1 + delta1));
  const elo1_partnerNew = elo1_partner !== null 
    ? Math.max(100, Math.round(elo1_partner + delta1_p)) 
    : null;

  const elo2New = Math.max(100, Math.round(elo2 + delta2));
  const elo2_partnerNew = elo2_partner !== null 
    ? Math.max(100, Math.round(elo2_partner + delta2_p)) 
    : null;

  // Elo Exchanged ghi nhận vào DB (giá trị tuyệt đối của người thắng để tương thích ngược)
  const eloExchanged = team1Won ? Math.abs(delta1) : Math.abs(delta2);

  return {
    elo1New,
    elo2New,
    elo1_partnerNew,
    elo2_partnerNew,
    delta1,
    delta2,
    delta1_p,
    delta2_p,
    baseDelta,
    eloExchanged,
    team1Won,
    p1Outcome,
    p2Outcome,
    p1pOutcome,
    p2pOutcome
  };
}

/**
 * Bảng quy chuẩn phân cấp ELO của SmashTeam:
 * - Challenger: 1800+
 * - Diamond: 1600+
 * - Platinum: 1400+
 * - Gold: 1200+
 * - Silver: 1000+
 * - Bronze: < 1000
 */
const RANK_TIERS = [
  { name: 'Challenger', label: 'Thách Đấu', minElo: 1800 },
  { name: 'Diamond', label: 'Kim Cương', minElo: 1600 },
  { name: 'Platinum', label: 'Bạch Kim', minElo: 1400 },
  { name: 'Gold', label: 'Vàng', minElo: 1200 },
  { name: 'Silver', label: 'Bạc', minElo: 1000 },
  { name: 'Bronze', label: 'Đồng', minElo: 0 }
];

function getRankName(elo) {
  const score = Number(elo) || 0;
  if (score >= 1800) return 'Challenger';
  if (score >= 1600) return 'Diamond';
  if (score >= 1400) return 'Platinum';
  if (score >= 1200) return 'Gold';
  if (score >= 1000) return 'Silver';
  return 'Bronze';
}

function getRankLabel(elo) {
  const score = Number(elo) || 0;
  if (score >= 1800) return 'Thách Đấu';
  if (score >= 1600) return 'Kim Cương';
  if (score >= 1400) return 'Bạch Kim';
  if (score >= 1200) return 'Vàng';
  if (score >= 1000) return 'Bạc';
  return 'Đồng';
}

module.exports = { calculateElo, getK, getRankName, getRankLabel, RANK_TIERS };

