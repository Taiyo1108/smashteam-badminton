const db = require('../db');

/**
 * Chuẩn hóa số điện thoại Việt Nam
 */
function normalizePhone(phone) {
  if (!phone) return null;
  let clean = String(phone).replace(/[\s\.\-\(\)]/g, '');
  if (clean.startsWith('+84')) {
    clean = '0' + clean.slice(3);
  } else if (clean.startsWith('84') && clean.length === 11) {
    clean = '0' + clean.slice(2);
  }
  return clean;
}

/**
 * Chuẩn hóa email
 */
function normalizeEmail(email) {
  if (!email) return null;
  return String(email).trim().toLowerCase();
}

/**
 * Kiểm tra xem Số điện thoại hoặc Email có nằm trong danh sách cấm vĩnh viễn (Blacklist) hay không
 * @param {object} params - { phone, email, client }
 * @returns {Promise<{ isBanned: boolean, reason?: string }>}
 */
async function checkBlacklist({ phone, email, client = db }) {
  const cleanPhone = normalizePhone(phone);
  const cleanEmail = normalizeEmail(email);

  if (!cleanPhone && !cleanEmail) {
    return { isBanned: false };
  }

  // 1. Kiểm tra trong bảng guest_blacklist
  const conditions = [];
  const params = [];
  let idx = 1;

  if (cleanPhone) {
    conditions.push(`phone = $${idx++}`);
    params.push(cleanPhone);
  }
  if (cleanEmail) {
    conditions.push(`LOWER(email) = $${idx++}`);
    params.push(cleanEmail);
  }

  const blacklistQuery = `
    SELECT id, reason, created_at 
    FROM guest_blacklist 
    WHERE ${conditions.join(' OR ')} 
    LIMIT 1;
  `;
  const blRes = await client.query(blacklistQuery, params);

  if (blRes.rows.length > 0) {
    return {
      isBanned: true,
      reason: blRes.rows[0].reason || 'Số điện thoại hoặc Email này đã bị cấm vĩnh viễn do vi phạm quy chế giữ chỗ của CLB.'
    };
  }

  // 2. Kiểm tra trong bảng users nếu có tài khoản guest bị khóa vĩnh viễn (is_blocked = true)
  const userConditions = [];
  const userParams = [];
  let uIdx = 1;

  if (cleanPhone) {
    userConditions.push(`phone_zalo = $${uIdx++}`);
    userParams.push(cleanPhone);
  }
  if (cleanEmail) {
    userConditions.push(`LOWER(email) = $${uIdx++}`);
    userParams.push(cleanEmail);
  }

  const userQuery = `
    SELECT id, is_blocked, status 
    FROM users 
    WHERE (${userConditions.join(' OR ')}) AND role = 'guest' AND is_blocked = TRUE
    LIMIT 1;
  `;
  const userRes = await client.query(userQuery, userParams);

  if (userRes.rows.length > 0) {
    return {
      isBanned: true,
      reason: 'Số điện thoại hoặc Email này đã bị khóa vĩnh viễn do vi phạm quy định giữ chỗ của CLB.'
    };
  }

  return { isBanned: false };
}

/**
 * Xử lý kỷ luật người chơi vãng lai khi vắng mặt không báo trước (No-show)
 * @param {object} params - { userId, sessionId, adminId, client }
 */
