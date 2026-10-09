const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { addXpToUser } = require('../utils/gamification');

// Protect all routes
router.use(authenticateToken);

const {
  getVietnamDateString,
  isSameVietnamDay,
  getVietnamWeekString,
  getVietnamMonthString
} = require('../utils/date');

// Check and Update Streak on Profile load (Asia/Ho_Chi_Minh timezone)
async function checkAndUpdateStreak(userId, client = db) {
  const userRes = await client.query(
    'SELECT last_active_date, current_streak, max_streak, streak_shields FROM users WHERE id = $1',
    [userId]
  );
  if (userRes.rows.length === 0) return null;
  
  const user = userRes.rows[0];
  const lastActiveDateStr = user.last_active_date;
  let currentStreak = user.current_streak || 0;
  let maxStreak = user.max_streak || 0;
  let streakShields = user.streak_shields || 0;
  let streakNotification = null;

  const todayStr = getVietnamDateString();
  if (!lastActiveDateStr) {
    await client.query(
      'UPDATE users SET current_streak = 1, max_streak = GREATEST(max_streak, 1), last_active_date = CURRENT_DATE WHERE id = $1',
      [userId]
    );
    return { currentStreak: 1, streakShields, streakNotification: null };
  }

  const lastActiveStr = getVietnamDateString(lastActiveDateStr);
  const todayDate = new Date(todayStr);
  const lastDate = new Date(lastActiveStr);
  const diffTime = todayDate.getTime() - lastDate.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    // Already active today in Vietnam timezone
  } else if (diffDays === 1) {
    // Active yesterday, increment streak
    currentStreak += 1;
    maxStreak = Math.max(maxStreak, currentStreak);
    await client.query(
      'UPDATE users SET current_streak = $1, max_streak = $2, last_active_date = CURRENT_DATE WHERE id = $3',
      [currentStreak, maxStreak, userId]
    );
  } else {
    // Missed a day: reset daily active streak (không tiêu tốn khiên thi đấu)
    currentStreak = 1;
    await client.query(
      'UPDATE users SET current_streak = $1, last_active_date = CURRENT_DATE WHERE id = $2',
      [currentStreak, userId]
    );
    streakNotification = "Chuỗi ngày hoạt động 🔥 của bạn đã chuyển về ngày 1.";
  }

  return { currentStreak, streakShields, streakNotification };
}

// Tự động hết hạn khiên (7 ngày) và đồng bộ streak_shields trên bảng users
async function cleanupAndSyncShields(userId, client = db) {
  await client.query(
    `UPDATE user_inventory 
     SET status = 'expired' 
     WHERE user_id = $1 
       AND (item_type IN ('shield', 'streak_shield') OR item_name ILIKE '%khiên%') 
       AND status = 'unused' 
       AND expires_at IS NOT NULL 
       AND expires_at <= NOW()`,
    [userId]
  );

  await client.query(
    `UPDATE users u
     SET streak_shields = (
       SELECT COUNT(*)::int 
       FROM user_inventory 
       WHERE user_id = u.id 
         AND (item_type IN ('shield', 'streak_shield') OR item_name ILIKE '%khiên%') 
         AND status = 'unused' 
         AND (expires_at IS NULL OR expires_at > NOW())
     )
     WHERE u.id = $1`,
    [userId]
  );
}

