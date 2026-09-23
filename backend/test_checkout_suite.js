require('dotenv').config({ path: __dirname + '/.env' });
const db = require('./db');
const {
  reserveSession,
  processQrCheckIn,
  processQrCheckOut,
  getAdminSessionDashboard
} = require('./services/sessionReservationService');
const {
  processMissingCheckouts
} = require('./services/reservationAutomationService');

async function runCheckoutSuite() {
  console.log('================================================================');
  console.log('🏸 RUNNING COMPREHENSIVE CHECK-OUT TEST SUITE');
  console.log('================================================================\n');

  const client = await db.connect();
  let testSessionId = null;
  let endedSessionId = null;
  let testUsers = [];
  let testMatchId = null;

  try {
    // 1. Lấy test users
    const usersRes = await client.query(`SELECT id, full_name, role FROM users ORDER BY created_at ASC LIMIT 10;`);
    testUsers = usersRes.rows;
    if (testUsers.length < 5) {
      throw new Error('Cần ít nhất 5 user trong DB để chạy test suite.');
    }
    const adminUser = testUsers.find(u => u.role === 'admin') || testUsers[0];
    console.log(`✓ Loaded ${testUsers.length} test users from database.`);

    const now = new Date();
    // Buổi tập đang diễn ra: bắt đầu từ 1 giờ trước, kết thúc sau 1 giờ
    const tStart = new Date(now.getTime() - 1 * 3600000);
    const tEnd = new Date(now.getTime() + 1 * 3600000);
    const resOpen = new Date(now.getTime() - 3 * 3600000);
    const resDeadline = new Date(tEnd.getTime() + 1 * 3600000); // Hạn đăng ký mở rộng trong test
    const checkinOpen = new Date(tStart.getTime() - 30 * 60000);
    const checkinClose = new Date(tEnd.getTime() + 30 * 60000);
    const checkoutOpen = new Date(tStart.getTime() + 15 * 60000); // Mở checkout sau khi bắt đầu 15p
    const checkoutClose = new Date(tEnd.getTime() + 60 * 60000);

    const checkinToken = 'SEC_CHECKIN_SUITE_100';
    const checkoutToken = 'SEC_OUT_SUITE_200';

    // 2. Tạo test session đang diễn ra với check-out token
    const sessRes = await client.query(
      `INSERT INTO sessions (
        title, date_time, location, capacity, session_start, session_end,
        reservation_open_at, reservation_deadline,
        checkin_open_at, checkin_close_at, checkout_open_at, checkout_close_at,
        qr_code, checkin_code, qr_secret_token, qr_checkout_secret_token
      ) VALUES (
        'TEST SESSION CHECKOUT LIVE', $1, 'Sân Test Cầu Lông Số 1', 10, $1, $2,
        $3, $4, $5, $6, $7, $8, 'QR_CKIN_100', 'CK100', $9, $10
      ) RETURNING *;`,
      [tStart, tEnd, resOpen, resDeadline, checkinOpen, checkinClose, checkoutOpen, checkoutClose, checkinToken, checkoutToken]
    );
    testSessionId = sessRes.rows[0].id;
    console.log(`✓ Created Active Test Session: #${testSessionId.split('-')[0]}`);

    // Cho 3 user đăng ký & check-in vào sân
    // User 0, 1, 2 đăng ký
    await reserveSession(testSessionId, testUsers[0].id);
    await reserveSession(testSessionId, testUsers[1].id);
    await reserveSession(testSessionId, testUsers[2].id);
    // User 3 chỉ đăng ký, KHÔNG check-in
    await reserveSession(testSessionId, testUsers[3].id);

    // User 0, 1, 2 Check-in
    await processQrCheckIn({ sessionId: testSessionId, userId: testUsers[0].id, clientTokenOrCode: checkinToken });
    await processQrCheckIn({ sessionId: testSessionId, userId: testUsers[1].id, clientTokenOrCode: checkinToken });
    await processQrCheckIn({ sessionId: testSessionId, userId: testUsers[2].id, clientTokenOrCode: checkinToken });
    console.log(`✓ Checked-in User 0, User 1, User 2. User 3 remains RESERVED.`);

    // --- TEST 1: Full QR Check-Out thành công ---
    console.log('\n[TEST 1] User 0 quét mã QR Check-out rời sân hợp lệ');
    const outRes1 = await processQrCheckOut({
      sessionId: testSessionId,
      userId: testUsers[0].id,
      clientTokenOrCode: checkoutToken
    });
    console.log(`  - Result: ${outRes1.message}`);
    console.log(`  - Duration: ${outRes1.duration_minutes} phút, Status: ${outRes1.checkout_status}`);
    if (!outRes1.success || outRes1.duration_minutes < 1 || outRes1.checkout_status !== 'completed') {
      throw new Error('TEST 1 FAILED: Check-out output mismatch');
    }
    const attUser0 = await client.query('SELECT status, checked_out_at, duration_minutes FROM attendances WHERE session_id = $1 AND user_id = $2', [testSessionId, testUsers[0].id]);
    if (attUser0.rows[0].status !== 'CHECKED_OUT' || !attUser0.rows[0].checked_out_at) {
      throw new Error('TEST 1 FAILED: DB attendance status not CHECKED_OUT');
    }
    console.log('  ✅ [TEST 1 PASSED: QR Check-out succeeded with duration calculation]');

    // --- TEST 2: Quét nhầm mã QR Check-in khi muốn Check-out -> Bị từ chối ---
    console.log('\n[TEST 2] User 1 quét nhầm mã QR Check-in (Vào sân) để Check-out');
    let wrongTokenCaught = false;
    try {
      await processQrCheckOut({
        sessionId: testSessionId,
        userId: testUsers[1].id,
        clientTokenOrCode: checkinToken
      });
    } catch (e) {
      if (e.message.includes('Mã này là mã QR Check-in') || e.message.includes('không phải mã QR Check-out')) {
        wrongTokenCaught = true;
      }
    }
    if (!wrongTokenCaught) {
      throw new Error('TEST 2 FAILED: Expected rejection when using Check-in QR for Check-out');
    }
    console.log('  - Correctly rejected with warning: Mã này là mã QR Check-in (Vào sân)');
    console.log('  ✅ [TEST 2 PASSED: Separate QR check-in / check-out token enforcement]');

    // --- TEST 3: Chặn Check-out nếu đang có trận đấu Pending trên Match Desk ---
    console.log('\n[TEST 3] User 1 đang có trận đấu chưa hoàn thành trên Match Desk');
    const matchRes = await client.query(
      `INSERT INTO matches (
        player1_id, player2_id, status, score_p1, score_p2,
        p1_elo_before, p2_elo_before, p1_elo_after, p2_elo_after, elo_exchanged
      ) VALUES (
        $1, $2, 'pending', 0, 0,
        1000, 1000, 1000, 1000, 0
      ) RETURNING id;`,
      [testUsers[1].id, testUsers[2].id]
    );
    testMatchId = matchRes.rows[0].id;
    console.log(`  - Created pending match #${testMatchId.split('-')[0]} for User 1 & User 2 on Match Desk.`);

    let activeMatchCaught = false;
    try {
      await processQrCheckOut({
        sessionId: testSessionId,
        userId: testUsers[1].id,
        clientTokenOrCode: checkoutToken
      });
    } catch (e) {
      if (e.message.includes('đang có trận đấu chưa kết thúc')) {
        activeMatchCaught = true;
      }
    }
    if (!activeMatchCaught) {
      throw new Error('TEST 3 FAILED: Should block check-out when user has active match on Match Desk');
    }
    console.log('  - Blocked check-out successfully: Thành viên đang có trận đấu chưa kết thúc trên sân.');

    // Hoàn thành/hủy trận đấu để cho phép check-out
    await client.query(`DELETE FROM matches WHERE id = $1;`, [testMatchId]);
    testMatchId = null;
    console.log('  - Match completed/cleared on Match Desk.');

    const outRes2 = await processQrCheckOut({
      sessionId: testSessionId,
      userId: testUsers[1].id,
      clientTokenOrCode: checkoutToken
    });
    if (!outRes2.success) throw new Error('TEST 3 FAILED: User 1 should checkout after match ended');
    console.log('  - User 1 successfully checked out after match cleared.');
    console.log('  ✅ [TEST 3 PASSED: Active match conflict protection]');

    // --- TEST 4: Idempotency (Check-out nhiều lần không lỗi) ---
    console.log('\n[TEST 4] User 0 gọi Check-out lần 2 (Idempotency)');
    const outResDup = await processQrCheckOut({
      sessionId: testSessionId,
      userId: testUsers[0].id,
      clientTokenOrCode: checkoutToken
    });
    if (!outResDup.success || !outResDup.alreadyCheckedOut) {
      throw new Error('TEST 4 FAILED: Repeated check-out must return alreadyCheckedOut = true cleanly');
    }
    console.log(`  - Result: ${outResDup.message} (alreadyCheckedOut: true)`);
    console.log('  ✅ [TEST 4 PASSED: Idempotent checkout handling]');

    // --- TEST 5: Chặn Re-Check-In sau khi đã Check-Out ---
    console.log('\n[TEST 5] User 0 cố tình quét lại mã Check-In sau khi đã rời sân');
    let reCheckInBlocked = false;
    try {
      await processQrCheckIn({ sessionId: testSessionId, userId: testUsers[0].id, clientTokenOrCode: checkinToken });
    } catch (e) {
      console.log('  - Actual error caught in Test 5:', e.message);
      if (e.message.includes('Check-out') || e.message.includes('rời sân')) {
        reCheckInBlocked = true;
      }
    }
    if (!reCheckInBlocked) {
      throw new Error('TEST 5 FAILED: Must reject check-in after user has checked out');
    }
    console.log('  - Correctly rejected check-in attempt after checkout.');
    console.log('  ✅ [TEST 5 PASSED: Re-check-in prevention]');

    // --- TEST 6: Chặn Check-Out nếu chưa từng Check-In ---
    console.log('\n[TEST 6] User 3 (chưa quét QR vào sân, đang RESERVED) cố Check-Out');
    let notCheckedInCaught = false;
    try {
      await processQrCheckOut({
        sessionId: testSessionId,
        userId: testUsers[3].id,
        clientTokenOrCode: checkoutToken
      });
    } catch (e) {
      if (e.message.includes('chưa quét mã Check-in')) {
        notCheckedInCaught = true;
      }
    }
    if (!notCheckedInCaught) {
      throw new Error('TEST 6 FAILED: User who never checked in must not be allowed to check out');
    }
    console.log('  - Correctly rejected: Bạn chưa quét mã Check-in tại sân');
    console.log('  ✅ [TEST 6 PASSED: Non-checked-in member check-out rejection]');

    // --- TEST 7: Kiểm tra loại trừ khỏi Match Desk Available Players ---
    console.log('\n[TEST 7] Match Desk exclusion for CHECKED_OUT members');
    const deskPlayersRes = await client.query(
      `SELECT u.id, u.full_name, a.status 
       FROM attendances a
       JOIN users u ON a.user_id = u.id
       WHERE a.session_id = $1 AND a.status IN ('going', 'CHECKED_IN') 
         AND u.status = 'active';`,
      [testSessionId]
    );
    const activeDeskIds = deskPlayersRes.rows.map(r => r.id);
    console.log(`  - Active Desk Players count: ${activeDeskIds.length}`);
    if (activeDeskIds.includes(testUsers[0].id) || activeDeskIds.includes(testUsers[1].id)) {
      throw new Error('TEST 7 FAILED: Checked-out users must NOT be in available Match Desk pool');
    }
    if (!activeDeskIds.includes(testUsers[2].id)) {
      throw new Error('TEST 7 FAILED: Still-present user 2 must remain in Match Desk pool');
    }
    console.log('  - User 0 and User 1 are eliminated from Match Desk pool.');
    console.log('  - User 2 (CHECKED_IN) remains available for matchmaking.');
    console.log('  ✅ [TEST 7 PASSED: Immediate Match Desk exclusion]');

    // --- TEST 8: Automation sweep - Tự động đánh dấu MISSING_CHECKOUT cho buổi tập đã kết thúc ---
    console.log('\n[TEST 8] Automation sweep: processMissingCheckouts() for ended session');
    const pastStart = new Date(now.getTime() - 3 * 3600000);
    const pastEnd = new Date(now.getTime() - 1 * 3600000); // Đã kết thúc 1 tiếng trước

    const endedSessRes = await client.query(
      `INSERT INTO sessions (
        title, date_time, location, capacity, session_start, session_end,
        missing_checkout_processed
      ) VALUES (
        'TEST PAST ENDED SESSION', $1, 'Sân Cũ', 10, $1, $2, FALSE
      ) RETURNING id;`,
      [pastStart, pastEnd]
    );
    endedSessionId = endedSessRes.rows[0].id;

    // User 4 đã check-in vào buổi tập đã qua này
    await client.query(
      `INSERT INTO attendances (session_id, user_id, status, checked_in_at, created_at)
       VALUES ($1::uuid, $2::uuid, 'CHECKED_IN', $3::timestamptz, $4::timestamp);`,
      [endedSessionId, testUsers[4].id, pastStart, pastStart]
    );

    // Chạy cron sweep
    const sweptCount = await processMissingCheckouts();
    console.log(`  - Sweep processed ${sweptCount} missing check-out attendee(s)`);

    const user4Att = await client.query(
      `SELECT status, checkout_status, checkout_method, duration_minutes 
       FROM attendances WHERE session_id = $1 AND user_id = $2;`,
      [endedSessionId, testUsers[4].id]
    );
    const u4 = user4Att.rows[0];
    console.log(`  - User 4 status: ${u4.status}, checkout_status: ${u4.checkout_status}, duration: ${u4.duration_minutes}m`);

    if (u4.status !== 'MISSING_CHECKOUT' || u4.checkout_status !== 'missing' || u4.duration_minutes < 60) {
      throw new Error('TEST 8 FAILED: Missing checkout automation failed to calculate estimated duration or update status');
    }

    const sessFlagRes = await client.query(`SELECT missing_checkout_processed FROM sessions WHERE id = $1;`, [endedSessionId]);
    if (!sessFlagRes.rows[0].missing_checkout_processed) {
      throw new Error('TEST 8 FAILED: missing_checkout_processed flag not updated to TRUE');
    }
    console.log('  ✅ [TEST 8 PASSED: Missing checkout automation sweep & duration estimation]');

    // --- TEST 9: Admin Manual Override & Session Audit Logs ---
    console.log('\n[TEST 9] Admin manual check-out override with custom time & audit log');
    const customTime = new Date(pastEnd.getTime() + 15 * 60000); // Rời sân sau giờ kết thúc 15 phút
    const adminOutRes = await processQrCheckOut({
      sessionId: endedSessionId,
      userId: testUsers[4].id,
      adminId: adminUser.id,
      checkoutTime: customTime,
      reason: 'Admin xác nhận qua camera VĐV ra về lúc kết thúc'
    });

    if (!adminOutRes.success || adminOutRes.method !== 'admin') {
      throw new Error('TEST 9 FAILED: Admin checkout override failed');
    }

    // Kiểm tra Audit Log
    const auditRes = await client.query(
      `SELECT * FROM session_audit_logs 
       WHERE session_id = $1 AND target_user_id = $2 AND action = 'ADMIN_CHECKOUT_OVERRIDE';`,
      [endedSessionId, testUsers[4].id]
    );
    if (auditRes.rows.length === 0) {
      throw new Error('TEST 9 FAILED: Audit log missing for ADMIN_CHECKOUT_OVERRIDE');
    }
    const log = auditRes.rows[0];
    console.log(`  - Audit action: ${log.action}`);
    console.log(`  - Before status: ${log.before_status} -> After status: ${log.after_status}`);
    console.log(`  - Admin Reason: "${log.reason}"`);
    console.log('  ✅ [TEST 9 PASSED: Admin manual override & audit logging]');

    // --- TEST 10: Admin Dashboard Statistics ---
    console.log('\n[TEST 10] Admin Dashboard KPI Statistics');
    const dashboard = await getAdminSessionDashboard(testSessionId);
    console.log(`  - Dashboard Title: ${dashboard.session.title}`);
    console.log(`  - KPI Stats:`, dashboard.stats);
    if (typeof dashboard.stats.checkedOut === 'undefined' || typeof dashboard.stats.missingCheckout === 'undefined') {
      throw new Error('TEST 10 FAILED: checkedOut / missingCheckout stats missing in dashboard');
    }
    if (dashboard.stats.checkedOut < 2) {
      throw new Error(`TEST 10 FAILED: Expected at least 2 checkedOut in stats, got ${dashboard.stats.checkedOut}`);
    }
    console.log('  ✅ [TEST 10 PASSED: Admin dashboard KPI counts accurately reflecting check-outs]');

    // Dọn dẹp dữ liệu test
    await client.query(`DELETE FROM sessions WHERE id IN ($1, $2);`, [testSessionId, endedSessionId]);
    if (testUsers && testUsers.length > 0) {
      const userIds = testUsers.map(u => u.id);
      await client.query(`UPDATE user_quests SET current_count = 0, is_completed = false, is_claimed = false WHERE user_id = ANY($1) AND quest_id = 1;`, [userIds]).catch(() => {});
    }
    console.log('\n✓ Cleaned up temporary test sessions, audit logs, and test user_quests.');

    console.log('\n================================================================');
    console.log('🎉 ALL 10 CHECK-OUT TESTS PASSED 100% WITH ZERO ERRORS!');
    console.log('================================================================\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ CHECK-OUT TEST SUITE FAILED:', error);
    if (testMatchId) {
      await client.query(`DELETE FROM matches WHERE id = $1;`, [testMatchId]).catch(() => {});
    }
    if (testSessionId) {
      await client.query(`DELETE FROM sessions WHERE id = $1;`, [testSessionId]).catch(() => {});
    }
    if (endedSessionId) {
      await client.query(`DELETE FROM sessions WHERE id = $1;`, [endedSessionId]).catch(() => {});
    }
    if (testUsers && testUsers.length > 0) {
      const userIds = testUsers.map(u => u.id);
      await client.query(`UPDATE user_quests SET current_count = 0, is_completed = false, is_claimed = false WHERE user_id = ANY($1) AND quest_id = 1;`, [userIds]).catch(() => {});
    }
    process.exit(1);
  } finally {
    client.release();
  }
}

runCheckoutSuite();