async function processGuestNoShowPenalty({ userId, sessionId, adminId = null, client = db }) {
  // 1. Kiểm tra user role có phải 'guest' không
  const userRes = await client.query(
    `SELECT id, full_name, phone_zalo, email, role, is_blocked, status FROM users WHERE id = $1::uuid`,
    [userId]
  );
  if (userRes.rows.length === 0) return null;
  const user = userRes.rows[0];
  if (user.role !== 'guest') return null; // Chỉ áp dụng luật kỷ luật này cho thành viên vãng lai

  // Lấy thông tin session
  const sessionRes = await client.query(
    `SELECT id, title, date_time FROM sessions WHERE id = $1::uuid`,
    [sessionId]
  );
  const sessionTitle = sessionRes.rows[0]?.title || 'Buổi tập CLB';

  // 2. Idempotency: Kiểm tra session này đã ghi nhận kỷ luật no-show chưa
  const existingForSession = await client.query(
    `SELECT id FROM member_discipline_records 
     WHERE user_id = $1::uuid AND session_id = $2::uuid AND metadata->>'reason_type' = 'GUEST_NO_SHOW'`,
    [userId, sessionId]
  );
  if (existingForSession.rows.length > 0) {
    return null; // Đã xử lý kỷ luật cho session này rồi
  }

  // 3. Kiểm tra xem hiện tại user có đang giữ Thẻ vàng ACTIVE do no-show hay không
  const activeYellowRes = await client.query(
    `SELECT * FROM member_discipline_records 
     WHERE user_id = $1::uuid AND type = 'YELLOW' AND status = 'ACTIVE' AND metadata->>'reason_type' = 'GUEST_NO_SHOW'
     ORDER BY issued_at DESC LIMIT 1`,
    [userId]
  );

  if (activeYellowRes.rows.length === 0) {
    // ===== VI PHẠM LẦN 1 =====
    // Phạt 1 Thẻ vàng, trừ 50 điểm uy tín, yêu cầu 5 buổi tập hợp lệ để xóa
    const yellowRecord = await client.query(
      `INSERT INTO member_discipline_records (
        user_id, type, reason, session_id, issued_by, status, metadata
      ) VALUES (
        $1::uuid, 'YELLOW', $2, $3::uuid, $4::uuid, 'ACTIVE', $5::jsonb
      ) RETURNING *`,
      [
        userId,
        `Vi phạm lần 1: Đăng ký giữ chỗ buổi tập "${sessionTitle}" nhưng không tham gia (No-show). Bị phạt 1 Thẻ vàng và trừ 50 điểm uy tín. Thẻ sẽ được gỡ sau khi tham gia đầy đủ 5 buổi tập tiếp theo.`,
        sessionId,
        adminId || null,
        JSON.stringify({
          reason_type: 'GUEST_NO_SHOW',
          violation_count: 1,
          penalty_reputation: -50,
          clean_sessions_required: 5
        })
      ]
    );

    return {
      violationCount: 1,
      type: 'YELLOW',
      record: yellowRecord.rows[0],
      user
    };
  } else {
    // ===== VI PHẠM LẦN 2 (TÁI PHẠM) =====
    // Phạt Thẻ đỏ, trừ toàn bộ điểm uy tín (về 0), khóa tài khoản vĩnh viễn, đưa SĐT & Email vào blacklist!
    const redRecord = await client.query(
      `INSERT INTO member_discipline_records (
        user_id, type, reason, session_id, issued_by, status, metadata
      ) VALUES (
        $1::uuid, 'RED', $2, $3::uuid, $4::uuid, 'ACTIVE', $5::jsonb
      ) RETURNING *`,
      [
        userId,
        `Vi phạm lần 2: Tái phạm đăng ký giữ chỗ buổi tập "${sessionTitle}" nhưng không tham gia (No-show tái phạm). Phạt Thẻ đỏ, trừ toàn bộ điểm uy tín, khóa tài khoản vĩnh viễn và cấm số điện thoại/email đăng ký lại trên toàn hệ thống.`,
        sessionId,
        adminId || null,
        JSON.stringify({
          reason_type: 'GUEST_NO_SHOW',
          violation_count: 2,
          penalty_reputation: 'RESET_ZERO',
          permanent_ban: true
        })
      ]
    );

    // Cập nhật users table: Khóa tài khoản vĩnh viễn (is_blocked = true, status = 'inactive')
    await client.query(
      `UPDATE users 
       SET is_blocked = TRUE, status = 'inactive' 
       WHERE id = $1::uuid`,
      [userId]
    );

    // Đưa SĐT và Email vào danh sách đen vĩnh viễn (guest_blacklist)
    const phone = normalizePhone(user.phone_zalo);
    const email = normalizeEmail(user.email);

    if (phone || email) {
      await client.query(
        `INSERT INTO guest_blacklist (user_id, phone, email, reason)
         VALUES ($1::uuid, $2, $3, $4)`,
        [
          userId,
          phone,
          email,
          `Khóa tài khoản vĩnh viễn do tái phạm đăng ký giữ chỗ 2 lần nhưng không đến sân.`
        ]
      );
    }

    return {
      violationCount: 2,
      type: 'RED',
      record: redRecord.rows[0],
      user
    };
  }
}

/**
 * Kiểm tra và gỡ thẻ phạt cho người chơi vãng lai nếu đã tham gia đủ 5 buổi tập tiếp theo
 * @param {string} userId
 * @param {object} client - pg client
 */
