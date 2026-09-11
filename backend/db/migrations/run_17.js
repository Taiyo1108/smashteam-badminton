const fs = require('fs');
const path = require('path');
const db = require('../index');

async function runMigration() {
  try {
    console.log('Running Migration 17 (Club Events & Campaign Fields)...');
    await db.query(`
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
        status VARCHAR(50) DEFAULT 'upcoming',
        participants_count INTEGER DEFAULT 0,
        max_participants INTEGER DEFAULT 50,
        description TEXT,
        results_summary TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.query(`ALTER TABLE recruitment_campaigns ADD COLUMN IF NOT EXISTS badge_text VARCHAR(100) DEFAULT 'Mùa Tuyển Quân 2026'`);
    await db.query(`ALTER TABLE recruitment_campaigns ADD COLUMN IF NOT EXISTS description TEXT DEFAULT 'Chào đón mọi cấp độ vợt thủ đam mê cầu lông gia nhập ngôi nhà chung SmashTeam. Tham gia ngay để tỏa sáng, nâng hạng ELO và rèn luyện thể lực hàng tuần!'`);
    await db.query(`ALTER TABLE recruitment_campaigns ADD COLUMN IF NOT EXISTS location VARCHAR(255) DEFAULT 'Sân Cầu Lông Lan Anh, 291 CMT8, Q.10, TP.HCM'`);
    await db.query(`ALTER TABLE recruitment_campaigns ADD COLUMN IF NOT EXISTS target_audience VARCHAR(255) DEFAULT 'Mọi cấp độ tay vợt'`);
    await db.query(`ALTER TABLE recruitment_campaigns ADD COLUMN IF NOT EXISTS target_capacity INTEGER DEFAULT 60`);
    await db.query(`ALTER TABLE recruitment_campaigns ADD COLUMN IF NOT EXISTS timeline_steps JSONB`);

    // 1. Seed events nếu bảng club_events đang rỗng
    const eventsCount = await db.query('SELECT COUNT(*) FROM club_events');
    if (parseInt(eventsCount.rows[0].count) === 0) {
      console.log('Khởi tạo dữ liệu sự kiện giải đấu mẫu (Active & Lịch sử)...');
      
      // Sự kiện nổi bật hiện tại
      await db.query(`
        INSERT INTO club_events (
          title, subtitle, event_date, location, badge, action_text, action_link, 
          is_featured, status, participants_count, max_participants, description
        ) VALUES (
          'Giải Đấu Cầu Lông Mở Rộng SmashTeam Championship 2026',
          'Sự kiện quy tụ hơn 50 vợt thủ tranh cúp ELO Vàng, vinh danh tay vợt xuất sắc và phần thưởng tài trợ độc quyền.',
          '2026-09-20 08:30:00',
          'Cụm Sân Cầu Lông Lan Anh, 291 CMT8, Q.10, TP.HCM',
          'GIẢI ĐẤU NỔI BẬT',
          'Đăng ký tham gia ngay',
          '/schedule',
          true,
          'upcoming',
          36,
          50,
          'Giải đấu quy mô lớn nhất năm 2026 của CLB SmashTeam, tranh tài các nội dung Đơn Nam, Đơn Nữ, Đôi Nam Nữ với tổng giải thưởng lên đến 15.000.000 VNĐ.'
        )
      `);

      // Lịch sử giải đấu 1 (Đã hoàn thành)
      await db.query(`
        INSERT INTO club_events (
          title, subtitle, event_date, location, badge, action_text, action_link, 
          is_featured, status, participants_count, max_participants, description, results_summary
        ) VALUES (
          'Giải SmashTeam Newbie & Intermediate Cup 2025',
          'Giải đấu giao lưu cọ xát kỹ năng và tính điểm ELO đầu tiên của năm 2025.',
          '2025-11-15 08:00:00',
          'Sân Bình Thắng, TP. Dĩ An, Bình Dương',
          'LỊCH SỬ GIẢI ĐẤU',
          'Xem bảng xếp hạng ELO',
          '/#leaderboard',
          false,
          'completed',
          48,
          48,
          'Giải đấu cọ xát đầu mùa quy tụ 48 tay vợt thành viên và khách mời giao lưu.',
          '🏆 Vô địch Đơn Nam: Nguyễn Văn A (+150 ELO) | 🥈 Á quân: Trần Minh Quang | 🥉 Hạng ba: Lê Hoàng C'
        )
      `);

      // Lịch sử giải đấu 2 (Đã hoàn thành)
      await db.query(`
        INSERT INTO club_events (
          title, subtitle, event_date, location, badge, action_text, action_link, 
          is_featured, status, participants_count, max_participants, description, results_summary
        ) VALUES (
          'Giao Hữu Cầu Lông Liên Trường UIT x VNU 2025',
          'Tranh tài hữu nghị giữa SmashTeam UIT và các CLB cầu lông khối ĐHQG-HCM.',
          '2025-08-20 13:30:00',
          'Nhà Thi Đấu Thể Thao ĐHQG-HCM, Thủ Đức',
          'GIAO HỮU LIÊN CLB',
          'Xem tổng kết hình ảnh',
          '/#gallery',
          false,
          'completed',
          32,
          32,
          'Sự kiện giao lưu thi đấu đôi nam nữ giữa các trường đại học.',
          '🏆 SmashTeam UIT giành giải Nhất toàn đoàn với 3 huy chương vàng các nội dung đôi!'
        )
      `);
      console.log('✅ Đã nạp 3 giải đấu (1 Nổi bật, 2 Lịch sử) vào club_events!');
    }

    // 2. Seed campaign nếu recruitment_campaigns đang rỗng
    const campCount = await db.query('SELECT COUNT(*) FROM recruitment_campaigns');
    if (parseInt(campCount.rows[0].count) === 0) {
      console.log('Khởi tạo chiến dịch tuyển quân mẫu (Active & Lịch sử)...');
      
      const defaultTimeline = JSON.stringify([
        { step: "01", title: "Nộp Đơn Online", desc: "Điền hồ sơ thông tin, chọn ca test kỹ năng phù hợp.", status: "Đang diễn ra", isCurrent: true },
        { step: "02", title: "Casting & Thử Sân", desc: "Test thể lực, kỹ thuật cơ bản và đấu tập giao lưu trên sân.", status: "Sắp tới", isCurrent: false },
        { step: "03", title: "Onboard & Cấp Thẻ", desc: "Nhận áo đấu chính thức, kích hoạt mã định danh ELO.", status: "Chung cuộc", isCurrent: false }
      ]);

      // Chiến dịch tuyển quân hiện tại (Active)
      const currentCamp = await db.query(`
        INSERT INTO recruitment_campaigns (
          name, start_date, end_date, is_active, badge_text, description, location, target_audience, target_capacity, timeline_steps
        ) VALUES (
          'Chiến Dịch Tuyển Vợt Thủ SmashTeam Mùa Giải 2026',
          '2026-03-01 00:00:00',
          '2026-03-30 23:59:59',
          true,
          'Mùa Tuyển Quân 2026',
          'Chào đón mọi cấp độ vợt thủ đam mê cầu lông gia nhập ngôi nhà chung SmashTeam. Tham gia ngay để tỏa sáng, nâng hạng ELO và rèn luyện thể lực hàng tuần!',
          'Sân Cầu Lông Lan Anh, 291 CMT8, Q.10, TP.HCM',
          'Mọi cấp độ tay vợt (Sinh viên UIT & Khách mời)',
          60,
          $1
        ) RETURNING id
      `, [defaultTimeline]);

      const campId = currentCamp.rows[0].id;

      // Seed ca casting cho chiến dịch này
      await db.query(`
        INSERT INTO casting_slots (campaign_id, casting_time, location, max_capacity)
        VALUES 
          ($1, '2026-03-15 08:00:00', 'Sân Cầu Lông Lan Anh, Q.10 - Sân số 2', 20),
          ($1, '2026-03-22 14:00:00', 'Sân Cầu Lông Lan Anh, Q.10 - Sân số 3', 20),
          ($1, '2026-03-29 08:30:00', 'Sân Bình Thắng, Dĩ An - Sân VIP', 20)
      `, [campId]);

      // Lịch sử đợt tuyển quân cũ (Đã hoàn thành)
      await db.query(`
        INSERT INTO recruitment_campaigns (
          name, start_date, end_date, is_active, badge_text, description, location, target_audience, target_capacity, timeline_steps
        ) VALUES (
          'Đợt Tuyển Thành Viên Mùa Thu Đông 2025',
          '2025-09-01 00:00:00',
          '2025-09-30 23:59:59',
          false,
          'Mùa Tuyển Quân 2025',
          'Đợt tuyển chọn thành viên thế hệ K19 UIT tham gia đội tuyển câu lạc bộ SmashTeam.',
          'Sân Bình Thắng, TP. Dĩ An, Bình Dương',
          'Sinh viên khóa mới UIT',
          50,
          $1
        )
      `, [defaultTimeline]);

      console.log('✅ Đã nạp 2 chiến dịch tuyển quân (1 Đang mở, 1 Lịch sử) kèm 3 ca casting!');
    }

    console.log('✅ Migration 17 hoàn tất thành công!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Lỗi khi chạy migration 17:', error);
    process.exit(1);
  }
}

runMigration();
