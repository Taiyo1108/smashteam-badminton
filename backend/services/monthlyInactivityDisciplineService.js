const db = require('../db');

/**
 * Tính toán dải ngày (bắt đầu - kết thúc) theo múi giờ Việt Nam (+07:00) cho tháng chỉ định
 * @param {string} monthYear - Định dạng 'YYYY-MM' (ví dụ: '2026-10')
 */
function getMonthDateRange(monthYear) {
  if (!monthYear || !/^\d{4}-\d{2}$/.test(monthYear)) {
    throw new Error('Định dạng tháng không hợp lệ. Yêu cầu định dạng YYYY-MM (ví dụ: 2026-10).');
  }

  const [yearStr, monthStr] = monthYear.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const pad = (n) => String(n).padStart(2, '0');

  const startIso = `${year}-${pad(month)}-01T00:00:00+07:00`;
  const lastDay = new Date(year, month, 0).getDate();
  const endIso = `${year}-${pad(month)}-${pad(lastDay)}T23:59:59+07:00`;
  const monthDisplay = `Tháng ${pad(month)}/${year}`;

  return { year, month, startIso, endIso, monthDisplay };
}

/**
 * Đánh giá chuyên cần của tất cả thành viên trong tháng chỉ định
 * Quy tắc:
 * - Thành viên chính thức (role = 'member', status = 'active') phải tham gia tối thiểu 2 buổi/tháng.
 * - Tham gia được tính khi có mặt tại buổi tập (status IN 'CHECKED_IN', 'CHECKED_OUT', 'MISSING_CHECKOUT', 'going').
 * - Vi phạm lần 1: Phạt 1 Thẻ vàng và trừ 30 điểm uy tín.
 * - Vi phạm lần 2 (hoặc các lần sau): Phạt 1 Thẻ vàng và trừ 40 điểm uy tín.
 * - Idempotent: Mỗi thành viên chỉ bị phạt tối đa 1 lần cho mỗi tháng.
 *
 * @param {object} options - { monthYear, dryRun, adminId, client }
 */
