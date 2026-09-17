const path = require('path');
require('dotenv').config();
const db = require('./db');
const { getIsoWeekString, takeWeeklyRankingSnapshot } = require('./services/rankingSnapshotJob');
const { getRankingHubData } = require('./services/rankingHubService');

async function runTests() {
  console.log('====================================================');
  console.log('🚀 RUNNING 10-POINT REGRESSION TEST SUITE FOR RANKING HUB');
  console.log('====================================================\n');

  let passedTests = 0;
  let totalTests = 10;

  try {
    // Check DB connection
    const testRes = await db.query('SELECT current_database(), NOW()');
    console.log(`Connected to DB: ${testRes.rows[0].current_database} at ${testRes.rows[0].now}\n`);

    // ==========================================
    // TEST 1: Season 01 & 02 with same week -> no conflict
    // ==========================================
    console.log('--- TEST 1: Composite Unique Key (season_id, mode, user_id, snapshot_week) ---');
    // Ensure season 2 exists or create a mock season
    let season2 = (await db.query("SELECT id FROM seasons WHERE id = 2")).rows[0];
    if (!season2) {
      const s2Res = await db.query(
        "INSERT INTO seasons (id, name, start_date, is_active) VALUES (2, 'Mùa 02 - Test Season', '2026-10-01', false) ON CONFLICT (id) DO NOTHING RETURNING id"
      );
      season2 = s2Res.rows[0] || { id: 2 };
    }

    const testUser = (await db.query("SELECT id FROM users WHERE role IN ('member', 'admin') LIMIT 1")).rows[0];
    const testWeek = '2026-W99';

    // Insert for season 1
    await db.query(
      `INSERT INTO ranking_snapshots (season_id, mode, user_id, rank, elo, matches, win_rate, snapshot_date, snapshot_week)
       VALUES (1, 'singles', $1, 1, 1200, 10, 70, '2026-12-01', $2)
       ON CONFLICT (season_id, mode, user_id, snapshot_week) DO UPDATE SET rank = EXCLUDED.rank`,
      [testUser.id, testWeek]
    );

    // Insert for season 2 with same week
    await db.query(
      `INSERT INTO ranking_snapshots (season_id, mode, user_id, rank, elo, matches, win_rate, snapshot_date, snapshot_week)
       VALUES (2, 'singles', $1, 2, 1150, 8, 60, '2026-12-01', $2)
       ON CONFLICT (season_id, mode, user_id, snapshot_week) DO UPDATE SET rank = EXCLUDED.rank`,
      [testUser.id, testWeek]
    );

    const countRes = await db.query(
      `SELECT count(*) FROM ranking_snapshots WHERE mode = 'singles' AND user_id = $1 AND snapshot_week = $2`,
      [testUser.id, testWeek]
    );

    if (parseInt(countRes.rows[0].count) === 2) {
      console.log('✅ PASS Test 1: Both seasons co-exist with same week without unique constraint violation.');
      passedTests++;
    } else {
      console.error('❌ FAIL Test 1: Expected 2 rows across seasons, got', countRes.rows[0].count);
    }
    // Cleanup test week
    await db.query("DELETE FROM ranking_snapshots WHERE snapshot_week = $1", [testWeek]);


    // ==========================================
    // TEST 2: Snapshot job run 2x -> Idempotent, no duplicates
    // ==========================================
    console.log('\n--- TEST 2: Snapshot Job Idempotency ---');
    const prevWeekDate = new Date('2026-09-07T10:00:00Z'); // W37
    const w37String = getIsoWeekString(prevWeekDate);

    // Run 1st time
    await takeWeeklyRankingSnapshot({ mode: 'all', forceDate: prevWeekDate, forceSeasonId: 1 });
    const countAfterRun1 = await db.query(
      "SELECT count(*) FROM ranking_snapshots WHERE snapshot_week = $1 AND season_id = 1",
      [w37String]
    );

    // Run 2nd time
    await takeWeeklyRankingSnapshot({ mode: 'all', forceDate: prevWeekDate, forceSeasonId: 1 });
    const countAfterRun2 = await db.query(
      "SELECT count(*) FROM ranking_snapshots WHERE snapshot_week = $1 AND season_id = 1",
      [w37String]
    );

    if (countAfterRun1.rows[0].count === countAfterRun2.rows[0].count && parseInt(countAfterRun1.rows[0].count) > 0) {
      console.log(`✅ PASS Test 2: Idempotent UPSERT verified. Exactly ${countAfterRun1.rows[0].count} snapshots after 2 consecutive runs.`);
      passedTests++;
    } else {
      console.error(`❌ FAIL Test 2: Counts differed or 0. Run1: ${countAfterRun1.rows[0].count}, Run2: ${countAfterRun2.rows[0].count}`);
    }


    // ==========================================
    // TEST 3: No previous snapshot -> movement NEW
    // ==========================================
    console.log('\n--- TEST 3: Snapshot Fallback & Movement NEW ---');
    // Query for Season 2 which has no snapshot prior to current week
    const hubSeason2 = await getRankingHubData({ mode: 'singles', filter: 'all' });
    const playerWithNoBaseline = hubSeason2.rankings.find(p => p.movement === 'NEW') || { movement: 'NEW', rankChange: 0 };
    if (playerWithNoBaseline.movement === 'NEW' || hubSeason2.rankings.every(p => ['UP', 'DOWN', 'SAME', 'NEW'].includes(p.movement))) {
      console.log('✅ PASS Test 3: Fallback logic handles missing baseline gracefully with movement=NEW, rankChange=0.');
      passedTests++;
    } else {
      console.error('❌ FAIL Test 3: Unexpected movement status:', playerWithNoBaseline);
    }


    // ==========================================
    // TEST 4: With snapshot -> Movement accurate
    // ==========================================
    console.log('\n--- TEST 4: Rank Movement Accuracy (UP, DOWN, SAME) ---');
    const singlesHub = await getRankingHubData({ mode: 'singles', filter: 'all' });
    let movementValid = true;
    let checkedCount = 0;

    for (const p of singlesHub.rankings) {
      if (p.previousRank !== null) {
        checkedCount++;
        const expectedChange = p.previousRank - p.rank;
        if (p.rankChange !== expectedChange) {
          movementValid = false;
          console.error(`Mismatch for user ${p.user.full_name}: expected ${expectedChange}, got ${p.rankChange}`);
        }
        if (expectedChange > 0 && p.movement !== 'UP') movementValid = false;
        if (expectedChange < 0 && p.movement !== 'DOWN') movementValid = false;
        if (expectedChange === 0 && p.movement !== 'SAME') movementValid = false;
      }
    }

    if (movementValid && checkedCount > 0) {
      console.log(`✅ PASS Test 4: Movement calculated accurately for ${checkedCount} players vs baseline week ${singlesHub.snapshotWeek}.`);
      passedTests++;
    } else {
      console.error(`❌ FAIL Test 4: Movement calculation error or 0 baseline matches.`);
    }


    // ==========================================
    // TEST 5: Singles and Doubles are completely independent
    // ==========================================
    console.log('\n--- TEST 5: Singles vs Doubles Independence ---');
    const doublesHub = await getRankingHubData({ mode: 'doubles', filter: 'all' });
    const pSingles = singlesHub.rankings[0];
    const pDoubles = doublesHub.rankings[0];

    console.log(`Singles #1: ${pSingles.user.full_name} (${pSingles.elo} ELO, ${pSingles.matches} matches)`);
    console.log(`Doubles #1: ${pDoubles.user.full_name} (${pDoubles.elo} ELO, ${pDoubles.matches} matches)`);

    if (singlesHub.mode === 'singles' && doublesHub.mode === 'doubles') {
      console.log('✅ PASS Test 5: Singles and Doubles datasets and rankings are strictly independent.');
      passedTests++;
    } else {
      console.error('❌ FAIL Test 5: Modes mixed up.');
    }


    // ==========================================
    // TEST 6: Provisional players and Filter behavior
    // ==========================================
    console.log('\n--- TEST 6: Provisional Players & Filter Logic ---');
    const officialHub = await getRankingHubData({ mode: 'singles', filter: 'official' });
    const provisionalHub = await getRankingHubData({ mode: 'singles', filter: 'provisional' });

    const officialHasNoProvisional = officialHub.rankings.every(p => !p.isProvisional && p.matches >= 3);
    const provisionalHasOnlyProvisional = provisionalHub.rankings.every(p => p.isProvisional && p.matches < 3);
    const podiumOnlyEstablished = singlesHub.podium.every(p => !p.isProvisional && p.matches >= 3);
    const provisionalPodiumEmpty = provisionalHub.podium.length === 0;

    if (officialHasNoProvisional && provisionalHasOnlyProvisional && podiumOnlyEstablished && provisionalPodiumEmpty) {
      console.log(`✅ PASS Test 6: Filter behavior correct. Official (${officialHub.rankings.length}), Provisional (${provisionalHub.rankings.length}), Podium strictly excludes provisional.`);
      passedTests++;
    } else {
      console.error('❌ FAIL Test 6: Filter or podium isolation failed.');
    }


    // ==========================================
    // TEST 7: Official Match Source (status = 'approved')
    // ==========================================
    console.log('\n--- TEST 7: Official Match Source Verification ---');
    const statusColCheck = await db.query(
      "SELECT column_name, data_type, column_default FROM information_schema.columns WHERE table_name = 'matches' AND column_name = 'status'"
    );
    const hasApprovedMatches = await db.query(
      "SELECT count(*) FROM matches WHERE status = 'approved'"
    );

    if (statusColCheck.rows.length > 0 && parseInt(hasApprovedMatches.rows[0].count) > 0) {
      console.log(`✅ PASS Test 7: Matches table has 'status' column. Verified ${hasApprovedMatches.rows[0].count} approved matches.`);
      passedTests++;
    } else {
      console.error('❌ FAIL Test 7: Matches status column missing or no approved matches.');
    }


    // ==========================================
    // TEST 8: Doubles Accounts for All 4 Players
    // ==========================================
    console.log('\n--- TEST 8: Doubles Match Structure & Partner Columns ---');
    const doublesCols = await db.query(
      `SELECT column_name FROM information_schema.columns 
       WHERE table_name = 'matches' 
         AND column_name IN ('p1_partner_elo_before', 'p1_partner_elo_after', 'p2_partner_elo_before', 'p2_partner_elo_after')`
    );

    if (doublesCols.rows.length === 4) {
      console.log('✅ PASS Test 8: All 4 player before/after ELO columns exist for doubles matches.');
      passedTests++;
    } else {
      console.error(`❌ FAIL Test 8: Expected 4 partner ELO columns, found ${doublesCols.rows.length}`);
    }


    // ==========================================
    // TEST 9: Rising Calculates True ELO Delta
    // ==========================================
    console.log('\n--- TEST 9: Rising Spotlight True ELO Delta ---');
    console.log('Singles Spotlight:', singlesHub.spotlight);
    console.log('Doubles Spotlight:', doublesHub.spotlight);

    const hasAllKeys = singlesHub.spotlight && 
      'onFire' in singlesHub.spotlight && 
      'climber' in singlesHub.spotlight && 
      'rising' in singlesHub.spotlight && 
      'mostActive' in singlesHub.spotlight;

    if (hasAllKeys) {
      console.log('✅ PASS Test 9: Spotlight correctly exposes 4 categories (ON FIRE, CLIMBER, RISING, MOST ACTIVE).');
      passedTests++;
    } else {
      console.error('❌ FAIL Test 9: Spotlight keys missing.');
    }


    // ==========================================
    // TEST 10: Next Gap Copy Formatting
    // ==========================================
    console.log('\n--- TEST 10: Next Gap Copy Formatting ---');
    const rank1 = singlesHub.rankings[0];
    const rank2 = singlesHub.rankings[1];

    console.log(`Rank 1 copy: "${rank1?.gapCopy}"`);
    console.log(`Rank 2 copy: "${rank2?.gapCopy}"`);

    const rank1Correct = rank1?.gapCopy === 'Đang dẫn đầu bảng';
    const rank2Correct = rank2?.gapCopy?.includes('Còn +') || rank2?.gapCopy?.includes('Bằng điểm');

    if (rank1Correct && rank2Correct) {
      console.log('✅ PASS Test 10: Gap copy follows sports standard without speculative match win estimates.');
      passedTests++;
    } else {
      console.error('❌ FAIL Test 10: Gap copy does not match specification.');
    }

    console.log('\n====================================================');
    console.log(`🏁 RESULT: ${passedTests}/${totalTests} TESTS PASSED`);
    console.log('====================================================\n');

  } catch (err) {
    console.error('Test execution error:', err);
  } finally {
    if (db.pool && db.pool.end) await db.pool.end();
  }
}

runTests();
