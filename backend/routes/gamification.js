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
    // Missed a day
    if (streakShields > 0) {
      streakShields -= 1;
      streakNotification = "Mất mát suýt xảy ra! Một chiếc Khiên Streak đã được kích hoạt để bảo vệ chuỗi 🔥 của bạn.";
      await client.query(
        'UPDATE users SET streak_shields = $1, last_active_date = CURRENT_DATE WHERE id = $2',
        [streakShields, userId]
      );
    } else {
      currentStreak = 1;
      await client.query(
        'UPDATE users SET current_streak = $1, last_active_date = CURRENT_DATE WHERE id = $2',
        [currentStreak, userId]
      );
      streakNotification = "Chuỗi ngày hoạt động 🔥 của bạn đã bị reset do không hoạt động.";
    }
  }

  return { currentStreak, streakShields, streakNotification };
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

    // Lọc bỏ các bản ghi legacy (tính năng SmashPass cũ đã gỡ), avatar_frame (đã gỡ bỏ) và các vật phẩm đã hết hạn
    const inventoryRes = await db.query(
      `SELECT id, item_type, item_name, item_value, is_equipped, acquired_at, coupon_code, status, redeemed_at, expires_at 
       FROM user_inventory 
       WHERE user_id = $1 AND item_type != 'smash_pass_reward_level' AND item_type != 'avatar_frame' AND (expires_at IS NULL OR expires_at > NOW())
       ORDER BY acquired_at DESC`,
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

module.exports = router;
