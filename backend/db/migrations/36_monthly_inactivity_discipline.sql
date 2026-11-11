-- Migration 36: Kỷ luật chuyên cần thành viên hàng tháng (Monthly Inactivity Discipline)
-- Tối ưu hóa truy vấn kiểm tra kỷ luật chuyên cần và cảnh báo đăng nhập 1 lần

CREATE INDEX IF NOT EXISTS idx_discipline_reason_type ON member_discipline_records((metadata->>'reason_type'));
CREATE INDEX IF NOT EXISTS idx_discipline_month_year ON member_discipline_records((metadata->>'month_year'));
CREATE INDEX IF NOT EXISTS idx_discipline_warning_ack ON member_discipline_records((metadata->>'warning_acknowledged'));