async function evaluateMonthlyInactivity({ monthYear, dryRun = false, adminId = null, client = db }) {
  const { startIso, endIso, monthDisplay } = getMonthDateRange(monthYear);

  // 1. Kiểm tra số buổi tập diễn ra trong tháng
  const sessionsRes = await client.query(`
    SELECT id, title, date_time
    FROM sessions
    WHERE date_time >= $1::timestamptz AND date_time <= $2::timestamptz
    ORDER BY date_time ASC;
  `, [startIso, endIso]);

  const totalSessionsInMonth = sessionsRes.rows.length;

  // 2. Lấy danh sách tất cả thành viên chính thức đang active
  const membersRes = await client.query(`
    SELECT id, full_name, nickname, phone_zalo, email, role, status, created_at, joined_at
    FROM users
    WHERE role = 'member' AND status = 'active'
    ORDER BY full_name ASC;
  `);

  const activeMembers = membersRes.rows;

  // 3. Lấy dữ liệu điểm danh thực tế trong tháng
  const attRes = await client.query(`
    SELECT a.user_id, COUNT(DISTINCT a.session_id) as attended_count
    FROM attendances a
    JOIN sessions s ON a.session_id = s.id
    WHERE s.date_time >= $1::timestamptz AND s.date_time <= $2::timestamptz
      AND a.status IN ('CHECKED_IN', 'CHECKED_OUT', 'MISSING_CHECKOUT', 'going')
    GROUP BY a.user_id;
  `, [startIso, endIso]);

  const attMap = new Map();
  attRes.rows.forEach(r => {
    attMap.set(r.user_id, parseInt(r.attended_count, 10));
  });

  // 4. Lấy các bản ghi kỷ luật tháng này đã tạo trước đó để đảm bảo idempotency
  const existingDiscRes = await client.query(`
    SELECT id, user_id, metadata
    FROM member_discipline_records
    WHERE metadata->>'reason_type' = 'MONTHLY_INACTIVITY'
      AND metadata->>'month_year' = $1;
  `, [monthYear]);

  const existingPenalizedSet = new Set(existingDiscRes.rows.map(r => r.user_id));

  // 5. Lấy lịch sử vi phạm các tháng trước để xác định vi phạm lần 1 hay lần 2+
  const allInactivityRes = await client.query(`
    SELECT user_id, COUNT(*) as count
    FROM member_discipline_records
    WHERE metadata->>'reason_type' = 'MONTHLY_INACTIVITY'
      AND status = 'ACTIVE'
      AND (metadata->>'month_year' != $1 OR metadata->>'month_year' IS NULL)
    GROUP BY user_id;
  `, [monthYear]);

  const prevViolationMap = new Map();
  allInactivityRes.rows.forEach(r => {
    prevViolationMap.set(r.user_id, parseInt(r.count, 10));
  });

  const compliantList = [];
  const penalizedList = [];
  let newlyPenalizedCount = 0;
  let alreadyPenalizedCount = 0;

  for (const member of activeMembers) {
    const attended = attMap.get(member.id) || 0;

    if (attended >= 2) {
      compliantList.push({
        id: member.id,
        name: member.full_name,
        phone: member.phone_zalo,
        attended,
        status: 'COMPLIANT'
      });
      continue;
    }

    // Không đủ 2 buổi -> Xử lý kỷ luật
    const isAlreadyPenalized = existingPenalizedSet.has(member.id);
    const prevCount = prevViolationMap.get(member.id) || 0;
    const violationNumber = prevCount + 1;

    // Lần 1: 1 Thẻ vàng, trừ 30 điểm uy tín. Lần 2 trở đi: Phạt trừ 40 điểm uy tín.
    const penaltyReputation = violationNumber === 1 ? -30 : -40;
    const cardType = 'YELLOW';
    const reason = violationNumber === 1
      ? `Không tham gia đủ tối thiểu 2 buổi sinh hoạt trong ${monthDisplay} (Vi phạm lần 1: Phạt 1 Thẻ vàng và trừ 30 điểm uy tín)`
      : `Không tham gia đủ tối thiểu 2 buổi sinh hoạt trong ${monthDisplay} (Tái phạm lần ${violationNumber}: Phạt 1 Thẻ vàng và trừ 40 điểm uy tín)`;

    const penaltyItem = {
      id: member.id,
      name: member.full_name,
      phone: member.phone_zalo,
      email: member.email,
      attended,
      required: 2,
      violationNumber,
      penaltyReputation,
      cardType,
      reason,
      isAlreadyPenalized
    };

    if (isAlreadyPenalized) {
      alreadyPenalizedCount++;
    } else {
      newlyPenalizedCount++;
      if (!dryRun) {
        const metadata = {
          reason_type: 'MONTHLY_INACTIVITY',
          month_year: monthYear,
          month_display: monthDisplay,
          sessions_attended: attended,
          required_sessions: 2,
          violation_number: violationNumber,
          penalty_reputation: penaltyReputation,
          warning_acknowledged: false,
          issued_by: adminId || null,
          issued_at: new Date().toISOString()
        };

        await client.query(`
          INSERT INTO member_discipline_records (
            user_id, type, reason, status, metadata
          ) VALUES (
            $1::uuid, $2, $3, 'ACTIVE', $4::jsonb
          );
        `, [member.id, cardType, reason, JSON.stringify(metadata)]);
      }
    }

    penalizedList.push(penaltyItem);
  }

  return {
    monthYear,
    monthDisplay,
    totalSessionsInMonth,
    totalMembers: activeMembers.length,
    compliantCount: compliantList.length,
    penalizedCount: penalizedList.length,
    newlyPenalizedCount,
    alreadyPenalizedCount,
    dryRun,
    penalizedList,
    compliantList
  };
}

/**
 * Lấy cảnh báo kỷ luật chuyên cần chưa xác nhận của thành viên khi đăng nhập
 * @param {string} userId - UUID của thành viên
 * @param {object} client - pg client
 */
