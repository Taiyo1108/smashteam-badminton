-- Migration 12: Smash Shop Physical & Virtual Items
CREATE TABLE IF NOT EXISTS shop_items (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    item_type VARCHAR(50) NOT NULL, -- 'virtual' (khung viền, danh hiệu) hoặc 'physical' (đồ thật)
    coin_price INT NOT NULL,
    stock INT NOT NULL DEFAULT 0, -- Số lượng còn lại trong kho (chỉ áp dụng cho physical)
    image_url TEXT, -- Link ảnh sản phẩm từ Cloudinary
    is_active BOOLEAN DEFAULT true
);

-- Nạp một số sản phẩm mẫu
INSERT INTO shop_items (name, item_type, coin_price, stock, image_url) VALUES
('Cuộn cán vợt Yonex', 'physical', 150, 50, 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=500'),
('Nước bù khoáng Revive', 'physical', 50, 100, 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500'),
('Khung Avatar Vinh Quang (7 Ngày)', 'virtual', 200, 9999, NULL),
('Danh hiệu "Smash King" 👑', 'virtual', 300, 9999, NULL)
ON CONFLICT (name) DO NOTHING;

ALTER TABLE user_inventory ADD COLUMN IF NOT EXISTS shop_item_id INT REFERENCES shop_items(id) ON DELETE SET NULL;
ALTER TABLE user_inventory ADD COLUMN IF NOT EXISTS coupon_code VARCHAR(50) NULL UNIQUE;
ALTER TABLE user_inventory ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'unused'; -- 'unused' (chưa dùng), 'redeemed' (đã nhận quà)
ALTER TABLE user_inventory ADD COLUMN IF NOT EXISTS redeemed_at TIMESTAMP NULL;
