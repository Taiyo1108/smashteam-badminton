-- Migration 24: Thêm Peak ELO cho Users và ELO Đôi cho Partners trong Matches
ALTER TABLE users ADD COLUMN IF NOT EXISTS peak_elo_singles INTEGER DEFAULT 1000;
ALTER TABLE users ADD COLUMN IF NOT EXISTS peak_elo_doubles INTEGER DEFAULT 1000;

ALTER TABLE matches ADD COLUMN IF NOT EXISTS p1_partner_elo_before INTEGER;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS p1_partner_elo_after INTEGER;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS p2_partner_elo_before INTEGER;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS p2_partner_elo_after INTEGER;
