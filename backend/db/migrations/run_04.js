const fs = require('fs');
const path = require('path');
const db = require('../index');

async function runMigration() {
  try {
    console.log('Running Migration 04 (Elo Matches)...');
    const schemaPath = path.join(__dirname, '04_elo_matches.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    await db.query(schemaSql);
    
    console.log('✅ Migration 04 chạy thành công!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Lỗi khi chạy migration 04:', error);
    process.exit(1);
  }
}

runMigration();
