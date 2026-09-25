const db = require('../db');

async function runMigration() {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    console.log('Starting Member Management Hub migration...');

    // 1. Add tags array and deleted_at to users
    await client.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;
    `);
    console.log('✓ Added tags and deleted_at columns to users table');

    // 2. Create member_discipline_records
    await client.query(`
      CREATE TABLE IF NOT EXISTS member_discipline_records (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(20) NOT NULL, -- 'WARNING', 'YELLOW', 'RED'
        reason TEXT NOT NULL,
        session_id UUID NULL REFERENCES sessions(id) ON DELETE SET NULL,
        issued_by UUID NULL REFERENCES users(id) ON DELETE SET NULL,
        issued_at TIMESTAMPTZ DEFAULT NOW(),
        expires_at TIMESTAMPTZ NULL,
        status VARCHAR(20) DEFAULT 'ACTIVE', -- 'ACTIVE', 'REVOKED', 'EXPIRED'
        revoked_by UUID NULL REFERENCES users(id) ON DELETE SET NULL,
        revoked_reason TEXT NULL,
        revoked_at TIMESTAMPTZ NULL,
        metadata JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_discipline_user_status ON member_discipline_records(user_id, status);
      CREATE INDEX IF NOT EXISTS idx_discipline_session ON member_discipline_records(session_id);
    `);
    console.log('✓ Created member_discipline_records table with indexes');

    // 3. Create coin_transactions ledger
    await client.query(`
      CREATE TABLE IF NOT EXISTS coin_transactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        amount INT NOT NULL,
        balance_after INT NOT NULL,
        source VARCHAR(50) NOT NULL, -- 'MANUAL_ADMIN', 'QUEST_REWARD', 'SHOP_PURCHASE', 'SESSION_CHECKIN', 'EVENT_REWARD'
        reason TEXT NOT NULL,
        admin_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_coin_tx_user ON coin_transactions(user_id, created_at DESC);
    `);
    console.log('✓ Created coin_transactions ledger table with indexes');

    // 4. Create member_audit_logs
    await client.query(`
      CREATE TABLE IF NOT EXISTS member_audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        admin_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
        action_type VARCHAR(50) NOT NULL,
        field_name VARCHAR(50) NULL,
        old_value TEXT NULL,
        new_value TEXT NULL,
        reason TEXT NULL,
        metadata JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_member_audit_user ON member_audit_logs(user_id, created_at DESC);
    `);
    console.log('✓ Created member_audit_logs table with indexes');

    await client.query('COMMIT');
    console.log('Migration committed successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed, rolled back:', err);
    throw err;
  } finally {
    client.release();
    process.exit(0);
  }
}

runMigration().catch(err => {
  console.error(err);
  process.exit(1);
});
