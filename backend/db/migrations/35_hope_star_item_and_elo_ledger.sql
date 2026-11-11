-- Migration 35: Hope Star Item, User Inventory Extensions and ELO Ledger
-- 1. Bổ sung các cột trạng thái tiêu hao và liên kết trận đấu vào user_inventory
ALTER TABLE user_inventory ADD COLUMN IF NOT EXISTS activated_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
ALTER TABLE user_inventory ADD COLUMN IF NOT EXISTS consumed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
ALTER TABLE user_inventory ADD COLUMN IF NOT EXISTS consumed_match_id UUID REFERENCES matches(id) ON DELETE SET NULL;

-- Cập nhật check constraint trạng thái cho user_inventory
DO $$
BEGIN
    ALTER TABLE user_inventory DROP CONSTRAINT IF EXISTS chk_user_inventory_status;
    ALTER TABLE user_inventory ADD CONSTRAINT chk_user_inventory_status 
      CHECK (status IN ('unused', 'redeemed', 'used', 'expired', 'OWNED', 'ACTIVATED', 'CONSUMED', 'REFUNDED'));
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 2. Tạo bảng ELO Ledger chuẩn hóa để lưu vết và giám sát lạm phát điểm
CREATE TABLE IF NOT EXISTS elo_ledger (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    inventory_item_id INT REFERENCES user_inventory(id) ON DELETE SET NULL,
    item_type VARCHAR(50) NOT NULL DEFAULT 'NONE', -- 'HOPE_STAR', 'NONE'
    base_elo_delta INT NOT NULL,                    -- Điểm ELO cơ bản từ công thức chuẩn
    item_elo_bonus INT NOT NULL DEFAULT 0,          -- Điểm thưởng thêm từ vật phẩm (Tối đa +20)
    total_elo_delta INT NOT NULL,                   -- Điểm thực nhận ghi nhận vào user
    is_win BOOLEAN NOT NULL,
    activation_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'APPLIED',  -- 'APPLIED', 'VOIDED', 'ROLLED_BACK'
    rollback_reason TEXT DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_elo_ledger_match_id ON elo_ledger(match_id);
CREATE INDEX IF NOT EXISTS idx_elo_ledger_player_id ON elo_ledger(player_id);
CREATE INDEX IF NOT EXISTS idx_elo_ledger_created_at ON elo_ledger(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_elo_ledger_item_type ON elo_ledger(item_type);

-- 3. Nạp hoặc cập nhật sản phẩm Ngôi Sao Hy Vọng vào Smash Shop
INSERT INTO shop_items (
    name, item_type, coin_price, stock, category, description, 
    level_required, rarity, is_active, max_per_user
) VALUES (
    'Ngôi Sao Hy Vọng',
    'virtual',
    40,
    9999,
    'Bảo bối',
    'Nhân đôi số điểm ELO tăng thêm khi thắng trận đấu chính thức kế tiếp sau khi kích hoạt (Thưởng tối đa +20 ELO). Không nhận thưởng khi thua. Hạn dùng 7 ngày kể từ khi mua.',
    1,
    'rare',
    true,
    5
) ON CONFLICT (name) DO UPDATE SET 
    coin_price = 40,
    item_type = 'virtual',
    category = 'Bảo bối',
    description = EXCLUDED.description,
    max_per_user = 5,
    is_active = true;
