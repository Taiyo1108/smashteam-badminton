/**
 * Ranking Snapshot Job
 * Idempotent scheduled job to capture point-in-time weekly ranking snapshots.
 * Read-only endpoints must NEVER call this job.
 */

const db = require('../db');

/**
 * Get ISO week string (e.g. '2026-W38')
 * @param {Date} [date]
 * @returns {string}
 */
function getIsoWeekString(date = new Date()) {
  const target = new Date(date.valueOf());
  // ISO day: 1 = Monday, 7 = Sunday
  const dayNumber = (target.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayNumber + 3);
  const firstThursday = target.valueOf();
  target.setUTCMonth(0, 1);
  if (target.getUTCDay() !== 4) {
    target.setUTCMonth(0, 1 + ((4 - target.getUTCDay() + 7) % 7));
  }
  const weekNumber = 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
  const year = new Date(firstThursday).getUTCFullYear();
  const weekFormatted = weekNumber < 10 ? `0${weekNumber}` : `${weekNumber}`;
  return `${year}-W${weekFormatted}`;
}

/**
 * Take weekly ranking snapshot for Singles and/or Doubles
 * Idempotent: Can be run multiple times for the same week without creating duplicates.
 * @param {object} [options]
 * @param {'singles'|'doubles'|'all'} [options.mode='all']
 * @param {Date} [options.forceDate]
 * @param {number} [options.forceSeasonId]
 * @returns {Promise<object>}
 */
async function takeWeeklyRankingSnapshot(options = {}) {
  const targetMode = options.mode || 'all';
  const targetDate = options.forceDate || new Date();
  const snapshotWeek = getIsoWeekString(targetDate);
  const snapshotDate = targetDate.toISOString().split('T')[0];

  // 1. Resolve Season ID
  let seasonId = options.forceSeasonId;
  if (!seasonId) {
    const seasonRes = await db.query(
      "SELECT id FROM seasons WHERE is_active = true ORDER BY id DESC LIMIT 1"
    );
    seasonId = seasonRes.rows[0]?.id || 1;
  }

  const modes = targetMode === 'all' ? ['singles', 'doubles'] : [targetMode];
  const summary = {};

  for (const m of modes) {
    const eloCol = m === 'doubles' ? 'elo_doubles' : 'elo_singles';
    const matchesCol = m === 'doubles' ? 'matches_doubles' : 'matches_singles';
    const winRateCol = m === 'doubles' ? 'win_rate_doubles' : 'win_rate_singles';

    // Query active members with 100% deterministic tie-breaking:
    // 1. ELO DESC
    // 2. Matches DESC
    // 3. Win Rate DESC
    // 4. created_at ASC
    // 5. id ASC
    const membersRes = await db.query(
      `SELECT id, 
              COALESCE(${eloCol}, 1000) as elo, 
              COALESCE(${matchesCol}, 0) as matches, 
              COALESCE(${winRateCol}, 0) as win_rate
       FROM users
       WHERE role IN ('member', 'admin') 
         AND full_name != 'Super Admin' 
         AND phone_zalo != '0999999999'
       ORDER BY 
         ${eloCol} DESC,
         ${matchesCol} DESC,
         ${winRateCol} DESC,
         created_at ASC,
         id ASC`
    );

    let insertedOrUpdated = 0;

    for (let i = 0; i < membersRes.rows.length; i++) {
      const player = membersRes.rows[i];
      const rank = i + 1;

      await db.query(
        `INSERT INTO ranking_snapshots (
          season_id, mode, user_id, rank, elo, matches, win_rate, snapshot_date, snapshot_week
        )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (season_id, mode, user_id, snapshot_week)
         DO UPDATE SET 
           rank = EXCLUDED.rank,
           elo = EXCLUDED.elo,
           matches = EXCLUDED.matches,
           win_rate = EXCLUDED.win_rate,
           snapshot_date = EXCLUDED.snapshot_date,
           created_at = CURRENT_TIMESTAMP`,
        [
          seasonId,
          m,
          player.id,
          rank,
          player.elo,
          player.matches,
          player.win_rate,
          snapshotDate,
          snapshotWeek
        ]
      );
      insertedOrUpdated++;
    }

    summary[m] = {
      seasonId,
      snapshotWeek,
      snapshotDate,
      totalPlayers: insertedOrUpdated
    };
  }

  return {
    success: true,
    summary
  };
}

module.exports = {
  getIsoWeekString,
  takeWeeklyRankingSnapshot
};
