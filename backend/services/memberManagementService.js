/**
 * Member Management Hub Service
 * Comprehensive service for Member 360°, Reliability Score, Discipline (Yellow/Red Cards),
 * Transactional Coin Ledger, Activity Timeline, Audit Logs, and Safe Lifecycle Management.
 */

const db = require('../db');
const { getRankName } = require('../utils/elo');

/**
 * 1. Tính Derived Reliability Score (0 - 100)
 * Hoàn toàn phái sinh từ dữ liệu thực tế, Admin KHÔNG được sửa trực tiếp.
 */
async function calculateReliabilityScore(userId, client = db) {
  // Query attendance stats
  const attRes = await client.query(
    `SELECT status, is_late_cancellation, duration_minutes, checked_in_at, checked_out_at
     FROM attendances
     WHERE user_id = $1::uuid`,
    [userId]
  );

  let noShowCount = 0;
  let lateCancelCount = 0;
  let missingCheckoutCount = 0;
  let attendedValidCount = 0;

  attRes.rows.forEach(r => {
    if (r.status === 'NO_SHOW') {
      noShowCount++;
    } else if (r.is_late_cancellation || (r.status === 'CANCELLED' && r.is_late_cancellation)) {
      lateCancelCount++;
    } else if (r.status === 'MISSING_CHECKOUT') {
      missingCheckoutCount++;
      attendedValidCount++; // Có mặt tại sân nhưng quên checkout, vẫn tính là có tham gia
    } else if (['CHECKED_OUT', 'CHECKED_IN', 'going'].includes(r.status)) {
      attendedValidCount++;
    }
  });

  // Query active discipline records
  const discRes = await client.query(
    `SELECT type, status FROM member_discipline_records
     WHERE user_id = $1::uuid AND status = 'ACTIVE'`,
    [userId]
  );

  let activeYellowCards = 0;
  let activeRedCards = 0;
  let activeWarnings = 0;

  discRes.rows.forEach(r => {
    if (r.type === 'YELLOW') activeYellowCards++;
    else if (r.type === 'RED') activeRedCards++;
    else if (r.type === 'WARNING') activeWarnings++;
  });

  // Derived formula:
  // Base 100
  // - No-show: -20đ / lần
  // - Hủy trễ: -10đ / lần
  // - Thẻ vàng còn hiệu lực: -15đ / thẻ
  // - Thẻ đỏ còn hiệu lực: -40đ / thẻ
  // - Quên checkout: -5đ / lần
  // - Buổi tập hoàn thành hợp lệ (có check-in): +2đ / buổi
  const rawScore = 100 
    - (noShowCount * 20) 
    - (lateCancelCount * 10) 
    - (activeYellowCards * 15) 
    - (activeRedCards * 40) 
    - (missingCheckoutCount * 5) 
    + (attendedValidCount * 2);

  const boundedScore = Math.max(0, Math.min(100, Math.round(rawScore)));

  let label = 'Xuất sắc';
  let level = 'excellent';
  let color = 'emerald';

  if (boundedScore >= 90) {
    label = 'Xuất sắc';
    level = 'excellent';
    color = 'emerald';
  } else if (boundedScore >= 75) {
    label = 'Tốt';
    level = 'good';
    color = 'blue';
  } else if (boundedScore >= 50) {
    label = 'Trung bình';
    level = 'fair';
    color = 'amber';
  } else {
    label = 'Nguy cơ';
    level = 'risk';
    color = 'rose';
  }

  return {
    score: boundedScore,
    label,
    level,
    color,
    breakdown: {
      noShowCount,
      lateCancelCount,
      missingCheckoutCount,
      attendedValidCount,
      attendedCount: attendedValidCount,
      activeYellowCards,
      activeRedCards,
      activeWarnings
    }
  };
}

/**
 * 2. Member 360° - TAB 1: OVERVIEW
 * Nạp tức thì các thông số trọng yếu, loại bỏ hoàn toàn password_hash / tokens bảo mật
 */
