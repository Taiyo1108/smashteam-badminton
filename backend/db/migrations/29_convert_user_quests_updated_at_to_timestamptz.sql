-- ==============================================================================
-- Migration 29: Convert user_quests.updated_at to TIMESTAMPTZ
-- Purpose: Ensures accurate Asia/Ho_Chi_Minh timezone evaluations and prevents
-- double-offset conversion when node-postgres parses timestamps.
-- ==============================================================================

ALTER TABLE user_quests 
  ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING updated_at AT TIME ZONE 'UTC';

ALTER TABLE user_quests 
  ALTER COLUMN updated_at SET DEFAULT CURRENT_TIMESTAMP;
