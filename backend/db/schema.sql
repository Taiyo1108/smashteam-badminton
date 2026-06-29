-- PostgreSQL Schema

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name VARCHAR(255) NOT NULL,
    phone_zalo VARCHAR(50) NOT NULL,
    academic_info VARCHAR(255),
    badminton_level VARCHAR(50) CHECK (badminton_level IN ('Mới chơi', 'Trung bình', 'Khá/Giỏi')),
    soft_skills JSONB,
    role VARCHAR(50) DEFAULT 'candidate' CHECK (role IN ('candidate', 'member', 'admin')),
    elo_score INTEGER DEFAULT 1000,
    total_matches INTEGER DEFAULT 0,
    win_rate DECIMAL(5, 2) DEFAULT 0.0,
    password_hash VARCHAR(255), -- For admin login
    gender VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE media_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    content_url TEXT NOT NULL,
    is_featured BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    date_time TIMESTAMP NOT NULL,
    location VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player1_id UUID REFERENCES users(id) ON DELETE CASCADE,
    player2_id UUID REFERENCES users(id) ON DELETE CASCADE,
    winner_id UUID REFERENCES users(id) ON DELETE CASCADE,
    score_detail VARCHAR(100),
    elo_exchanged INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert a default admin for testing (password is 'admin123' hashed with bcrypt, you should generate a real hash in production)
-- The hash below is for 'admin123'
INSERT INTO users (full_name, phone_zalo, role, password_hash) 
VALUES ('Super Admin', '0999999999', 'admin', '$2b$10$wTf255n44B4mGXY9T9.u8eZ/rNqS5O0U0kRkY.qJ5K1A9oH9wA3.O');
