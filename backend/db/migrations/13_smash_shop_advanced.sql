-- Migration 13: Advanced Smash Shop
ALTER TABLE shop_items ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE shop_items ADD COLUMN IF NOT EXISTS category VARCHAR(100) DEFAULT 'Đồ dùng'; -- 'Grip', 'Drink', 'Apparel', 'Voucher', 'Virtual'
ALTER TABLE shop_items ADD COLUMN IF NOT EXISTS max_per_user INT DEFAULT 99; -- Giới hạn số lượng mua tối đa của mỗi thành viên
ALTER TABLE shop_items ADD COLUMN IF NOT EXISTS level_required INT DEFAULT 1; -- Cấp độ SmashPass tối thiểu để mở khóa mua
ALTER TABLE shop_items ADD COLUMN IF NOT EXISTS rarity VARCHAR(50) DEFAULT 'common'; -- 'common', 'rare', 'epic', 'legendary'
ALTER TABLE shop_items ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE shop_items ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE user_inventory ADD COLUMN IF NOT EXISTS purchase_price INT NOT NULL DEFAULT 0; -- Giá trị Smash Coins tại thời điểm mua
ALTER TABLE user_inventory ADD COLUMN IF NOT EXISTS purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE user_inventory ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP DEFAULT NULL; -- Thời gian hết hạn của vật phẩm ảo tạm thời

CREATE TABLE IF NOT EXISTS admin_logs (
    id SERIAL PRIMARY KEY,
    admin_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action_type VARCHAR(100) NOT NULL, -- 'deliver_item', 'adjust_elo', 'toggle_campaign'
    details TEXT NOT NULL, -- Ghi rõ hoạt động
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Cập nhật dữ liệu mẫu cũ cho phù hợp cấu trúc nâng cao
UPDATE shop_items SET 
  category = 'Grip', 
  rarity = 'common', 
  description = 'Cuộn cán vợt chống trơn Yonex chất liệu PU siêu bám êm ái.' 
WHERE name = 'Cuộn cán vợt Yonex';

UPDATE shop_items SET 
  category = 'Drink', 
  rarity = 'common', 
  description = 'Nước uống thể thao Revive giúp bù nước khoáng nhanh chóng.' 
WHERE name = 'Nước bù khoáng Revive';

UPDATE shop_items SET 
  category = 'Virtual', 
  rarity = 'epic', 
  level_required = 3, 
  max_per_user = 1,
  description = 'Khung Avatar rực cháy sắc tím Vinh Quang kiêu hãnh.' 
WHERE name = 'Khung Avatar Vinh Quang (7 Ngày)';

UPDATE shop_items SET 
  category = 'Virtual', 
  rarity = 'legendary', 
  level_required = 5, 
  max_per_user = 1,
  description = 'Danh hiệu vương quyền dành riêng cho bá chủ đập cầu.' 
WHERE name = 'Danh hiệu "Smash King" 👑';
