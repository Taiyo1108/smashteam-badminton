-- Migration 35: Bảng guest_blacklist và lưu vết kỷ luật khách vãng lai
CREATE TABLE IF NOT EXISTS guest_blacklist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
    phone VARCHAR(50) NULL,
    email VARCHAR(255) NULL,
    reason TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_guest_blacklist_phone ON guest_blacklist(phone);
CREATE INDEX IF NOT EXISTS idx_guest_blacklist_email ON guest_blacklist(LOWER(email));
