const db = require('../db');

/**
 * SINGLE SOURCE OF TRUTH CHO RESERVATION SLOTS
 * 
 * Các trạng thái chiếm reservation slot:
 * - RESERVED: Giữ chỗ thành công
 * - CONFIRMED: Đã chốt slot trước giờ tập
 * - CHECKED_IN: Đã quét QR có mặt tại sân
 * - CHECKED_OUT: Đã hoàn thành buổi tập và check-out rời sân (slot đã sử dụng)
 * - MISSING_CHECKOUT: Đã tham gia buổi tập nhưng quên check-out (slot đã sử dụng)
 * - going: Trạng thái RSVP legacy từ phiên bản trước
 * 
 * Các trạng thái KHÔNG chiếm slot:
 * - CANCELLED: Đã hủy giữ chỗ (slot được trả lại cho cộng đồng / waitlist)
 * - NO_SHOW: Không đến sân (slot được giải phóng)
 * - absent: Báo vắng (không chiếm slot)
 */
const SLOT_OCCUPYING_STATUSES = Object.freeze([
  'RESERVED',
  'CONFIRMED',
  'CHECKED_IN',
  'CHECKED_OUT',
  'MISSING_CHECKOUT',
  'going'
]);

const NON_OCCUPYING_STATUSES = Object.freeze([
  'CANCELLED',
  'NO_SHOW',
  'absent'
]);

/**
 * Lấy số liệu capacity, occupiedSlots, availableSlots, waitlistCount cho 1 buổi tập
 */
async function getSessionCapacity(sessionId, client = db) {
  if (!sessionId) {
    throw new Error('sessionId là bắt buộc để tính capacity.');
  }

  // 1. Lấy thông tin cơ bản của session
  const sessionRes = await client.query(
    `SELECT id, title, capacity FROM sessions WHERE id = $1::uuid;`,
    [sessionId]
  );
  if (sessionRes.rows.length === 0) {
    throw new Error('Không tìm thấy buổi tập này.');
  }
  const capacity = sessionRes.rows[0].capacity || 40;

  // 2. Đếm các trạng thái attendances
  const statsRes = await client.query(
    `SELECT 
      COUNT(*) FILTER (WHERE status = 'RESERVED') AS reserved_count,
      COUNT(*) FILTER (WHERE status = 'CONFIRMED') AS confirmed_count,
      COUNT(*) FILTER (WHERE status = 'CHECKED_IN') AS checked_in_count,
      COUNT(*) FILTER (WHERE status = 'going') AS going_count,
      COUNT(*) FILTER (WHERE status = 'CHECKED_OUT') AS checked_out_count,
      COUNT(*) FILTER (WHERE status = 'MISSING_CHECKOUT') AS missing_checkout_count,
      COUNT(*) FILTER (WHERE status = 'CANCELLED') AS cancelled_count,
      COUNT(*) FILTER (WHERE status = 'NO_SHOW') AS no_show_count,
      COUNT(*) FILTER (WHERE status = ANY($1::varchar[])) AS occupied_count,
      COUNT(*) FILTER (WHERE cancellation_request_pending IS TRUE) AS pending_late_cancel_count
     FROM attendances
     WHERE session_id = $2::uuid;`,
    [SLOT_OCCUPYING_STATUSES, sessionId]
  );

  const stats = statsRes.rows[0];
  const occupiedSlots = parseInt(stats.occupied_count || 0, 10);
  const availableSlots = Math.max(0, capacity - occupiedSlots);
  const isFull = availableSlots === 0;

  // 3. Đếm waitlist
  const wlRes = await client.query(
    `SELECT 
      COUNT(*) FILTER (WHERE status = 'WAITING') AS waiting_count,
      COUNT(*) FILTER (WHERE status = 'OFFERED') AS offered_count
     FROM session_waitlist
     WHERE session_id = $1::uuid;`,
    [sessionId]
  );
  const waitlistCount = parseInt(wlRes.rows[0].waiting_count || 0, 10);
  const offeredCount = parseInt(wlRes.rows[0].offered_count || 0, 10);

  return {
    capacity,
    occupiedSlots,
    availableSlots,
    waitlistCount,
    offeredCount,
    isFull,
    stats: {
      reserved: parseInt(stats.reserved_count || 0, 10),
      confirmed: parseInt(stats.confirmed_count || 0, 10),
      checkedIn: parseInt(stats.checked_in_count || 0, 10) + parseInt(stats.going_count || 0, 10),
      checkedOut: parseInt(stats.checked_out_count || 0, 10),
      missingCheckout: parseInt(stats.missing_checkout_count || 0, 10),
      cancelled: parseInt(stats.cancelled_count || 0, 10),
      noShow: parseInt(stats.no_show_count || 0, 10),
      active: occupiedSlots,
      pendingLateCancel: parseInt(stats.pending_late_cancel_count || 0, 10),
      waiting: waitlistCount,
      offered: offeredCount
    }
  };
}

