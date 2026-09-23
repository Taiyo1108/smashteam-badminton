require('dotenv').config({ path: __dirname + '/.env' });
const db = require('./db');
const {
  getSessionDetails,
  reserveSession,
  joinWaitlist,
  cancelReservation,
  requestLateCancel,
  claimWaitlistOffer,
  processQrCheckIn,
  adminApproveLateCancel,
  adminRejectLateCancel,
  getAdminSessionDashboard
} = require('./services/sessionReservationService');
const {
  processAutoConfirmations,
  processWaitlistExpirations,
  processNoShows
} = require('./services/reservationAutomationService');

async function runSuite() {
  console.log('================================================================');
  console.log('🧪 RUNNING COMPREHENSIVE SESSION RESERVATION & WAITLIST TEST SUITE');
  console.log('================================================================\n');

  const client = await db.connect();
  let testSessionId = null;
  let testUsers = [];

  try {
    // 1. Lấy hoặc tạo 12 test users trong database
    const usersRes = await client.query(`SELECT id, full_name FROM users ORDER BY created_at ASC LIMIT 15;`);
    testUsers = usersRes.rows;
    if (testUsers.length < 5) {
      throw new Error('Cần ít nhất 5 user trong DB để chạy test suite.');
    }
    console.log(`✓ Loaded ${testUsers.length} test users from database.`);

    const now = new Date();
    const tStart = new Date(now.getTime() + 4 * 3600000); // 4h nữa
    const tEnd = new Date(tStart.getTime() + 2 * 3600000);
    const resOpen = new Date(now.getTime() - 1 * 3600000); // Mở 1h trước
    const resDeadline = new Date(tStart.getTime() - 1 * 3600000); // Hạn hủy: 1h trước giờ tập
    const checkinOpen = new Date(tStart.getTime() - 30 * 60000);
    const checkinClose = new Date(tStart.getTime() + 30 * 60000);

    // 2. Tạo một test session với capacity = 2 để kiểm thử kịch bản Full và Waitlist
    const sessRes = await client.query(
      `INSERT INTO sessions (
        title, date_time, location, capacity, session_start, session_end,
        reservation_open_at, reservation_deadline, checkin_open_at, checkin_close_at,
        qr_code, checkin_code, qr_secret_token, waitlist_offer_duration_minutes
      ) VALUES (
        'TEST SESSION RESERVATION 4000', $1, 'Sân Test Cầu Lông Q10', 2, $1, $2,
        $3, $4, $5, $6, 'SMASH_TEST_QR_4000', 'TST01', 'SEC_TEST_TOKEN_4000', 10
      ) RETURNING *;`,
      [tStart, tEnd, resOpen, resDeadline, checkinOpen, checkinClose]
    );
    testSessionId = sessRes.rows[0].id;
    console.log(`✓ Created Test Session: #${testSessionId.split('-')[0]} with Capacity = 2.`);

    // --- TEST 1: Đăng ký slot thành công ---
    console.log('\n[TEST 1] User 1 đăng ký slot đầu tiên');
    const res1 = await reserveSession(testSessionId, testUsers[0].id);
    console.log(`  - Result: ${res1.message} (Status: ${res1.reservation.status})`);
    if (res1.reservation.status !== 'RESERVED') throw new Error('TEST 1 FAILED: Status must be RESERVED');
    console.log('  ✅ [TEST 1 PASSED]');

    // --- TEST 2: Đăng ký slot thứ 2 (kín slot) ---
    console.log('\n[TEST 2] User 2 đăng ký slot thứ 2 (Capacity = 2 -> Kín chỗ)');
    const res2 = await reserveSession(testSessionId, testUsers[1].id);
    console.log(`  - Result: ${res2.message} (Status: ${res2.reservation.status})`);
    if (res2.reservation.status !== 'RESERVED') throw new Error('TEST 2 FAILED');
    console.log('  ✅ [TEST 2 PASSED]');

    // --- TEST 3: User 3 đăng ký khi session đã full -> Bị từ chối và vào Waitlist ---
    console.log('\n[TEST 3] User 3 cố đăng ký khi session đã full (2/2 slots)');
    let fullCaught = false;
    try {
      await reserveSession(testSessionId, testUsers[2].id);
    } catch (e) {
      if (e.code === 'SESSION_FULL') fullCaught = true;
    }
    if (!fullCaught) throw new Error('TEST 3 FAILED: Session full must throw SESSION_FULL');
    console.log('  - Caught SESSION_FULL error as expected. Now joining Waitlist...');
    const wl1 = await joinWaitlist(testSessionId, testUsers[2].id);
    console.log(`  - Result: ${wl1.message} (Position: #${wl1.waitlist.position})`);
    if (wl1.waitlist.position !== 1 || wl1.waitlist.status !== 'WAITING') throw new Error('TEST 3 FAILED: Waitlist position must be 1');
    console.log('  ✅ [TEST 3 PASSED]');

    // --- TEST 4: User 4 tham gia Waitlist -> Vị trí #2 FIFO ---
    console.log('\n[TEST 4] User 4 tham gia Waitlist -> Vị trí #2 FIFO');
    const wl2 = await joinWaitlist(testSessionId, testUsers[3].id);
    console.log(`  - Result: Position: #${wl2.waitlist.position}`);
    if (wl2.waitlist.position !== 2) throw new Error('TEST 4 FAILED: Waitlist position must be 2');
    console.log('  ✅ [TEST 4 PASSED]');

    // --- TEST 5: User 1 cancel trước deadline -> Release slot & Tự động offer cho Waitlist #1 ---
    console.log('\n[TEST 5] User 1 cancel trước deadline -> Slot release -> Tự động offer Waitlist #1');
    const cancelRes = await cancelReservation(testSessionId, testUsers[0].id, 'Bận việc gia đình');
    console.log(`  - Cancel Result: ${cancelRes.message}`);
    console.log(`  - Auto Offered to Waitlist:`, cancelRes.offeredToWaitlist?.fullName, `(Position #${cancelRes.offeredToWaitlist?.position})`);
    if (!cancelRes.offeredToWaitlist || cancelRes.offeredToWaitlist.userId !== testUsers[2].id) {
      throw new Error('TEST 5 FAILED: Must auto offer to User 3 (Waitlist #1)');
    }
    console.log('  ✅ [TEST 5 PASSED]');

    // --- TEST 6: User 3 claim Waitlist offer -> Trở thành RESERVED ---
    console.log('\n[TEST 6] User 3 xác nhận nhận slot từ Waitlist (Claim Offer)');
    const claimRes = await claimWaitlistOffer(testSessionId, testUsers[2].id);
    console.log(`  - Claim Result: ${claimRes.message} (Status: ${claimRes.reservation.status})`);
    if (claimRes.reservation.status !== 'RESERVED') throw new Error('TEST 6 FAILED');
    console.log('  ✅ [TEST 6 PASSED]');

    // --- TEST 7: Chặn tự hủy sau Deadline & Gửi Late Cancellation Request ---
    console.log('\n[TEST 7] Chặn tự hủy sau Deadline & Gửi Late Cancel Request cho Admin');
    // Tạm thời điều chỉnh reservation_deadline về quá khứ để test kịch bản quá hạn
    await client.query(`UPDATE sessions SET reservation_deadline = NOW() - INTERVAL '10 minutes' WHERE id = $1;`, [testSessionId]);
    let deadlineCaught = false;
    try {
      await cancelReservation(testSessionId, testUsers[1].id, 'Muốn hủy sau hạn');
    } catch (e) {
      if (e.code === 'LATE_CANCELLATION_DEADLINE_PASSED') deadlineCaught = true;
    }
    if (!deadlineCaught) throw new Error('TEST 7 FAILED: Must reject self-cancel after deadline');
    console.log('  - Successfully rejected direct cancellation after deadline.');

    // User gửi yêu cầu hủy muộn
    const reqLate = await requestLateCancel(testSessionId, testUsers[1].id, 'Xe bị thủng lốp sát giờ');
    console.log(`  - Late cancel request submitted: ${reqLate.message}`);

    // Admin duyệt hủy muộn
    const adminApprove = await adminApproveLateCancel(testSessionId, testUsers[1].id, testUsers[0].id, 'Lý do chính đáng chấp thuận hủy');
    console.log(`  - Admin approved: ${adminApprove.message}`);
    console.log(`  - Auto offered to next in Waitlist (User 4):`, adminApprove.offeredToWaitlist?.fullName);
    if (!adminApprove.offeredToWaitlist || adminApprove.offeredToWaitlist.userId !== testUsers[3].id) {
      throw new Error('TEST 7 FAILED: Must auto offer to User 4 (Waitlist #2)');
    }
    console.log('  ✅ [TEST 7 PASSED]');

    // --- TEST 8: Auto Confirmation Job (RESERVED -> CONFIRMED khi qua deadline) ---
    console.log('\n[TEST 8] Auto Confirmation Background Job');
    const autoConfirmed = await processAutoConfirmations();
    console.log(`  - Total reservations auto-confirmed: ${autoConfirmed}`);
    const checkAtt3 = await client.query(`SELECT status FROM attendances WHERE session_id = $1 AND user_id = $2;`, [testSessionId, testUsers[2].id]);
    console.log(`  - User 3 new status: ${checkAtt3.rows[0]?.status}`);
    if (checkAtt3.rows[0]?.status !== 'CONFIRMED') throw new Error('TEST 8 FAILED: User 3 must be CONFIRMED');
    console.log('  ✅ [TEST 8 PASSED]');

    // --- TEST 9: QR Check-In đúng session và trong time window ---
    console.log('\n[TEST 9] User 3 quét mã QR đúng session');
    // Mở checkin window để test
    await client.query(`UPDATE sessions SET checkin_open_at = NOW() - INTERVAL '10 minutes', checkin_close_at = NOW() + INTERVAL '30 minutes' WHERE id = $1;`, [testSessionId]);
    const checkinRes = await processQrCheckIn({
      sessionId: testSessionId,
      userId: testUsers[2].id,
      clientTokenOrCode: 'SMASH_TEST_QR_4000'
    });
    console.log(`  - Check-in result: ${checkinRes.message} (XP: +${checkinRes.xpAwarded}, Coins: +${checkinRes.coinsAwarded})`);
    if (checkinRes.attendance.status !== 'CHECKED_IN') throw new Error('TEST 9 FAILED: Status must be CHECKED_IN');
    console.log('  ✅ [TEST 9 PASSED]');

    // --- TEST 10: Quét QR sai hoặc ngoài time window bị từ chối ---
    console.log('\n[TEST 10] Quét sai mã QR');
    let qrReject = false;
    try {
      await processQrCheckIn({
        sessionId: testSessionId,
        userId: testUsers[4].id,
        clientTokenOrCode: 'WRONG_INVALID_QR_TOKEN'
      });
    } catch (e) {
      qrReject = true;
    }
    if (!qrReject) throw new Error('TEST 10 FAILED: Invalid QR must be rejected');
    console.log('  - Correctly rejected invalid QR token.');
    console.log('  ✅ [TEST 10 PASSED]');

    // --- TEST 11: Walk-in Check-in với Admin Override ---
    console.log('\n[TEST 11] Walk-in Check-in bởi Admin cho khách vãng lai (chưa đăng ký trước)');
    const walkInRes = await processQrCheckIn({
      sessionId: testSessionId,
      userId: testUsers[4].id,
      clientTokenOrCode: '',
      allowWalkIn: true,
      adminId: testUsers[0].id,
      walkInReason: 'Khách vãng lai đến sân đột xuất'
    });
    console.log(`  - Walk-in result: ${walkInRes.message} (isWalkIn: ${walkInRes.isWalkIn})`);
    if (walkInRes.attendance.status !== 'CHECKED_IN' || !walkInRes.isWalkIn) throw new Error('TEST 11 FAILED');
    console.log('  ✅ [TEST 11 PASSED]');

    // --- TEST 12: No-Show Detection Job ---
    console.log('\n[TEST 12] No-Show Job khi buổi tập kết thúc');
    // Tạo 1 confirmed reservation cho User 5 nhưng không check-in
    await client.query(
      `INSERT INTO attendances (session_id, user_id, status) VALUES ($1, $2, 'CONFIRMED')
       ON CONFLICT (session_id, user_id) DO UPDATE SET status = 'CONFIRMED';`,
      [testSessionId, testUsers[5].id]
    );
    // Cho session kết thúc trong quá khứ
    await client.query(`UPDATE sessions SET session_end = NOW() - INTERVAL '5 minutes' WHERE id = $1;`, [testSessionId]);
    const noShowCount = await processNoShows();
    console.log(`  - Total reservations marked NO_SHOW: ${noShowCount}`);
    const checkNoShow = await client.query(`SELECT status FROM attendances WHERE session_id = $1 AND user_id = $2;`, [testSessionId, testUsers[5].id]);
    console.log(`  - User 5 status after session end: ${checkNoShow.rows[0]?.status}`);
    if (checkNoShow.rows[0]?.status !== 'NO_SHOW') throw new Error('TEST 12 FAILED: User 5 must be NO_SHOW');
    console.log('  ✅ [TEST 12 PASSED]');

    // --- TEST 13: Concurrency Row-Level Lock Test ---
    console.log('\n[TEST 13] Concurrency Protection: 10 concurrent requests tranh 1 slot cuối cùng');
    // Tạo session concurrency với capacity = 1
    const concSessRes = await client.query(
      `INSERT INTO sessions (
        title, date_time, location, capacity, session_start, session_end,
        reservation_open_at, reservation_deadline, checkin_open_at, checkin_close_at,
        qr_code, checkin_code, qr_secret_token
      ) VALUES (
        'CONCURRENCY BATTLE SESSION', NOW() + INTERVAL '2 days', 'Sân Đấu Thử Nghiệm', 1,
        NOW() + INTERVAL '2 days', NOW() + INTERVAL '2 days 2 hours',
        NOW() - INTERVAL '1 hour', NOW() + INTERVAL '1 day',
        NOW() + INTERVAL '2 days', NOW() + INTERVAL '2 days 1 hour',
        'SMASH_CONC_QR', 'CON01', 'SEC_CONC_TOKEN'
      ) RETURNING id;`
    );
    const concSessionId = concSessRes.rows[0].id;

    // 10 users cùng lúc gọi reserveSession
    const candidateUsers = testUsers.slice(0, 10);
    const results = await Promise.allSettled(
      candidateUsers.map(u => reserveSession(concSessionId, u.id))
    );

    const successCount = results.filter(r => r.status === 'fulfilled').length;
    const fullRejections = results.filter(r => r.status === 'rejected' && r.reason?.code === 'SESSION_FULL').length;

    console.log(`  - Concurrent requests: 10`);
    console.log(`  - Successful RESERVED count: ${successCount}`);
    console.log(`  - SESSION_FULL rejections: ${fullRejections}`);

    if (successCount !== 1) {
      throw new Error(`CONCURRENCY VIOLATION! Expected exactly 1 successful reservation, got ${successCount}`);
    }
    console.log('  - Database row-level lock strictly maintained capacity = 1 without overbooking!');
    console.log('  ✅ [TEST 13 PASSED]');

    // --- TEST 14: Admin Dashboard & Audit Logs Verification ---
    console.log('\n[TEST 14] Admin Dashboard & Audit Logs Verification');
    const dashboard = await getAdminSessionDashboard(testSessionId);
    console.log(`  - Dashboard Title: ${dashboard.session.title}`);
    console.log(`  - Stats:`, dashboard.stats);
    console.log(`  - Total attendees in dashboard: ${dashboard.attendees.length}`);
    console.log(`  - Total audit logs: ${dashboard.auditLogs.length}`);
    if (dashboard.auditLogs.length < 2) throw new Error('TEST 14 FAILED: Audit logs missing');
    console.log(`  - Sample audit action: ${dashboard.auditLogs[0]?.action} (Reason: "${dashboard.auditLogs[0]?.reason}")`);
    console.log('  ✅ [TEST 14 PASSED]');

    // Dọn dẹp dữ liệu test
    await client.query(`DELETE FROM sessions WHERE id IN ($1, $2);`, [testSessionId, concSessionId]);
    if (testUsers && testUsers.length > 0) {
      const userIds = testUsers.map(u => u.id);
      await client.query(`UPDATE user_quests SET current_count = 0, is_completed = false, is_claimed = false WHERE user_id = ANY($1) AND quest_id = 1;`, [userIds]).catch(() => {});
    }
    console.log('✓ Cleaned up temporary test sessions and test user_quests.');

    console.log('\n================================================================');
    console.log('🎉 ALL 14 CORE ENGINE & CONCURRENCY TESTS PASSED 100%!');
    console.log('================================================================\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ TEST SUITE FAILED:', error);
    if (testSessionId) {
      await client.query(`DELETE FROM sessions WHERE id = $1;`, [testSessionId]).catch(() => {});
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

runSuite();
