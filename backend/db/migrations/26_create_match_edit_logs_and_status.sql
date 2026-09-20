-- Migration 26: Create match_edit_logs table, indexes, and status constraints
CREATE TABLE IF NOT EXISTS match_edit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  admin_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(50) NOT NULL,
  reason TEXT,
  before_data JSONB NOT NULL,
  after_data JSONB NOT NULL,
  affected_matches_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_match_edit_logs_match_id ON match_edit_logs(match_id);
CREATE INDEX IF NOT EXISTS idx_match_edit_logs_created_at ON match_edit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_matches_chronological ON matches(created_at ASC, id ASC);
CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);

DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_matches_status') THEN 
    ALTER TABLE matches ADD CONSTRAINT chk_matches_status CHECK (status IN ('approved', 'voided', 'pending')); 
  END IF; 
END $$;
