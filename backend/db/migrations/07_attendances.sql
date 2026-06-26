-- Create attendances table for RSVP
CREATE TABLE IF NOT EXISTS attendances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL CHECK (status IN ('going', 'absent')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(session_id, user_id)
);

-- Add nickname column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS nickname VARCHAR(100);

-- Insert mock future sessions if the sessions table is empty
INSERT INTO sessions (title, date_time, location)
SELECT 'Buổi tập Thứ Bảy - Giao lưu ELO', NOW() + INTERVAL '1 day 2 hours', 'Sân cầu lông Kỳ Hòa, Quận 10'
WHERE NOT EXISTS (SELECT 1 FROM sessions WHERE title = 'Buổi tập Thứ Bảy - Giao lưu ELO');

INSERT INTO sessions (title, date_time, location)
SELECT 'Buổi tập Thứ Ba - Kỹ thuật Smash', NOW() + INTERVAL '4 days 2 hours', 'Sân cầu lông Kỳ Hòa, Quận 10'
WHERE NOT EXISTS (SELECT 1 FROM sessions WHERE title = 'Buổi tập Thứ Ba - Kỹ thuật Smash');