async function checkAndRevokeGuestPenalty(userId, client = db) {
  // 1. Kiểm tra xem user có phải 'guest' không
  const userRes = await client.query(
    `SELECT id, role, is_blocked FROM users WHERE id = $1::uuid`,
    [userId]
  );
  if (userRes.rows.length === 0 || userRes.rows[0].role !== 'guest') return null;

  // 2. Tìm thẻ vàng ACTIVE do GUEST_NO_SHOW
  const yellowRes = await client.query(
    `SELECT id, issued_at, metadata 
     FROM member_discipline_records
     WHERE user_id = $1::uuid AND type = 'YELLOW' AND status = 'ACTIVE' AND metadata->>'reason_type' = 'GUEST_NO_SHOW'
     ORDER BY issued_at ASC
     LIMIT 1`,
    [userId]
  );

  if (yellowRes.rows.length === 0) return null;
  const yellowRecord = yellowRes.rows[0];
  const issuedAt = yellowRecord.issued_at;

  // 3. Đếm số buổi tập hợp lệ (CHECKED_IN hoặc CHECKED_OUT) sau thời điểm bị phạt thẻ vàng
  const countRes = await client.query(
    `SELECT COUNT(DISTINCT a.session_id) as attended_count
     FROM attendances a
     JOIN sessions s ON a.session_id = s.id
     WHERE a.user_id = $1::uuid
       AND a.status IN ('CHECKED_IN', 'CHECKED_OUT')
       AND (a.checked_in_at > $2::timestamptz OR s.date_time > $2::timestamptz)`,
    [userId, issuedAt]
  );

  const cleanSessions = parseInt(countRes.rows[0]?.attended_count || 0, 10);
  const required = 5;

  if (cleanSessions >= required) {
    // Đã hoàn thành đủ 5 buổi tập -> GỠ THẺ PHẠT!
    const revokeRes = await client.query(
      `UPDATE member_discipline_records 
       SET status = 'REVOKED',
           revoked_reason = 'Hoàn thành xuất sắc 5 buổi tập thành công theo quy chế gỡ phạt thẻ vàng của CLB.',
           revoked_at = NOW()
       WHERE id = $1::uuid
       RETURNING *`,
      [yellowRecord.id]
    );

    return {
      revoked: true,
      cleanSessions,
      required,
      record: revokeRes.rows[0]
    };
  }

  return {
    revoked: false,
    cleanSessions,
    required,
    remaining: required - cleanSessions
  };
}

/**
 * Lấy chi tiết thông tin kỷ luật và tiến trình gỡ thẻ phạt của khách vãng lai
 * @param {string} userId
 * @param {object} client
 */
async function getGuestPenaltyStatus(userId, client = db) {
  const userRes = await client.query(
    `SELECT id, role, is_blocked, status, phone_zalo, email FROM users WHERE id = $1::uuid`,
    [userId]
  );
  if (userRes.rows.length === 0 || userRes.rows[0].role !== 'guest') {
    return { isGuest: false };
  }

  const user = userRes.rows[0];

  // Kiểm tra trước việc tự động gỡ thẻ nếu đã đạt 5 buổi
  await checkAndRevokeGuestPenalty(userId, client);

  // Lấy các kỷ luật liên quan
  const discRes = await client.query(
    `SELECT id, type, reason, status, issued_at, revoked_at, metadata
     FROM member_discipline_records
     WHERE user_id = $1::uuid AND metadata->>'reason_type' = 'GUEST_NO_SHOW'
     ORDER BY issued_at DESC`,
    [userId]
  );

  const activeRed = discRes.rows.find(d => d.type === 'RED' && d.status === 'ACTIVE');
  const activeYellow = discRes.rows.find(d => d.type === 'YELLOW' && d.status === 'ACTIVE');

  let cleanSessions = 0;
  if (activeYellow) {
    const countRes = await client.query(
      `SELECT COUNT(DISTINCT a.session_id) as attended_count
       FROM attendances a
       JOIN sessions s ON a.session_id = s.id
       WHERE a.user_id = $1::uuid
         AND a.status IN ('CHECKED_IN', 'CHECKED_OUT')
         AND (a.checked_in_at > $2::timestamptz OR s.date_time > $2::timestamptz)`,
      [userId, activeYellow.issued_at]
    );
    cleanSessions = parseInt(countRes.rows[0]?.attended_count || 0, 10);
  }

  return {
    isGuest: true,
    isBlocked: Boolean(user.is_blocked),
    hasRedCard: Boolean(activeRed),
    hasYellowCard: Boolean(activeYellow),
    cleanSessions,
    cleanSessionsRequired: 5,
    activeYellow,
    activeRed,
    history: discRes.rows
  };
}

module.exports = {
  normalizePhone,
  normalizeEmail,
  checkBlacklist,
  processGuestNoShowPenalty,
  checkAndRevokeGuestPenalty,
  getGuestPenaltyStatus
};
