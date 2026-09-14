-- Migration 21: Bổ sung mã QR nhóm Zalo và link Zalo cho đợt tuyển
ALTER TABLE recruitment_campaigns ADD COLUMN IF NOT EXISTS zalo_qr_url TEXT;
ALTER TABLE recruitment_campaigns ADD COLUMN IF NOT EXISTS zalo_group_link TEXT;
