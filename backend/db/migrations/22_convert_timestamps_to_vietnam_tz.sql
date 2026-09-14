-- Migration 22: Chuyển đổi các trường thời gian sang TIMESTAMPTZ theo giờ chuẩn Việt Nam (Asia/Ho_Chi_Minh)
-- Đồng bộ lại giá trị featured_event_date trong site_settings

ALTER TABLE club_events ALTER COLUMN event_date TYPE TIMESTAMPTZ USING event_date AT TIME ZONE 'Asia/Ho_Chi_Minh';
ALTER TABLE sessions ALTER COLUMN date_time TYPE TIMESTAMPTZ USING date_time AT TIME ZONE 'Asia/Ho_Chi_Minh';
ALTER TABLE casting_slots ALTER COLUMN casting_time TYPE TIMESTAMPTZ USING casting_time AT TIME ZONE 'Asia/Ho_Chi_Minh';
ALTER TABLE recruitment_campaigns ALTER COLUMN start_date TYPE TIMESTAMPTZ USING start_date AT TIME ZONE 'Asia/Ho_Chi_Minh';
ALTER TABLE recruitment_campaigns ALTER COLUMN end_date TYPE TIMESTAMPTZ USING end_date AT TIME ZONE 'Asia/Ho_Chi_Minh';

-- Đồng bộ giá trị chuẩn cho sự kiện nổi bật trong site_settings
UPDATE site_settings 
SET value = (
  SELECT TO_CHAR(event_date AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') 
  FROM club_events 
  WHERE is_featured = true 
  LIMIT 1
),
updated_at = CURRENT_TIMESTAMP
WHERE key = 'featured_event_date'
  AND EXISTS (SELECT 1 FROM club_events WHERE is_featured = true);