// GET /api/gamification/profile
router.get('/profile', async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Tự động dọn dẹp các vật phẩm đã hết hạn
    await db.query(
      `WITH expired_items AS (
         UPDATE user_inventory 
         SET is_equipped = false 
         WHERE user_id = $1 AND expires_at <= NOW() AND is_equipped = true
         RETURNING item_type
       )
       UPDATE users
       SET 
         selected_avatar_frame = CASE WHEN EXISTS (SELECT 1 FROM expired_items WHERE item_type = 'avatar_frame') THEN NULL ELSE selected_avatar_frame END,
         selected_title = CASE WHEN EXISTS (SELECT 1 FROM expired_items WHERE item_type = 'title') THEN NULL ELSE selected_title END
       WHERE id = $1`,
      [userId]
    );

    // Dọn dẹp và đồng bộ số khiên còn hạn
    await cleanupAndSyncShields(userId);
    
    // Check and update streak
    const streakInfo = await checkAndUpdateStreak(userId);
    
    const userRes = await db.query(
      `SELECT level, xp, smash_coins, current_streak, max_streak, streak_shields, 
              selected_avatar_frame, selected_title 
       FROM users WHERE id = $1`,
      [userId]
    );

    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userRes.rows[0];
    const { getXpForLevel } = require('../utils/gamification');
    const xpNeeded = getXpForLevel(user.level);

    res.json({
      ...user,
      xp_needed: xpNeeded,
      streak_notification: streakInfo?.streakNotification || null
    });
  } catch (error) {
    console.error('Error fetching gamification profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/gamification/quests - Lấy danh sách nhiệm vụ (Read-Only query, derived in-memory)
router.get('/quests', async (req, res) => {
  try {
    const userId = req.user.id;
    
    // 1. Lấy tất cả nhiệm vụ đang hoạt động
    const questsRes = await db.query('SELECT * FROM quests WHERE is_active = true ORDER BY id ASC');
    const quests = questsRes.rows;

    // 2. Lấy thông tin tiến độ của người dùng
    const userQuestsRes = await db.query(
      'SELECT quest_id, current_count, is_completed, is_claimed, updated_at FROM user_quests WHERE user_id = $1',
      [userId]
    );
    const userQuests = userQuestsRes.rows;

    // 3. NGUỒN CHÂN LÝ CHO QUEST ĐIỂM DANH: Kiểm tra user có attendance CHECKED_IN hoặc CHECKED_OUT hôm nay theo giờ Việt Nam
    const checkInRes = await db.query(
      `SELECT EXISTS (
         SELECT 1 FROM attendances
         WHERE user_id = $1
           AND status IN ('CHECKED_IN', 'CHECKED_OUT')
           AND to_char(COALESCE(checked_in_at, created_at) AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYYY-MM-DD') = to_char(CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYYY-MM-DD')
       ) AS has_checked_in_today`,
      [userId]
    );
    const hasCheckedInToday = Boolean(checkInRes.rows[0]?.has_checked_in_today);

    const now = new Date();
    const resultList = [];

    for (const q of quests) {
      const progress = userQuests.find(uq => uq.quest_id === q.id);

      if (q.action_type === 'check_in') {
        // NGUỒN CHÂN LÝ: Bảng attendances
        const isCompleted = hasCheckedInToday;
        const currentCount = hasCheckedInToday ? Math.max(1, q.target_count || 1) : 0;
        // Chỉ coi là đã nhận thưởng nếu hôm nay đã check-in VÀ bản ghi claim diễn ra trong ngày hôm nay (Asia/Ho_Chi_Minh)
        const isClaimed = Boolean(
          hasCheckedInToday &&
          progress &&
          progress.is_claimed &&
          progress.updated_at &&
          isSameVietnamDay(progress.updated_at, now)
        );

        resultList.push({
          ...q,
          current_count: currentCount,
          is_completed: isCompleted,
          is_claimed: isClaimed,
          updated_at: progress ? progress.updated_at : null
        });
        continue;
      }

      // Các nhiệm vụ khác (play_matches, win_matches, volunteer, etc.)
      if (progress) {
        let currentCount = progress.current_count;
        let isCompleted = progress.is_completed;
        let isClaimed = progress.is_claimed;
        const updatedAt = progress.updated_at;
        let isCycleExpired = false;

        if (updatedAt) {
          if (q.quest_type === 'daily') {
            if (!isSameVietnamDay(updatedAt, now)) {
              isCycleExpired = true;
            }
          } else if (q.quest_type === 'weekly') {
            if (getVietnamWeekString(updatedAt) !== getVietnamWeekString(now)) {
              isCycleExpired = true;
            }
          } else if (q.quest_type === 'monthly') {
            if (getVietnamMonthString(updatedAt) !== getVietnamMonthString(now)) {
              isCycleExpired = true;
            }
          }
        }

        // Tính toán động (in-memory) cho chu kỳ mới mà KHÔNG ghi đè DB trong hàm GET
        if (isCycleExpired) {
          currentCount = 0;
          isCompleted = false;
          isClaimed = false;
        }

        resultList.push({
          ...q,
          current_count: currentCount,
          is_completed: isCompleted,
          is_claimed: isClaimed,
          updated_at: updatedAt
        });
      } else {
        resultList.push({
          ...q,
          current_count: 0,
          is_completed: false,
          is_claimed: false,
          updated_at: null
        });
      }
    }

    res.json(resultList);
  } catch (error) {
    console.error('Error fetching quests:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/gamification/quests/:id/claim - Nhận thưởng (Race Condition Prevention via DB Transaction)
router.post('/quests/:id/claim', async (req, res) => {
  const userId = req.user.id;
  const questId = req.params.id;

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    // 1. Lấy thông tin quest
    const questRes = await client.query(
      'SELECT id, title, quest_type, action_type, target_count, xp_reward, coin_reward, is_active FROM quests WHERE id = $1',
      [questId]
    );

    if (questRes.rows.length === 0 || !questRes.rows[0].is_active) {
      throw new Error('Nhiệm vụ không tồn tại hoặc đã ngừng hoạt động.');
    }

    const quest = questRes.rows[0];
    const now = new Date();

    // 2. Xử lý riêng cho nhiệm vụ check_in: BẢNG ATTENDANCES LÀ CHÂN LÝ
    if (quest.action_type === 'check_in') {
      const checkInRes = await client.query(
        `SELECT EXISTS (
           SELECT 1 FROM attendances
           WHERE user_id = $1
             AND status IN ('CHECKED_IN', 'CHECKED_OUT')
             AND to_char(COALESCE(checked_in_at, created_at) AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYYY-MM-DD') = to_char(CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYYY-MM-DD')
         ) AS has_checked_in_today`,
        [userId]
      );
      const hasCheckedInToday = Boolean(checkInRes.rows[0]?.has_checked_in_today);

      if (!hasCheckedInToday) {
        // Reset ngay bản ghi user_quests rác (nếu có) về false
        await client.query(
          `UPDATE user_quests 
           SET current_count = 0, is_completed = false, is_claimed = false, updated_at = CURRENT_TIMESTAMP 
           WHERE user_id = $1 AND quest_id = $2`,
          [userId, questId]
        );
        await client.query('COMMIT');
        return res.status(400).json({
          error: 'Bạn chưa quét mã QR Check-in điểm danh tại sân hôm nay. Không thể nhận thưởng.'
        });
      }

      // Khóa bản ghi user_quests để kiểm tra tranh chấp (FOR UPDATE)
      const uqRes = await client.query(
        'SELECT current_count, is_completed, is_claimed, updated_at FROM user_quests WHERE user_id = $1 AND quest_id = $2 FOR UPDATE',
        [userId, questId]
      );

      if (uqRes.rows.length > 0) {
        const uq = uqRes.rows[0];
        if (uq.is_claimed && uq.updated_at && isSameVietnamDay(uq.updated_at, now)) {
          throw new Error('Phần thưởng nhiệm vụ này đã được nhận trước đó.');
        }

        await client.query(
          `UPDATE user_quests 
           SET current_count = $3, is_completed = true, is_claimed = true, updated_at = CURRENT_TIMESTAMP 
           WHERE user_id = $1 AND quest_id = $2`,
          [userId, questId, quest.target_count || 1]
        );
      } else {
        await client.query(
          `INSERT INTO user_quests (user_id, quest_id, current_count, is_completed, is_claimed, updated_at)
           VALUES ($1, $2, $3, true, true, CURRENT_TIMESTAMP)`,
          [userId, questId, quest.target_count || 1]
        );
      }
    } else {
      // 3. Các nhiệm vụ khác: Khóa bản ghi user_quests
      const userQuestRes = await client.query(
        `SELECT uq.current_count, uq.is_completed, uq.is_claimed, uq.updated_at
         FROM user_quests uq
         WHERE uq.user_id = $1 AND uq.quest_id = $2 FOR UPDATE`,
        [userId, questId]
      );

      if (userQuestRes.rows.length === 0) {
        throw new Error('Nhiệm vụ này chưa được bắt đầu hoặc không tồn tại tiến trình.');
      }

      const uq = userQuestRes.rows[0];

      // Kiểm tra chu kỳ reset
      if (uq.updated_at) {
        if (quest.quest_type === 'daily' && !isSameVietnamDay(uq.updated_at, now)) {
          await client.query(
            'UPDATE user_quests SET current_count = 0, is_completed = false, is_claimed = false, updated_at = CURRENT_TIMESTAMP WHERE user_id = $1 AND quest_id = $2',
            [userId, questId]
          );
          throw new Error('Nhiệm vụ chưa hoàn thành.');
        }
        if (quest.quest_type === 'weekly' && getVietnamWeekString(uq.updated_at) !== getVietnamWeekString(now)) {
          await client.query(
            'UPDATE user_quests SET current_count = 0, is_completed = false, is_claimed = false, updated_at = CURRENT_TIMESTAMP WHERE user_id = $1 AND quest_id = $2',
            [userId, questId]
          );
          throw new Error('Nhiệm vụ chưa hoàn thành.');
        }
        if (quest.quest_type === 'monthly' && getVietnamMonthString(uq.updated_at) !== getVietnamMonthString(now)) {
          await client.query(
            'UPDATE user_quests SET current_count = 0, is_completed = false, is_claimed = false, updated_at = CURRENT_TIMESTAMP WHERE user_id = $1 AND quest_id = $2',
            [userId, questId]
          );
          throw new Error('Nhiệm vụ chưa hoàn thành.');
        }
      }

      if (!uq.is_completed) {
        throw new Error('Nhiệm vụ chưa hoàn thành.');
      }

      if (uq.is_claimed) {
        throw new Error('Phần thưởng nhiệm vụ này đã được nhận trước đó.');
      }

      await client.query(
        'UPDATE user_quests SET is_claimed = true, updated_at = CURRENT_TIMESTAMP WHERE user_id = $1 AND quest_id = $2',
        [userId, questId]
      );
    }

    // 4. Cộng XP & Xu
    const levelUpInfo = await addXpToUser(userId, quest.xp_reward, client);
    await client.query(
      'UPDATE users SET smash_coins = smash_coins + $1 WHERE id = $2',
      [quest.coin_reward, userId]
    );

    await client.query('COMMIT');
    res.json({
      success: true,
      message: `Nhận thưởng thành công cho nhiệm vụ: ${quest.title}`,
      xp_reward: quest.xp_reward,
      coin_reward: quest.coin_reward,
      level_up: levelUpInfo
    });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(400).json({ error: error.message || 'Lỗi nhận thưởng' });
  } finally {
    client.release();
  }
});

// GET /api/gamification/inventory - Lấy danh sách kho đồ của User
router.get('/inventory', async (req, res) => {
  try {
    const userId = req.user.id;

    // Tự động dọn dẹp các vật phẩm đã hết hạn
    await db.query(
      `WITH expired_items AS (
         UPDATE user_inventory 
         SET is_equipped = false 
         WHERE user_id = $1 AND expires_at <= NOW() AND is_equipped = true
         RETURNING item_type
       )
       UPDATE users
       SET 
         selected_avatar_frame = CASE WHEN EXISTS (SELECT 1 FROM expired_items WHERE item_type = 'avatar_frame') THEN NULL ELSE selected_avatar_frame END,
         selected_title = CASE WHEN EXISTS (SELECT 1 FROM expired_items WHERE item_type = 'title') THEN NULL ELSE selected_title END
       WHERE id = $1`,
      [userId]
    );

    // Dọn dẹp và đồng bộ số khiên còn hạn
    await cleanupAndSyncShields(userId);

    // Lọc bỏ các bản ghi legacy (tính năng SmashPass cũ đã gỡ) và avatar_frame (đã gỡ bỏ)
    const inventoryRes = await db.query(
      `SELECT ui.id, ui.item_type, ui.item_name, ui.item_value, ui.is_equipped, ui.acquired_at, 
              ui.coupon_code, ui.status, ui.redeemed_at, ui.expires_at,
              COALESCE(si.image_url, CASE WHEN ui.item_type IN ('shield', 'streak_shield') OR ui.item_name ILIKE '%khiên%' THEN (SELECT image_url FROM shop_items WHERE id = 10 OR name ILIKE '%Khiên Hộ Mệnh%' LIMIT 1) ELSE NULL END) AS image_url
       FROM user_inventory ui
       LEFT JOIN shop_items si ON ui.shop_item_id = si.id
       WHERE ui.user_id = $1 AND ui.item_type != 'smash_pass_reward_level' AND ui.item_type != 'avatar_frame' AND (ui.expires_at IS NULL OR ui.expires_at > NOW() OR ui.status IN ('used', 'expired'))
       ORDER BY ui.acquired_at DESC`,
      [userId]
    );

    res.json(inventoryRes.rows);
  } catch (error) {
    console.error('Error fetching inventory:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/gamification/inventory/:id/equip - Trang bị danh hiệu
router.post('/inventory/:id/equip', async (req, res) => {
  const userId = req.user.id;
  const itemId = req.params.id;

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    // 1. Kiểm tra vật phẩm có thuộc về user không
    const itemRes = await client.query(
      'SELECT item_type, item_name, item_value FROM user_inventory WHERE id = $1 AND user_id = $2',
      [itemId, userId]
    );

    if (itemRes.rows.length === 0) {
      throw new Error('Vật phẩm không tồn tại trong kho đồ của bạn.');
    }

    const item = itemRes.rows[0];

    if (item.item_type === 'avatar_frame') {
      throw new Error('Vật phẩm khung viền đã ngừng hỗ trợ.');
    }

    if (item.item_type !== 'title') {
      throw new Error('Loại vật phẩm này không thể trang bị.');
    }

    // 2. Bỏ trang bị tất cả vật phẩm cùng loại
    await client.query(
      'UPDATE user_inventory SET is_equipped = false WHERE user_id = $1 AND item_type = $2',
      [userId, item.item_type]
    );

    // 3. Thiết lập trang bị cho vật phẩm hiện tại
    await client.query(
      'UPDATE user_inventory SET is_equipped = true WHERE id = $1 AND user_id = $2',
      [itemId, userId]
    );

    // 4. Đồng bộ vào bảng users
    await client.query(
      `UPDATE users SET selected_title = $1 WHERE id = $2`,
      [item.item_value, userId]
    );

    await client.query('COMMIT');
    res.json({
      success: true,
      message: `Đã trang bị danh hiệu "${item.item_name}" thành công.`,
      item_type: item.item_type,
      item_value: item.item_value
    });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(400).json({ error: error.message || 'Lỗi trang bị vật phẩm' });
  } finally {
    client.release();
  }
});

// POST /api/gamification/inventory/:id/unequip - Hủy trang bị danh hiệu
router.post('/inventory/:id/unequip', async (req, res) => {
  const userId = req.user.id;
  const itemId = req.params.id;

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    // 1. Kiểm tra vật phẩm
    const itemRes = await client.query(
      'SELECT item_type FROM user_inventory WHERE id = $1 AND user_id = $2',
      [itemId, userId]
    );

    if (itemRes.rows.length === 0) {
      throw new Error('Vật phẩm không tồn tại.');
    }

    const item = itemRes.rows[0];

    // 2. Bỏ trang bị
    await client.query(
      'UPDATE user_inventory SET is_equipped = false WHERE id = $1 AND user_id = $2',
      [itemId, userId]
    );

    // 3. Đồng bộ bảng users
    if (item.item_type === 'title') {
      await client.query(
        `UPDATE users SET selected_title = NULL WHERE id = $1`,
        [userId]
      );
    }

    await client.query('COMMIT');
    res.json({
      success: true,
      message: 'Đã hủy trang bị thành công.'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(400).json({ error: error.message || 'Lỗi hủy trang bị' });
  } finally {
    client.release();
  }
});

// GET /api/gamification/shield/status - Lấy trạng thái khiên và điều kiện sử dụng cho trận thua gần nhất
router.get('/shield/status', async (req, res) => {
  try {
    const userId = req.user.id;

    // Dọn dẹp khiên hết hạn và đồng bộ lại streak_shields
    await cleanupAndSyncShields(userId);

    // Lấy số khiên hiện tại
    const userRes = await db.query(
      `SELECT streak_shields FROM users WHERE id = $1`,
      [userId]
    );
    const availableShields = userRes.rows.length > 0 ? (Number(userRes.rows[0].streak_shields) || 0) : 0;

    // Lấy số khiên đã mua trong tháng hiện tại
    const monthlyBuysRes = await db.query(
      `SELECT COUNT(*)::int AS count 
       FROM user_inventory 
       WHERE user_id = $1 
         AND (item_type IN ('shield', 'streak_shield') OR item_name ILIKE '%khiên%')
         AND purchase_price > 0
         AND purchased_at >= date_trunc('month', NOW())`,
      [userId]
    );
    const monthlyPurchased = monthlyBuysRes.rows[0].count;

    // Lấy trận đấu gần nhất
    const matchRes = await db.query(
      `SELECT m.* 
       FROM matches m
       WHERE (m.player1_id = $1 OR m.player2_id = $1 OR m.player1_partner_id = $1 OR m.player2_partner_id = $1)
         AND m.status = 'approved'
       ORDER BY m.created_at DESC, m.id DESC
       LIMIT 1`,
      [userId]
    );

    let canUse = false;
    let lastMatchInfo = null;

    if (matchRes.rows.length > 0) {
      const m = matchRes.rows[0];
      const isTeam1 = (m.player1_id === userId || m.player1_partner_id === userId);
      const team1Won = (m.winner_id === m.player1_id || m.winner_id === m.player1_partner_id);
      const userWon = isTeam1 ? team1Won : !team1Won;

      if (!userWon) {
        // Kiểm tra xem đã shield trận này chưa
        const shieldedRes = await db.query(
          `SELECT id FROM shield_usages WHERE user_id = $1 AND match_id = $2`,
          [userId, m.id]
        );
        const alreadyShielded = shieldedRes.rows.length > 0;

        if (!alreadyShielded) {
          canUse = availableShields > 0;
          let eloBefore = 0;
          let eloAfter = 0;
          if (m.player1_id === userId) { eloBefore = m.p1_elo_before; eloAfter = m.p1_elo_after; }
          else if (m.player2_id === userId) { eloBefore = m.p2_elo_before; eloAfter = m.p2_elo_after; }
          else if (m.player1_partner_id === userId) { eloBefore = m.p1_partner_elo_before; eloAfter = m.p1_partner_elo_after; }
          else if (m.player2_partner_id === userId) { eloBefore = m.p2_partner_elo_before; eloAfter = m.p2_partner_elo_after; }

          const isDoubles = !!(m.player1_partner_id && m.player2_partner_id);
          lastMatchInfo = {
            matchId: m.id,
            mode: isDoubles ? 'doubles' : 'singles',
            eloLost: Math.max(0, eloBefore - eloAfter),
            createdAt: m.created_at,
            alreadyShielded: false
          };
        }
      }
    }

    res.json({
      availableShields,
      monthlyPurchased,
      maxMonthlyPurchases: 3,
      canUse,
      lastMatch: lastMatchInfo
    });
  } catch (error) {
    console.error('Error fetching shield status:', error);
    res.status(500).json({ error: 'Lỗi nạp trạng thái khiên.' });
  }
});

// POST /api/gamification/shield/use - Kích hoạt khiên bảo vệ ELO và chuỗi thắng cho trận thua gần nhất
router.post('/shield/use', async (req, res) => {
  const userId = req.user.id;
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    // Dọn dẹp các khiên đã hết hạn trước khi kiểm tra số lượng
    await cleanupAndSyncShields(userId, client);

    // 1. Khóa dòng user để kiểm tra số lượng khiên
    const userRes = await client.query(
      `SELECT id, elo_singles, elo_doubles, streak_singles, streak_doubles, 
              win_singles, win_doubles, loss_singles, loss_doubles, streak_shields
       FROM users WHERE id = $1 FOR UPDATE`,
      [userId]
    );
    if (userRes.rows.length === 0) {
      throw new Error('Tài khoản không tồn tại.');
    }
    const user = userRes.rows[0];
    const availableShields = Number(user.streak_shields) || 0;
    if (availableShields <= 0) {
      throw new Error('Bạn không có Khiên Hộ Mệnh còn hạn sử dụng trong túi đồ. Hãy ghé Cửa hàng hoặc mở Hộp quà bí ẩn để sở hữu!');
    }

    // 2. Tìm trận đấu gần nhất (approved) có user tham gia
    const matchRes = await client.query(
      `SELECT m.* 
       FROM matches m
       WHERE (m.player1_id = $1 OR m.player2_id = $1 OR m.player1_partner_id = $1 OR m.player2_partner_id = $1)
         AND m.status = 'approved'
       ORDER BY m.created_at DESC, m.id DESC
       LIMIT 1`,
      [userId]
    );

    if (matchRes.rows.length === 0) {
      throw new Error('Bạn chưa có trận đấu nào trong hệ thống để sử dụng khiên.');
    }

    const lastMatch = matchRes.rows[0];

    // Xác định xem user ở đội nào và có phải đội thua không
    const isTeam1 = (lastMatch.player1_id === userId || lastMatch.player1_partner_id === userId);
    const team1Won = (lastMatch.winner_id === lastMatch.player1_id || lastMatch.winner_id === lastMatch.player1_partner_id);
    const userWon = isTeam1 ? team1Won : !team1Won;

    if (userWon) {
      throw new Error('Trận đấu gần nhất của bạn là một CHIẾN THẮNG! Khiên chỉ sử dụng khi gặp thất bại để bảo vệ điểm và chuỗi.');
    }

    // 3. Kiểm tra xem trận đấu này đã được dùng khiên chưa
    const alreadyShieldedRes = await client.query(
      `SELECT id FROM shield_usages WHERE user_id = $1 AND match_id = $2`,
      [userId, lastMatch.id]
    );
    if (alreadyShieldedRes.rows.length > 0) {
      throw new Error('Trận đấu này đã được sử dụng Khiên Hộ Mệnh bảo vệ trước đó.');
    }

    // 4. Xác định thể thức và điểm ELO bị trừ trong trận đó
    const isDoubles = !!(lastMatch.player1_partner_id && lastMatch.player2_partner_id);
    const mode = isDoubles ? 'doubles' : 'singles';

    let eloBefore = 0;
    let eloAfter = 0;
    if (lastMatch.player1_id === userId) {
      eloBefore = lastMatch.p1_elo_before;
      eloAfter = lastMatch.p1_elo_after;
    } else if (lastMatch.player2_id === userId) {
      eloBefore = lastMatch.p2_elo_before;
      eloAfter = lastMatch.p2_elo_after;
    } else if (lastMatch.player1_partner_id === userId) {
      eloBefore = lastMatch.p1_partner_elo_before;
      eloAfter = lastMatch.p1_partner_elo_after;
    } else if (lastMatch.player2_partner_id === userId) {
      eloBefore = lastMatch.p2_partner_elo_before;
      eloAfter = lastMatch.p2_partner_elo_after;
    }

    const eloLost = Math.max(0, eloBefore - eloAfter);

    // 5. Xác định chuỗi thắng trước trận thua này bằng cách tái hiện chuỗi các trận trước đó
    const priorMatchesRes = await client.query(
      `SELECT m.id, m.winner_id, m.player1_id, m.player2_id, m.player1_partner_id, m.player2_partner_id
       FROM matches m
       WHERE (m.player1_id = $1 OR m.player2_id = $1 OR m.player1_partner_id = $1 OR m.player2_partner_id = $1)
         AND (CASE WHEN $2 = true THEN m.player1_partner_id IS NOT NULL ELSE m.player1_partner_id IS NULL END)
         AND m.status = 'approved'
         AND (m.created_at < $3 OR (m.created_at = $3 AND m.id != $4))
       ORDER BY m.created_at ASC, m.id ASC`,
      [userId, isDoubles, lastMatch.created_at, lastMatch.id]
    );

    // Lấy danh sách các trận đã từng được shield của user
    const shieldedMatchesRes = await client.query(
      `SELECT match_id FROM shield_usages WHERE user_id = $1`,
      [userId]
    );
    const shieldedMatchIds = new Set(shieldedMatchesRes.rows.map(r => r.match_id));

    let runningStreak = 0;
    for (const pm of priorMatchesRes.rows) {
      const pmIsTeam1 = (pm.player1_id === userId || pm.player1_partner_id === userId);
      const pmTeam1Won = (pm.winner_id === pm.player1_id || pm.winner_id === pm.player1_partner_id);
      const pmWon = pmIsTeam1 ? pmTeam1Won : !pmTeam1Won;

      if (pmWon) {
        runningStreak = runningStreak >= 0 ? runningStreak + 1 : 1;
      } else {
        if (!shieldedMatchIds.has(pm.id)) {
          runningStreak = runningStreak <= 0 ? runningStreak - 1 : -1;
        }
      }
    }

    const restoredStreak = runningStreak > 0 ? runningStreak : 0;

    // 6. Trừ 1 Khiên trên users và cập nhật 1 bản ghi trong user_inventory
    await client.query(
      `UPDATE users SET streak_shields = GREATEST(0, streak_shields - 1) WHERE id = $1`,
      [userId]
    );

    await client.query(
      `UPDATE user_inventory 
       SET status = 'used', redeemed_at = NOW() 
       WHERE id = (
         SELECT id FROM user_inventory 
         WHERE user_id = $1 
           AND (item_type IN ('shield', 'streak_shield') OR item_name ILIKE '%khiên%')
           AND status = 'unused'
           AND (expires_at IS NULL OR expires_at > NOW())
         ORDER BY expires_at ASC NULLS LAST, purchased_at ASC
         LIMIT 1
       )`,
      [userId]
    );

    // 7. Hồi phục điểm ELO và chuỗi trên users
    const eloCol = isDoubles ? 'elo_doubles' : 'elo_singles';
    const streakCol = isDoubles ? 'streak_doubles' : 'streak_singles';
    const currentElo = isDoubles ? user.elo_doubles : user.elo_singles;

    const newElo = currentElo + eloLost;
    const finalStreak = restoredStreak > 0 ? restoredStreak : 0;

    await client.query(
      `UPDATE users 
       SET ${eloCol} = $1,
           ${streakCol} = $2
       WHERE id = $3`,
      [newElo, finalStreak, userId]
    );

    // 8. Ghi nhật ký vào shield_usages
    await client.query(
      `INSERT INTO shield_usages (user_id, match_id, elo_restored, streak_restored, mode, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [userId, lastMatch.id, eloLost, restoredStreak, mode]
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Kích hoạt Khiên Hộ Mệnh thành công!',
      eloRestored: eloLost,
      streakRestored: restoredStreak,
      hasStreakFlame: restoredStreak > 0,
      newElo,
      newStreak: finalStreak,
      mode
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error using shield:', error);
    res.status(400).json({ error: error.message || 'Lỗi sử dụng khiên bảo vệ.' });
  } finally {
    client.release();
  }
});

module.exports = router;