async function getMemberOverview(userId) {
  const userRes = await db.query(
    `SELECT u.id, u.full_name, u.nickname, u.phone_zalo, u.email, u.academic_info, u.gender,
            u.avatar_url, u.badminton_level, u.soft_skills, u.role, u.status, u.is_blocked,
            u.tags, u.joined_at, u.created_at, u.deleted_at,
            COALESCE(u.elo_singles, 1000) as elo_singles,
            COALESCE(u.peak_elo_singles, 1000) as peak_elo_singles,
            COALESCE(u.matches_singles, 0) as matches_singles,
            COALESCE(u.win_singles, 0) as win_singles,
            COALESCE(u.loss_singles, 0) as loss_singles,
            COALESCE(u.win_rate_singles, 0) as win_rate_singles,
            COALESCE(u.streak_singles, 0) as streak_singles,
            COALESCE(u.max_streak_singles, 0) as max_streak_singles,
            COALESCE(u.elo_doubles, 1000) as elo_doubles,
            COALESCE(u.peak_elo_doubles, 1000) as peak_elo_doubles,
            COALESCE(u.matches_doubles, 0) as matches_doubles,
            COALESCE(u.win_doubles, 0) as win_doubles,
            COALESCE(u.loss_doubles, 0) as loss_doubles,
            COALESCE(u.win_rate_doubles, 0) as win_rate_doubles,
            COALESCE(u.streak_doubles, 0) as streak_doubles,
            COALESCE(u.max_streak_doubles, 0) as max_streak_doubles,
            COALESCE(u.level, 1) as level,
            COALESCE(u.xp, 0) as xp,
            COALESCE(u.smash_coins, 0) as smash_coins,
            u.selected_avatar_frame, u.selected_title,
            (u.password_hash IS NOT NULL) AS is_activated,
            rc.name as campaign_name,
            rc.id as campaign_id
     FROM users u
     LEFT JOIN casting_slots cs ON u.casting_slot_id = cs.id
     LEFT JOIN recruitment_campaigns rc ON cs.campaign_id = rc.id
     WHERE u.id = $1::uuid`,
    [userId]
  );

  if (userRes.rows.length === 0) {
    throw new Error('Không tìm thấy thành viên.');
  }

  const u = userRes.rows[0];

  // Derived Reliability Score
  const reliability = await calculateReliabilityScore(userId);

  // Active Discipline records summary
  const discRes = await db.query(
    `SELECT id, type, reason, session_id, issued_at, status
     FROM member_discipline_records
     WHERE user_id = $1::uuid AND status = 'ACTIVE'
     ORDER BY created_at DESC`,
    [userId]
  );

  const yellowCards = discRes.rows.filter(d => d.type === 'YELLOW').length;
  const redCards = discRes.rows.filter(d => d.type === 'RED').length;
  const warnings = discRes.rows.filter(d => d.type === 'WARNING').length;

  // Attendance summary
  const attStatsRes = await db.query(
    `SELECT 
       COUNT(*) FILTER (WHERE status IN ('CHECKED_OUT', 'CHECKED_IN', 'going')) as attended_count,
       COUNT(*) FILTER (WHERE status = 'NO_SHOW') as no_show_count,
       COUNT(*) FILTER (WHERE is_late_cancellation IS TRUE OR (status = 'CANCELLED' AND is_late_cancellation IS TRUE)) as late_cancel_count,
       COUNT(*) as total_reservations
     FROM attendances
     WHERE user_id = $1::uuid`,
    [userId]
  );
  const attStats = attStatsRes.rows[0];
  const attendedCount = parseInt(attStats.attended_count || 0, 10);
  const noShowCount = parseInt(attStats.no_show_count || 0, 10);
  const lateCancelCount = parseInt(attStats.late_cancel_count || 0, 10);
  const totalRelevant = attendedCount + noShowCount + lateCancelCount;
  const attendanceRate = totalRelevant > 0 ? Number(((attendedCount / totalRelevant) * 100).toFixed(1)) : 100;

  // Recent attendance list (3 latest)
  const recentAttRes = await db.query(
    `SELECT a.id, a.status, a.checked_in_at, a.checked_out_at, a.is_late_cancellation,
            s.id as session_id, s.title as session_title, s.date_time
     FROM attendances a
     JOIN sessions s ON a.session_id = s.id
     WHERE a.user_id = $1::uuid
     ORDER BY s.date_time DESC
     LIMIT 3`,
    [userId]
  );

  const memberObj = {
    id: u.id,
    full_name: u.full_name,
    fullName: u.full_name,
    nickname: u.nickname,
    phone_zalo: u.phone_zalo,
    phoneZalo: u.phone_zalo,
    email: u.email,
    academic_info: u.academic_info,
    academicInfo: u.academic_info,
    gender: u.gender,
    avatar_url: u.avatar_url,
    avatarUrl: u.avatar_url,
    badminton_level: u.badminton_level,
    badmintonLevel: u.badminton_level,
    hand_preference: u.hand_preference || 'right',
    handPreference: u.hand_preference || 'right',
    play_style: u.play_style || 'Công thủ toàn diện',
    playStyle: u.play_style || 'Công thủ toàn diện',
    soft_skills: typeof u.soft_skills === 'string' ? JSON.parse(u.soft_skills) : (u.soft_skills || []),
    softSkills: typeof u.soft_skills === 'string' ? JSON.parse(u.soft_skills) : (u.soft_skills || []),
    tags: u.tags || [],
    role: u.role,
    status: u.status || 'active',
    is_blocked: Boolean(u.is_blocked),
    isBlocked: Boolean(u.is_blocked),
    is_activated: Boolean(u.is_activated),
    isActivated: Boolean(u.is_activated),
    joined_at: u.joined_at || u.created_at,
    joinedAt: u.joined_at || u.created_at,
    created_at: u.created_at,
    createdAt: u.created_at,
    deleted_at: u.deleted_at,
    deletedAt: u.deleted_at,
    level: u.level || 1,
    xp: u.xp || 0,
    smashCoins: u.smash_coins || 0,
    smash_coins: u.smash_coins || 0,
    campaign: u.campaign_name ? { id: u.campaign_id, name: u.campaign_name } : null
  };

  const competitiveSummary = {
    singles: {
      elo: u.elo_singles,
      peakElo: Math.max(u.peak_elo_singles, u.elo_singles),
      rank: getRankName(u.elo_singles),
      matches: u.matches_singles,
      wins: u.win_singles,
      losses: u.loss_singles,
      winRate: Number(Number(u.win_rate_singles).toFixed(1)),
      streak: u.streak_singles,
      maxStreak: u.max_streak_singles
    },
    doubles: {
      elo: u.elo_doubles,
      peakElo: Math.max(u.peak_elo_doubles, u.elo_doubles),
      rank: getRankName(u.elo_doubles),
      matches: u.matches_doubles,
      wins: u.win_doubles,
      losses: u.loss_doubles,
      winRate: Number(Number(u.win_rate_doubles).toFixed(1)),
      streak: u.streak_doubles,
      maxStreak: u.max_streak_doubles
    }
  };

  const gamificationSummary = {
    level: u.level || 1,
    xp: u.xp || 0,
    smashCoins: u.smash_coins || 0,
    selectedAvatarFrame: u.selected_avatar_frame,
    selectedTitle: u.selected_title
  };

  const disciplineSummary = {
    yellowCards,
    activeYellowCards: yellowCards,
    redCards,
    activeRedCards: redCards,
    warnings,
    activeWarnings: warnings,
    activeRecords: discRes.rows
  };

  const attendanceSummary = {
    rate: attendanceRate,
    attendanceRate,
    attendedCount,
    noShowCount,
    lateCancelCount,
    totalReservations: totalRelevant,
    recent: recentAttRes.rows
  };

  return {
    member: memberObj,
    user: memberObj,
    competitive: competitiveSummary,
    competitiveSummary,
    gamification: gamificationSummary,
    reliability,
    discipline: disciplineSummary,
    disciplineSummary,
    attendance: attendanceSummary,
    attendanceSummary
  };
}

