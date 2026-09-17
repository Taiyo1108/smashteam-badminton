-- Migration 25: Thêm status vào Matches, tạo bảng Seasons và bảng Ranking Snapshots
-- 1. Bổ sung status cho Matches (mặc định approved cho tất cả trận hiện tại)
ALTER TABLE matches ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'approved';
UPDATE matches SET status = 'approved' WHERE status IS NULL;

-- 2. Bảng Mùa Giải (Seasons)
CREATE TABLE IF NOT EXISTS seasons (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  is_active BOOLEAN DEFAULT false,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Khởi tạo Season 01 mặc định nếu chưa có mùa giải active
INSERT INTO seasons (name, start_date, is_active, description)
SELECT 'Mùa 01 - Khởi Tranh 2026', CURRENT_DATE - INTERVAL '60 days', true, 'Mùa giải chính thức đầu tiên của SmashTeam Badminton Club'
WHERE NOT EXISTS (SELECT 1 FROM seasons WHERE is_active = true);

-- 3. Bảng Ranking Snapshots hàng tuần (Idempotent với khóa Unique composite)
CREATE TABLE IF NOT EXISTS ranking_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id INTEGER NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  mode VARCHAR(10) NOT NULL, -- 'singles' | 'doubles'
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rank INTEGER NOT NULL,
  elo INTEGER NOT NULL,
  matches INTEGER NOT NULL DEFAULT 0,
  win_rate DECIMAL(5, 2) DEFAULT 0.0,
  snapshot_date DATE NOT NULL,
  snapshot_week VARCHAR(10) NOT NULL, -- e.g. '2026-W38'
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_ranking_snapshot_season_mode_user_week UNIQUE (season_id, mode, user_id, snapshot_week)
);

-- Index tra cứu tối ưu hóa
CREATE INDEX IF NOT EXISTS idx_ranking_snapshots_lookup 
ON ranking_snapshots(season_id, mode, snapshot_week, rank ASC);

CREATE INDEX IF NOT EXISTS idx_ranking_snapshots_user 
ON ranking_snapshots(season_id, mode, user_id, snapshot_week);
