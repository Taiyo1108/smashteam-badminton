const pool = require('../index');

async function runMigration() {
  try {
    console.log('Running Migration 32: Add display_order to media_posts...');

    await pool.query(`
      ALTER TABLE media_posts ADD COLUMN IF NOT EXISTS display_order INTEGER NOT NULL DEFAULT 0;

      WITH ranked AS (
        SELECT id, ROW_NUMBER() OVER (ORDER BY is_featured DESC, created_at DESC) - 1 as new_order
        FROM media_posts
      )
      UPDATE media_posts
      SET display_order = ranked.new_order
      FROM ranked
      WHERE media_posts.id = ranked.id;

      CREATE INDEX IF NOT EXISTS idx_media_posts_display_order ON media_posts (display_order ASC, created_at DESC);
    `);

    console.log('✓ Migration 32 applied successfully: display_order added and indexed.');
    process.exit(0);
  } catch (err) {
    console.error('Migration 32 failed:', err);
    process.exit(1);
  }
}

runMigration();
