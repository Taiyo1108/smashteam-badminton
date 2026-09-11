-- Migration 16: Thêm cột checkin_code (mã code 5 ký tự) vào bảng sessions để thành viên không có camera điểm danh thủ công
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS checkin_code VARCHAR(10);
