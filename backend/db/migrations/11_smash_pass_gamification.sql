-- Migration 11: SmashPass Gamification System

-- 1. Update users table with gamification attributes
ALTER TABLE users ADD COLUMN IF NOT EXISTS level INT DEFAULT 1;
ALTER TABLE users ADD COLUMN IF NOT EXISTS xp INT DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS smash_coins INT DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS current_streak INT DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS max_streak INT DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_active_date DATE DEFAULT CURRENT_DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS streak_shields INT DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS selected_avatar_frame VARCHAR(255) DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS selected_title VARCHAR(255) DEFAULT NULL;

-- 2. Quests Configuration Table
CREATE TABLE IF NOT EXISTS quests (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    quest_type VARCHAR(50) NOT NULL, -- 'daily', 'weekly', 'seasonal'
    xp_reward INT NOT NULL,
    coin_reward INT NOT NULL,
    action_type VARCHAR(100) NOT NULL, -- 'check_in', 'play_matches', 'win_matches', 'referral', 'volunteer'
    target_count INT DEFAULT 1,
    is_active BOOLEAN DEFAULT true
);

-- 3. User Quests Progress Table
CREATE TABLE IF NOT EXISTS user_quests (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    quest_id INT REFERENCES quests(id) ON DELETE CASCADE,
    current_count INT DEFAULT 0,
    is_completed BOOLEAN DEFAULT false,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, quest_id)
);

-- 4. SmashPass Rewards Configuration
CREATE TABLE IF NOT EXISTS smash_pass_rewards (
    id SERIAL PRIMARY KEY,
    season_id INT NOT NULL,
    level_required INT NOT NULL,
    reward_type VARCHAR(100) NOT NULL, -- 'coins', 'avatar_frame', 'title', 'coupon', 'streak_shield'
    reward_name VARCHAR(255) NOT NULL,
    reward_value VARCHAR(255) DEFAULT NULL, -- frame style or title text or coupon code
    is_premium BOOLEAN DEFAULT false
);

-- 5. User Inventory Table
CREATE TABLE IF NOT EXISTS user_inventory (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    item_type VARCHAR(100) NOT NULL, -- 'avatar_frame', 'title', 'coupon', 'streak_shield'
    item_name VARCHAR(255) NOT NULL,
    item_value VARCHAR(255) DEFAULT NULL,
    is_equipped BOOLEAN DEFAULT false,
    acquired_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Populate default Quests
INSERT INTO quests (title, quest_type, xp_reward, coin_reward, action_type, target_count)
VALUES 
('Điểm danh tập luyện hôm nay', 'daily', 25, 10, 'check_in', 1)
ON CONFLICT DO NOTHING;

INSERT INTO quests (title, quest_type, xp_reward, coin_reward, action_type, target_count)
VALUES 
('Hoàn thành 1 trận đấu xếp hạng', 'daily', 30, 15, 'play_matches', 1)
ON CONFLICT DO NOTHING;

INSERT INTO quests (title, quest_type, xp_reward, coin_reward, action_type, target_count)
VALUES 
('Chiến thắng 3 trận đấu xếp hạng', 'weekly', 100, 50, 'win_matches', 3)
ON CONFLICT DO NOTHING;

INSERT INTO quests (title, quest_type, xp_reward, coin_reward, action_type, target_count)
VALUES 
('Tham gia hỗ trợ 1 giải đấu CLB', 'seasonal', 500, 200, 'volunteer', 1)
ON CONFLICT DO NOTHING;

-- 7. Populate default SmashPass Rewards (Season 1)
INSERT INTO smash_pass_rewards (season_id, level_required, reward_type, reward_name, reward_value, is_premium)
VALUES
(1, 1, 'title', 'Tân Binh Smash', 'Tân Binh Smash', false),
(1, 2, 'coins', '50 Smash Coins', '50', false),
(1, 3, 'avatar_frame', 'Khung viền Neon Bạc', 'silver-neon', false),
(1, 4, 'streak_shield', '1 Khiên bảo vệ chuỗi', '1', false),
(1, 5, 'title', 'Tay Vợt Nhiệt Huyết', 'Tay Vợt Nhiệt Huyết', true),
(1, 6, 'coupon', 'Mã Giảm giá Sân 10%', 'DISCOUNT10', false),
(1, 7, 'coins', '150 Smash Coins', '150', true),
(1, 8, 'avatar_frame', 'Khung viền Tím Huyền Ảo', 'purple-glowing', true),
(1, 9, 'streak_shield', '2 Khiên bảo vệ chuỗi', '2', true),
(1, 10, 'title', 'Huyền Thoại Đập Cầu', 'Huyền Thoại Đập Cầu', true)
ON CONFLICT DO NOTHING;
