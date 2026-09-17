/**
 * Ranking Service
 * Calculates accurate rank standings and percentiles for Singles and Doubles modes independently.
 */

const db = require('../db');

// Minimum active player population required to display Top X% percentile
const MIN_POPULATION_THRESHOLD = 5;

/**
 * Get accurate rank standing (#) and percentile (Top X%) for a given mode
 * @param {string} userId
 * @param {number} elo
 * @param {'singles'|'doubles'} mode
 * @returns {Promise<{ rank: number, totalPlayers: number, percentile: string|null, topPercent: number|null }>}
 */
async function getModeRanking(userId, elo, mode = 'singles') {
  const eloCol = mode === 'doubles' ? 'elo_doubles' : 'elo_singles';
  const score = Number(elo) || 0;

  try {
    // 1. Count active members with higher Elo
    const rankRes = await db.query(
      `SELECT COUNT(*)::int as count 
       FROM users 
       WHERE role IN ('member', 'admin') 
         AND full_name != 'Super Admin' 
         AND phone_zalo != '0999999999'
         AND ${eloCol} > $1`,
      [score]
    );
    const rankPosition = (rankRes.rows[0]?.count || 0) + 1;

    // 2. Count total active members
    const totalRes = await db.query(
      `SELECT COUNT(*)::int as total 
       FROM users 
       WHERE role IN ('member', 'admin') 
         AND full_name != 'Super Admin' 
         AND phone_zalo != '0999999999'`
    );
    const totalPlayers = totalRes.rows[0]?.total || 1;

    // 3. Compute Percentile if population threshold is satisfied
    let percentile = null;
    let topPercent = null;

    if (totalPlayers >= MIN_POPULATION_THRESHOLD) {
      topPercent = Math.max(1, Math.ceil((rankPosition / totalPlayers) * 100));
      percentile = `Top ${topPercent}% CLB`;
    }

    return {
      rank: rankPosition,
      totalPlayers,
      percentile,
      topPercent
    };
  } catch (error) {
    console.error(`Error calculating ${mode} ranking:`, error);
    return {
      rank: 1,
      totalPlayers: 1,
      percentile: null,
      topPercent: null
    };
  }
}

module.exports = {
  MIN_POPULATION_THRESHOLD,
  getModeRanking
};
