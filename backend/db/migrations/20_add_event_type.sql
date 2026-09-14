-- Migration 20: Thêm cột phân loại sự kiện (event_type) cho club_events
ALTER TABLE club_events ADD COLUMN IF NOT EXISTS event_type VARCHAR(50) DEFAULT 'tournament';