/**
 * Lấy Map số liệu slot cho danh sách nhiều sessionIds
 */
async function getSessionsCapacityMap(sessionIds, client = db) {
  if (!sessionIds || sessionIds.length === 0) return new Map();

  const queryRes = await client.query(
    `SELECT 
       s.id AS session_id,
       s.capacity,
       COALESCE(att.occupied_count, 0) AS occupied_count,
       COALESCE(wl.waiting_count, 0) AS waiting_count,
       COALESCE(wl.offered_count, 0) AS offered_count
     FROM sessions s
     LEFT JOIN (
       SELECT session_id, COUNT(*) AS occupied_count
       FROM attendances
       WHERE status = ANY($1::varchar[])
       GROUP BY session_id
     ) att ON s.id = att.session_id
     LEFT JOIN (
       SELECT session_id, 
              COUNT(*) FILTER (WHERE status = 'WAITING') AS waiting_count,
              COUNT(*) FILTER (WHERE status = 'OFFERED') AS offered_count
       FROM session_waitlist
       WHERE status IN ('WAITING', 'OFFERED')
       GROUP BY session_id
     ) wl ON s.id = wl.session_id
     WHERE s.id = ANY($2::uuid[]);`,
    [SLOT_OCCUPYING_STATUSES, sessionIds]
  );

  const resultMap = new Map();
  for (const row of queryRes.rows) {
    const capacity = row.capacity || 40;
    const occupiedSlots = parseInt(row.occupied_count || 0, 10);
    const availableSlots = Math.max(0, capacity - occupiedSlots);
    resultMap.set(row.session_id, {
      capacity,
      occupiedSlots,
      availableSlots,
      waitlistCount: parseInt(row.waiting_count || 0, 10),
      offeredCount: parseInt(row.offered_count || 0, 10),
      isFull: availableSlots === 0
    });
  }
  return resultMap;
}

/**
 * Bổ sung số liệu slot vào mảng sessions (dùng cho /api/sessions, /api/profile/me, v.v.)
 */
async function enrichSessionsWithCapacity(sessionsList, client = db) {
  if (!sessionsList || sessionsList.length === 0) return sessionsList;
  const sessionIds = sessionsList.map(s => s.id);
  const capMap = await getSessionsCapacityMap(sessionIds, client);

  return sessionsList.map(s => {
    const capInfo = capMap.get(s.id) || {
      capacity: s.capacity || 40,
      occupiedSlots: 0,
      availableSlots: s.capacity || 40,
      waitlistCount: 0,
      offeredCount: 0,
      isFull: false
    };

    return {
      ...s,
      capacity: capInfo.capacity,
      active_reservations_count: capInfo.occupiedSlots,
      available_slots: capInfo.availableSlots,
      waitlist_count: capInfo.waitlistCount,
      is_full: capInfo.isFull
    };
  });
}

module.exports = {
  SLOT_OCCUPYING_STATUSES,
  NON_OCCUPYING_STATUSES,
  getSessionCapacity,
  getSessionsCapacityMap,
  enrichSessionsWithCapacity
};
