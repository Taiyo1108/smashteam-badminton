-- Migration 17: Bảng club_events lưu trữ giải đấu & sự kiện (kèm lịch sử), và bổ sung trường cho recruitment_campaigns

-- 1. Bảng club_events
CREATE TABLE IF NOT EXISTS club_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    subtitle TEXT,
    event_date TIMESTAMP NOT NULL,
    location VARCHAR(255) NOT NULL,
    badge VARCHAR(100) DEFAULT 'GIẢI ĐẤU NỔI BẬT',
    action_text VARCHAR(100) DEFAULT 'Đăng ký tham gia ngay',
    action_link VARCHAR(255) DEFAULT '/schedule',
    is_featured BOOLEAN DEFAULT false,
    status VARCHAR(50) DEFAULT 'upcoming', -- 'upcoming', 'ongoing', 'completed', 'cancelled'
    participants_count INTEGER DEFAULT 0,
    max_participants INTEGER DEFAULT 50,
    description TEXT,
    results_summary TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Bổ sung trường chi tiết cho recruitment_campaigns
ALTER TABLE recruitment_campaigns ADD COLUMN IF NOT EXISTS badge_text VARCHAR(100) DEFAULT 'Mùa Tuyển Quân 2026';
ALTER TABLE recruitment_campaigns ADD COLUMN IF NOT EXISTS description TEXT DEFAULT 'Chào đón mọi cấp độ vợt thủ đam mê cầu lông gia nhập ngôi nhà chung SmashTeam. Tham gia ngay để tỏa sáng, nâng hạng ELO và rèn luyện thể lực hàng tuần!';
ALTER TABLE recruitment_campaigns ADD COLUMN IF NOT EXISTS location VARCHAR(255) DEFAULT 'Sân Cầu Lông Lan Anh, 291 CMT8, Q.10, TP.HCM';
ALTER TABLE recruitment_campaigns ADD COLUMN IF NOT EXISTS target_audience VARCHAR(255) DEFAULT 'Mọi cấp độ tay vợt';
ALTER TABLE recruitment_campaigns ADD COLUMN IF NOT EXISTS target_capacity INTEGER DEFAULT 60;
ALTER TABLE recruitment_campaigns ADD COLUMN IF NOT EXISTS timeline_steps JSONB;
