-- Thêm cột player1_partner_id và player2_partner_id vào bảng matches
ALTER TABLE matches ADD COLUMN IF NOT EXISTS player1_partner_id UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS player2_partner_id UUID REFERENCES users(id) ON DELETE SET NULL;
