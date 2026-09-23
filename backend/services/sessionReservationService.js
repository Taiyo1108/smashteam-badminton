const db = require('../db');
const { addXpToUser, trackActivity } = require('../utils/gamification');
const { getSessionCapacity, SLOT_OCCUPYING_STATUSES } = require('./sessionCapacityService');

/**
 * Lấy thông tin chi tiết buổi tập, số liệu slots, timing và trạng thái của user
 */
async function getSessionDetails(sessionId, userId = null) {
  // Lấy session record
  const sessionRes = await db.query(
    `SELECT s.*, 
            s.date_time::text AS date_time_str,
            s.session_start::text AS session_start_str,
            s.session_end::text AS session_end_str,
            s.reservation_open_at::text AS reservation_open_at_str,
            s.reservation_deadline::text AS reservation_deadline_str,
            s.checkin_open_at::text AS checkin_open_at_str,
            s.checkin_close_at::text AS checkin_close_at_str
     FROM sessions s
     WHERE s.id = $1::uuid;`,
    [sessionId]
  );

  if (sessionRes.rows.length === 0) {
    throw new Error('Không tìm thấy buổi tập này.');
  }

  const session = sessionRes.rows[0];

  // Đếm các số liệu trạng thái đặt chỗ từ Single Source of Truth
  const capInfo = await getSessionCapacity(sessionId, db);
  const capacity = capInfo.capacity;
  const availableSlots = capInfo.availableSlots;
  const isFull = capInfo.isFull;
  const stats = capInfo.stats;
  const waitingCount = capInfo.waitlistCount;
  const offeredCount = capInfo.offeredCount;

  // Lấy trạng thái của user hiện tại (nếu có userId)
  let userStatus = null;
  let userWaitlist = null;

  if (userId) {
    const userAttRes = await db.query(
      `SELECT * FROM attendances WHERE session_id = $1::uuid AND user_id = $2::uuid;`,
      [sessionId, userId]
    );
    if (userAttRes.rows.length > 0) {
      userStatus = userAttRes.rows[0];
    }

    const userWlRes = await db.query(
      `SELECT * FROM session_waitlist WHERE session_id = $1::uuid AND user_id = $2::uuid;`,
      [sessionId, userId]
    );
    if (userWlRes.rows.length > 0) {
      userWaitlist = userWlRes.rows[0];
    }
  }

  // Xác định trạng thái thời gian
  const now = new Date();
  const tStart = session.session_start ? new Date(session.session_start) : new Date(session.date_time);
  const sessionEnd = session.session_end ? new Date(session.session_end) : new Date(tStart.getTime() + 2 * 3600000);
  const resOpen = session.reservation_open_at ? new Date(session.reservation_open_at) : new Date(tStart.getTime() - 3 * 86400000);
  const resDeadline = session.reservation_deadline ? new Date(session.reservation_deadline) : new Date(tStart.getTime() - 2 * 3600000);
  const checkinOpen = session.checkin_open_at ? new Date(session.checkin_open_at) : new Date(tStart.getTime() - 30 * 60000);
  const checkinClose = session.checkin_close_at ? new Date(session.checkin_close_at) : new Date(tStart.getTime() + 30 * 60000);
  const checkoutOpen = session.checkout_open_at ? new Date(session.checkout_open_at) : new Date(tStart.getTime() + 30 * 60000);
  const checkoutClose = session.checkout_close_at ? new Date(session.checkout_close_at) : new Date(sessionEnd.getTime() + 60 * 60000);

  const canReserve = now >= resOpen && now < resDeadline && !session.is_closed;
  const canSelfCancel = now < resDeadline;
  const canCheckIn = now >= checkinOpen && now <= checkinClose;
  const canCheckOut = now >= checkoutOpen && now <= checkoutClose;
  const isExpired = now > sessionEnd;

  return {
    session,
    capacity,
    availableSlots,
    isFull,
    stats,
    timing: {
      canReserve,
      canSelfCancel,
      canCheckIn,
      canCheckOut,
      isExpired,
      reservationOpenAt: resOpen,
      reservationDeadline: resDeadline,
      checkinOpenAt: checkinOpen,
      checkinCloseAt: checkinClose,
      checkoutOpenAt: checkoutOpen,
      checkoutCloseAt: checkoutClose,
      sessionStart: tStart,
      sessionEnd: sessionEnd
    },
    userStatus,
    userWaitlist
  };
}

/**
 * Đăng ký giữ chỗ (Reservation) với PostgreSQL Row-Level Lock chống race condition
 */
