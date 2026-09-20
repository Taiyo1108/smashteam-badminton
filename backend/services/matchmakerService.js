/**
 * Smart Matchmaker Service
 * Generates fair, balanced match suggestions for Singles and Doubles
 * based on checked-in available players and current ELO ratings.
 */

/**
 * Calculate match quality percentage based on ELO gap
 * @param {number} eloGap - Absolute difference in ELO
 * @returns {number} Quality percentage (0 - 100)
 */
function calculateMatchQuality(eloGap) {
  // Gap = 0 -> 100%
  // Gap = 50 -> 75%
  // Gap = 100 -> 50%
  // Gap = 200 -> 0%
  const quality = Math.max(0, 100 - eloGap * 0.5);
  return Math.round(quality);
}

/**
 * Suggest opponents for Singles mode
 * @param {object} player1 - Selected player 1 object
 * @param {Array<object>} availablePlayers - Candidate players pool (excluding player1 and active drafts)
 * @param {number} [limit=6]
 * @returns {Array<object>} Sorted suggestions
 */
function suggestSinglesOpponents(player1, availablePlayers, limit = 6) {
  if (!player1 || !Array.isArray(availablePlayers)) return [];

  const p1Elo = Number(player1.elo_singles) || 1000;

  const suggestions = availablePlayers
    .filter(p => p.id !== player1.id)
    .map(p => {
      const pElo = Number(p.elo_singles) || 1000;
      const eloGap = Math.abs(p1Elo - pElo);
      const matchQuality = calculateMatchQuality(eloGap);

      return {
        player: p,
        elo: pElo,
        eloGap,
        matches: Number(p.matches_singles) || 0,
        winRate: Number(p.win_rate_singles) || 0,
        streak: Number(p.streak_singles) || 0,
        matchQuality
      };
    })
    .sort((a, b) => a.eloGap - b.eloGap)
    .slice(0, limit);

  return suggestions;
}

/**
 * Suggest opposing pair for Doubles mode when Team 1 is fully selected
 * @param {object} player1 - Team 1 Player 1
 * @param {object} partner1 - Team 1 Partner 1
 * @param {Array<object>} availablePlayers - Candidate players pool
 * @param {number} [limit=8]
 * @returns {Array<object>} Sorted pair suggestions
 */
function suggestDoublesOpponents(player1, partner1, availablePlayers, limit = 8) {
  if (!player1 || !partner1 || !Array.isArray(availablePlayers)) return [];

  const p1Elo = Number(player1.elo_doubles) || 1000;
  const p1pElo = Number(partner1.elo_doubles) || 1000;
  const team1Elo = Math.round((p1Elo + p1pElo) / 2);

  const excludedIds = new Set([player1.id, partner1.id]);
  const candidates = availablePlayers.filter(p => !excludedIds.has(p.id));

  const pairSuggestions = [];

  // Generate all unique 2-player combinations from candidates
  for (let i = 0; i < candidates.length; i++) {
    for (let j = i + 1; j < candidates.length; j++) {
      const c = candidates[i];
      const d = candidates[j];

      const cElo = Number(c.elo_doubles) || 1000;
      const dElo = Number(d.elo_doubles) || 1000;
      const team2Elo = Math.round((cElo + dElo) / 2);
      const teamGap = Math.abs(team1Elo - team2Elo);
      const pairBalanceGap = Math.abs(cElo - dElo);

      // Score prioritizes closest team gap, with minor penalty for extreme internal disparity
      const score = teamGap + pairBalanceGap * 0.1;
      const matchQuality = calculateMatchQuality(teamGap);

      pairSuggestions.push({
        team2: [c, d],
        player2: c,
        player2Partner: d,
        team2Elo,
        teamGap,
        pairBalanceGap,
        matchQuality,
        score
      });
    }
  }

  pairSuggestions.sort((a, b) => a.score - b.score);
  return pairSuggestions.slice(0, limit);
}

/**
 * Suggest partner for Player 1 when only 1 player is chosen in Doubles
 * @param {object} player1
 * @param {Array<object>} availablePlayers
 * @param {number} [limit=6]
 */
function suggestDoublesPartners(player1, availablePlayers, limit = 6) {
  if (!player1 || !Array.isArray(availablePlayers)) return [];

  const p1Elo = Number(player1.elo_doubles) || 1000;

  return availablePlayers
    .filter(p => p.id !== player1.id)
    .map(p => {
      const pElo = Number(p.elo_doubles) || 1000;
      const eloGap = Math.abs(p1Elo - pElo);
      const combinedTeamElo = Math.round((p1Elo + pElo) / 2);

      return {
        partner: p,
        partnerElo: pElo,
        combinedTeamElo,
        eloGap,
        matches: Number(p.matches_doubles) || 0,
        winRate: Number(p.win_rate_doubles) || 0,
        streak: Number(p.streak_doubles) || 0
      };
    })
    .sort((a, b) => a.eloGap - b.eloGap)
    .slice(0, limit);
}

module.exports = {
  calculateMatchQuality,
  suggestSinglesOpponents,
  suggestDoublesOpponents,
  suggestDoublesPartners
};
