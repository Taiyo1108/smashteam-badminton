-- Migration 10: Advanced Member Fields
ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'left'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS hand_preference VARCHAR(50) CHECK (hand_preference IN ('Right', 'Left'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS play_style VARCHAR(50) CHECK (play_style IN ('Attacking', 'Defending', 'Net-play', 'All-rounder'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