async function reserveSession(sessionId, userId) {
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    // 1. Row-level Lock trên sessions record để tuần tự hóa toàn bộ reservation của session này
    const sessionRes = await client.query(
      `SELECT id, title, capacity, is_closed,
              reservation_open_at, reservation_deadline, date_time
       FROM sessions
       WHERE id = $1::uuid
       FOR UPDATE;`,
      [sessionId]
    );

    if (sessionRes.rows.length === 0) {
      throw new Error('Không tìm thấy buổi tập này.');
    }

    const session = sessionRes.rows[0];

    if (session.is_closed) {
      throw new Error('Buổi tập này đã bị đóng.');
    }

    const now = new Date();
    const resOpen = session.reservation_open_at ? new Date(session.reservation_open_at) : new Date(session.date_time.getTime() - 3 * 86400000);
    const resDeadline = session.reservation_deadline ? new Date(session.reservation_deadline) : new Date(session.date_time.getTime() - 2 * 3600000);

    if (now < resOpen) {
      throw new Error(`Cổng đăng ký chưa mở. Buổi tập sẽ mở đăng ký từ ${resOpen.toLocaleString('vi-VN')}.`);
    }

    if (now >= resDeadline) {
      throw new Error(`Hạn chót đăng ký (${resDeadline.toLocaleString('vi-VN')}) đã qua.`);
    }

    // 2. Kiểm tra xem user đã có reservation active chưa
    const existingRes = await client.query(
      `SELECT status FROM attendances WHERE session_id = $1::uuid AND user_id = $2::uuid;`,
      [sessionId, userId]
    );

    if (existingRes.rows.length > 0) {
      const currentStatus = existingRes.rows[0].status;
      if (['RESERVED', 'CONFIRMED', 'CHECKED_IN', 'going'].includes(currentStatus)) {
        throw new Error('Bạn đã đăng ký giữ chỗ cho buổi tập này rồi.');
      }
    }

    // 3. Đếm số lượng slot active hiện tại từ Single Source of Truth
    const countRes = await client.query(
      `SELECT count(*) as active_count
       FROM attendances
       WHERE session_id = $1::uuid AND status = ANY($2::varchar[]);`,
      [sessionId, SLOT_OCCUPYING_STATUSES]
    );

    const activeCount = parseInt(countRes.rows[0].active_count, 10);
    const capacity = session.capacity || 40;

    if (activeCount >= capacity) {
      const err = new Error('Buổi tập đã đủ số lượng chỗ (Hết slot). Vui lòng tham gia danh sách chờ (Waitlist).');
      err.code = 'SESSION_FULL';
      throw err;
    }

    // 4. Ghi nhận reservation với status = 'RESERVED'
    const upsertRes = await client.query(
      `INSERT INTO attendances (
        session_id, user_id, status, reserved_at, updated_at,
        cancellation_reason, is_late_cancellation, cancellation_request_pending
      )
      VALUES ($1::uuid, $2::uuid, 'RESERVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL, FALSE, FALSE)
      ON CONFLICT (session_id, user_id)
      DO UPDATE SET
        status = 'RESERVED',
        reserved_at = CURRENT_TIMESTAMP,
        cancelled_at = NULL,
        cancellation_reason = NULL,
        is_late_cancellation = FALSE,
        cancellation_request_pending = FALSE,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *;`,
      [sessionId, userId]
    );

    // Nếu user đang trong waitlist, cập nhật waitlist thành CLAIMED hoặc CANCELLED
    await client.query(
      `UPDATE session_waitlist 
       SET status = 'CLAIMED', confirmed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE session_id = $1::uuid AND user_id = $2::uuid AND status IN ('WAITING', 'OFFERED');`,
      [sessionId, userId]
    );

    await client.query('COMMIT');

    return {
      success: true,
      message: `Giữ chỗ thành công buổi tập "${session.title}"!`,
      reservation: upsertRes.rows[0]
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Tham gia hàng chờ Waitlist (FIFO) khi buổi tập đã đầy
 */
async function joinWaitlist(sessionId, userId) {
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    // 1. Kiểm tra session
    const sessionRes = await client.query(
      `SELECT id, title, capacity, session_end FROM sessions WHERE id = $1::uuid FOR UPDATE;`,
      [sessionId]
    );

    if (sessionRes.rows.length === 0) {
      throw new Error('Không tìm thấy buổi tập này.');
    }

    const session = sessionRes.rows[0];

    // 2. Kiểm tra xem user đã có reservation active chưa
    const existingRes = await client.query(
      `SELECT status FROM attendances WHERE session_id = $1::uuid AND user_id = $2::uuid;`,
      [sessionId, userId]
    );
    if (existingRes.rows.length > 0 && ['RESERVED', 'CONFIRMED', 'CHECKED_IN', 'going'].includes(existingRes.rows[0].status)) {
      throw new Error('Bạn đã có chỗ chính thức trong buổi tập, không cần vào danh sách chờ.');
    }

    // 3. Kiểm tra user đã ở trong waitlist chưa
    const wlCheck = await client.query(
      `SELECT * FROM session_waitlist WHERE session_id = $1::uuid AND user_id = $2::uuid;`,
      [sessionId, userId]
    );

    if (wlCheck.rows.length > 0 && ['WAITING', 'OFFERED'].includes(wlCheck.rows[0].status)) {
      throw new Error(`Bạn đang ở trong danh sách chờ (Vị trí #${wlCheck.rows[0].position}).`);
    }

    // 4. Lấy vị trí FIFO tiếp theo
    const maxPosRes = await client.query(
      `SELECT COALESCE(MAX(position), 0) AS max_pos 
       FROM session_waitlist 
       WHERE session_id = $1::uuid AND status IN ('WAITING', 'OFFERED');`,
      [sessionId]
    );
    const nextPosition = parseInt(maxPosRes.rows[0].max_pos, 10) + 1;

    // 5. Thêm hoặc cập nhật vào session_waitlist
    const insertRes = await client.query(
      `INSERT INTO session_waitlist (
        session_id, user_id, position, status, created_at, updated_at
      )
      VALUES ($1::uuid, $2::uuid, $3, 'WAITING', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT (session_id, user_id)
      DO UPDATE SET
        position = EXCLUDED.position,
        status = 'WAITING',
        offered_at = NULL,
        offer_expires_at = NULL,
        confirmed_at = NULL,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *;`,
      [sessionId, userId, nextPosition]
    );

    await client.query('COMMIT');

    return {
      success: true,
      message: `Bạn đã tham gia danh sách chờ (Vị trí #${nextPosition}). Khi có slot trống, hệ thống sẽ tự động thông báo cho bạn!`,
      waitlist: insertRes.rows[0]
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Hủy giữ chỗ (Cancel Reservation)
 * - Nếu TRƯỚC deadline: Hủy ngay, giải phóng slot, tự động offer cho Waitlist #1
 * - Nếu SAU deadline: Chặn tự hủy, yêu cầu gửi Late Cancellation Request
 */
async function cancelReservation(sessionId, userId, reason = 'Thành viên tự hủy') {
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    // 1. Khóa row session
    const sessionRes = await client.query(
      `SELECT id, title, reservation_deadline, date_time, waitlist_offer_duration_minutes, session_end
       FROM sessions WHERE id = $1::uuid FOR UPDATE;`,
      [sessionId]
    );

    if (sessionRes.rows.length === 0) {
      throw new Error('Không tìm thấy buổi tập này.');
    }

    const session = sessionRes.rows[0];

    // 2. Kiểm tra reservation của user
    const attRes = await client.query(
      `SELECT * FROM attendances WHERE session_id = $1::uuid AND user_id = $2::uuid FOR UPDATE;`,
      [sessionId, userId]
    );

    if (attRes.rows.length === 0 || !['RESERVED', 'CONFIRMED', 'going'].includes(attRes.rows[0].status)) {
      throw new Error('Bạn không có lượt đặt chỗ hợp lệ nào để hủy.');
    }

    const now = new Date();
    const resDeadline = session.reservation_deadline 
      ? new Date(session.reservation_deadline) 
      : new Date(session.date_time.getTime() - 2 * 3600000);

    // 3. Kiểm tra hạn chót
    if (now >= resDeadline) {
      const err = new Error(
        `Đã quá hạn chót hủy chỗ miễn phí (${resDeadline.toLocaleString('vi-VN')}). Bạn không thể tự ý hủy slot. Vui lòng gửi Yêu cầu Hủy muộn để Admin xem xét duyệt.`
      );
      err.code = 'LATE_CANCELLATION_DEADLINE_PASSED';
      throw err;
    }

    // 4. Thực hiện hủy hợp lệ trước deadline
    await client.query(
      `UPDATE attendances
       SET status = 'CANCELLED',
           cancelled_at = CURRENT_TIMESTAMP,
           cancellation_reason = $1,
           is_late_cancellation = FALSE,
           updated_at = CURRENT_TIMESTAMP
       WHERE session_id = $2::uuid AND user_id = $3::uuid;`,
      [reason, sessionId, userId]
    );

    // 5. Tự động tìm kiếm và offer slot cho người đầu tiên trong Waitlist (nếu có)
    const offerResult = await triggerWaitlistOfferInternal(client, session);

    await client.query('COMMIT');

    return {
      success: true,
      message: 'Đã hủy giữ chỗ thành công. Slot của bạn đã được giải phóng.',
      offeredToWaitlist: offerResult
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Gửi yêu cầu hủy muộn (Late Cancellation Request) khi đã quá deadline
 */
async function requestLateCancel(sessionId, userId, reason) {
  if (!reason || !reason.trim()) {
    throw new Error('Vui lòng cung cấp lý do cho yêu cầu hủy muộn.');
  }

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const attRes = await client.query(
      `SELECT * FROM attendances WHERE session_id = $1::uuid AND user_id = $2::uuid FOR UPDATE;`,
      [sessionId, userId]
    );

    if (attRes.rows.length === 0 || !['RESERVED', 'CONFIRMED', 'going'].includes(attRes.rows[0].status)) {
      throw new Error('Bạn không có lượt đặt chỗ nào để yêu cầu hủy.');
    }

    await client.query(
      `UPDATE attendances
       SET cancellation_request_pending = TRUE,
           cancellation_request_reason = $1,
           cancellation_requested_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE session_id = $2::uuid AND user_id = $3::uuid;`,
      [reason.trim(), sessionId, userId]
    );

    await client.query('COMMIT');

    return {
      success: true,
      message: 'Đã gửi yêu cầu hủy muộn đến Ban Quản Trị. Vui lòng chờ Admin xem xét phê duyệt.'
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Tự động offer slot cho người đứng đầu Waitlist (hàm nội bộ chạy trong transaction)
 */
async function triggerWaitlistOfferInternal(client, session) {
  const now = new Date();
  const sessionEnd = session.session_end ? new Date(session.session_end) : new Date(session.date_time.getTime() + 2 * 3600000);

  // Nếu buổi tập đã kết thúc hoặc chỉ còn dưới 10 phút, không cần offer nữa
  if (now.getTime() + 10 * 60000 >= sessionEnd.getTime()) {
    return null;
  }

  // 1. Kiểm tra xem hiện có ai đang ở trạng thái OFFERED chưa hết hạn không
  const activeOfferRes = await client.query(
    `SELECT * FROM session_waitlist
     WHERE session_id = $1::uuid AND status = 'OFFERED' AND offer_expires_at > CURRENT_TIMESTAMP;`,
    [session.id]
  );
  if (activeOfferRes.rows.length > 0) {
    return null; // Đã có người đang giữ offer
  }

  // 2. Tìm người đầu tiên trong waitlist có status = 'WAITING'
  const nextUserRes = await client.query(
    `SELECT w.*, u.full_name, u.email
     FROM session_waitlist w
     JOIN users u ON w.user_id = u.id
     WHERE w.session_id = $1::uuid AND w.status = 'WAITING'
     ORDER BY w.position ASC
     LIMIT 1
     FOR UPDATE;`,
    [session.id]
  );

  if (nextUserRes.rows.length === 0) {
    return null; // Waitlist rỗng
  }

  const nextUser = nextUserRes.rows[0];
  const offerMinutes = session.waitlist_offer_duration_minutes || 10;
  const offerExpiresAt = new Date(Date.now() + offerMinutes * 60000);

  // 3. Cập nhật thành OFFERED
  await client.query(
    `UPDATE session_waitlist
     SET status = 'OFFERED',
         offered_at = CURRENT_TIMESTAMP,
         offer_expires_at = $1,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $2::uuid;`,
    [offerExpiresAt, nextUser.id]
  );

  return {
    userId: nextUser.user_id,
    fullName: nextUser.full_name,
    email: nextUser.email,
    position: nextUser.position,
    offerExpiresAt
  };
}

/**
 * Xác nhận nhận slot từ Waitlist khi được OFFERED
 */
async function claimWaitlistOffer(sessionId, userId) {
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    // 1. Kiểm tra session
    const sessionRes = await client.query(
      `SELECT id, title, capacity, reservation_deadline FROM sessions WHERE id = $1::uuid FOR UPDATE;`,
      [sessionId]
    );
    if (sessionRes.rows.length === 0) {
      throw new Error('Không tìm thấy buổi tập này.');
    }
    const session = sessionRes.rows[0];

    // 2. Kiểm tra waitlist record của user
    const wlRes = await client.query(
      `SELECT * FROM session_waitlist 
       WHERE session_id = $1::uuid AND user_id = $2::uuid FOR UPDATE;`,
      [sessionId, userId]
    );

    if (wlRes.rows.length === 0) {
      throw new Error('Bạn không có trong danh sách chờ của buổi tập này.');
    }

    const wl = wlRes.rows[0];

    if (wl.status !== 'OFFERED') {
      throw new Error('Slot chờ của bạn hiện không ở trạng thái sẵn sàng để xác nhận.');
    }

    const now = new Date();
    if (new Date(wl.offer_expires_at) < now) {
      // Đã hết hạn
      await client.query(
        `UPDATE session_waitlist SET status = 'EXPIRED', updated_at = CURRENT_TIMESTAMP WHERE id = $1::uuid;`,
        [wl.id]
      );
      await client.query('COMMIT');
      throw new Error('Thời gian giữ slot của bạn đã hết hạn. Hệ thống đã chuyển cơ hội cho người tiếp theo.');
    }

    // 3. Chuyển thành công sang trạng thái phù hợp
    const finalStatus = (session.reservation_deadline && now >= new Date(session.reservation_deadline)) ? 'CONFIRMED' : 'RESERVED';

    await client.query(
      `UPDATE session_waitlist 
       SET status = 'CLAIMED', confirmed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1::uuid;`,
      [wl.id]
    );

    const upsertRes = await client.query(
      `INSERT INTO attendances (
        session_id, user_id, status, reserved_at, updated_at
      )
      VALUES ($1::uuid, $2::uuid, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT (session_id, user_id)
      DO UPDATE SET
        status = $3,
        reserved_at = CURRENT_TIMESTAMP,
        cancelled_at = NULL,
        cancellation_reason = NULL,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *;`,
      [sessionId, userId, finalStatus]
    );

    await client.query('COMMIT');

    return {
      success: true,
      message: '🎉 Xác nhận nhận slot thành công! Bạn đã có chỗ chính thức trong buổi tập.',
      reservation: upsertRes.rows[0]
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Xử lý QR Check-In tại sân
 * - Kiểm tra session identity và token chống giả mạo
 * - Kiểm tra time window
 * - Kiểm tra reservation status (RESERVED / CONFIRMED)
 * - Hỗ trợ Walk-in Override cho Admin
 */
async function processQrCheckIn({
  sessionId,
  userId,
  clientTokenOrCode = '',
  allowWalkIn = false,
  adminId = null,
  walkInReason = 'Khách vãng lai check-in trực tiếp tại sân'
}) {
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    // 1. Lấy thông tin session
    const sessionRes = await client.query(
      `SELECT s.*, 
              s.date_time::text AS date_time_str,
              s.session_start::text AS session_start_str,
              s.session_end::text AS session_end_str,
              s.checkin_open_at::text AS checkin_open_at_str,
              s.checkin_close_at::text AS checkin_close_at_str
       FROM sessions s
       WHERE s.id = $1::uuid
       FOR UPDATE;`,
      [sessionId]
    );

    if (sessionRes.rows.length === 0) {
      throw new Error('Không tìm thấy buổi tập này.');
    }

    const session = sessionRes.rows[0];

    if (session.is_closed) {
      throw new Error('Buổi tập này đã kết thúc hoặc bị đóng.');
    }

    // 2. Xác thực QR token hoặc checkin_code (nếu client có truyền mã lên)
    const isAdmin = Boolean(adminId);
    const rawCode = (clientTokenOrCode || '').trim().toUpperCase();
    
    if (rawCode) {
      const matchSecret = session.qr_secret_token && rawCode === session.qr_secret_token.toUpperCase();
      const matchQr = session.qr_code && rawCode === session.qr_code.toUpperCase();
      const matchCode = session.checkin_code && rawCode === session.checkin_code.toUpperCase();

      if (!matchSecret && !matchQr && !matchCode && !session.qr_code?.toUpperCase().includes(rawCode)) {
        throw new Error('Mã QR hoặc mã điểm danh không khớp với buổi tập này hoặc đã bị làm mới.');
      }
    } else if (!isAdmin) {
      throw new Error('Bạn cần phải quét mã QR tại sân hoặc nhập mã điểm danh để Check-in.');
    }

    // 3. Kiểm tra khung giờ check-in (Time Window)
    const now = new Date();
    const tStart = session.date_time ? new Date(session.date_time) : new Date(session.session_start);
    const checkinOpen = session.checkin_open_at ? new Date(session.checkin_open_at) : new Date(tStart.getTime() - 30 * 60000);
    const checkinClose = session.checkin_close_at ? new Date(session.checkin_close_at) : new Date(tStart.getTime() + 30 * 60000);

    if (!isAdmin && (now < checkinOpen || now > checkinClose)) {
      throw new Error(
        `Cổng điểm danh mở từ ${checkinOpen.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} đến ${checkinClose.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} ngày ${checkinOpen.toLocaleDateString('vi-VN')}.`
      );
    }

    // 4. Kiểm tra trạng thái reservation của user
    const attRes = await client.query(
      `SELECT * FROM attendances WHERE session_id = $1::uuid AND user_id = $2::uuid FOR UPDATE;`,
      [sessionId, userId]
    );

    let isWalkInUsed = false;

    if (attRes.rows.length === 0 || !['RESERVED', 'CONFIRMED', 'going'].includes(attRes.rows[0].status)) {
      const currentStatus = attRes.rows.length > 0 ? attRes.rows[0].status : null;

      if (currentStatus === 'CHECKED_IN') {
        throw new Error('Bạn đã điểm danh thành công cho buổi tập này rồi.');
      }

      if (currentStatus === 'CHECKED_OUT') {
        throw new Error('Bạn đã ghi nhận Check-out rời sân buổi tập này rồi. Vui lòng liên hệ Admin nếu muốn vào lại.');
      }

      if (currentStatus === 'MISSING_CHECKOUT') {
        throw new Error('Buổi tập này đã kết thúc.');
      }

      if (currentStatus === 'CANCELLED') {
        if (!allowWalkIn) {
          throw new Error('Bạn đã hủy đăng ký giữ chỗ buổi tập này. Vui lòng liên hệ Admin tại bàn tiếp đón để check-in bổ sung (Walk-in).');
        }
      }

      // Chưa có reservation: Nếu allowWalkIn = true thì cho phép
      if (allowWalkIn) {
        isWalkInUsed = true;
      } else {
        throw new Error('Bạn chưa có lượt giữ chỗ (Reservation) cho buổi tập này. Vui lòng liên hệ Ban Điều Phối sân.');
      }
    }

    // 5. Cập nhật status thành CHECKED_IN
    const updatedAttRes = await client.query(
      `INSERT INTO attendances (
        session_id, user_id, status, checked_in_at, is_walk_in, updated_at
      )
      VALUES ($1::uuid, $2::uuid, 'CHECKED_IN', CURRENT_TIMESTAMP, $3, CURRENT_TIMESTAMP)
      ON CONFLICT (session_id, user_id)
      DO UPDATE SET
        status = 'CHECKED_IN',
        checked_in_at = CURRENT_TIMESTAMP,
        is_walk_in = $3,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *;`,
      [sessionId, userId, isWalkInUsed]
    );

    // 6. Ghi Audit Log nếu có can thiệp Walk-in hoặc Admin
    if (isWalkInUsed || isAdmin) {
      await client.query(
        `INSERT INTO session_audit_logs (
          session_id, admin_user_id, target_user_id, action, before_status, after_status, reason
        ) VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5, 'CHECKED_IN', $6);`,
        [
          sessionId,
          adminId || userId,
          userId,
          isWalkInUsed ? 'ADMIN_WALK_IN_CHECKIN' : 'ADMIN_OVERRIDE_CHECKIN',
          attRes.rows[0]?.status || 'NONE',
          walkInReason
        ]
      );
    }

    // 7. Thưởng XP & Coins cho thành viên
    const lvlUpRes = await addXpToUser(userId, 25);
    await client.query('UPDATE users SET smash_coins = smash_coins + 10 WHERE id = $1', [userId]);
    await trackActivity(userId, 'check_in');

    await client.query('COMMIT');

    return {
      success: true,
      message: '✅ Điểm danh quét mã QR thành công!',
      attendance: updatedAttRes.rows[0],
      isWalkIn: isWalkInUsed,
      xpAwarded: 25,
      coinsAwarded: 10,
      levelUp: lvlUpRes
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Thành viên hoặc Admin thực hiện CHECK-OUT buổi tập
 */
async function processQrCheckOut({
  sessionId,
  userId,
  clientTokenOrCode = '',
  adminId = null,
  checkoutTime = null,
  reason = ''
}) {
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    // 1. Lấy thông tin session
    const sessionRes = await client.query(
      `SELECT s.*, 
              s.date_time::text AS date_time_str,
              s.session_start::text AS session_start_str,
              s.session_end::text AS session_end_str,
              s.checkout_open_at::text AS checkout_open_at_str,
              s.checkout_close_at::text AS checkout_close_at_str
       FROM sessions s
       WHERE s.id = $1::uuid
       FOR UPDATE;`,
      [sessionId]
    );

    if (sessionRes.rows.length === 0) {
      throw new Error('Không tìm thấy buổi tập này.');
    }

    const session = sessionRes.rows[0];

    // 2. Kiểm tra trận đấu đang diễn ra trên Match Desk (Tránh tình trạng vừa checkout vừa đang thi đấu)
    const activeMatchRes = await client.query(
      `SELECT id, status FROM matches
       WHERE status = 'pending'
         AND ($1::uuid IN (player1_id, player2_id, player1_partner_id, player2_partner_id))
       LIMIT 1;`,
      [userId]
    );

    if (activeMatchRes.rows.length > 0) {
      throw new Error('Thành viên này đang có trận đấu chưa kết thúc trên sân (Match Desk). Vui lòng hoàn thành hoặc hủy trận đấu trước khi Check-out.');
    }

    const isAdmin = Boolean(adminId);

    // 3. Xác thực QR token Check-out (nếu client gọi bằng mã QR)
    const rawCode = (clientTokenOrCode || '').trim().toUpperCase();
    if (rawCode && !isAdmin) {
      const matchCheckoutSecret = session.qr_checkout_secret_token && rawCode === session.qr_checkout_secret_token.toUpperCase();
      const matchCheckinSecret = session.qr_secret_token && rawCode === session.qr_secret_token.toUpperCase();
      const matchCheckinQr = session.qr_code && rawCode === session.qr_code.toUpperCase();

      if (matchCheckinSecret || matchCheckinQr) {
        throw new Error('Mã này là mã QR Check-in (Vào sân), không phải mã QR Check-out (Rời sân). Vui lòng quét đúng mã QR Check-out của sân.');
      }

      if (!matchCheckoutSecret && !session.qr_checkout_secret_token?.toUpperCase().includes(rawCode)) {
        throw new Error('Mã QR Check-out không khớp với buổi tập này hoặc không hợp lệ.');
      }
    } else if (!isAdmin) {
      throw new Error('Bạn cần phải quét mã QR tại sân để Check-out.');
    }

    // 4. Kiểm tra khung giờ check-out (Time Window)
    const now = new Date();
    const tStart = session.session_start ? new Date(session.session_start) : new Date(session.date_time);
    const tEnd = session.session_end ? new Date(session.session_end) : new Date(tStart.getTime() + 2 * 3600000);
    const checkoutOpen = session.checkout_open_at ? new Date(session.checkout_open_at) : new Date(tStart.getTime() + 30 * 60000);
    const checkoutClose = session.checkout_close_at ? new Date(session.checkout_close_at) : new Date(tEnd.getTime() + 60 * 60000);

    if (!isAdmin && now < checkoutOpen) {
      throw new Error(
        `Cổng Check-out mở từ ${checkoutOpen.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} ngày ${checkoutOpen.toLocaleDateString('vi-VN')}. Bạn chưa thể Check-out lúc này.`
      );
    }
    if (!isAdmin && now > checkoutClose) {
      throw new Error(
        `Cổng Check-out của buổi tập đã đóng lúc ${checkoutClose.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}.`
      );
    }

    // 5. Kiểm tra trạng thái attendance của user
    const attRes = await client.query(
      `SELECT * FROM attendances WHERE session_id = $1::uuid AND user_id = $2::uuid FOR UPDATE;`,
      [sessionId, userId]
    );

    if (attRes.rows.length === 0) {
      throw new Error('Bạn chưa đăng ký hoặc điểm danh buổi tập này nên không thể Check-out.');
    }

    const att = attRes.rows[0];

    // Idempotent: Nếu đã CHECKED_OUT từ trước
    if (att.status === 'CHECKED_OUT') {
      await client.query('COMMIT');
      return {
        success: true,
        alreadyCheckedOut: true,
        message: 'Bạn đã ghi nhận Check-out trước đó.',
        checked_in_at: att.checked_in_at,
        checked_out_at: att.checked_out_at,
        duration_minutes: att.duration_minutes || 0,
        checkout_status: att.checkout_status || 'completed'
      };
    }

    // Nếu chưa từng Check-in
    if (att.status === 'RESERVED' || att.status === 'CONFIRMED') {
      throw new Error('Bạn chưa quét mã Check-in tại sân nên không thể thực hiện Check-out.');
    }

    if (att.status === 'CANCELLED' || att.status === 'NO_SHOW') {
      throw new Error(`Lượt tham gia của bạn đang ở trạng thái "${att.status}". Không thể Check-out.`);
    }

    // Phải ở trạng thái CHECKED_IN hoặc going hoặc MISSING_CHECKOUT (cho admin override)
    if (att.status !== 'CHECKED_IN' && att.status !== 'going' && !(isAdmin && att.status === 'MISSING_CHECKOUT')) {
      throw new Error(`Trạng thái hiện tại (${att.status}) không hợp lệ để Check-out.`);
    }

    // 6. Thực hiện check-out
    const effectiveOutTime = checkoutTime ? new Date(checkoutTime) : new Date();
    const checkInTime = att.checked_in_at ? new Date(att.checked_in_at) : new Date(att.created_at);
    const durationMinutes = Math.max(1, Math.round((effectiveOutTime.getTime() - checkInTime.getTime()) / 60000));
    const method = isAdmin ? 'admin' : (rawCode ? 'qr' : 'manual');

    await client.query(
      `UPDATE attendances
       SET status = 'CHECKED_OUT',
           checked_out_at = $1,
           checkout_method = $2,
           checkout_status = 'completed',
           duration_minutes = $3,
           updated_at = CURRENT_TIMESTAMP
       WHERE session_id = $4::uuid AND user_id = $5::uuid;`,
      [effectiveOutTime, method, durationMinutes, sessionId, userId]
    );

    // 7. Ghi audit log nếu admin can thiệp
    if (isAdmin) {
      await client.query(
        `INSERT INTO session_audit_logs (
          session_id, admin_user_id, target_user_id, action, before_status, after_status, reason
        ) VALUES ($1::uuid, $2::uuid, $3::uuid, 'ADMIN_CHECKOUT_OVERRIDE', $4, 'CHECKED_OUT', $5);`,
        [sessionId, adminId, userId, att.status, reason || 'Admin ghi nhận Check-out thủ công']
      );
    }

    await client.query('COMMIT');

    return {
      success: true,
      message: 'Check-out thành công! Cảm ơn bạn đã tham gia buổi tập.',
      checked_in_at: checkInTime,
      checked_out_at: effectiveOutTime,
      duration_minutes: durationMinutes,
      checkout_status: 'completed',
      method
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Admin duyệt yêu cầu hủy muộn
 */
async function adminApproveLateCancel(sessionId, targetUserId, adminId, reason = 'Admin phê duyệt hủy muộn') {
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const sessionRes = await client.query(
      `SELECT * FROM sessions WHERE id = $1::uuid FOR UPDATE;`,
      [sessionId]
    );
    if (sessionRes.rows.length === 0) throw new Error('Không tìm thấy buổi tập.');

    const attRes = await client.query(
      `SELECT * FROM attendances WHERE session_id = $1::uuid AND user_id = $2::uuid FOR UPDATE;`,
      [sessionId, targetUserId]
    );
    if (attRes.rows.length === 0) throw new Error('Không tìm thấy lượt đặt chỗ của thành viên này.');

    const beforeStatus = attRes.rows[0].status;

    await client.query(
      `UPDATE attendances
       SET status = 'CANCELLED',
           cancelled_at = CURRENT_TIMESTAMP,
           cancellation_reason = $1,
           is_late_cancellation = TRUE,
           cancellation_request_pending = FALSE,
           updated_at = CURRENT_TIMESTAMP
       WHERE session_id = $2::uuid AND user_id = $3::uuid;`,
      [reason, sessionId, targetUserId]
    );

    // Ghi audit log
    await client.query(
      `INSERT INTO session_audit_logs (
        session_id, admin_user_id, target_user_id, action, before_status, after_status, reason
      ) VALUES ($1::uuid, $2::uuid, $3::uuid, 'ADMIN_APPROVE_LATE_CANCEL', $4, 'CANCELLED', $5);`,
      [sessionId, adminId, targetUserId, beforeStatus, reason]
    );

    // Tự động offer cho Waitlist
    const offerResult = await triggerWaitlistOfferInternal(client, sessionRes.rows[0]);

    await client.query('COMMIT');

    return {
      success: true,
      message: 'Đã phê duyệt hủy muộn và giải phóng slot thành công.',
      offeredToWaitlist: offerResult
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Admin từ chối yêu cầu hủy muộn
 */
async function adminRejectLateCancel(sessionId, targetUserId, adminId, reason = 'Admin từ chối hủy muộn') {
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const attRes = await client.query(
      `SELECT * FROM attendances WHERE session_id = $1::uuid AND user_id = $2::uuid FOR UPDATE;`,
      [sessionId, targetUserId]
    );
    if (attRes.rows.length === 0) throw new Error('Không tìm thấy lượt đặt chỗ của thành viên này.');

    const beforeStatus = attRes.rows[0].status;

    await client.query(
      `UPDATE attendances
       SET cancellation_request_pending = FALSE,
           updated_at = CURRENT_TIMESTAMP
       WHERE session_id = $1::uuid AND user_id = $2::uuid;`,
      [sessionId, targetUserId]
    );

    // Ghi audit log
    await client.query(
      `INSERT INTO session_audit_logs (
        session_id, admin_user_id, target_user_id, action, before_status, after_status, reason
      ) VALUES ($1::uuid, $2::uuid, $3::uuid, 'ADMIN_REJECT_LATE_CANCEL', $4, $4, $5);`,
      [sessionId, adminId, targetUserId, beforeStatus, reason]
    );

    await client.query('COMMIT');

    return {
      success: true,
      message: 'Đã từ chối yêu cầu hủy muộn. Lượt đặt chỗ vẫn giữ nguyên.'
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Lấy danh sách toàn bộ người tham gia phân theo trạng thái và audit logs cho Admin Dashboard
 */
async function getAdminSessionDashboard(sessionId) {
  const details = await getSessionDetails(sessionId);

  // Lấy danh sách tất cả người trong attendances
  const attendeesRes = await db.query(
    `SELECT a.*, 
            u.full_name, u.nickname, u.phone_zalo, u.avatar_url, u.badminton_level
     FROM attendances a
     JOIN users u ON a.user_id = u.id
     WHERE a.session_id = $1::uuid
     ORDER BY a.updated_at DESC;`,
    [sessionId]
  );

  // Lấy danh sách waitlist
  const waitlistRes = await db.query(
    `SELECT w.*, 
            u.full_name, u.nickname, u.phone_zalo, u.avatar_url, u.badminton_level
     FROM session_waitlist w
     JOIN users u ON w.user_id = u.id
     WHERE w.session_id = $1::uuid
     ORDER BY w.position ASC, w.created_at ASC;`,
    [sessionId]
  );

  // Lấy audit logs
  const auditLogsRes = await db.query(
    `SELECT l.*, 
            adm.full_name as admin_name,
            tar.full_name as target_user_name
     FROM session_audit_logs l
     LEFT JOIN users adm ON l.admin_user_id = adm.id
     LEFT JOIN users tar ON l.target_user_id = tar.id
     WHERE l.session_id = $1::uuid
     ORDER BY l.created_at DESC;`,
    [sessionId]
  );

  return {
    ...details,
    attendees: attendeesRes.rows,
    waitlist: waitlistRes.rows,
    auditLogs: auditLogsRes.rows
  };
}

module.exports = {
  getSessionDetails,
  reserveSession,
  joinWaitlist,
  cancelReservation,
  requestLateCancel,
  claimWaitlistOffer,
  processQrCheckIn,
  processQrCheckOut,
  adminApproveLateCancel,
  adminRejectLateCancel,
  getAdminSessionDashboard
};
