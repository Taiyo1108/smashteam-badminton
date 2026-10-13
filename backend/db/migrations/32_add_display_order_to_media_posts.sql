-- Migration 32: Bổ sung display_order cho media_posts và khởi tạo thứ tự ban đầu
ALTER TABLE media_posts ADD COLUMN IF NOT EXISTS display_order INTEGER NOT NULL DEFAULT 0;

-- Đánh số thứ tự liên tục 0, 1, 2... cho các bài đăng hiện có
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY is_featured DESC, created_at DESC) - 1 as new_order
  FROM media_posts
)
UPDATE media_posts
SET display_order = ranked.new_order
FROM ranked
WHERE media_posts.id = ranked.id;

CREATE INDEX IF NOT EXISTS idx_media_posts_display_order ON media_posts (display_order ASC, created_at DESC);
