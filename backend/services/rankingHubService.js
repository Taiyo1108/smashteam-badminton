/**
 * Ranking Hub Service
 * Core service orchestrating competitive rankings, deterministic tie-breaking,
 * weekly snapshots comparison, 4-way spotlight, provisional states, and gap calculation.
 */

const db = require('../db');
const { getIsoWeekString } = require('./rankingSnapshotJob');
const { getTierByElo } = require('./tierService');

// Threshold to transition from Provisional to Established
const MIN_MATCHES_FOR_ESTABLISHED_RANK = 3;

/**
 * Get comprehensive Ranking Hub payload
 * @param {object} params
 * @param {'singles'|'doubles'} [params.mode='doubles']
 * @param {'all'|'official'|'provisional'} [params.filter='official']
 * @param {string|null} [params.currentUserId=null]
 * @returns {Promise<object>}
 */
async function getRankingHubData({ mode = 'doubles', filter = 'official', currentUserId = null }) {
  const currentMode = mode === 'singles' ? 'singles' : 'doubles';
  const currentFilter = ['all', 'official', 'provisional'].includes(filter) ? filter : 'official';

  // 1. Fetch current active Season
  const seasonRes = await db.query(
    "SELECT id, name, start_date, end_date, is_active, description FROM seasons WHERE is_active = true ORDER BY id DESC LIMIT 1"
  );
  const currentSeason = seasonRes.rows[0] || {
    id: 1,
    name: "Mùa 01 - Khởi Tranh 2026",
    start_date: new Date().toISOString(),
    is_active: true
  };

  // 2. Identify Current Week and Fetch Baseline Snapshot
  const currentWeek = getIsoWeekString(new Date());

  // Snapshot Fallback: Find most recent snapshot BEFORE current week in same season and mode
  const baselineSnapshotsRes = await db.query(
    `SELECT DISTINCT ON (user_id) user_id, rank, elo, snapshot_week
     FROM ranking_snapshots
     WHERE season_id = $1 AND mode = $2 AND snapshot_week < $3
     ORDER BY user_id, snapshot_week DESC, created_at DESC`,
    [currentSeason.id, currentMode, currentWeek]
  );

  const baselineMap = new Map();
  baselineSnapshotsRes.rows.forEach(snap => {
    baselineMap.set(snap.user_id, snap);
  });

  const hasBaselineSnapshot = baselineSnapshotsRes.rows.length > 0;
  const baselineWeek = hasBaselineSnapshot ? baselineSnapshotsRes.rows[0].snapshot_week : null;

  // 3. Fetch all active members with deterministic tie-breaking:
  // 1. ELO DESC
  // 2. Matches DESC
  // 3. Win Rate DESC
  // 4. created_at ASC
  // 5. id ASC
  const eloCol = currentMode === 'doubles' ? 'elo_doubles' : 'elo_singles';
  const peakCol = currentMode === 'doubles' ? 'peak_elo_doubles' : 'peak_elo_singles';
  const matchesCol = currentMode === 'doubles' ? 'matches_doubles' : 'matches_singles';
  const winCol = currentMode === 'doubles' ? 'win_doubles' : 'win_singles';
  const lossCol = currentMode === 'doubles' ? 'loss_doubles' : 'loss_singles';
  const winRateCol = currentMode === 'doubles' ? 'win_rate_doubles' : 'win_rate_singles';
  const streakCol = currentMode === 'doubles' ? 'streak_doubles' : 'streak_singles';
  const maxStreakCol = currentMode === 'doubles' ? 'max_streak_doubles' : 'max_streak_singles';

  const membersRes = await db.query(
    `SELECT id, full_name, nickname, avatar_url, selected_avatar_frame, selected_title,
            badminton_level, role, academic_info, created_at,
            COALESCE(${eloCol}, 1000) as elo,
            COALESCE(${peakCol}, 1000) as peak_elo,
            COALESCE(${matchesCol}, 0) as matches,
            COALESCE(${winCol}, 0) as wins,
            COALESCE(${lossCol}, 0) as losses,
            COALESCE(${winRateCol}, 0) as win_rate,
            COALESCE(${streakCol}, 0) as streak,
            COALESCE(${maxStreakCol}, 0) as max_streak
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

  // 4. Separate Established (>= 3 matches) and Provisional (< 3 matches) players
  // Strict rule: Ranks (#1, #2, ...) are calculated ONLY based on the official leaderboard.
  // Players with < 3 matches are unranked (rank: null, "Vô hạng").
  const establishedRows = [];
  const provisionalRows = [];

  membersRes.rows.forEach(row => {
    if (Number(row.matches) >= MIN_MATCHES_FOR_ESTABLISHED_RANK) {
      establishedRows.push(row);
    } else {
      provisionalRows.push(row);
    }
  });

  // Process Established Players (Official Rank #1, #2, ... #N)
  const establishedPlayers = establishedRows.map((p, i) => {
    const rank = i + 1;
    const tier = getTierByElo(p.elo);

    // Movement calculation vs weekly snapshot
    let movement = 'NEW';
    let rankChange = 0;
    let previousRank = null;

    const baseline = baselineMap.get(p.id);
    if (baseline && baseline.rank != null) {
      previousRank = baseline.rank;
      rankChange = previousRank - rank;
      if (rankChange > 0) movement = 'UP';
      else if (rankChange < 0) movement = 'DOWN';
      else movement = 'SAME';
    }

    return {
      rank,
      movement,
      rankChange,
      previousRank,
      user: {
        id: p.id,
        full_name: p.full_name,
        nickname: p.nickname,
        avatar_url: p.avatar_url,
        selected_avatar_frame: p.selected_avatar_frame,
        selected_title: p.selected_title,
        badminton_level: p.badminton_level,
        role: p.role,
        academic_info: p.academic_info
      },
      elo: Number(p.elo),
      peakElo: Math.max(Number(p.peak_elo), Number(p.elo)),
      tier: tier.name,
      tierLabel: tier.label,
      badgeClass: tier.badgeClass,
      glowClass: tier.glowClass,
      borderClass: tier.borderClass,
      matches: Number(p.matches),
      wins: Number(p.wins),
      losses: Number(p.losses),
      winRate: Number(Number(p.win_rate).toFixed(1)),
      streak: Number(p.streak),
      maxStreak: Number(p.max_streak),
      isProvisional: false,
      provisionalThreshold: MIN_MATCHES_FOR_ESTABLISHED_RANK,
      isTopOne: false,
      gapToNext: 0,
      targetPlayer: null,
      gapCopy: ''
    };
  });

  // Calculate Gap to Next Player within Established Players
  for (let i = 0; i < establishedPlayers.length; i++) {
    const current = establishedPlayers[i];
    if (i === 0) {
      current.gapToNext = 0;
      current.isTopOne = true;
      current.gapCopy = 'Đang dẫn đầu bảng';
    } else {
      const playerAbove = establishedPlayers[i - 1];
      const gap = Math.max(0, playerAbove.elo - current.elo);
      current.gapToNext = gap;
      current.isTopOne = false;
      current.targetPlayer = {
        id: playerAbove.user.id,
        name: playerAbove.user.full_name,
        rank: playerAbove.rank,
        elo: playerAbove.elo
      };
      current.gapCopy = gap > 0 
        ? `Còn +${gap} ELO để vượt #${playerAbove.rank}`
        : `Bằng điểm với #${playerAbove.rank}`;
    }
  }

  // Process Provisional Players (Unranked: rank = null)
  const provisionalPlayers = provisionalRows.map(p => {
    const tier = getTierByElo(p.elo);
    const matches = Number(p.matches);
    const neededMatches = Math.max(1, MIN_MATCHES_FOR_ESTABLISHED_RANK - matches);

    return {
      rank: null,
      movement: 'NEW',
      rankChange: 0,
      previousRank: null,
      user: {
        id: p.id,
        full_name: p.full_name,
        nickname: p.nickname,
        avatar_url: p.avatar_url,
        selected_avatar_frame: p.selected_avatar_frame,
        selected_title: p.selected_title,
        badminton_level: p.badminton_level,
        role: p.role,
        academic_info: p.academic_info
      },
      elo: Number(p.elo),
      peakElo: Math.max(Number(p.peak_elo), Number(p.elo)),
      tier: tier.name,
      tierLabel: tier.label,
      badgeClass: tier.badgeClass,
      glowClass: tier.glowClass,
      borderClass: tier.borderClass,
      matches,
      wins: Number(p.wins),
      losses: Number(p.losses),
      winRate: Number(Number(p.win_rate).toFixed(1)),
      streak: Number(p.streak),
      maxStreak: Number(p.max_streak),
      isProvisional: true,
      provisionalThreshold: MIN_MATCHES_FOR_ESTABLISHED_RANK,
      isTopOne: false,
      gapToNext: 0,
      targetPlayer: null,
      gapCopy: `Cần đấu thêm ${neededMatches} trận để có thứ hạng`
    };
  });

  // Combined players list: Official ranked players first, followed by unranked provisional players
  const allRankedPlayers = [...establishedPlayers, ...provisionalPlayers];

  // 5. Championship Podium:
  // Must ONLY take Top 3 Established players for 'all' and 'official'.
  // For 'provisional' filter, podium is empty (shows provisional banner).
  let podium = [];
  if (currentFilter !== 'provisional') {
    podium = establishedPlayers.slice(0, 3);
  }

  // 6. Calculate 4 Spotlight Categories from 100% Real Data
  const spotlight = await calculateSpotlight({
    mode: currentMode,
    allPlayers: allRankedPlayers
  });

  // 7. Apply Filter for Table Rankings
  let filteredRankings = establishedPlayers;
  if (currentFilter === 'all') {
    filteredRankings = allRankedPlayers;
  } else if (currentFilter === 'provisional') {
    filteredRankings = provisionalPlayers;
  }

  // 8. Extract My Position if user is authenticated
  let myPosition = null;
  if (currentUserId) {
    const myItem = allRankedPlayers.find(p => String(p.user?.id) === String(currentUserId));
    if (myItem) {
      myPosition = { ...myItem };
    } else {
      // User is authenticated but not in the active ranked list (e.g. newly created or special account)
      try {
        const userRes = await db.query(
          "SELECT id, full_name, nickname, avatar_url, selected_avatar_frame, selected_title, badminton_level, role, academic_info FROM users WHERE id = $1",
          [currentUserId]
        );
        if (userRes.rows.length > 0) {
          const u = userRes.rows[0];
          const tier = getTierByElo(1000);
          myPosition = {
            rank: null,
            movement: 'NEW',
            rankChange: 0,
            previousRank: null,
            user: u,
            elo: 1000,
            peakElo: 1000,
            tier: tier.name,
            tierLabel: tier.label,
            badgeClass: tier.badgeClass,
            glowClass: tier.glowClass,
            borderClass: tier.borderClass,
            matches: 0,
            wins: 0,
            losses: 0,
            winRate: 0,
            streak: 0,
            maxStreak: 0,
            isProvisional: true,
            provisionalThreshold: MIN_MATCHES_FOR_ESTABLISHED_RANK,
            isTopOne: false,
            gapToNext: 0,
            targetPlayer: null,
            gapCopy: `Cần đấu thêm ${MIN_MATCHES_FOR_ESTABLISHED_RANK} trận để có thứ hạng`
          };
        }
      } catch (err) {
        console.error('Error fetching fallback user for myPosition:', err);
      }
    }
  }

  return {
    season: {
      id: currentSeason.id,
      name: currentSeason.name,
      isActive: currentSeason.is_active,
      startDate: currentSeason.start_date
    },
    mode: currentMode,
    filter: currentFilter,
    snapshotWeek: baselineWeek,
    currentWeek,
    podium,
    rankings: filteredRankings,
    totalPlayers: allRankedPlayers.length,
    establishedCount: allRankedPlayers.filter(p => !p.isProvisional).length,
    provisionalCount: allRankedPlayers.filter(p => p.isProvisional).length,
    minMatchesThreshold: MIN_MATCHES_FOR_ESTABLISHED_RANK,
    spotlight,
    myPosition
  };
}

