-- Cập nhật bảng users để thêm các cột thống kê thi đấu
ALTER TABLE users ADD COLUMN IF NOT EXISTS current_streak INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS max_streak INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS win_count INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS loss_count INTEGER DEFAULT 0;

-- Xóa bảng matches cũ nếu tồn tại
DROP TABLE IF EXISTS matches;

-- Tạo lại bảng matches với cấu trúc Elo chi tiết
CREATE TABLE matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player1_id UUID REFERENCES users(id) ON DELETE CASCADE,
    player2_id UUID REFERENCES users(id) ON DELETE CASCADE,
    winner_id UUID REFERENCES users(id) ON DELETE CASCADE,
    score_p1 INTEGER NOT NULL,
    score_p2 INTEGER NOT NULL,
    p1_elo_before INTEGER NOT NULL,
    p2_elo_before INTEGER NOT NULL,
    p1_elo_after INTEGER NOT NULL,
    p2_elo_after INTEGER NOT NULL,
    elo_exchanged INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
