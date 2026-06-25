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
function calculateElo(
  elo1, elo2, player1_id, player2_id, winner_id,
  streak1 = 0, streak2 = 0, matches1 = 0, matches2 = 0,
  elo1_partner = null, elo2_partner = null,
  streak1_partner = 0, streak2_partner = 0,
  matches1_partner = 0, matches2_partner = 0,
  player1_partner_id = null, player2_partner_id = null
) {
  // 1. Calculate Team Ratings (Averages)
  const T1 = elo1_partner !== null ? (elo1 + elo1_partner) / 2 : elo1;
  const T2 = elo2_partner !== null ? (elo2 + elo2_partner) / 2 : elo2;

  // 2. Calculate Individual K-factors
  const getK = (matches, streak) => {
    return matches < 10 ? 40 : (streak >= 3 ? 36 : 24);
  };

  const K1 = getK(matches1, streak1);
  const K2 = getK(matches2, streak2);

  // 3. Calculate Team K-factors (Averages if Doubles)
  let K_team1 = K1;
  if (elo1_partner !== null) {
    const K1_p = getK(matches1_partner, streak1_partner);
    K_team1 = (K1 + K1_p) / 2;
  }

  let K_team2 = K2;
  if (elo2_partner !== null) {
    const K2_p = getK(matches2_partner, streak2_partner);
    K_team2 = (K2 + K2_p) / 2;
  }

  // 4. Expected Scores
  const E1 = 1 / (1 + Math.pow(10, (T2 - T1) / 400));
  const E2 = 1 - E1;

  // 5. Actual Scores
  // Determine if Team 1 won (winner is either player 1 or player 1 partner)
  const team1Won = winner_id === player1_id || (player1_partner_id && winner_id === player1_partner_id);
  const S1 = team1Won ? 1 : 0;
  const S2 = 1 - S1;

  // 6. Calculate Team Delta changes
  const delta1 = Math.round(K_team1 * (S1 - E1));
  const delta2 = Math.round(K_team2 * (S2 - E2));

  // 7. Calculate New Ratings
  const elo1New = Math.max(100, Math.round(elo1 + delta1));
  const elo1_partnerNew = elo1_partner !== null 
    ? Math.max(100, Math.round(elo1_partner + delta1)) 
    : null;

  const elo2New = Math.max(100, Math.round(elo2 + delta2));
  const elo2_partnerNew = elo2_partner !== null 
    ? Math.max(100, Math.round(elo2_partner + delta2)) 
    : null;

  // Elo Exchanged is the absolute change of the winning team
  const eloExchanged = team1Won ? Math.abs(delta1) : Math.abs(delta2);

  return {
    elo1New,
    elo2New,
    elo1_partnerNew,
    elo2_partnerNew,
    eloExchanged
  };
}

module.exports = { calculateElo };