/**
 * Calculate 4 Spotlight Categories strictly from real verified data:
 * 1. ON FIRE (Highest current win streak > 0)
 * 2. CLIMBER (Highest positive rankChange)
 * 3. RISING (Highest real player ELO delta in last 7 days)
 * 4. MOST ACTIVE (Most official matches in last 14 days)
 */
async function calculateSpotlight({ mode, allPlayers }) {
  // 1. ON FIRE: Highest active streak > 0
  const onFireCandidates = allPlayers.filter(p => p.streak > 0 && !p.isProvisional);
  onFireCandidates.sort((a, b) => b.streak - a.streak || b.elo - a.elo);
  const onFire = onFireCandidates.length > 0 ? {
    user: onFireCandidates[0].user,
    streak: onFireCandidates[0].streak,
    label: `${onFireCandidates[0].streak} TRẬN THẮNG LIÊN TIẾP`,
    subLabel: `Đang có chuỗi bất bại thể thức ${mode === 'doubles' ? 'Đôi' : 'Đơn'}`
  } : null;

  // 2. CLIMBER: Highest positive rankChange vs weekly snapshot (established players only)
  const climberCandidates = allPlayers.filter(p => p.rankChange > 0 && !p.isProvisional && p.rank !== null);
  climberCandidates.sort((a, b) => b.rankChange - a.rankChange || b.elo - a.elo);
  const climber = climberCandidates.length > 0 ? {
    user: climberCandidates[0].user,
    ranksGained: climberCandidates[0].rankChange,
    currentRank: climberCandidates[0].rank,
    label: `TĂNG +${climberCandidates[0].rankChange} BẬC TUẦN NÀY`,
    subLabel: `Bứt phá ngoạn mục lên vị trí #${climberCandidates[0].rank}`
  } : null;

  // 3. RISING: Highest true player ELO delta in last 7 days (official matches only: status = 'approved')
  let rising = null;
  try {
    const isDoubles = mode === 'doubles';
    const partnerFilter = isDoubles 
      ? "player1_partner_id IS NOT NULL" 
      : "player1_partner_id IS NULL";

    // Query official matches in last 7 days
    const recentMatchesRes = await db.query(
      `SELECT player1_id, player2_id, player1_partner_id, player2_partner_id,
              p1_elo_before, p1_elo_after, p2_elo_before, p2_elo_after,
              p1_partner_elo_before, p1_partner_elo_after, p2_partner_elo_before, p2_partner_elo_after
       FROM matches
       WHERE ${partnerFilter} 
         AND status = 'approved'
         AND created_at >= NOW() - INTERVAL '7 days'`
    );

    const userDeltaMap = new Map();

    recentMatchesRes.rows.forEach(m => {
      // Player 1 delta
      if (m.player1_id && m.p1_elo_before != null && m.p1_elo_after != null) {
        const delta = m.p1_elo_after - m.p1_elo_before;
        userDeltaMap.set(m.player1_id, (userDeltaMap.get(m.player1_id) || 0) + delta);
      }
      // Player 2 delta
      if (m.player2_id && m.p2_elo_before != null && m.p2_elo_after != null) {
        const delta = m.p2_elo_after - m.p2_elo_before;
        userDeltaMap.set(m.player2_id, (userDeltaMap.get(m.player2_id) || 0) + delta);
      }
      // Partner 1 delta
      if (m.player1_partner_id && m.p1_partner_elo_before != null && m.p1_partner_elo_after != null) {
        const delta = m.p1_partner_elo_after - m.p1_partner_elo_before;
        userDeltaMap.set(m.player1_partner_id, (userDeltaMap.get(m.player1_partner_id) || 0) + delta);
      }
      // Partner 2 delta
      if (m.player2_partner_id && m.p2_partner_elo_before != null && m.p2_partner_elo_after != null) {
        const delta = m.p2_partner_elo_after - m.p2_partner_elo_before;
        userDeltaMap.set(m.player2_partner_id, (userDeltaMap.get(m.player2_partner_id) || 0) + delta);
      }
    });

    // Find user with highest positive ELO delta
    let maxDelta = 0;
    let risingUserId = null;
    userDeltaMap.forEach((delta, uId) => {
      if (delta > maxDelta) {
        maxDelta = delta;
        risingUserId = uId;
      }
    });

    if (risingUserId && maxDelta > 0) {
      const risingPlayer = allPlayers.find(p => p.user.id === risingUserId);
      if (risingPlayer) {
        rising = {
          user: risingPlayer.user,
          eloGain: maxDelta,
          label: `+${maxDelta} ELO TRONG 7 NGÀY`,
          subLabel: `Tăng trưởng phong độ ấn tượng nhất tuần`
        };
      }
    }
  } catch (err) {
    console.error('Error calculating Rising spotlight:', err);
  }

  // 4. MOST ACTIVE: Most official matches played in last 14 days (status = 'approved')
  let mostActive = null;
  try {
    const isDoubles = mode === 'doubles';
    const partnerFilter = isDoubles 
      ? "player1_partner_id IS NOT NULL" 
      : "player1_partner_id IS NULL";

    const activeMatchesRes = await db.query(
      `SELECT player1_id, player2_id, player1_partner_id, player2_partner_id
       FROM matches
       WHERE ${partnerFilter} 
         AND status = 'approved'
         AND created_at >= NOW() - INTERVAL '14 days'`
    );

    const matchCountMap = new Map();
    activeMatchesRes.rows.forEach(m => {
      if (m.player1_id) matchCountMap.set(m.player1_id, (matchCountMap.get(m.player1_id) || 0) + 1);
      if (m.player2_id) matchCountMap.set(m.player2_id, (matchCountMap.get(m.player2_id) || 0) + 1);
      if (m.player1_partner_id) matchCountMap.set(m.player1_partner_id, (matchCountMap.get(m.player1_partner_id) || 0) + 1);
      if (m.player2_partner_id) matchCountMap.set(m.player2_partner_id, (matchCountMap.get(m.player2_partner_id) || 0) + 1);
    });

    let maxMatches = 0;
    let mostActiveUserId = null;
    matchCountMap.forEach((cnt, uId) => {
      if (cnt > maxMatches) {
        maxMatches = cnt;
        mostActiveUserId = uId;
      }
    });

    if (mostActiveUserId && maxMatches > 0) {
      const activePlayer = allPlayers.find(p => p.user.id === mostActiveUserId);
      if (activePlayer) {
        mostActive = {
          user: activePlayer.user,
          matchCount: maxMatches,
          label: `${maxMatches} TRẬN TRONG 14 NGÀY`,
          subLabel: `Chiến binh thi đấu cọ xát năng nổ nhất CLB`
        };
      }
    }
  } catch (err) {
    console.error('Error calculating Most Active spotlight:', err);
  }

  return {
    onFire,
    climber,
    rising,
    mostActive
  };
}

module.exports = {
  MIN_MATCHES_FOR_ESTABLISHED_RANK,
  getRankingHubData
};
