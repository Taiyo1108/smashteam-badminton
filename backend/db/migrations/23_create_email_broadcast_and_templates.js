const pool = require('../index');

async function runMigration() {
  try {
    console.log('Running Migration 23: Create email_broadcast_logs and init email_welcome_template...');

    // 1. Tạo bảng email_broadcast_logs
    await pool.query(`
      CREATE TABLE IF NOT EXISTS email_broadcast_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(255) NOT NULL,
        subject VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        target_audience VARCHAR(100) NOT NULL,
        target_label VARCHAR(255),
        total_recipients INTEGER DEFAULT 0,
        success_count INTEGER DEFAULT 0,
        failed_count INTEGER DEFAULT 0,
        status VARCHAR(20) DEFAULT 'completed',
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✓ Table email_broadcast_logs created/verified.');

    // 2. Mẫu email trúng tuyển mặc định
    const defaultTemplate = {
      subject: '🏸 Chúc mừng bạn đã gia nhập gia đình SMASH TEAM!',
      heading: 'SMASH TEAM ACADEMY 🏸',
      subheading: 'Chúc mừng bạn đã chính thức vượt qua kỳ Casting chuyên môn!',
      body: 'Chào mừng bạn đã trở thành một phần của đại gia đình SmashTeam. Dưới đây là thông số đánh giá chuyên môn ban đầu của bạn được Ban Tuyển Trạch ghi nhận:',
      show_stats: true,
      call_to_action_text: 'KÍCH HOẠT TÀI KHOẢN',
      footer_text: 'Đây là email tự động từ Ban Quản Trị SMASH TEAM. Vui lòng không trả lời thư này.'
    };

    // 3. Khởi tạo giá trị trong site_settings nếu chưa có
    await pool.query(`
      INSERT INTO site_settings (key, value, updated_at)
      VALUES ($1, $2, CURRENT_TIMESTAMP)
      ON CONFLICT (key) DO NOTHING;
    `, ['email_welcome_template', JSON.stringify(defaultTemplate)]);
    console.log('✓ Initialized default email_welcome_template in site_settings.');

    console.log('Migration 23 completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Migration 23 failed:', err);
    process.exit(1);
  }
}

runMigration();