async function getUnacknowledgedInactivityWarning(userId, client = db) {
  if (!userId) return null;

  const res = await client.query(`
    SELECT id, type, reason, issued_at, metadata
    FROM member_discipline_records
    WHERE user_id = $1::uuid
      AND status = 'ACTIVE'
      AND metadata->>'reason_type' = 'MONTHLY_INACTIVITY'
      AND (
        metadata->>'warning_acknowledged' IS NULL 
        OR metadata->>'warning_acknowledged' = 'false'
        OR (metadata->'warning_acknowledged')::boolean IS FALSE
      )
    ORDER BY issued_at DESC
    LIMIT 1;
  `, [userId]);

  if (res.rows.length === 0) return null;

  const row = res.rows[0];
  const meta = row.metadata || {};

  return {
    recordId: row.id,
    cardType: row.type || 'YELLOW',
    reason: row.reason,
    monthYear: meta.month_year || '',
    monthDisplay: meta.month_display || (meta.month_year ? `Tháng ${meta.month_year}` : 'Tháng gần nhất'),
    sessionsAttended: meta.sessions_attended ?? 0,
    requiredSessions: meta.required_sessions ?? 2,
    violationNumber: meta.violation_number ?? 1,
    penaltyReputation: meta.penalty_reputation ?? -30,
    issuedAt: row.issued_at
  };
}

/**
 * Đánh dấu thành viên đã đọc và xác nhận cảnh báo kỷ luật (chỉ hiện đúng 1 lần)
 * @param {string} userId
 * @param {string} recordId
 * @param {object} client
 */
async function acknowledgeInactivityWarning(userId, recordId, client = db) {
  if (!userId || !recordId) {
    throw new Error('Thiếu userId hoặc recordId.');
  }

  const res = await client.query(`
    UPDATE member_discipline_records
    SET metadata = jsonb_set(
      jsonb_set(
        COALESCE(metadata, '{}'::jsonb),
        '{warning_acknowledged}',
        'true'::jsonb
      ),
      '{acknowledged_at}',
      to_jsonb(NOW()::text)
    )
    WHERE id = $1::uuid 
      AND user_id = $2::uuid 
      AND metadata->>'reason_type' = 'MONTHLY_INACTIVITY'
    RETURNING id;
  `, [recordId, userId]);

  if (res.rows.length === 0) {
    throw new Error('Không tìm thấy bản ghi kỷ luật chuyên cần phù hợp.');
  }

  return { success: true, recordId };
}

/**
 * Tự động chạy kiểm tra tháng trước trong chu kỳ định kỳ của hệ thống
 */
async function checkAndRunMonthlyInactivityCron() {
  try {
    const now = new Date();
    // Lấy tháng trước
    const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const pad = n => String(n).padStart(2, '0');
    const prevMonthYear = `${prevDate.getFullYear()}-${pad(prevDate.getMonth() + 1)}`;

    // Kiểm tra xem tháng trước đã có bản ghi nào chưa
    const checkRes = await db.query(`
      SELECT id FROM member_discipline_records
      WHERE metadata->>'reason_type' = 'MONTHLY_INACTIVITY'
        AND metadata->>'month_year' = $1
      LIMIT 1;
    `, [prevMonthYear]);

    if (checkRes.rows.length === 0) {
      console.log(`[MonthlyInactivityCron] Đang tự động xử lý chuyên cần cho tháng trước (${prevMonthYear})...`);
      const report = await evaluateMonthlyInactivity({ monthYear: prevMonthYear, dryRun: false });
      console.log(`[MonthlyInactivityCron] Đã xử lý xong ${prevMonthYear}: Phạt mới ${report.newlyPenalizedCount} thành viên.`);
    }
  } catch (err) {
    console.error('[MonthlyInactivityCron Error]:', err);
  }
}

module.exports = {
  getMonthDateRange,
  evaluateMonthlyInactivity,
  getUnacknowledgedInactivityWarning,
  acknowledgeInactivityWarning,
  checkAndRunMonthlyInactivityCron
};
