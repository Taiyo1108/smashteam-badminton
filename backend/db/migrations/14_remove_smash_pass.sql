-- Migration 14: Gỡ tính năng SmashPass
-- Xóa bảng cấu hình mốc thưởng và dọn các bản ghi kho đồ liên quan.
-- Giữ nguyên hệ thống level/XP/xu/nhiệm vụ/shop.

-- 1. Xóa dữ liệu kho đồ của SmashPass (mốc đã nhận + Premium Pass đã mua)
DELETE FROM user_inventory
WHERE item_type IN ('smash_pass_reward_level', 'premium_pass');

-- 2. Xóa bảng cấu hình phần thưởng SmashPass
DROP TABLE IF EXISTS smash_pass_rewards;
