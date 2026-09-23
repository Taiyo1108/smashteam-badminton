/**
 * Player Statistics Aggregator Service
 * Unified Single Source of Truth for Player Card, Profiles, and Competitive Metrics.
 */

const db = require('../db');
const { getTierByElo, getNextTierInfo } = require('./tierService');
const { getModeRanking } = require('./rankingService');
const { calculateAchievements, calculateMilestones } = require('./achievementService');

// Number of matches required to exit provisional state
const PROVISIONAL_MATCH_THRESHOLD = 3;

/**
 * Get comprehensive, verified competitive stats for a player
 * @param {string} userId
 * @returns {Promise<object>}
 */
async function getPlayerProfileStats(userId) {
  // 1. Fetch user data
  const userRes = await db.query(
    `SELECT id, full_name, nickname, phone_zalo, academic_info, badminton_level, soft_skills, role, avatar_url,
            selected_avatar_frame, selected_title,
            elo_singles, peak_elo_singles, matches_singles, win_rate_singles, win_singles, loss_singles, streak_singles, max_streak_singles,
            elo_doubles, peak_elo_doubles, matches_doubles, win_rate_doubles, win_doubles, loss_doubles, streak_doubles, max_streak_doubles,
            level, xp, smash_coins, current_streak, max_streak, created_at
     FROM users
     WHERE id = $1`,
    [userId]
  );

  if (userRes.rows.length === 0) {
    return null;
  }

  const user = userRes.rows[0];

  // Raw values with safe defaults
  const eloSingles = Number(user.elo_singles) || 1000;
  const peakSingles = Math.max(Number(user.peak_elo_singles) || 1000, eloSingles);
  const matchesSingles = Number(user.matches_singles) || 0;
  const winSingles = Number(user.win_singles) || 0;
  const lossSingles = Number(user.loss_singles) || 0;
  const winRateSingles = matchesSingles > 0 
    ? Number(((winSingles / matchesSingles) * 100).toFixed(1)) 
    : 0;

  const eloDoubles = Number(user.elo_doubles) || 1000;
  const peakDoubles = Math.max(Number(user.peak_elo_doubles) || 1000, eloDoubles);
  const matchesDoubles = Number(user.matches_doubles) || 0;
  const winDoubles = Number(user.win_doubles) || 0;
  const lossDoubles = Number(user.loss_doubles) || 0;
  const winRateDoubles = matchesDoubles > 0 
    ? Number(((winDoubles / matchesDoubles) * 100).toFixed(1)) 
    : 0;

  // 2. Compute rankings & percentiles in parallel
  const [singlesRank, doublesRank] = await Promise.all([
    getModeRanking(userId, eloSingles, 'singles'),
    getModeRanking(userId, eloDoubles, 'doubles')
  ]);

  // 3. Tiers & progression
  const singlesTier = getTierByElo(eloSingles);
  const doublesTier = getTierByElo(eloDoubles);

  const singlesProgression = getNextTierInfo(eloSingles);
  const doublesProgression = getNextTierInfo(eloDoubles);

  // Determine dominant competitive mode (defaulting to doubles as requested by club)
  const preferredMode = matchesSingles > matchesDoubles ? 'singles' : 'doubles';
  const dominantProgression = preferredMode === 'doubles' ? doublesProgression : singlesProgression;
  const dominantElo = preferredMode === 'doubles' ? eloDoubles : eloSingles;

  // 4. Streaks
  const streak = {
    singles: {
      current: Number(user.streak_singles) || 0,
      max: Number(user.max_streak_singles) || 0
    },
    doubles: {
      current: Number(user.streak_doubles) || 0,
      max: Number(user.max_streak_doubles) || 0
    },
    activeStreak: Math.max(
      (user.streak_singles > 0 ? user.streak_singles : 0),
      (user.streak_doubles > 0 ? user.streak_doubles : 0)
    ),
    activeMode: (user.streak_doubles > 0 && user.streak_doubles >= user.streak_singles) ? 'doubles' : 'singles'
  };

  // 5. Structure Mode-specific stats
  const singles = {
    elo: eloSingles,
    tier: singlesTier.name,
    tierLabel: singlesTier.label,
    badgeClass: singlesTier.badgeClass,
    glowClass: singlesTier.glowClass,
    borderClass: singlesTier.borderClass,
    rank: singlesRank.rank,
    totalPlayers: singlesRank.totalPlayers,
    percentile: singlesRank.percentile,
    topPercent: singlesRank.topPercent,
    matches: matchesSingles,
    wins: winSingles,
    losses: lossSingles,
    winRate: winRateSingles,
    peakElo: peakSingles,
    isProvisional: matchesSingles < PROVISIONAL_MATCH_THRESHOLD,
    provisionalThreshold: PROVISIONAL_MATCH_THRESHOLD,
    newPeak: matchesSingles > 0 && eloSingles >= peakSingles
  };

  const doubles = {
    elo: eloDoubles,
    tier: doublesTier.name,
    tierLabel: doublesTier.label,
    badgeClass: doublesTier.badgeClass,
    glowClass: doublesTier.glowClass,
    borderClass: doublesTier.borderClass,
    rank: doublesRank.rank,
    totalPlayers: doublesRank.totalPlayers,
    percentile: doublesRank.percentile,
    topPercent: doublesRank.topPercent,
    matches: matchesDoubles,
    wins: winDoubles,
    losses: lossDoubles,
    winRate: winRateDoubles,
    peakElo: peakDoubles,
    isProvisional: matchesDoubles < PROVISIONAL_MATCH_THRESHOLD,
    provisionalThreshold: PROVISIONAL_MATCH_THRESHOLD,
    newPeak: matchesDoubles > 0 && eloDoubles >= peakDoubles
  };

  // 6. Overall Combined Totals
  const totalMatches = matchesSingles + matchesDoubles;
  const totalWins = winSingles + winDoubles;
  const totalLosses = lossSingles + lossDoubles;
  const overallWinRate = totalMatches > 0 
    ? Number(((totalWins / totalMatches) * 100).toFixed(1)) 
    : 0;

  // 7. Progression & Milestones
  const progression = {
    activeMode: preferredMode,
    currentElo: dominantElo,
    hasNextTier: dominantProgression.hasNextTier,
    nextTierName: dominantProgression.nextTierName,
    nextTierLabel: dominantProgression.nextTierLabel,
    nextTierMinElo: dominantProgression.nextTierMinElo,
    eloNeeded: dominantProgression.eloNeeded,
    progressPercent: dominantProgression.progressPercent,
    milestones: calculateMilestones({
      singles,
      doubles,
      progression: { ...dominantProgression, currentElo: dominantElo }
    })
  };

  // 8. Achievements
  const achievements = calculateAchievements({
    player: user,
    singles,
    doubles,
    streak
  });

  // 9. Meta / Gamification stats
  const meta = {
    level: user.level ?? 1,
    xp: user.xp ?? 0,
    smashCoins: user.smash_coins ?? 0,
    dailyStreak: user.current_streak ?? 0,
    maxDailyStreak: user.max_streak ?? 0
  };

  return {
    player: {
      id: user.id,
      full_name: user.full_name,
      nickname: user.nickname,
      phone_zalo: user.phone_zalo,
      academic_info: user.academic_info,
      badminton_level: user.badminton_level,
      role: user.role,
      avatar_url: user.avatar_url,
      selected_avatar_frame: user.selected_avatar_frame,
      selected_title: user.selected_title,
      soft_skills: user.soft_skills,
      created_at: user.created_at
    },
    singles,
    doubles,
    overall: {
      totalMatches,
      totalWins,
      totalLosses,
      winRate: overallWinRate,
      isProvisional: totalMatches < PROVISIONAL_MATCH_THRESHOLD
    },
    progression,
    achievements,
    streak,
    title: {
      name: user.selected_title || (singles.tier === 'Challenger' || doubles.tier === 'Challenger' ? 'Huyền Thoại CLB' : 'Vận Động Viên SmashTeam'),
      isEquipped: Boolean(user.selected_title)
    },
    meta
  };
}

module.exports = {
  PROVISIONAL_MATCH_THRESHOLD,
  getPlayerProfileStats
};
