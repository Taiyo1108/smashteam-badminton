CREATE TABLE IF NOT EXISTS site_settings (
    key VARCHAR(255) PRIMARY KEY,
    value TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Khởi tạo ảnh bìa mặc định nếu chưa tồn tại
INSERT INTO site_settings (key, value)
VALUES ('homepage_cover_url', 'https://images.unsplash.com/photo-1599586120429-48281b6f0ece?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80')
ON CONFLICT (key) DO NOTHING;
