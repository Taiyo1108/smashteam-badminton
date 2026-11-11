-- Migration 33: Guest Role, Onboarding Support & Data Synchronization
-- Safe migration: preserves all existing members, admins, and candidates.

-- 1. Cho phép role 'guest' trong constraint users_role_check
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('candidate', 'member', 'admin', 'guest'));
ALTER TABLE users ALTER COLUMN role SET DEFAULT 'guest';

-- 2. Đặt mốc mặc định 950 điểm Elo cho tài khoản mới
ALTER TABLE users ALTER COLUMN elo_singles SET DEFAULT 950;
ALTER TABLE users ALTER COLUMN elo_doubles SET DEFAULT 950;
ALTER TABLE users ALTER COLUMN matches_singles SET DEFAULT 0;
ALTER TABLE users ALTER COLUMN matches_doubles SET DEFAULT 0;

-- 3. Bổ sung các cột phục vụ Onboarding và Gamification tổng quát
ALTER TABLE users ADD COLUMN IF NOT EXISTS rating_points INTEGER DEFAULT 950;
ALTER TABLE users ADD COLUMN IF NOT EXISTS matches_played INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_profile_completed BOOLEAN DEFAULT false;

-- 4. Cho phép phone_zalo tạm thời NULL đối với tài khoản vừa đăng ký qua Google nhưng chưa Onboarding
ALTER TABLE users ALTER COLUMN phone_zalo DROP NOT NULL;

-- 5. Tạo Unique Index cho phone_zalo (chỉ index các số không rỗng)
CREATE UNIQUE INDEX IF NOT EXISTS users_phone_zalo_unique ON users (phone_zalo) 
WHERE phone_zalo IS NOT NULL AND phone_zalo != '';

-- 6. Đảm bảo toàn bộ thành viên chính thức và admin cũ được đánh dấu hoàn tất hồ sơ
UPDATE users 
SET is_profile_completed = true 
WHERE role IN ('member', 'admin') AND (is_profile_completed IS NULL OR is_profile_completed = false);

-- 7. Đồng bộ rating_points và matches_played cho tất cả thành viên hiện hữu (không làm đổi elo gốc)
UPDATE users 
SET matches_played = COALESCE(matches_doubles, 0) + COALESCE(matches_singles, 0)
WHERE matches_played IS NULL OR matches_played = 0;

UPDATE users 
SET rating_points = COALESCE(elo_doubles, elo_singles, 1000)
WHERE rating_points IS NULL;
