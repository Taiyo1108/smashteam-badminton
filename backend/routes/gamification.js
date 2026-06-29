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

// GET /api/gamification/smash-pass - Lấy danh sách phần thưởng SmashPass
router.get('/smash-pass', async (req, res) => {
  try {
    const userId = req.user.id;

    // Lấy các mốc thưởng Season 1
    const rewardsRes = await db.query('SELECT * FROM smash_pass_rewards WHERE season_id = 1 ORDER BY level_required ASC');
    const rewards = rewardsRes.rows;

    // Lấy các mốc đã nhận của user
    const claimedRes = await db.query(
      `SELECT item_name FROM user_inventory 
       WHERE user_id = $1 AND item_type = 'smash_pass_reward_level'`,
      [userId]
    );
    const claimedList = claimedRes.rows.map(r => {
      const match = r.item_name.match(/Level (\d+)/);
      return match ? parseInt(match[1]) : null;
    }).filter(Boolean);

    // Kiểm tra xem đã mở khóa Premium Pass chưa
    const premiumRes = await db.query(
      `SELECT id FROM user_inventory WHERE user_id = $1 AND item_type = 'premium_pass'`,
      [userId]
    );
    const isPremiumUnlocked = premiumRes.rows.length > 0;

    res.json({
      rewards,
      claimed_levels: claimedList,
      is_premium_unlocked: isPremiumUnlocked
    });
  } catch (error) {
    console.error('Error fetching smash pass:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/gamification/smash-pass/unlock-premium - Mở khóa Premium Pass bằng Xu
router.post('/smash-pass/unlock-premium', async (req, res) => {
  const userId = req.user.id;
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    // Kiểm tra xem đã mở khóa chưa
    const premiumPassRes = await client.query(
      `SELECT id FROM user_inventory WHERE user_id = $1 AND item_type = 'premium_pass'`,
      [userId]
    );
    if (premiumPassRes.rows.length > 0) {
      throw new Error('Bạn đã mở khóa Premium Pass từ trước.');
    }

    // Kiểm tra số dư xu
    const userRes = await client.query(
      `SELECT smash_coins FROM users WHERE id = $1 FOR UPDATE`,
      [userId]
    );
    const coins = userRes.rows[0].smash_coins || 0;
    if (coins < 200) {
      throw new Error('Không đủ Smash Coins. Cần 200 xu để kích hoạt Premium Pass.');
    }

    // Trừ xu
    await client.query(
      `UPDATE users SET smash_coins = smash_coins - 200 WHERE id = $1`,
      [userId]
    );

    // Thêm Premium Pass vào kho đồ
    await client.query(
      `INSERT INTO user_inventory (user_id, item_type, item_name, item_value, is_equipped)
       VALUES ($1, 'premium_pass', 'Premium Pass Season 1', 'active', false)`,
      [userId]
    );

    await client.query('COMMIT');
    res.json({ success: true, message: 'Kích hoạt SmashPass Premium thành công!' });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(400).json({ error: error.message || 'Lỗi mở khóa Premium' });
  } finally {
    client.release();
  }
});

// POST /api/gamification/smash-pass/claim/:level - Nhận quà SmashPass mốc Cấp độ (DB Transaction)
router.post('/smash-pass/claim/:level', async (req, res) => {
  const userId = req.user.id;
  const claimLevel = parseInt(req.params.level);

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    // 1. Khóa bảng users để lấy cấp độ hiện tại
    const userRes = await client.query(
      `SELECT level, smash_coins FROM users WHERE id = $1 FOR UPDATE`,
      [userId]
    );
    if (userRes.rows.length === 0) throw new Error('Không tìm thấy người dùng.');
    
    const user = userRes.rows[0];
    const userLevel = user.level || 1;

    // 2. Lấy cấu hình phần thưởng
    const rewardRes = await client.query(
      `SELECT * FROM smash_pass_rewards WHERE level_required = $1 AND season_id = 1`,
      [claimLevel]
    );
    if (rewardRes.rows.length === 0) throw new Error('Mốc phần thưởng không tồn tại.');
    const reward = rewardRes.rows[0];

    // Kiểm tra cấp độ người dùng
    if (userLevel < reward.level_required) {
      throw new Error(`Cấp độ hiện tại (${userLevel}) chưa đạt yêu cầu cấp độ (${reward.level_required}).`);
    }

    // 3. Kiểm tra xem đã nhận chưa
    const claimRes = await client.query(
      `SELECT id FROM user_inventory 
       WHERE user_id = $1 AND item_type = 'smash_pass_reward_level' AND item_name = $2`,
      [userId, `Season 1 Level ${claimLevel}`]
    );
    if (claimRes.rows.length > 0) {
      throw new Error('Bạn đã nhận phần thưởng cho cấp độ này rồi.');
    }

    // 4. Nếu là premium, kiểm tra xem đã mua Premium Pass chưa
    if (reward.is_premium) {
      const premiumPassRes = await client.query(
        `SELECT id FROM user_inventory WHERE user_id = $1 AND item_type = 'premium_pass'`,
        [userId]
      );
      if (premiumPassRes.rows.length === 0) {
        throw new Error('Yêu cầu kích hoạt SmashPass Premium để nhận phần thưởng này.');
      }
    }

    // 5. Ghi nhận đã nhận thưởng
    await client.query(
      `INSERT INTO user_inventory (user_id, item_type, item_name, item_value, is_equipped)
       VALUES ($1, 'smash_pass_reward_level', $2, 'claimed', false)`,
      [userId, `Season 1 Level ${claimLevel}`]
    );

    // 6. Cấp phần thưởng thực tế
    if (reward.reward_type === 'coins') {
      const coinsAmount = parseInt(reward.reward_value) || 0;
      await client.query(
        `UPDATE users SET smash_coins = smash_coins + $1 WHERE id = $2`,
        [coinsAmount, userId]
      );
    } else if (reward.reward_type === 'streak_shield') {
      const shieldAmount = parseInt(reward.reward_value) || 1;
      await client.query(
        `UPDATE users SET streak_shields = streak_shields + $1 WHERE id = $2`,
        [shieldAmount, userId]
      );
    } else {
      // avatar_frame / title / coupon -> Thêm vào kho đồ
      await client.query(
        `INSERT INTO user_inventory (user_id, item_type, item_name, item_value, is_equipped)
         VALUES ($1, $2, $3, $4, false)`,
        [userId, reward.reward_type, reward.reward_name, reward.reward_value]
      );
    }

    await client.query('COMMIT');
    res.json({
      success: true,
      message: `Nhận phần thưởng mốc Level ${claimLevel} thành công!`,
      reward
    });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(400).json({ error: error.message || 'Lỗi nhận thưởng SmashPass' });
  } finally {
    client.release();
  }
});

// GET /api/gamification/inventory - Lấy danh sách kho đồ của User
router.get('/inventory', async (req, res) => {
  try {
    const userId = req.user.id;

    // Lọc bỏ các bản ghi ghi nhận claimed mốc SmashPass
    const inventoryRes = await db.query(
      `SELECT id, item_type, item_name, item_value, is_equipped, acquired_at 
       FROM user_inventory 
       WHERE user_id = $1 AND item_type != 'smash_pass_reward_level'
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
