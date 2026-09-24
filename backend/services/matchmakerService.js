/**
 * Smart Matchmaker Service
 * Generates fair, balanced match suggestions for Singles and Doubles
 * based on checked-in available players and current ELO ratings.
 *
 * Includes calibration for provisional/uncalibrated players (< 5 matches)
 * to prevent nominal 1000 ELO newcomers from distorting balance against 900 ELO veterans.
 */

/**
 * Calculates effective ELO for matchmaking calibration.
 * Addresses the "uncalibrated provisional ELO" issue where a complete newcomer (< 5 matches)
 * with a nominal initial 1000 ELO is incorrectly treated as superior to an experienced veteran with 900 ELO.
 *
 * Calibration rules:
 * - 0 matches: Anchor to baseline entry rating (750) to protect match quality.
 * - 1-2 matches: If winning/streaking, allow rapid rise up to 1050; otherwise anchor conservatively (min(rawElo, 820)).
 * - 3-4 matches: If winning/streaking, allow normal rawElo; otherwise cap at 920.
 * - 5+ matches: Fully calibrated rating (100% rawElo).
 *
 * @param {object} player - Player object
 * @param {'singles'|'doubles'} mode - Game mode
 * @returns {number} Calibrated effective ELO
 */
function getEffectiveMatchElo(player, mode = 'doubles') {
  if (!player) return 1000;

  const rawElo = Number(mode === 'doubles' ? player.elo_doubles : player.elo_singles) || 1000;
  const matches = Number(mode === 'doubles' ? player.matches_doubles : player.matches_singles) || 0;
  const streak = Number(mode === 'doubles' ? player.streak_doubles : player.streak_singles) || 0;
  const winRate = Number(mode === 'doubles' ? player.win_rate_doubles : player.win_rate_singles) || 0;

  // Case 1: Brand new player (0 matches recorded) -> anchor at baseline entry level
  if (matches === 0) {
    return 750;
  }

  // Case 2: Early provisional (1 - 2 matches)
  if (matches < 3) {
    if (streak >= 2 || winRate >= 75) {
      return Math.min(rawElo, 1050);
    }
    return Math.min(rawElo, 820);
  }

  // Case 3: Late provisional (3 - 4 matches)
  if (matches < 5) {
    if (streak >= 2 || winRate >= 65) {
      return rawElo;
    }
    return Math.min(rawElo, 920);
  }

  // Case 4: Fully calibrated (5+ matches)
  return rawElo;
}

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

  const p1RawElo = Number(player1.elo_singles) || 1000;
  const p1EffectiveElo = getEffectiveMatchElo(player1, 'singles');

  const suggestions = availablePlayers
    .filter(p => p.id !== player1.id)
    .map(p => {
      const pRawElo = Number(p.elo_singles) || 1000;
      const pEffectiveElo = getEffectiveMatchElo(p, 'singles');
      const eloGap = Math.abs(p1EffectiveElo - pEffectiveElo);
      const matchQuality = calculateMatchQuality(eloGap);
      const matches = Number(p.matches_singles) || 0;

      return {
        player: p,
        elo: pRawElo,
        effectiveElo: pEffectiveElo,
        isProvisional: matches < 5,
        eloGap,
        matches,
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

  const p1EffElo = getEffectiveMatchElo(player1, 'doubles');
  const p1pEffElo = getEffectiveMatchElo(partner1, 'doubles');
  const team1EffectiveElo = Math.round((p1EffElo + p1pEffElo) / 2);

  const excludedIds = new Set([player1.id, partner1.id]);
  const candidates = availablePlayers.filter(p => !excludedIds.has(p.id));

  const pairSuggestions = [];

  // Generate all unique 2-player combinations from candidates
  for (let i = 0; i < candidates.length; i++) {
    for (let j = i + 1; j < candidates.length; j++) {
      const c = candidates[i];
      const d = candidates[j];

      const cEffElo = getEffectiveMatchElo(c, 'doubles');
      const dEffElo = getEffectiveMatchElo(d, 'doubles');
      const team2EffectiveElo = Math.round((cEffElo + dEffElo) / 2);

      const teamGap = Math.abs(team1EffectiveElo - team2EffectiveElo);
      const pairBalanceGap = Math.abs(cEffElo - dEffElo);

      // Penalty if both c and d are brand new uncalibrated players (< 2 matches)
      const cMatches = Number(c.matches_doubles) || 0;
      const dMatches = Number(d.matches_doubles) || 0;
      const bothNewbiesPenalty = (cMatches < 2 && dMatches < 2) ? 40 : 0;

      // Score prioritizes closest team gap, with minor penalty for extreme internal disparity
      // and penalty for putting two complete newcomers together without an experienced partner
      const score = teamGap + pairBalanceGap * 0.1 + bothNewbiesPenalty;
      const matchQuality = calculateMatchQuality(teamGap);

      pairSuggestions.push({
        team2: [c, d],
        player2: c,
        player2Partner: d,
        team2Elo: Math.round(((Number(c.elo_doubles) || 1000) + (Number(d.elo_doubles) || 1000)) / 2),
        team2EffectiveElo,
        teamGap,
        pairBalanceGap,
        hasProvisional: cMatches < 5 || dMatches < 5,
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

  const p1EffElo = getEffectiveMatchElo(player1, 'doubles');
  const p1Matches = Number(player1.matches_doubles) || 0;

  return availablePlayers
    .filter(p => p.id !== player1.id)
    .map(p => {
      const pEffElo = getEffectiveMatchElo(p, 'doubles');
      const pRawElo = Number(p.elo_doubles) || 1000;
      const pMatches = Number(p.matches_doubles) || 0;

      // If player1 is brand new (< 3 matches), prefer partners with experience (matches >= 5)
      // Add penalty if both are brand new
      let mentorScoreBonus = 0;
      if (p1Matches < 3 && pMatches < 3) {
        mentorScoreBonus += 50;
      }

      const eloGap = Math.abs(p1EffElo - pEffElo);
      const combinedTeamElo = Math.round((p1EffElo + pEffElo) / 2);
      const score = eloGap + mentorScoreBonus;

      return {
        partner: p,
        partnerElo: pRawElo,
        effectiveElo: pEffElo,
        isProvisional: pMatches < 5,
        combinedTeamElo,
        eloGap,
        score,
        matches: pMatches,
        winRate: Number(p.win_rate_doubles) || 0,
        streak: Number(p.streak_doubles) || 0
      };
    })
    .sort((a, b) => a.score - b.score)
    .slice(0, limit);
}

module.exports = {
  getEffectiveMatchElo,
  calculateMatchQuality,
  suggestSinglesOpponents,
  suggestDoublesOpponents,
  suggestDoublesPartners
};
