const db = require('../db');

// Hàm tính lượng XP cần để vượt qua Level hiện tại
function getXpForLevel(level) {
  return Math.round(80 * Math.pow(level, 1.5));
}

// Hàm cộng XP cho User và tự động xử lý thăng cấp (Level Up)
async function addXpToUser(userId, xpAmount, client = db) {
  try {
    // 1. Lấy thông tin XP và Level hiện tại của User
    const userResult = await client.query(
      'SELECT level, xp, smash_coins FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) return null;

    const user = userResult.rows[0];
    let currentLevel = parseInt(user.level, 10) || 1;
    let currentXp = (parseInt(user.xp, 10) || 0) + xpAmount;
    let xpNeeded = getXpForLevel(currentLevel);
    let leveledUp = false;

    // 2. Vòng lặp thăng cấp nếu lượng XP tích lũy vượt mốc yêu cầu
    while (currentXp >= xpNeeded) {
      currentXp -= xpNeeded;
      currentLevel += 1;
      xpNeeded = getXpForLevel(currentLevel);
      leveledUp = true;
    }

    // 3. Cập nhật lại vào database
    await client.query(
      'UPDATE users SET level = $1, xp = $2 WHERE id = $3',
      [currentLevel, currentXp, userId]
    );

    return { currentLevel, currentXp, leveledUp };
  } catch (error) {
    console.error('Error adding XP to user:', error);
    throw error;
  }
}

// Hàm cập nhật và theo dõi tiến trình nhiệm vụ của người chơi (Quest Event Decoupling via UPSERT)
async function trackActivity(userId, actionType, count = 1, client = db) {
  try {
    // Tìm các nhiệm vụ đang kích hoạt (is_active = true) có action_type tương ứng
    const activeQuests = await client.query(
      'SELECT id, target_count FROM quests WHERE action_type = $1 AND is_active = true',
      [actionType]
    );

    for (const quest of activeQuests.rows) {
      const questId = quest.id;
      const targetCount = quest.target_count;

      // Thực hiện UPSERT nguyên tử tránh tranh chấp luồng dữ liệu
      await client.query(
        `INSERT INTO user_quests (user_id, quest_id, current_count, is_completed, updated_at)
         VALUES ($1, $2, LEAST($3, $4::int), LEAST($3, $4::int) >= $4, CURRENT_TIMESTAMP)
         ON CONFLICT (user_id, quest_id)
         DO UPDATE SET 
           current_count = CASE 
             WHEN user_quests.is_completed THEN user_quests.current_count 
             ELSE LEAST(user_quests.current_count + $3, $4) 
           END,
           is_completed = CASE 
             WHEN user_quests.is_completed THEN true 
             ELSE (user_quests.current_count + $3) >= $4 
           END,
           updated_at = CURRENT_TIMESTAMP`,
        [userId, questId, count, targetCount]
      );
    }
  } catch (error) {
    console.error('Error tracking activity for gamification:', error);
    throw error;
  }
}

// Hàm cập nhật tiến trình nhiệm vụ (wrapper để đảm bảo tương thích ngược)
async function updateQuestProgress(userId, actionType, count = 1, client = db) {
  return trackActivity(userId, actionType, count, client);
}

module.exports = {
  getXpForLevel,
  addXpToUser,
  trackActivity,
  updateQuestProgress
};
