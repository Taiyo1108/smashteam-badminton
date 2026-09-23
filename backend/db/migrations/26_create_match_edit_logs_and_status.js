const pool = require('../index');

async function runMigration() {
  const client = await pool.connect();
  try {
    console.log('--- RUNNING MIGRATION 26: Create match_edit_logs, verify status, and backfill partner ELO ---');
    await client.query('BEGIN');

    // 1. Tạo bảng match_edit_logs
    await client.query(`
      CREATE TABLE IF NOT EXISTS match_edit_logs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
        admin_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        action VARCHAR(50) NOT NULL,
        reason TEXT,
        before_data JSONB NOT NULL,
        after_data JSONB NOT NULL,
        affected_matches_count INTEGER DEFAULT 0,
        created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✓ Table match_edit_logs created or verified.');

    // 2. Tạo indexes tối ưu truy vấn
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_match_edit_logs_match_id ON match_edit_logs(match_id);
      CREATE INDEX IF NOT EXISTS idx_match_edit_logs_created_at ON match_edit_logs(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_matches_chronological ON matches(created_at ASC, id ASC);
      CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);
    `);
    console.log('✓ Indexes on match_edit_logs and matches verified.');

    // 3. Ràng buộc check constraint cho status
    await client.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_matches_status') THEN 
          ALTER TABLE matches ADD CONSTRAINT chk_matches_status CHECK (status IN ('approved', 'voided', 'pending')); 
        END IF; 
      END $$;
    `);
    console.log('✓ Constraint chk_matches_status verified.');

    // 4. Backfill partner ELO columns cho các trận đôi cũ có p1_partner_elo_before IS NULL
    const usersRes = await client.query(`SELECT id, full_name, badminton_level, elo_doubles FROM users;`);
    const userLevel = {};
    usersRes.rows.forEach(u => {
      let init = 1000;
      if (u.badminton_level === 'Mới chơi') init = 900;
      else if (u.badminton_level === 'Khá/Giỏi') init = 1150;
      userLevel[u.id] = { name: u.full_name, initialElo: init };
    });

    const doublesMatches = await client.query(`
      SELECT * FROM matches
      WHERE player1_partner_id IS NOT NULL AND (p1_partner_elo_before IS NULL OR p2_partner_elo_before IS NULL)
      ORDER BY created_at ASC, id ASC;
    `);

    console.log(`Backfilling partner ELO for ${doublesMatches.rows.length} doubles matches...`);
    const playerElo = {};

    for (const m of doublesMatches.rows) {
      const p1 = m.player1_id;
      const p2 = m.player2_id;
      const p1p = m.player1_partner_id;
      const p2p = m.player2_partner_id;

      const elo1p = playerElo[p1p] !== undefined ? playerElo[p1p] : (userLevel[p1p]?.initialElo || 1000);
      const elo2p = playerElo[p2p] !== undefined ? playerElo[p2p] : (userLevel[p2p]?.initialElo || 1000);

      const delta1 = m.p1_elo_after - m.p1_elo_before;
      const delta2 = m.p2_elo_after - m.p2_elo_before;

      const elo1p_after = Math.max(100, elo1p + delta1);
      const elo2p_after = Math.max(100, elo2p + delta2);

      playerElo[p1] = m.p1_elo_after;
      playerElo[p2] = m.p2_elo_after;
      playerElo[p1p] = elo1p_after;
      playerElo[p2p] = elo2p_after;

      await client.query(`
        UPDATE matches
        SET p1_partner_elo_before = $1,
            p1_partner_elo_after = $2,
            p2_partner_elo_before = $3,
            p2_partner_elo_after = $4
        WHERE id = $5;
      `, [elo1p, elo1p_after, elo2p, elo2p_after, m.id]);
    }
    console.log(`✓ Successfully backfilled partner ELO for ${doublesMatches.rows.length} matches.`);

    await client.query('COMMIT');
    console.log('=== MIGRATION 26 COMPLETED SUCCESSFULLY ===');
    process.exit(0);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migration 26 failed:', err);
    process.exit(1);
  } finally {
    client.release();
  }
}

runMigration();