/**
 * 3. Member 360° - TAB 3: ATTENDANCE (Lazy Loaded)
 * Phân tích chuyên sâu mọi trạng thái: RESERVED, CONFIRMED, CHECKED_IN, CHECKED_OUT,
 * MISSING_CHECKOUT, CANCELLED, NO_SHOW và xu hướng 12 tuần gần nhất.
 */
async function getMemberAttendanceDetails(userId) {
  // Query all sessions joined/reserved by user
  const attRes = await db.query(
    `SELECT a.id, a.status, a.reserved_at, a.confirmed_at, a.checked_in_at, a.checked_out_at,
            a.cancelled_at, a.cancellation_reason, a.is_late_cancellation,
            a.duration_minutes, a.checkout_method, a.checkout_status,
            s.id as session_id, s.title as session_title, s.date_time, s.location,
            s.session_start, s.session_end, s.is_closed
     FROM attendances a
     JOIN sessions s ON a.session_id = s.id
     WHERE a.user_id = $1::uuid
     ORDER BY s.date_time DESC`,
    [userId]
  );

  let attendedCount = 0;
  let checkedOutCount = 0;
  let missingCheckoutCount = 0;
  let checkedInOnlyCount = 0;
  let noShowCount = 0;
  let lateCancelCount = 0;
  let validCancelCount = 0;
  let confirmedUpcomingCount = 0;
  let totalDurationMinutes = 0;

  const history = attRes.rows.map(row => {
    const isLateCancel = Boolean(row.is_late_cancellation) || (row.status === 'CANCELLED' && Boolean(row.is_late_cancellation));
    
    if (row.status === 'CHECKED_OUT') {
      attendedCount++;
      checkedOutCount++;
      totalDurationMinutes += (row.duration_minutes || 0);
    } else if (row.status === 'MISSING_CHECKOUT') {
      attendedCount++;
      missingCheckoutCount++;
      totalDurationMinutes += (row.duration_minutes || 0);
    } else if (['CHECKED_IN', 'going'].includes(row.status)) {
      attendedCount++;
      checkedInOnlyCount++;
      totalDurationMinutes += (row.duration_minutes || 0);
    } else if (row.status === 'NO_SHOW') {
      noShowCount++;
    } else if (isLateCancel) {
      lateCancelCount++;
    } else if (row.status === 'CANCELLED' || row.status === 'absent') {
      validCancelCount++;
    } else if (['RESERVED', 'CONFIRMED'].includes(row.status)) {
      confirmedUpcomingCount++;
    }

    return {
      id: row.id,
      sessionId: row.session_id,
      sessionTitle: row.session_title,
      dateTime: row.date_time,
      location: row.location,
      status: row.status,
      isLateCancel,
      cancellationReason: row.cancellation_reason,
      checkedInAt: row.checked_in_at,
      checkedOutAt: row.checked_out_at,
      durationMinutes: row.duration_minutes,
      checkoutMethod: row.checkout_method,
      checkoutStatus: row.checkout_status,
      isSessionClosed: Boolean(row.is_closed)
    };
  });

  const totalEvaluated = attendedCount + noShowCount + lateCancelCount;
  const attendanceRate = totalEvaluated > 0 ? Number(((attendedCount / totalEvaluated) * 100).toFixed(1)) : 100;

  // 12-Week trend aggregation
  const weeklyTrendMap = new Map();
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 7 * 86400000);
    const key = `${d.getFullYear()}-W${Math.ceil((d.getDate() + (6 - d.getDay())) / 7)}`;
    const label = `Tuần ${12 - i}`;
    weeklyTrendMap.set(label, { week: label, attended: 0, noShow: 0, lateCancel: 0, date: d });
  }

  history.forEach(item => {
    const itemDate = new Date(item.dateTime);
    const diffWeeks = Math.floor((now.getTime() - itemDate.getTime()) / (7 * 86400000));
    if (diffWeeks >= 0 && diffWeeks < 12) {
      const label = `Tuần ${12 - diffWeeks}`;
      const bucket = weeklyTrendMap.get(label);
      if (bucket) {
        if (['CHECKED_OUT', 'CHECKED_IN', 'MISSING_CHECKOUT', 'going'].includes(item.status)) {
          bucket.attended++;
        } else if (item.status === 'NO_SHOW') {
          bucket.noShow++;
        } else if (item.isLateCancel) {
          bucket.lateCancel++;
        }
      }
    }
  });

  const trend = Array.from(weeklyTrendMap.values());

  return {
    summary: {
      attendanceRate,
      attendedCount,
      checkedOutCount,
      missingCheckoutCount,
      checkedInOnlyCount,
      noShowCount,
      lateCancelCount,
      validCancelCount,
      confirmedUpcomingCount,
      totalDurationHours: Number((totalDurationMinutes / 60).toFixed(1)),
      totalSessionsTracked: history.length
    },
    trend,
    history
  };
}

/**
 * 4. Member 360° - TAB 4: COMPETITIVE (Lazy Loaded)
 * Source of Truth: Matches table + ELO stats
 */
