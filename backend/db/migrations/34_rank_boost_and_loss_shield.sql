-- Migration 34: Thêm cột theo dõi tiến trình thưởng thắng x2 và khiên bảo hộ thua
ALTER TABLE users ADD COLUMN IF NOT EXISTS grind_matches_count INT DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS grind_loss_count INT DEFAULT 0;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'check_grind_matches_count'
    ) THEN
        ALTER TABLE users ADD CONSTRAINT check_grind_matches_count CHECK (grind_matches_count >= 0 AND grind_matches_count <= 5);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'check_grind_loss_count'
    ) THEN
        ALTER TABLE users ADD CONSTRAINT check_grind_loss_count CHECK (grind_loss_count >= 0 AND grind_loss_count <= 5);
    END IF;
END $$;
