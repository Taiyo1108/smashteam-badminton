-- Migration 19: Bộ câu hỏi tùy chỉnh theo đợt tuyển (admin soạn) + câu trả lời của ứng viên
ALTER TABLE recruitment_campaigns ADD COLUMN IF NOT EXISTS custom_questions JSONB DEFAULT '[]';
ALTER TABLE users ADD COLUMN IF NOT EXISTS extra_answers JSONB;