async function getMemberCompetitiveDetails(userId) {
  // Query member ELO stats
  const userRes = await db.query(
    `SELECT elo_singles, peak_elo_singles, matches_singles, win_singles, loss_singles,
            win_rate_singles, streak_singles, max_streak_singles,
            elo_doubles, peak_elo_doubles, matches_doubles, win_doubles, loss_doubles,
            win_rate_doubles, streak_doubles, max_streak_doubles
     FROM users WHERE id = $1::uuid`,
    [userId]
  );

  const u = userRes.rows[0] || {};

  // Single Source of Truth for Match History
  const matchesRes = await db.query(
    `SELECT m.id, m.created_at, m.score_p1, m.score_p2, m.winner_id, m.elo_exchanged,
            m.player1_id, m.player2_id, m.player1_partner_id, m.player2_partner_id,
            m.p1_elo_before, m.p1_elo_after, m.p2_elo_before, m.p2_elo_after,
            m.p1_partner_elo_before, m.p1_partner_elo_after, m.p2_partner_elo_before, m.p2_partner_elo_after,
            p1.full_name as p1_name, p1.avatar_url as p1_avatar,
            p2.full_name as p2_name, p2.avatar_url as p2_avatar,
            p1p.full_name as p1p_name, p1p.avatar_url as p1p_avatar,
            p2p.full_name as p2p_name, p2p.avatar_url as p2p_avatar
     FROM matches m
     LEFT JOIN users p1 ON m.player1_id = p1.id
     LEFT JOIN users p2 ON m.player2_id = p2.id
     LEFT JOIN users p1p ON m.player1_partner_id = p1p.id
     LEFT JOIN users p2p ON m.player2_partner_id = p2p.id
     WHERE (m.player1_id = $1::uuid OR m.player2_id = $1::uuid 
            OR m.player1_partner_id = $1::uuid OR m.player2_partner_id = $1::uuid)
       AND m.status = 'approved'
     ORDER BY m.created_at DESC`,
    [userId]
  );

  const matchHistory = matchesRes.rows.map(m => {
    const isTeam1 = (m.player1_id === userId || m.player1_partner_id === userId);
    const isDoubles = Boolean(m.player1_partner_id || m.player2_partner_id);
    const isWinner = isTeam1 ? (m.winner_id === m.player1_id) : (m.winner_id === m.player2_id);

    let partnerName = null;
    let partnerAvatar = null;
    let opponentName = '';
    let opponentAvatar = '';
    let opponent2Name = null;
    let opponent2Avatar = null;
    let myScore = isTeam1 ? m.score_p1 : m.score_p2;
    let oppScore = isTeam1 ? m.score_p2 : m.score_p1;
    let eloBefore = 1000;
    let eloAfter = 1000;

    if (isTeam1) {
      if (m.player1_id === userId) {
        eloBefore = m.p1_elo_before;
        eloAfter = m.p1_elo_after;
      } else {
        eloBefore = m.p1_partner_elo_before;
        eloAfter = m.p1_partner_elo_after;
      }
      partnerName = m.player1_id === userId ? m.p1p_name : m.p1_name;
      partnerAvatar = m.player1_id === userId ? m.p1p_avatar : m.p1_avatar;
      opponentName = m.p2_name;
      opponentAvatar = m.p2_avatar;
      opponent2Name = m.p2p_name;
      opponent2Avatar = m.p2p_avatar;
    } else {
      if (m.player2_id === userId) {
        eloBefore = m.p2_elo_before;
        eloAfter = m.p2_elo_after;
      } else {
        eloBefore = m.p2_partner_elo_before;
        eloAfter = m.p2_partner_elo_after;
      }
      partnerName = m.player2_id === userId ? m.p2p_name : m.p2_name;
      partnerAvatar = m.player2_id === userId ? m.p2p_avatar : m.p2_avatar;
      opponentName = m.p1_name;
      opponentAvatar = m.p1_avatar;
      opponent2Name = m.p1p_name;
      opponent2Avatar = m.p1p_avatar;
    }

    const eloDelta = eloAfter - eloBefore;

    return {
      id: m.id,
      mode: isDoubles ? 'doubles' : 'singles',
      isDoubles,
      isWinner,
      myScore,
      oppScore,
      eloBefore,
      eloAfter,
      eloDelta,
      partner: partnerName ? { name: partnerName, avatar: partnerAvatar } : null,
      opponent: { name: opponentName, avatar: opponentAvatar },
      opponent2: opponent2Name ? { name: opponent2Name, avatar: opponent2Avatar } : null,
      createdAt: m.created_at
    };
  });

  return {
    singles: {
      elo: u.elo_singles || 1000,
      peakElo: Math.max(u.peak_elo_singles || 1000, u.elo_singles || 1000),
      rank: getRankName(u.elo_singles || 1000),
      matches: u.matches_singles || 0,
      wins: u.win_singles || 0,
      losses: u.loss_singles || 0,
      winRate: Number(Number(u.win_rate_singles || 0).toFixed(1)),
      streak: u.streak_singles || 0,
      maxStreak: u.max_streak_singles || 0
    },
    doubles: {
      elo: u.elo_doubles || 1000,
      peakElo: Math.max(u.peak_elo_doubles || 1000, u.elo_doubles || 1000),
      rank: getRankName(u.elo_doubles || 1000),
      matches: u.matches_doubles || 0,
      wins: u.win_doubles || 0,
      losses: u.loss_doubles || 0,
      winRate: Number(Number(u.win_rate_doubles || 0).toFixed(1)),
      streak: u.streak_doubles || 0,
      maxStreak: u.max_streak_doubles || 0
    },
    matches: matchHistory
  };
}

/**
 * 5. Member 360° - TAB 5: GAMIFICATION & COIN LEDGER (Lazy Loaded)
 */
