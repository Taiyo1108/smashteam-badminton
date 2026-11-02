-- Migration 37: Bảng cấu hình ca đánh cố định linh hoạt (Customizable Club Slots)
-- Cho phép thêm, sửa, xóa các khung giờ sinh hoạt cố định theo từng tháng hoặc mặc định toàn hệ thống

CREATE TABLE IF NOT EXISTS club_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    month_year VARCHAR(7) NULL, -- 'YYYY-MM' (ví dụ '2026-11'), NULL nghĩa là ca mẫu mặc định
    code VARCHAR(50) NOT NULL, -- ví dụ 'WED_18_20', 'THU_17_19', 'SAT_18_20', 'TUE_18_20'
    weekday INT NOT NULL, -- 0 = CN, 1 = T2, 2 = T3, 3 = T4, 4 = T5, 5 = T6, 6 = T7
    day_prefix VARCHAR(10) NOT NULL, -- 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'
    weekday_token VARCHAR(20) NOT NULL, -- 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'
    start_time VARCHAR(10) NOT NULL, -- '18:00'
    end_time VARCHAR(10) NOT NULL, -- '20:00'
    start_hour INT NOT NULL, -- 18
    end_hour INT NOT NULL, -- 20
    label VARCHAR(100) NOT NULL, -- 'Thứ 4 — 18:00–20:00'
    short_label VARCHAR(50) NOT NULL, -- 'T4 (18-20h)'
    color VARCHAR(30) DEFAULT 'purple', -- 'emerald', 'indigo', 'blue', 'purple', 'amber', 'rose', 'cyan'
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_club_slots_month_code 
ON club_slots (COALESCE(month_year, '__GLOBAL__'), code);

CREATE INDEX IF NOT EXISTS idx_club_slots_month_year 
ON club_slots (month_year);

-- Khởi tạo 4 ca mặc định ban đầu nếu bảng còn trống
INSERT INTO club_slots (month_year, code, weekday, day_prefix, weekday_token, start_time, end_time, start_hour, end_hour, label, short_label, color, display_order)
VALUES 
  (NULL, 'WED_18_20', 3, 'WED', 'WEDNESDAY', '18:00', '20:00', 18, 20, 'Thứ 4 — 18:00–20:00', 'T4 (18-20h)', 'emerald', 1),
  (NULL, 'THU_17_19', 4, 'THU', 'THURSDAY',  '17:00', '19:00', 17, 19, 'Thứ 5 — 17:00–19:00', 'T5 Ca 1 (17-19h)', 'indigo', 2),
  (NULL, 'THU_18_20', 4, 'THU', 'THURSDAY',  '18:00', '20:00', 18, 20, 'Thứ 5 — 18:00–20:00', 'T5 Ca 2 (18-20h)', 'blue', 3),
  (NULL, 'SAT_18_20', 6, 'SAT', 'SATURDAY',  '18:00', '20:00', 18, 20, 'Thứ 7 — 18:00–20:00', 'T7 (18-20h)', 'purple', 4)
ON CONFLICT DO NOTHING;
