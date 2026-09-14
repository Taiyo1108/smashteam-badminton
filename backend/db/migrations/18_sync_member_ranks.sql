-- Migration 14: Chuẩn hóa điểm ELO khởi điểm và phân cấp Rank cho các thành viên chưa thi đấu
-- Đảm bảo điểm ELO không bị NULL và khớp với bảng quy chuẩn phân cấp:
-- Mới chơi: 900 ELO (Bronze)
-- Trung bình: 1000 ELO (Bronze)
-- Khá/Giỏi: 1150 ELO (Silver)

-- 1. Cập nhật các thành viên chưa có trận đấu nào (matches = 0) theo đúng trình độ
UPDATE users
SET elo_singles = 900
WHERE badminton_level = 'Mới chơi' AND (matches_singles = 0 OR matches_singles IS NULL) AND elo_singles = 1000;

UPDATE users
SET elo_doubles = 900
WHERE badminton_level = 'Mới chơi' AND (matches_doubles = 0 OR matches_doubles IS NULL) AND elo_doubles = 1000;

UPDATE users
SET elo_singles = 1150
WHERE badminton_level = 'Khá/Giỏi' AND (matches_singles = 0 OR matches_singles IS NULL) AND elo_singles = 1000;

UPDATE users
SET elo_doubles = 1150
WHERE badminton_level = 'Khá/Giỏi' AND (matches_doubles = 0 OR matches_doubles IS NULL) AND elo_doubles = 1000;

-- 2. Đảm bảo không có dòng dữ liệu nào bị NULL điểm Elo
UPDATE users SET elo_singles = 1000 WHERE elo_singles IS NULL;
UPDATE users SET elo_doubles = 1000 WHERE elo_doubles IS NULL;
