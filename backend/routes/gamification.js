const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { addXpToUser } = require('../utils/gamification');

// Protect all routes
router.use(authenticateToken);

// Helper functions for date comparison
const getStartOfDay = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

const getStartOfWeek = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday.getTime();
};

const getStartOfMonth = (date) => {
  const d = new Date(date);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

// Check and Update Streak on Profile load
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

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const lastActive = new Date(lastActiveDateStr);
  lastActive.setHours(0, 0, 0, 0);

  const diffTime = today.getTime() - lastActive.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    // Already active today
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

// GET /api/gamification/quests - Lấy danh sách nhiệm vụ với Quest Auto-Reset
router.get('/quests', async (req, res) => {
  try {
    const userId = req.user.id;
    
    // 1. Lấy tất cả nhiệm vụ đang hoạt động
    const questsRes = await db.query('SELECT * FROM quests WHERE is_active = true');
    const quests = questsRes.rows;

    // 2. Lấy thông tin tiến độ của người dùng
    const userQuestsRes = await db.query(
      'SELECT quest_id, current_count, is_completed, is_claimed, updated_at FROM user_quests WHERE user_id = $1',
      [userId]
    );
    const userQuests = userQuestsRes.rows;

    const now = new Date();
    const resultList = [];

    for (const q of quests) {
      let progress = userQuests.find(uq => uq.quest_id === q.id);
      
      if (progress) {
        let currentCount = progress.current_count;
        let isCompleted = progress.is_completed;
        let isClaimed = progress.is_claimed;
        let updatedAt = progress.updated_at;
        let needReset = false;

        const lastUpdated = new Date(updatedAt);

        // Auto-Reset logic
        if (q.quest_type === 'daily') {
          if (getStartOfDay(lastUpdated) !== getStartOfDay(now)) {
            needReset = true;
          }
        } else if (q.quest_type === 'weekly') {
          if (getStartOfWeek(lastUpdated) !== getStartOfWeek(now)) {
            needReset = true;
          }
        } else if (q.quest_type === 'monthly') {
          if (getStartOfMonth(lastUpdated) !== getStartOfMonth(now)) {
            needReset = true;
          }
        }

        if (needReset) {
          currentCount = 0;
          isCompleted = false;
          isClaimed = false;
          updatedAt = now;
          
          await db.query(
            `UPDATE user_quests 
             SET current_count = 0, is_completed = false, is_claimed = false, updated_at = CURRENT_TIMESTAMP 
             WHERE user_id = $1 AND quest_id = $2`,
            [userId, q.id]
          );
        }

        resultList.push({
          ...q,
          current_count: currentCount,
          is_completed: isCompleted,
          is_claimed: isClaimed,
          updated_at: updatedAt
        });
      } else {
        // Chưa có bản ghi tiến độ -> Trả về mặc định 0
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

    // 1. Khóa bản ghi để tránh Race Condition (FOR UPDATE)
    const userQuestRes = await client.query(
      `SELECT uq.current_count, uq.is_completed, uq.is_claimed, q.xp_reward, q.coin_reward, q.title
       FROM user_quests uq
       JOIN quests q ON uq.quest_id = q.id
       WHERE uq.user_id = $1 AND uq.quest_id = $2 FOR UPDATE`,
      [userId, questId]
    );

    if (userQuestRes.rows.length === 0) {
      throw new Error('Nhiệm vụ này chưa được bắt đầu hoặc không tồn tại tiến trình.');
    }

    const uq = userQuestRes.rows[0];

    if (!uq.is_completed) {
      throw new Error('Nhiệm vụ chưa hoàn thành.');
    }

    if (uq.is_claimed) {
      throw new Error('Phần thưởng nhiệm vụ này đã được nhận trước đó.');
    }

    // 2. Đánh dấu đã nhận thưởng
    await client.query(
      'UPDATE user_quests SET is_claimed = true, updated_at = CURRENT_TIMESTAMP WHERE user_id = $1 AND quest_id = $2',
      [userId, questId]
    );

    // 3. Cộng XP & Xu
    const levelUpInfo = await addXpToUser(userId, uq.xp_reward, client);
    await client.query(
      'UPDATE users SET smash_coins = smash_coins + $1 WHERE id = $2',
      [uq.coin_reward, userId]
    );

    await client.query('COMMIT');
    res.json({
      success: true,
      message: `Nhận thưởng thành công cho nhiệm vụ: ${uq.title}`,
      xp_reward: uq.xp_reward,
      coin_reward: uq.coin_reward,
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

    // Lọc bỏ các bản ghi legacy (tính năng SmashPass cũ đã gỡ) và các vật phẩm đã hết hạn
    const inventoryRes = await db.query(
      `SELECT id, item_type, item_name, item_value, is_equipped, acquired_at, coupon_code, status, redeemed_at, expires_at 
       FROM user_inventory 
       WHERE user_id = $1 AND item_type != 'smash_pass_reward_level' AND (expires_at IS NULL OR expires_at > NOW())
       ORDER BY acquired_at DESC`,
      [userId]
    );

    res.json(inventoryRes.rows);
  } catch (error) {
    console.error('Error fetching inventory:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/gamification/inventory/:id/equip - Trang bị vật phẩm (khung viền, danh hiệu)
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

    if (!['avatar_frame', 'title'].includes(item.item_type)) {
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
    const userField = item.item_type === 'avatar_frame' ? 'selected_avatar_frame' : 'selected_title';
    await client.query(
      `UPDATE users SET ${userField} = $1 WHERE id = $2`,
      [item.item_value, userId]
    );

    await client.query('COMMIT');
    res.json({
      success: true,
      message: `Đã trang bị ${item.item_name} thành công.`,
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

// POST /api/gamification/inventory/:id/unequip - Hủy trang bị vật phẩm
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
    const userField = item.item_type === 'avatar_frame' ? 'selected_avatar_frame' : 'selected_title';
    await client.query(
      `UPDATE users SET ${userField} = NULL WHERE id = $1`,
      [userId]
    );

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
