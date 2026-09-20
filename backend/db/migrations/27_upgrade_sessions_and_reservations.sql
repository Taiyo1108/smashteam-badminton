-- ==============================================================================
-- Migration 27: Upgrade Sessions and Reservations
-- Architecture: RESERVATION -> CONFIRMATION -> QR CHECK-IN + Waitlist FIFO
-- ==============================================================================

-- 1. Upgrade public.sessions table
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS session_start TIMESTAMPTZ;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS session_end TIMESTAMPTZ;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS reservation_open_at TIMESTAMPTZ;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS reservation_deadline TIMESTAMPTZ;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS checkin_open_at TIMESTAMPTZ;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS checkin_close_at TIMESTAMPTZ;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS capacity INT NOT NULL DEFAULT 40;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS qr_secret_token VARCHAR(255);
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS waitlist_offer_duration_minutes INT NOT NULL DEFAULT 10;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS auto_confirm_processed BOOLEAN DEFAULT FALSE;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS no_show_processed BOOLEAN DEFAULT FALSE;

-- Backfill existing sessions
UPDATE sessions
SET session_start = COALESCE(session_start, date_time),
    session_end = COALESCE(session_end, date_time + INTERVAL '2 hours'),
    reservation_open_at = COALESCE(reservation_open_at, date_time - INTERVAL '3 days'),
    reservation_deadline = COALESCE(reservation_deadline, date_time - INTERVAL '2 hours'),
    checkin_open_at = COALESCE(checkin_open_at, date_time - INTERVAL '30 minutes'),
    checkin_close_at = COALESCE(checkin_close_at, date_time + INTERVAL '30 minutes'),
    capacity = COALESCE(capacity, 40),
    qr_secret_token = COALESCE(qr_secret_token, qr_code, 'SMASH_' || substr(id::text, 1, 8)),
    waitlist_offer_duration_minutes = COALESCE(waitlist_offer_duration_minutes, 10),
    auto_confirm_processed = COALESCE(auto_confirm_processed, FALSE),
    no_show_processed = COALESCE(no_show_processed, FALSE)
WHERE session_start IS NULL OR qr_secret_token IS NULL;

-- 2. Upgrade public.attendances table
-- Drop old check constraint if exists
DO $$ 
BEGIN
    ALTER TABLE attendances DROP CONSTRAINT IF EXISTS attendances_status_check;
EXCEPTION
    WHEN undefined_object THEN NULL;
END $$;

-- Add new comprehensive check constraint
ALTER TABLE attendances ADD CONSTRAINT attendances_status_check 
CHECK (status IN ('RESERVED', 'CONFIRMED', 'CHECKED_IN', 'CANCELLED', 'NO_SHOW', 'going', 'absent'));

-- Add lifecycle columns to attendances
ALTER TABLE attendances ADD COLUMN IF NOT EXISTS reserved_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE attendances ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ;
ALTER TABLE attendances ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMPTZ;
ALTER TABLE attendances ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
ALTER TABLE attendances ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
ALTER TABLE attendances ADD COLUMN IF NOT EXISTS is_late_cancellation BOOLEAN DEFAULT FALSE;
ALTER TABLE attendances ADD COLUMN IF NOT EXISTS cancellation_request_pending BOOLEAN DEFAULT FALSE;
ALTER TABLE attendances ADD COLUMN IF NOT EXISTS cancellation_request_reason TEXT;
ALTER TABLE attendances ADD COLUMN IF NOT EXISTS cancellation_requested_at TIMESTAMPTZ;
ALTER TABLE attendances ADD COLUMN IF NOT EXISTS is_walk_in BOOLEAN DEFAULT FALSE;
ALTER TABLE attendances ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Backfill existing attendances: 'going' -> checked_in_at
UPDATE attendances
SET checked_in_at = COALESCE(checked_in_at, created_at),
    confirmed_at = COALESCE(confirmed_at, created_at),
    reserved_at = COALESCE(reserved_at, created_at),
    updated_at = COALESCE(updated_at, created_at)
WHERE status = 'going' AND checked_in_at IS NULL;

-- 3. Create public.session_waitlist table
CREATE TABLE IF NOT EXISTS session_waitlist (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    position INT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'WAITING' CHECK (status IN ('WAITING', 'OFFERED', 'CLAIMED', 'EXPIRED', 'CANCELLED')),
    offered_at TIMESTAMPTZ,
    offer_expires_at TIMESTAMPTZ,
    confirmed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(session_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_waitlist_session_queue ON session_waitlist(session_id, status, position);

-- 4. Create public.session_audit_logs table
CREATE TABLE IF NOT EXISTS session_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    admin_user_id UUID REFERENCES users(id),
    target_user_id UUID REFERENCES users(id),
    action VARCHAR(50) NOT NULL,
    before_status VARCHAR(50),
    after_status VARCHAR(50),
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_session_audit_logs_session ON session_audit_logs(session_id, created_at DESC);
