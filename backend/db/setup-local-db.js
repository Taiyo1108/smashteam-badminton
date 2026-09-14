const { PGlite } = require('@electric-sql/pglite');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');

async function setupLocalDb(existingDb) {
  let db = existingDb;
  if (!db) {
    const dataDir = path.join(__dirname, '..', 'local_pgdata');
    console.log(`[DB Setup] Khởi tạo PGlite tại: ${dataDir}`);
    db = new PGlite(dataDir);
  }
  await db.waitReady;

  // 1. Kiểm tra xem bảng users đã tồn tại chưa
  try {
    const check = await db.query("SELECT 1 FROM information_schema.tables WHERE table_name = 'users'");
    if (check.rows.length > 0) {
      console.log('[DB Setup] Bảng users đã tồn tại. Đảm bảo mật khẩu admin123...');
      const hash = await bcrypt.hash('admin123', 10);
      await db.query("UPDATE users SET password_hash = $1 WHERE role = 'admin'", [hash]);

      // Đảm bảo có cột email trong users và is_claimed trong user_quests
      await db.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(255)");
      await db.query("ALTER TABLE user_quests ADD COLUMN IF NOT EXISTS is_claimed BOOLEAN DEFAULT false");

      // Đảm bảo có cột qr_code và checkin_code (5 ký tự) trong sessions để admin tạo mã QR & điểm danh thủ công
      await db.query("ALTER TABLE sessions ADD COLUMN IF NOT EXISTS qr_code VARCHAR(255)");
      await db.query("ALTER TABLE sessions ADD COLUMN IF NOT EXISTS qr_created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP");
      // Đảm bảo có bảng club_events và các cột bổ sung cho recruitment_campaigns
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
      await db.query("ALTER TABLE recruitment_campaigns ADD COLUMN IF NOT EXISTS badge_text VARCHAR(100) DEFAULT 'Mùa Tuyển Quân 2026'");
      await db.query("ALTER TABLE recruitment_campaigns ADD COLUMN IF NOT EXISTS description TEXT");
      await db.query("ALTER TABLE recruitment_campaigns ADD COLUMN IF NOT EXISTS location VARCHAR(255)");
      await db.query("ALTER TABLE recruitment_campaigns ADD COLUMN IF NOT EXISTS target_audience VARCHAR(255)");
      await db.query("ALTER TABLE recruitment_campaigns ADD COLUMN IF NOT EXISTS target_capacity INTEGER DEFAULT 60");
      await db.query("ALTER TABLE recruitment_campaigns ADD COLUMN IF NOT EXISTS timeline_steps JSONB");
      await db.query("ALTER TABLE recruitment_campaigns ADD COLUMN IF NOT EXISTS custom_questions JSONB DEFAULT '[]'");
      await db.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS extra_answers JSONB");

      // Đảm bảo có cấu hình sự kiện đếm ngược nổi bật
      await db.query(`
        INSERT INTO site_settings (key, value)
        VALUES 
          ('featured_event_title', 'Giải Đấu Cầu Lông Mở Rộng SmashTeam Championship 2026'),
          ('featured_event_subtitle', 'Sự kiện quy tụ hơn 50 vợt thủ tranh cúp ELO Vàng, vinh danh tay vợt xuất sắc và phần thưởng tài trợ độc quyền.'),
          ('featured_event_date', '2026-09-20T08:30:00'),
          ('featured_event_location', 'Cụm Sân Cầu Lông Lan Anh, 291 CMT8, Q.10, TP.HCM'),
          ('featured_event_badge', 'GIẢI ĐẤU NỔI BẬT'),
          ('featured_event_action_text', 'Đăng ký tham gia ngay'),
          ('featured_event_action_link', '/schedule'),
          ('featured_event_enabled', 'true')
        ON CONFLICT (key) DO NOTHING
      `);

      console.log('[DB Setup] Hoàn tất kiểm tra admin và cấu hình hệ thống!');
      return db;
    }
  } catch (err) {
    // bảng chưa tồn tại, tiếp tục khởi tạo
  }

  console.log('[DB Setup] Khởi tạo schema.sql...');
  let schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  schema = schema.replace(/CREATE EXTENSION IF NOT EXISTS "uuid-ossp";/g, '');
  schema = schema.replace(/uuid_generate_v4\(\)/g, 'gen_random_uuid()');
  await db.exec(schema);
  console.log('✅ Base schema đã áp dụng');

  // 2. Chạy migrations 01 - 14
  const migrationsDir = path.join(__dirname, 'migrations');
  if (fs.existsSync(migrationsDir)) {
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      console.log(`[DB Setup] Áp dụng migration ${file}...`);
      let sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      sql = sql.replace(/CREATE EXTENSION IF NOT EXISTS "uuid-ossp";/g, '');
      sql = sql.replace(/uuid_generate_v4\(\)/g, 'gen_random_uuid()');
      try {
        await db.exec(sql);
      } catch (err) {
        console.warn(`[DB Setup] Cảnh báo tại ${file}:`, err.message);
      }
    }
  }

  // 3. Cập nhật mật khẩu chuẩn bcrypt cho admin123
  console.log('[DB Setup] Tạo hash mật khẩu admin123...');
  const hash = await bcrypt.hash('admin123', 10);
  const adminCheck = await db.query("SELECT id FROM users WHERE phone_zalo = '0999999999'");
  if (adminCheck.rows.length > 0) {
    await db.query("UPDATE users SET password_hash = $1 WHERE phone_zalo = '0999999999'", [hash]);
  } else {
    await db.query(
      `INSERT INTO users (full_name, phone_zalo, role, password_hash, status, is_blocked)
       VALUES ('Super Admin', '0999999999', 'admin', $1, 'active', false)`,
      [hash]
    );
  }

  // 4. Thêm vài thành viên mẫu cho leaderboard & bục vinh danh nếu chưa có
  const memberCheck = await db.query("SELECT COUNT(*) as count FROM users WHERE role = 'member'");
  if (Number(memberCheck.rows[0].count) === 0) {
    console.log('[DB Setup] Thêm dữ liệu mẫu tay vợt cho BXH...');
    await db.query(`
      INSERT INTO users (full_name, phone_zalo, role, status, elo_singles, win_rate_singles, matches_singles, elo_doubles, win_rate_doubles, matches_doubles, password_hash)
      VALUES 
        ('Nguyễn Văn A', '0901111111', 'member', 'active', 1850, 78.5, 24, 1820, 75.0, 20, '${hash}'),
        ('Trần Thị B', '0902222222', 'member', 'active', 1680, 71.0, 18, 1650, 68.0, 16, '${hash}'),
        ('Lê Hoàng C', '0903333333', 'member', 'active', 1480, 62.5, 14, 1500, 65.0, 15, '${hash}'),
        ('Phạm D', '0904444444', 'member', 'active', 1320, 54.0, 10, 1300, 50.0, 8, '${hash}'),
        ('Đặng E', '0905555555', 'member', 'active', 1150, 48.0, 6, 1180, 45.0, 6, '${hash}'),
        ('Hoàng Văn F', '0906666666', 'member', 'active', 1050, 40.0, 4, 1020, 38.0, 4, '${hash}')
    `);
  }

  // 5. Đảm bảo cấu hình bổ sung và tương thích
  await db.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(255)");
  await db.query("ALTER TABLE user_quests ADD COLUMN IF NOT EXISTS is_claimed BOOLEAN DEFAULT false");
  await db.query(`
    INSERT INTO site_settings (key, value)
    VALUES 
      ('featured_event_title', 'Giải Đấu Cầu Lông Mở Rộng SmashTeam Championship 2026'),
      ('featured_event_subtitle', 'Sự kiện quy tụ hơn 50 vợt thủ tranh cúp ELO Vàng, vinh danh tay vợt xuất sắc và phần thưởng tài trợ độc quyền.'),
      ('featured_event_date', '2026-09-20T08:30:00'),
      ('featured_event_location', 'Cụm Sân Cầu Lông Lan Anh, 291 CMT8, Q.10, TP.HCM'),
      ('featured_event_badge', 'GIẢI ĐẤU NỔI BẬT'),
      ('featured_event_action_text', 'Đăng ký tham gia ngay'),
      ('featured_event_action_link', '/schedule'),
      ('featured_event_enabled', 'true')
    ON CONFLICT (key) DO NOTHING
  `);

  console.log('🎉 [DB Setup] Cơ sở dữ liệu PGlite đã sẵn sàng với tài khoản Admin: 0999999999 / admin123!');
  return db;
}

if (require.main === module) {
  setupLocalDb().then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { setupLocalDb };