async function getMemberGamificationDetails(userId) {
  // Query User level, XP, Coins
  const userRes = await db.query(
    `SELECT level, xp, smash_coins, selected_avatar_frame, selected_title
     FROM users WHERE id = $1::uuid`,
    [userId]
  );
  const u = userRes.rows[0] || {};

  // Inventory items (titles and frames)
  const invRes = await db.query(
    `SELECT ui.id, ui.item_type, ui.item_name, ui.is_equipped, ui.purchased_at, ui.purchase_price,
            si.image_url as icon_url, si.description
     FROM user_inventory ui
     LEFT JOIN shop_items si ON ui.shop_item_id = si.id
     WHERE ui.user_id = $1::uuid
     ORDER BY ui.purchased_at DESC`,
    [userId]
  );

  // Quests summary
  const questsRes = await db.query(
    `SELECT q.id, q.title, q.quest_type, q.action_type, q.target_count, q.xp_reward, q.coin_reward,
            uq.current_count, uq.is_completed, uq.is_claimed, uq.updated_at
     FROM user_quests uq
     JOIN quests q ON uq.quest_id = q.id
     WHERE uq.user_id = $1::uuid
     ORDER BY uq.is_completed DESC, uq.updated_at DESC`,
    [userId]
  );

  // Coin Ledger (Transactions)
  const coinTxRes = await db.query(
    `SELECT ct.id, ct.amount, ct.balance_after, ct.source, ct.reason, ct.created_at,
            admin.full_name as admin_name
     FROM coin_transactions ct
     LEFT JOIN users admin ON ct.admin_id = admin.id
     WHERE ct.user_id = $1::uuid
     ORDER BY ct.created_at DESC
     LIMIT 50`,
    [userId]
  );

  const completedQuestsCount = questsRes.rows.filter(q => q.is_completed || q.status === 'completed').length;
  const activeQuestsCount = questsRes.rows.filter(q => !q.is_completed && q.status !== 'completed').length;

  return {
    level: u.level || 1,
    xp: u.xp || 0,
    smashCoins: u.smash_coins || 0,
    stats: {
      level: u.level || 1,
      xp: u.xp || 0,
      smashCoins: u.smash_coins || 0,
      selectedAvatarFrame: u.selected_avatar_frame,
      selectedTitle: u.selected_title
    },
    inventory: {
      selectedTitle: u.selected_title,
      selectedAvatarFrame: u.selected_avatar_frame,
      items: invRes.rows
    },
    inventoryList: invRes.rows,
    quests: {
      completedQuestsCount,
      activeQuestsCount,
      list: questsRes.rows
    },
    questsList: questsRes.rows,
    coinTransactions: coinTxRes.rows
  };
}

/**
 * 6. Member 360° - TAB 6: UNIFIED ACTIVITY TIMELINE (Lazy Loaded)
 * Kết nối dữ liệu đa nguồn: Reservation, Check-in, Check-out, Matches, Quests, Disciplines, Admin Actions
 */
