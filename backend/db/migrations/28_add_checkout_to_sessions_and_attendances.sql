-- ==============================================================================
-- Migration 28: Add Checkout to Sessions and Attendances
-- Architecture: RESERVATION -> CONFIRMATION -> QR CHECK-IN -> QR CHECK-OUT
-- ==============================================================================

-- 1. Upgrade public.sessions table with check-out fields
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS checkout_open_at TIMESTAMPTZ;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS checkout_close_at TIMESTAMPTZ;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS qr_checkout_secret_token VARCHAR(255);
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS missing_checkout_processed BOOLEAN DEFAULT FALSE;

-- Backfill existing sessions
UPDATE sessions
SET checkout_open_at = COALESCE(checkout_open_at, session_start + INTERVAL '30 minutes', date_time + INTERVAL '30 minutes'),
    checkout_close_at = COALESCE(checkout_close_at, session_end + INTERVAL '30 minutes', date_time + INTERVAL '2 hours 30 minutes'),
    qr_checkout_secret_token = COALESCE(qr_checkout_secret_token, 'SMASH_OUT_' || substr(id::text, 1, 8)),
    missing_checkout_processed = COALESCE(missing_checkout_processed, FALSE)
WHERE checkout_open_at IS NULL OR qr_checkout_secret_token IS NULL;

-- 2. Upgrade public.attendances check constraint
DO $$ 
BEGIN
    ALTER TABLE attendances DROP CONSTRAINT IF EXISTS attendances_status_check;
EXCEPTION
    WHEN undefined_object THEN NULL;
END $$;

ALTER TABLE attendances ADD CONSTRAINT attendances_status_check 
CHECK (status IN ('RESERVED', 'CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'MISSING_CHECKOUT', 'CANCELLED', 'NO_SHOW', 'going', 'absent'));

-- 3. Add check-out lifecycle columns to attendances
ALTER TABLE attendances ADD COLUMN IF NOT EXISTS checked_out_at TIMESTAMPTZ;
ALTER TABLE attendances ADD COLUMN IF NOT EXISTS checkout_method VARCHAR(30);
ALTER TABLE attendances ADD COLUMN IF NOT EXISTS checkout_status VARCHAR(30);
ALTER TABLE attendances ADD COLUMN IF NOT EXISTS duration_minutes INT;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_attendances_checkout_status ON attendances (session_id, status);
CREATE INDEX IF NOT EXISTS idx_sessions_checkout_window ON sessions (checkout_open_at, checkout_close_at);
