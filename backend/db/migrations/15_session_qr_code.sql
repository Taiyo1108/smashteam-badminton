-- Migration 15: Thêm cột qr_code và qr_created_at vào bảng sessions để lưu mã QR điểm danh
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS qr_code VARCHAR(255);
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS qr_created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