async function getMemberActivityTimeline(userId) {
  const events = [];

  // A. Sessions & Attendances
  const attRes = await db.query(
    `SELECT a.status, a.reserved_at, a.checked_in_at, a.checked_out_at, a.cancelled_at,
            a.cancellation_reason, a.is_late_cancellation,
            s.title as session_title, s.date_time
     FROM attendances a
     JOIN sessions s ON a.session_id = s.id
     WHERE a.user_id = $1::uuid`,
    [userId]
  );

  attRes.rows.forEach(r => {
    if (r.reserved_at) {
      events.push({
        type: 'RESERVATION',
        icon: 'Calendar',
        color: 'blue',
        title: `Đăng ký slot buổi tập`,
        description: `Đặt chỗ thành công buổi tập: ${r.session_title}`,
        timestamp: r.reserved_at
      });
    }
    if (r.checked_in_at) {
      events.push({
        type: 'CHECK_IN',
        icon: 'CheckCircle2',
        color: 'emerald',
        title: `Check-in có mặt tại sân`,
        description: `Quét mã check-in buổi tập: ${r.session_title}`,
        timestamp: r.checked_in_at
      });
    }
    if (r.checked_out_at) {
      events.push({
        type: 'CHECK_OUT',
        icon: 'Clock',
        color: 'indigo',
        title: `Check-out ra về`,
        description: `Hoàn tất buổi tập: ${r.session_title}`,
        timestamp: r.checked_out_at
      });
    }
    if (r.status === 'NO_SHOW') {
      events.push({
        type: 'NO_SHOW',
        icon: 'AlertTriangle',
        color: 'rose',
        title: `Vắng mặt không báo trước (No-Show)`,
        description: `Không có mặt tại buổi tập: ${r.session_title}`,
        timestamp: r.date_time
      });
    }
    if (r.cancelled_at) {
      events.push({
        type: 'CANCELLED',
        icon: 'XCircle',
        color: r.is_late_cancellation ? 'rose' : 'slate',
        title: r.is_late_cancellation ? `Hủy slot trễ` : `Hủy giữ chỗ hợp lệ`,
        description: `Buổi tập: ${r.session_title}. Lý do: ${r.cancellation_reason || 'Không nêu'}`,
        timestamp: r.cancelled_at
      });
    }
  });

  // B. Matches
  const matchesRes = await db.query(
    `SELECT m.id, m.created_at, m.winner_id, m.player1_id, m.score_p1, m.score_p2,
            m.player1_partner_id,
            p1.full_name as p1_name, p2.full_name as p2_name
     FROM matches m
     LEFT JOIN users p1 ON m.player1_id = p1.id
     LEFT JOIN users p2 ON m.player2_id = p2.id
     WHERE (m.player1_id = $1::uuid OR m.player2_id = $1::uuid 
            OR m.player1_partner_id = $1::uuid OR m.player2_partner_id = $1::uuid)
       AND m.status = 'approved'`,
    [userId]
  );

  matchesRes.rows.forEach(m => {
    const isTeam1 = (m.player1_id === userId || m.player1_partner_id === userId);
    const isWinner = isTeam1 ? (m.winner_id === m.player1_id) : (m.winner_id === m.player2_id);
    const oppName = isTeam1 ? m.p2_name : m.p1_name;

    events.push({
      type: 'MATCH',
      icon: 'Swords',
      color: isWinner ? 'amber' : 'slate',
      title: isWinner ? `Chiến thắng trận giao lưu` : `Hoàn thành trận giao lưu`,
      description: `Thi đấu với ${oppName} (Tỉ số: ${isTeam1 ? m.score_p1 : m.score_p2} - ${isTeam1 ? m.score_p2 : m.score_p1})`,
      timestamp: m.created_at
    });
  });

  // C. Discipline records
  const discRes = await db.query(
    `SELECT type, reason, status, issued_at, revoked_at
     FROM member_discipline_records
     WHERE user_id = $1::uuid`,
    [userId]
  );

  discRes.rows.forEach(d => {
    events.push({
      type: 'DISCIPLINE_ISSUED',
      icon: 'ShieldAlert',
      color: d.type === 'RED' ? 'red' : (d.type === 'YELLOW' ? 'amber' : 'purple'),
      title: `Nhận thẻ phạt: ${d.type}`,
      description: d.reason,
      timestamp: d.issued_at
    });
    if (d.status === 'REVOKED' && d.revoked_at) {
      events.push({
        type: 'DISCIPLINE_REVOKED',
        icon: 'Unlock',
        color: 'emerald',
        title: `Hủy thẻ phạt: ${d.type}`,
        description: `Ban Quản Trị đã xóa bỏ thẻ phạt này`,
        timestamp: d.revoked_at
      });
    }
  });

  // D. Coin transactions
  const coinRes = await db.query(
    `SELECT amount, balance_after, source, reason, created_at
     FROM coin_transactions
     WHERE user_id = $1::uuid`,
    [userId]
  );

  coinRes.rows.forEach(c => {
    events.push({
      type: 'COIN_TX',
      icon: 'Coins',
      color: c.amount > 0 ? 'emerald' : 'indigo',
      title: c.amount > 0 ? `+${c.amount} Smash Coins` : `${c.amount} Smash Coins`,
      description: `${c.reason} (Nguồn: ${c.source})`,
      timestamp: c.created_at
    });
  });

  // E. Admin audit logs
  const auditRes = await db.query(
    `SELECT mal.action_type, mal.reason, mal.created_at, admin.full_name as admin_name
     FROM member_audit_logs mal
     LEFT JOIN users admin ON mal.admin_id = admin.id
     WHERE mal.user_id = $1::uuid`,
    [userId]
  );

  auditRes.rows.forEach(a => {
    events.push({
      type: 'ADMIN_ACTION',
      icon: 'ShieldCheck',
      color: 'slate',
      title: `Can thiệp từ Admin: ${a.action_type}`,
      description: `Bởi ${a.admin_name || 'Hệ thống'}. Lý do: ${a.reason || 'Không nêu'}`,
      timestamp: a.created_at
    });
  });

  // Sort descending by timestamp
  events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const sortedEvents = events.slice(0, 100).map((ev, idx) => ({
    id: ev.id || `${ev.type}_${idx}_${new Date(ev.timestamp).getTime()}`,
    ...ev
  }));
  return {
    timeline: sortedEvents,
    events: sortedEvents
  };
}

/**
 * 7. Member 360° - TAB 7: AUDIT HISTORY (Lazy Loaded)
 */
async function getMemberAuditHistory(userId) {
  const [logsRes, discRes] = await Promise.all([
    db.query(
      `SELECT mal.*, admin.full_name as admin_name
       FROM member_audit_logs mal
       LEFT JOIN users admin ON mal.admin_id = admin.id
       WHERE mal.user_id = $1::uuid
       ORDER BY mal.created_at DESC`,
      [userId]
    ),
    db.query(
      `SELECT mdr.*, 
              issuer.full_name as issuer_name,
              revoker.full_name as revoked_by_admin_name
       FROM member_discipline_records mdr
       LEFT JOIN users issuer ON mdr.issued_by = issuer.id
       LEFT JOIN users revoker ON mdr.revoked_by = revoker.id
       WHERE mdr.user_id = $1::uuid
       ORDER BY mdr.created_at DESC`,
      [userId]
    )
  ]);

  return {
    auditLogs: logsRes.rows.map(r => ({
      id: r.id,
      actionType: r.action_type,
      fieldName: r.field_name,
      oldValue: r.old_value,
      newValue: r.new_value,
      reason: r.reason,
      adminName: r.admin_name,
      createdAt: r.created_at
    })),
    disciplineRecords: discRes.rows.map(r => ({
      id: r.id,
      type: r.type,
      reason: r.reason,
      note: r.note || (r.metadata && r.metadata.note) || null,
      status: r.status,
      issuedAt: r.issued_at,
      expiresAt: r.expires_at,
      issuerName: r.issuer_name,
      revokedReason: r.revoked_reason,
      revokedByAdminName: r.revoked_by_admin_name,
      revokedAt: r.revoked_at,
      createdAt: r.created_at
    }))
  };
}

/**
 * Ghi nhận Audit Log
 */
async function recordAuditLog({ userId, adminId, actionType, fieldName = null, oldValue = null, newValue = null, reason = null, metadata = {} }, client = db) {
  try {
    await client.query(
      `INSERT INTO member_audit_logs (user_id, admin_id, action_type, field_name, old_value, new_value, reason, metadata)
       VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6, $7, $8::jsonb)`,
      [userId, adminId || null, actionType, fieldName, String(oldValue || ''), String(newValue || ''), reason, JSON.stringify(metadata)]
    );
  } catch (err) {
    console.error('Error recording member audit log:', err);
  }
}

