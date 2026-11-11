const pool = require('../index');

async function runMigration() {
  try {
    console.log('Running Migration 30: Create sent_emails_log table...');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS sent_emails_log (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        recipient_email VARCHAR(255) NOT NULL,
        subject VARCHAR(500),
        email_type VARCHAR(50) NOT NULL DEFAULT 'broadcast',
        status VARCHAR(20) NOT NULL DEFAULT 'sent',
        resend_id VARCHAR(100),
        broadcast_log_id UUID REFERENCES email_broadcast_logs(id) ON DELETE SET NULL,
        error_message TEXT,
        sent_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_sent_emails_log_sent_at ON sent_emails_log(sent_at);
      CREATE INDEX IF NOT EXISTS idx_sent_emails_log_status ON sent_emails_log(status);
      CREATE INDEX IF NOT EXISTS idx_sent_emails_log_type ON sent_emails_log(email_type);
    `);

    console.log('✓ Table sent_emails_log and indexes created successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Migration 30 failed:', err);
    process.exit(1);
  }
}

runMigration();
