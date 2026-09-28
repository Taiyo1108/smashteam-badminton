const db = require('../db');

async function runMigration() {
  const client = await db.pool.connect();
  try {
    console.log('--- Bắt đầu Migration: Password Reset Tokens ---');
    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token VARCHAR(128) NOT NULL UNIQUE,
        otp_code VARCHAR(10) NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        used_at TIMESTAMPTZ NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_pw_reset_token ON password_reset_tokens(token);
      CREATE INDEX IF NOT EXISTS idx_pw_reset_user ON password_reset_tokens(user_id, expires_at);
    `);

    await client.query('COMMIT');
    console.log('✅ Migration Password Reset Tokens hoàn thành thành công!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Lỗi khi chạy migration password reset:', err);
    throw err;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  runMigration()
    .then(() => process.exit(0))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}

module.exports = { runMigration };