/**
 * Transactional Coin Adjustment
 */
async function adjustUserCoins({ userId, amount, source = 'MANUAL_ADMIN', reason, adminId }) {
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const userRes = await client.query(
      `SELECT smash_coins, full_name FROM users WHERE id = $1::uuid FOR UPDATE`,
      [userId]
    );
    if (userRes.rows.length === 0) {
      throw new Error('Không tìm thấy người dùng.');
    }

    const currentCoins = userRes.rows[0].smash_coins || 0;
    const newBalance = Math.max(0, currentCoins + amount);

    await client.query(
      `UPDATE users SET smash_coins = $1 WHERE id = $2::uuid`,
      [newBalance, userId]
    );

    const txRes = await client.query(
      `INSERT INTO coin_transactions (user_id, amount, balance_after, source, reason, admin_id)
       VALUES ($1::uuid, $2, $3, $4, $5, $6::uuid)
       RETURNING *`,
      [userId, amount, newBalance, source, reason, adminId || null]
    );

    await recordAuditLog({
      userId,
      adminId,
      actionType: 'ADJUST_COINS',
      fieldName: 'smash_coins',
      oldValue: currentCoins,
      newValue: newBalance,
      reason,
      metadata: { delta: amount, source }
    }, client);

    await client.query('COMMIT');
    return {
      success: true,
      balance: newBalance,
      newBalance,
      transaction: txRes.rows[0]
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Ban hành thẻ phạt kỷ luật
 */
async function issueDisciplineRecord({ userId, type, reason, sessionId = null, issuedBy = null, expiresAt = null, metadata = {} }) {
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const res = await client.query(
      `INSERT INTO member_discipline_records (user_id, type, reason, session_id, issued_by, expires_at, status, metadata)
       VALUES ($1::uuid, $2, $3, $4::uuid, $5::uuid, $6, 'ACTIVE', $7::jsonb)
       RETURNING *`,
      [userId, type, reason, sessionId || null, issuedBy || null, expiresAt || null, JSON.stringify(metadata)]
    );

    const record = res.rows[0];

    await recordAuditLog({
      userId,
      adminId: issuedBy,
      actionType: 'ISSUE_DISCIPLINE',
      fieldName: type,
      newValue: 'ACTIVE',
      reason,
      metadata: { recordId: record.id, sessionId }
    }, client);

    await client.query('COMMIT');
    return record;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Thu hồi / Hủy thẻ phạt (Lưu vết REVOKED, không xóa vật lý)
 */
async function revokeDisciplineRecord({ recordId, revokedBy, reason }) {
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const findRes = await client.query(
      `SELECT * FROM member_discipline_records WHERE id = $1::uuid FOR UPDATE`,
      [recordId]
    );

    if (findRes.rows.length === 0) {
      throw new Error('Không tìm thấy thẻ phạt này.');
    }

    const rec = findRes.rows[0];
    if (rec.status === 'REVOKED') {
      throw new Error('Thẻ phạt này đã được thu hồi trước đó.');
    }

    const updateRes = await client.query(
      `UPDATE member_discipline_records 
       SET status = 'REVOKED', revoked_by = $1::uuid, revoked_reason = $2, revoked_at = NOW()
       WHERE id = $3::uuid
       RETURNING *`,
      [revokedBy || null, reason, recordId]
    );

    await recordAuditLog({
      userId: rec.user_id,
      adminId: revokedBy,
      actionType: 'REVOKE_DISCIPLINE',
      fieldName: rec.type,
      oldValue: 'ACTIVE',
      newValue: 'REVOKED',
      reason,
      metadata: { recordId }
    }, client);

    await client.query('COMMIT');
    return updateRes.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * No-show Trigger: Chỉ kích hoạt quét No-show và cấp Discipline Record sau khi Session đã CHUYỂN SANG TRẠNG THÁI CLOSED
 */
async function processNoShowDisciplineForClosedSession(sessionId, adminId = null) {
  const client = await db.connect();
  try {
    // 1. Kiểm tra session có đúng là is_closed = true không
    const sessionRes = await client.query(
      `SELECT id, title, is_closed, date_time FROM sessions WHERE id = $1::uuid`,
      [sessionId]
    );
    if (sessionRes.rows.length === 0) return { count: 0 };
    const session = sessionRes.rows[0];
    if (!session.is_closed) return { count: 0 }; // Chỉ chạy khi session CLOSED

    // 2. Tìm tất cả attendances là NO_SHOW của session này
    const noShowsRes = await client.query(
      `SELECT a.id, a.user_id, u.full_name
       FROM attendances a
       JOIN users u ON a.user_id = u.id
       WHERE a.session_id = $1::uuid AND a.status = 'NO_SHOW'`,
      [sessionId]
    );

    let issuedCount = 0;

    for (const att of noShowsRes.rows) {
      // 3. Kiểm tra idempotency: đã có thẻ phạt nào gắn với session này cho user chưa
      const existingRes = await client.query(
        `SELECT id FROM member_discipline_records 
         WHERE user_id = $1::uuid AND session_id = $2::uuid`,
        [att.user_id, sessionId]
      );

      if (existingRes.rows.length === 0) {
        // Cấp Thẻ Vàng (YELLOW) với lý do No-Show buổi tập đã đóng
        await issueDisciplineRecord({
          userId: att.user_id,
          type: 'YELLOW',
          reason: `Vắng mặt không báo trước (No-show) buổi tập "${session.title}" (Buổi tập đã kết thúc & đóng).`,
          sessionId,
          issuedBy: adminId,
          metadata: { auto_session_closed: true }
        });
        issuedCount++;
      }
    }

    return { count: issuedCount };
  } catch (err) {
    console.error('Error processing no-show discipline for closed session:', err);
    return { count: 0 };
  } finally {
    client.release();
  }
}

/**
 * Chỉnh sửa thông tin cá nhân thành viên kèm Audit Trail
 */
async function updateMemberPersonalInfo({ userId, adminId, data, updates, reason }) {
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const payload = updates || data || {};
    const auditReason = reason || payload.reason || 'Cập nhật hồ sơ cá nhân';

    const curRes = await client.query(
      `SELECT full_name, nickname, phone_zalo, email, academic_info, gender, badminton_level, hand_preference, play_style, avatar_url, soft_skills, tags
       FROM users WHERE id = $1::uuid FOR UPDATE`,
      [userId]
    );
    if (curRes.rows.length === 0) throw new Error('Không tìm thấy thành viên.');
    const cur = curRes.rows[0];

    const fields = [];
    const params = [];
    let pIdx = 1;

    const allowed = [
      'full_name', 'nickname', 'phone_zalo', 'email', 'academic_info',
      'gender', 'badminton_level', 'hand_preference', 'play_style', 'avatar_url'
    ];
    for (const key of allowed) {
      if (payload[key] !== undefined) {
        fields.push(`${key} = $${pIdx}`);
        params.push(payload[key]);
        pIdx++;

        if (String(cur[key] || '') !== String(payload[key] || '')) {
          await recordAuditLog({
            userId,
            adminId,
            actionType: 'EDIT_PROFILE',
            fieldName: key,
            oldValue: cur[key],
            newValue: payload[key],
            reason: auditReason
          }, client);
        }
      }
    }

    if (payload.soft_skills !== undefined) {
      const skillsJson = JSON.stringify(payload.soft_skills);
      fields.push(`soft_skills = $${pIdx}`);
      params.push(skillsJson);
      pIdx++;
      await recordAuditLog({
        userId,
        adminId,
        actionType: 'EDIT_PROFILE',
        fieldName: 'soft_skills',
        oldValue: JSON.stringify(cur.soft_skills),
        newValue: skillsJson,
        reason: auditReason
      }, client);
    }

    if (payload.tags !== undefined) {
      const tagsArray = Array.isArray(payload.tags) ? payload.tags : [];
      fields.push(`tags = $${pIdx}`);
      params.push(tagsArray);
      pIdx++;
      await recordAuditLog({
        userId,
        adminId,
        actionType: 'EDIT_PROFILE',
        fieldName: 'tags',
        oldValue: (cur.tags || []).join(', '),
        newValue: tagsArray.join(', '),
        reason: auditReason
      }, client);
    }

    let updatedRow = cur;
    if (fields.length > 0) {
      params.push(userId);
      const updateRes = await client.query(
        `UPDATE users SET ${fields.join(', ')} WHERE id = $${pIdx}::uuid RETURNING *`,
        params
      );
      updatedRow = updateRes.rows[0];
    }

    await client.query('COMMIT');
    return updatedRow;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Xóa an toàn / Lưu trữ vòng đời (Soft Archive vs Hard Delete)
 */
async function safeArchiveOrDeleteMember({ userId, adminId, reason }) {
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    // Kiểm tra lịch sử thi đấu và chuyên cần
    const [matchCheck, attCheck] = await Promise.all([
      client.query(`SELECT id FROM matches WHERE (player1_id = $1::uuid OR player2_id = $1::uuid OR player1_partner_id = $1::uuid OR player2_partner_id = $1::uuid) LIMIT 1`, [userId]),
      client.query(`SELECT id FROM attendances WHERE user_id = $1::uuid LIMIT 1`, [userId])
    ]);

    const hasHistory = (matchCheck.rows.length > 0 || attCheck.rows.length > 0);

    if (hasHistory) {
      // Soft Archive: Bảo tồn lịch sử đối đầu và chuyên cần
      await client.query(
        `UPDATE users SET status = 'archived', deleted_at = NOW(), is_blocked = true WHERE id = $1::uuid`,
        [userId]
      );

      await recordAuditLog({
        userId,
        adminId,
        actionType: 'ARCHIVE_USER',
        oldValue: 'active',
        newValue: 'archived',
        reason: reason || 'Lưu trữ thành viên (Bảo toàn lịch sử thi đấu & chuyên cần)'
      }, client);

      await client.query('COMMIT');
      return {
        action: 'archived',
        message: 'Thành viên này đã có dữ liệu thi đấu hoặc chuyên cần. Hệ thống đã chuyển sang trạng thái "Lưu trữ" (Archived) và vô hiệu hóa tài khoản để bảo toàn tính toàn vẹn dữ liệu cho toàn bộ CLB.'
      };
    } else {
      // Hard delete safe cho tài khoản rác
      await recordAuditLog({
        userId,
        adminId,
        actionType: 'DELETE_USER',
        reason: reason || 'Xóa tài khoản trắng chưa có lịch sử'
      }, client);

      await client.query(`DELETE FROM users WHERE id = $1::uuid`, [userId]);
      await client.query('COMMIT');
      return {
        action: 'deleted',
        message: 'Đã xóa tài khoản vĩnh viễn khỏi hệ thống.'
      };
    }
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  calculateReliabilityScore,
  getMemberOverview,
  getMemberAttendanceDetails,
  getMemberCompetitiveDetails,
  getMemberGamificationDetails,
  getMemberActivityTimeline,
  getMemberAuditHistory,
  recordAuditLog,
  adjustUserCoins,
  issueDisciplineRecord,
  revokeDisciplineRecord,
  processNoShowDisciplineForClosedSession,
  updateMemberPersonalInfo,
  safeArchiveOrDeleteMember
};
