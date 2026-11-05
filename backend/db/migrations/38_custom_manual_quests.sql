-- Migration 38: Custom and Manual Quests Enhancement
ALTER TABLE quests ADD COLUMN IF NOT EXISTS description TEXT;
