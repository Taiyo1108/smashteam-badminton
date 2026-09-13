const fs = require('fs');
const path = require('path');
const db = require('../index');

async function runMigration() {
  try {
    console.log('Running Migration 18 (Sync Member Ranks & Elo)...');
    const schemaPath = path.join(__dirname, '18_sync_member_ranks.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    await db.query(schemaSql);

    console.log('✅ Migration 18 chạy thành công! Điểm ELO của các thành viên đã được chuẩn hóa theo đúng phân cấp.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Lỗi khi chạy migration 18:', error);
    process.exit(1);
  }
}

runMigration();
