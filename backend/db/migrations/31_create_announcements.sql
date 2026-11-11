-- Migration 31: Create announcements and user_announcement_reads tables

CREATE TABLE IF NOT EXISTS announcements (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'general',
    image_url TEXT NULL,
    attachment_url TEXT NULL,
    attachment_name VARCHAR(255) NULL,
    attachment_size INTEGER NULL,
    attachment_mime_type VARCHAR(100) NULL,
    is_popup BOOLEAN NOT NULL DEFAULT TRUE,
    is_active BOOLEAN NOT NULL DEFAULT FALSE,
    priority INTEGER NOT NULL DEFAULT 0,
    publish_at TIMESTAMPTZ NULL,
    expires_at TIMESTAMPTZ NULL,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_announcement_reads (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    announcement_id INTEGER NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
    read_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, announcement_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_announcements_public_filter 
ON announcements(is_active, priority DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_announcements_popup_filter 
ON announcements(is_active, is_popup, priority DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_announcements_schedule 
ON announcements(publish_at, expires_at);

CREATE INDEX IF NOT EXISTS idx_user_announcement_reads_uid 
ON user_announcement_reads(user_id);
