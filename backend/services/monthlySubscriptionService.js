const db = require('../db');
const xlsx = require('xlsx');
const { normalizeVietnamPhone } = require('../utils/phoneNormalizer');
const { CLUB_SLOTS } = require('../config/clubSlots');
const { 
  validateSlotCode, 
  getSlotLabel, 
  getSessionSlotCode, 
  normalizeLegacyScheduleInput 
} = require('../utils/slotHelper');
const { getWeekdayFromDate, formatWeekdayVi } = require('../utils/weekdayHelper');
const { getSessionCapacity } = require('./sessionCapacityService');

/**
 * Phân tích buffer file Excel (hoặc CSV) trả về danh sách đối tượng dòng chuẩn
 */
function parseExcelBuffer(buffer) {
  const workbook = xlsx.read(buffer, { type: 'buffer' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const rawRows = xlsx.utils.sheet_to_json(worksheet, { defval: '' });

  return rawRows.map((row, index) => {
    // Tìm các trường dựa trên tên cột linh hoạt từ Google Form
    const keys = Object.keys(row);
    
    const findValue = (keywords) => {
      const matchKey = keys.find(k => {
        const lower = k.toLowerCase();
        return keywords.some(kw => lower.includes(kw));
      });
      return matchKey ? String(row[matchKey]).trim() : '';
    };

    const timestamp = findValue(['thời gian', 'timestamp', 'date']);
    const fullName = findValue(['họ và tên', 'họ tên', 'tên', 'name', 'thành viên']);
    const phone = findValue(['số điện thoại', 'điện thoại', 'phone', 'sđt', 'zalo']);
    const daysRaw = findValue(['khung giờ', 'slot', 'ngày', 'thứ', 'lịch', 'days', 'đăng ký']);
    const receiptUrl = findValue(['biên lai', 'minh chứng', 'chuyển khoản', 'receipt', 'ảnh']);
    const note = findValue(['thắc mắc', 'ghi chú', 'hỏi', 'note']);

    return {
      rowIndex: index + 2, // Dòng 1 là Header, nên dòng data đầu tiên là 2
      timestamp,
      fullName,
      phone,
      daysRaw,
      receiptUrl,
      note
    };
  });
}

/**
 * Tự động gộp ca thông minh khi 1 thành viên nộp form nhiều lần:
 * - Giữ lại các ca ở các thứ khác (ví dụ Thứ 4, Thứ 7)
 * - Nếu lần nộp sau có ca cùng thứ (ví dụ THU_17_19 thay vì THU_18_20), cập nhật sang ca mới
 */
function smartMergeSlots(earlierSlots, laterSlots) {
  const laterWeekdays = new Set(laterSlots.map(s => CLUB_SLOTS[s]?.weekdayToken).filter(Boolean));
  const preservedEarlier = earlierSlots.filter(s => {
    const wd = CLUB_SLOTS[s]?.weekdayToken;
    return !laterWeekdays.has(wd);
  });
  return Array.from(new Set([...preservedEarlier, ...laterSlots]));
}

/**
 * Xác thực và phân loại dữ liệu đăng ký theo tháng
 * Hỗ trợ nhận diện chính xác từng SLOT (Ví dụ THU_17_19 vs THU_18_20)
 * Xử lý thông minh khi thành viên nộp form nhiều lần (đổi ca / bổ sung ca)
 */
async function previewSubscriptions(rows, monthYear, client = db) {
  if (!monthYear || !/^\d{4}-\d{2}$/.test(monthYear)) {
    throw new Error('monthYear không hợp lệ. Định dạng yêu cầu: YYYY-MM (ví dụ 2026-10).');
  }

  // 1. Lấy danh sách thành viên hợp lệ trong hệ thống (chỉ lấy member/admin, loại bỏ candidate để tránh đăng ký nhầm ứng viên thành hội viên cố định)
  const usersRes = await client.query(`
    SELECT id, full_name, nickname, phone_zalo, role, badminton_level, status, is_blocked, deleted_at
    FROM users
    WHERE deleted_at IS NULL AND (role IS NULL OR role != 'candidate');
  `);

  // Map số điện thoại chuẩn hóa -> User
  const phoneToUserMap = new Map();
  const nameToUsersMap = new Map();

  for (const u of usersRes.rows) {
    const p1 = normalizeVietnamPhone(u.phone_zalo);
    if (p1) phoneToUserMap.set(p1, u);

    // Map tên không dấu để hỗ trợ gợi ý nếu SĐT không khớp
    const cleanName = (u.full_name || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'd')
      .trim();
    if (cleanName) {
      if (!nameToUsersMap.has(cleanName)) {
        nameToUsersMap.set(cleanName, []);
      }
      nameToUsersMap.get(cleanName).push(u);
    }
  }

  // 2. Lấy các subscription đã có trong tháng này để check trùng
  const existingSubsRes = await client.query(`
    SELECT user_id, registered_slots, registered_days, payment_status
    FROM monthly_subscriptions
    WHERE month_year = $1;
  `, [monthYear]);

  const existingSubMap = new Map();
  for (const s of existingSubsRes.rows) {
    existingSubMap.set(s.user_id, s);
  }

  // 3. Phân nhóm các dòng theo SĐT chuẩn hóa để phát hiện nộp form nhiều lần (Duplicate submissions)
  const phoneGroups = new Map();
  for (const row of rows) {
    const normPhone = normalizeVietnamPhone(row.phone);
    if (normPhone) {
      if (!phoneGroups.has(normPhone)) phoneGroups.set(normPhone, []);
      phoneGroups.get(normPhone).push(row);
    }
  }

  // 4. Xử lý từng dòng dữ liệu
  const processedRows = [];
  
  // Khởi tạo bộ đếm phân bổ theo từng SLOT CODE cụ thể
  const slotDistribution = Object.keys(CLUB_SLOTS).reduce((acc, code) => {
    acc[code] = 0;
    return acc;
  }, {});

  let validCount = 0;
  let warningCount = 0;
  let errorCount = 0;
  let duplicateCount = 0;

  for (const row of rows) {
    const rawPhone = row.phone;
    const normalizedPhone = normalizeVietnamPhone(rawPhone);

    // Sử dụng centralized normalizeLegacyScheduleInput
    const slotParse = normalizeLegacyScheduleInput(row.daysRaw);
    let registeredSlots = [...slotParse.slots];

    let status = 'VALID'; // 'VALID' (Green), 'WARNING' (Yellow), 'ERROR' (Red)
    const issues = [];
    let matchedUser = null;

    // Check SĐT hợp lệ
    if (!normalizedPhone) {
      status = 'ERROR';
      issues.push(`Số điện thoại không hợp lệ (${rawPhone || 'Trống'})`);
    } else {
      matchedUser = phoneToUserMap.get(normalizedPhone);
      if (!matchedUser) {
        // Thử tìm theo tên gợi ý trong danh sách hội viên chính thức
        const cleanName = (row.fullName || '')
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/đ/g, 'd')
          .replace(/Đ/g, 'd')
          .trim();
        const matchedByName = nameToUsersMap.get(cleanName);
        if (matchedByName && matchedByName.length === 1) {
          // Khớp duy nhất 1 thành viên chính thức theo họ tên -> Tự động gắn và cảnh báo SĐT lệch
          matchedUser = matchedByName[0];
          status = 'WARNING';
          issues.push(`⚠️ Khớp theo họ tên "${matchedUser.full_name}" (SĐT trong form: ${rawPhone || 'trống'} khác SĐT tài khoản: ${matchedUser.phone_zalo || 'trống'}). Hệ thống đã tự động gán vào hội viên này.`);
        } else if (matchedByName && matchedByName.length > 1) {
          issues.push(`Chưa khớp SĐT. Tìm thấy ${matchedByName.length} thành viên cùng tên: ${matchedByName.map(c => c.full_name + ' (' + (c.phone_zalo || 'Không SĐT') + ')').join(', ')}. Vui lòng kiểm tra lại.`);
          status = 'ERROR';
        } else {
          issues.push(`Không tìm thấy tài khoản thành viên nào với SĐT ${normalizedPhone || rawPhone || 'trống'} hoặc tên "${row.fullName}"`);
          status = 'ERROR';
        }
      }
    }

    // Xử lý nộp form nhiều lần (Duplicate submissions)
    const group = normalizedPhone ? phoneGroups.get(normalizedPhone) : null;
    const isDuplicate = Boolean(group && group.length > 1);
    let isSuperseded = false;
    let isMergedDuplicate = false;
    let mergedFromRows = [];
    let selectedForImport = true;

    if (isDuplicate) {
      const isLatest = (row === group[group.length - 1]);
      if (!isLatest) {
        // Dòng nộp trước: đánh dấu superseded, mặc định không chọn import để tránh ghi đè
        isSuperseded = true;
        selectedForImport = false;
        if (status !== 'ERROR') status = 'WARNING';
        issues.push(`Đã có bản nộp sau (Dòng ${group[group.length - 1].rowIndex}). Tự động bỏ chọn dòng này để tránh ghi đè dữ liệu.`);
      } else {
        // Dòng nộp sau cùng: tự động gộp ca từ các lần nộp trước
        isMergedDuplicate = true;
        duplicateCount++;
        mergedFromRows = group.slice(0, -1).map(g => g.rowIndex);
        
        let cumSlots = normalizeLegacyScheduleInput(group[0].daysRaw).slots;
        for (let i = 1; i < group.length; i++) {
          const nextSlots = normalizeLegacyScheduleInput(group[i].daysRaw).slots;
          cumSlots = smartMergeSlots(cumSlots, nextSlots);
        }
        
        // Cập nhật registeredSlots thành mảng đã gộp
        registeredSlots = cumSlots;
        issues.push(`⚡ Đã tự động kết hợp ca từ các lần nộp trước (Dòng ${mergedFromRows.join(', ')}): giữ các thứ khác và cập nhật ca mới.`);
      }
    }

    // Check AMBIGUOUS / Lỗi nhận diện slot
    if (slotParse.isAmbiguous && !isMergedDuplicate) {
      if (status !== 'ERROR') status = 'WARNING';
      issues.push(`⚠️ ${slotParse.error}`);
    } else if (registeredSlots.length === 0) {
      status = 'ERROR';
      issues.push(slotParse.error || `Không nhận diện được khung giờ hợp lệ từ: "${row.daysRaw}"`);
    }

    // Check user trạng thái (nếu tìm thấy user)
    if (matchedUser) {
      if (matchedUser.is_blocked) {
        status = 'ERROR';
        issues.push(`Tài khoản "${matchedUser.full_name}" đang bị KHÓA`);
      } else if (matchedUser.status === 'inactive' || matchedUser.status === 'left') {
        status = 'ERROR';
        issues.push(`Tài khoản đang ở trạng thái "${matchedUser.status}"`);
      }

      // Check đã đăng ký tháng này chưa
      if (existingSubMap.has(matchedUser.id)) {
        if (status !== 'ERROR') status = 'WARNING';
        issues.push(`Thành viên này đã có đăng ký tháng ${monthYear} trên hệ thống (Sẽ được cập nhật mới)`);
      }
    }

    // Thống kê phân bổ khung giờ (chỉ tính nếu hợp lệ/cảnh báo và được chọn import)
    if (status === 'ERROR') {
      selectedForImport = false;
      errorCount++;
    } else {
      if (selectedForImport) {
        for (const code of registeredSlots) {
          if (slotDistribution[code] !== undefined) {
            slotDistribution[code]++;
          }
        }
        if (status === 'VALID') validCount++;
        else warningCount++;
      } else {
        warningCount++;
      }
    }

    // Trích xuất các weekday tương ứng để tương thích ngược
    const legacyDays = Array.from(new Set(
      registeredSlots.map(code => CLUB_SLOTS[code]?.weekdayToken).filter(Boolean)
    ));

    processedRows.push({
      rowIndex: row.rowIndex,
      fullName: row.fullName,
      rawPhone,
      normalizedPhone,
      daysRaw: row.daysRaw,
      registeredSlots: [...registeredSlots],
      registeredSlotsLabels: registeredSlots.map(getSlotLabel),
      registeredDays: legacyDays,
      registeredDaysVi: legacyDays.map(formatWeekdayVi),
      isAmbiguous: slotParse.isAmbiguous && !isMergedDuplicate,
      ambiguousDays: slotParse.ambiguousDays,
      isDuplicate,
      isSuperseded,
      isMergedDuplicate,
      mergedFromRows,
      selectedForImport,
      receiptUrl: row.receiptUrl,
      note: row.note,
      matchedUser: matchedUser ? {
        id: matchedUser.id,
        fullName: matchedUser.full_name,
        nickname: matchedUser.nickname,
        role: matchedUser.role,
        badmintonLevel: matchedUser.badminton_level,
        phoneZalo: matchedUser.phone_zalo
      } : null,
      status,
      issues
    });
  }

  // Tạo map nhãn hiển thị cho slotDistribution
  const slotDistributionLabels = Object.entries(slotDistribution).reduce((acc, [code, count]) => {
    acc[getSlotLabel(code)] = count;
    return acc;
  }, {});

  return {
    monthYear,
    totalRows: rows.length,
    validCount,
    warningCount,
    errorCount,
    duplicateCount,
    slotDistribution,
    slotDistributionLabels,
    clubSlots: CLUB_SLOTS,
    rows: processedRows
  };
}

/**
 * Lưu đăng ký tháng vào database và tự động đồng bộ vào các buổi tập trong tháng
 * Lưu đồng thời registered_slots (Source of Truth) và registered_days (Backward compatibility)
 * Đảm bảo gộp ca thông minh nếu cùng userId xuất hiện nhiều lần trong payload
 */
async function commitSubscriptions({ monthYear, subscriptions, syncSessions = true, adminUserId }) {
  if (!monthYear || !Array.isArray(subscriptions) || subscriptions.length === 0) {
    throw new Error('Thiếu thông tin monthYear hoặc danh sách đăng ký rỗng.');
  }

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    // Nhóm theo userId để gộp an toàn nếu có duplicate trong payload
    const subsByUserId = new Map();

    for (const sub of subscriptions) {
      if (!sub.userId) continue;

      const slots = Array.isArray(sub.registeredSlots) ? sub.registeredSlots.filter(validateSlotCode) : [];
      
      // Nếu không có slots nhưng có registeredDays (legacy payload):
      let finalSlots = [...slots];
      if (finalSlots.length === 0 && Array.isArray(sub.registeredDays)) {
        for (const d of sub.registeredDays) {
          if (d === 'WEDNESDAY') finalSlots.push('WED_18_20');
          else if (d === 'THURSDAY') finalSlots.push('THU_18_20');
          else if (d === 'SATURDAY') finalSlots.push('SAT_18_20');
        }
      }

      if (finalSlots.length === 0) {
        continue;
      }

      if (subsByUserId.has(sub.userId)) {
        const existing = subsByUserId.get(sub.userId);
        existing.finalSlots = Array.from(new Set([...existing.finalSlots, ...finalSlots]));
        if (sub.paymentStatus) existing.paymentStatus = sub.paymentStatus;
        if (sub.receiptUrl) existing.receiptUrl = sub.receiptUrl;
        if (sub.note) existing.note = (existing.note ? existing.note + ' | ' : '') + sub.note;
      } else {
        subsByUserId.set(sub.userId, {
          userId: sub.userId,
          finalSlots,
          paymentStatus: sub.paymentStatus || 'PAID',
          receiptUrl: sub.receiptUrl || null,
          note: sub.note || null
        });
      }
    }

    const committedUsers = [];

    for (const [userId, sub] of subsByUserId.entries()) {
      // Suy ra registered_days từ slots để bảo toàn tương thích ngược
      const legacyDays = Array.from(new Set(
        sub.finalSlots.map(code => CLUB_SLOTS[code]?.weekdayToken).filter(Boolean)
      ));

      const res = await client.query(`
        INSERT INTO monthly_subscriptions (
          user_id, month_year, registered_slots, registered_days, payment_status, receipt_url, note, created_by, updated_at
        ) VALUES (
          $1::uuid, $2, $3::text[], $4::text[], $5, $6, $7, $8::uuid, CURRENT_TIMESTAMP
        )
        ON CONFLICT (user_id, month_year)
        DO UPDATE SET
          registered_slots = EXCLUDED.registered_slots,
          registered_days = EXCLUDED.registered_days,
          payment_status = EXCLUDED.payment_status,
          receipt_url = COALESCE(EXCLUDED.receipt_url, monthly_subscriptions.receipt_url),
          note = COALESCE(EXCLUDED.note, monthly_subscriptions.note),
          updated_at = CURRENT_TIMESTAMP
        RETURNING *;
      `, [
        sub.userId,
        monthYear,
        sub.finalSlots,
        legacyDays,
        sub.paymentStatus,
        sub.receiptUrl,
        sub.note,
        adminUserId || null
      ]);

      committedUsers.push(res.rows[0]);
    }

    // Đồng bộ vào các buổi tập trong tháng nếu được yêu cầu
    let syncStats = null;
    if (syncSessions) {
      syncStats = await syncMonthSessions(monthYear, client, adminUserId);
    }

    // Ghi audit log
    await client.query(`
      INSERT INTO admin_logs (admin_id, action_type, details)
      VALUES ($1::uuid, 'IMPORT_MONTHLY_SUBSCRIPTIONS', $2::jsonb);
    `, [
      adminUserId || null,
      JSON.stringify({
        monthYear,
        totalCommitted: committedUsers.length,
        syncStats
      })
    ]);

    await client.query('COMMIT');

    return {
      success: true,
      monthYear,
      committedCount: committedUsers.length,
      syncStats
    };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error committing monthly subscriptions:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Đồng bộ tất cả monthly subscriptions vào các buổi tập của tháng
 * ĐỐI SOÁT CHÍNH XÁC THEO SLOT CODE: getSessionSlotCode(sess) === registeredSlot
 * TUÂN THỦ NGUYÊN TẮC:
 * 1. Phân biệt chính xác giữa các ca cùng thứ (Ví dụ THU_17_19 vs THU_18_20).
 * 2. BẢO TOÀN TRẠNG THÁI HỦY (Override Protection): Nếu user đã CANCELLED hoặc NO_SHOW, TUYỆT ĐỐI KHÔNG ghi đè/hồi sinh slot.
 * 3. Idempotent: chạy nhiều lần không tạo bản ghi trùng lặp.
 */
async function syncMonthSessions(monthYear, client = db, adminUserId = null) {
  // Xác định khoảng thời gian đầu tháng và cuối tháng theo múi giờ VN
  const [yearStr, monthStr] = monthYear.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10); // 1-12

  const pad = n => String(n).padStart(2, '0');
  const startIso = `${year}-${pad(month)}-01T00:00:00+07:00`;
  const lastDay = new Date(year, month, 0).getDate();
  const endIso = `${year}-${pad(month)}-${pad(lastDay)}T23:59:59+07:00`;

  // 1. Lấy tất cả sessions trong tháng
  const sessionsRes = await client.query(`
    SELECT id, title, date_time, session_start, session_end, slot_code, capacity, is_closed
    FROM sessions
    WHERE date_time >= $1::timestamptz 
      AND date_time <= $2::timestamptz
      AND is_closed = false
    ORDER BY date_time ASC;
  `, [startIso, endIso]);

  const sessions = sessionsRes.rows;

  // 2. Lấy tất cả monthly subscriptions hoạt động của tháng
  const subsRes = await client.query(`
    SELECT ms.user_id, ms.registered_slots, ms.registered_days, ms.payment_status, u.full_name, u.status, u.is_blocked
    FROM monthly_subscriptions ms
    JOIN users u ON ms.user_id = u.id
    WHERE ms.month_year = $1
      AND (u.role IS NULL OR u.role != 'candidate')
      AND (u.status IS NULL OR u.status = 'active')
      AND (u.is_blocked IS NULL OR u.is_blocked = false)
      AND u.deleted_at IS NULL;
  `, [monthYear]);

  const subscriptions = subsRes.rows;

  let totalEnrolled = 0;
  let totalProtectedCancellations = 0;
  let totalAlreadyEnrolled = 0;
  const sessionsDetail = [];

  for (const sess of sessions) {
    // Lấy slot code chính xác của session
    const sessionSlotCode = getSessionSlotCode(sess);

    // Cập nhật slot_code cho session nếu chưa có
    if (!sess.slot_code && sessionSlotCode) {
      await client.query(`UPDATE sessions SET slot_code = $1 WHERE id = $2::uuid`, [sessionSlotCode, sess.id]);
      sess.slot_code = sessionSlotCode;
    }

    // Lọc các user có đăng ký ĐÚNG SLOT CODE NÀY
    const matchingUsers = subscriptions.filter(sub => {
      const slots = Array.isArray(sub.registered_slots) && sub.registered_slots.length > 0
        ? sub.registered_slots
        : [];

      if (slots.length > 0) {
        return slots.includes(sessionSlotCode);
      }

      // Tương thích ngược: Nếu subscription cũ chưa có registered_slots mà chỉ có registered_days
      const days = Array.isArray(sub.registered_days) ? sub.registered_days : [];
      const sessDate = sess.session_start ? new Date(sess.session_start) : new Date(sess.date_time);
      const weekdayToken = getWeekdayFromDate(sessDate);
      if (!days.includes(weekdayToken)) return false;

      // Nếu là Thứ 5, do legacy không rõ giờ nên chỉ map vào ca 18-20h mặc định
      if (weekdayToken === 'THURSDAY') {
        return sessionSlotCode === 'THU_18_20';
      }
      return true;
    });

    let sessionEnrolledCount = 0;
    let sessionProtectedCount = 0;

    for (const sub of matchingUsers) {
      // Kiểm tra xem user đã có record attendance trong session này chưa
      const attRes = await client.query(`
        SELECT id, status, registration_type, cancelled_at
        FROM attendances
        WHERE session_id = $1::uuid AND user_id = $2::uuid;
      `, [sess.id, sub.user_id]);

      if (attRes.rows.length > 0) {
        const currentAtt = attRes.rows[0];
        
        // NGUYÊN TẮC OVERRIDE BẢO TOÀN TRẠNG THÁI HỦY:
        // Nếu user hoặc admin đã hủy buổi này, KHÔNG được tự ý resurrect về CONFIRMED!
        if (['CANCELLED', 'NO_SHOW'].includes(currentAtt.status) || currentAtt.cancelled_at) {
          totalProtectedCancellations++;
          sessionProtectedCount++;
          continue;
        }

        // BẢO VỆ LƯỢT ĐẶT/VOTE TỰ DO CỦA THÀNH VIÊN:
        // Nếu thành viên đã có mặt hoặc đã tự vote từ trước (STANDARD / bất kỳ loại nào),
        // TUYỆT ĐỐI GIỮ NGUYÊN trạng thái của họ, KHÔNG ghi đè thành MONTHLY_FIXED.
        // Điều này đảm bảo khi admin reset/xóa danh sách cố định tháng, lượt vote tự do ban đầu
        // của thành viên sẽ không bao giờ bị xóa nhầm!
        totalAlreadyEnrolled++;
      } else {
        // Chưa có attendance -> Insert mới với status = CONFIRMED, registration_type = MONTHLY_FIXED
        await client.query(`
          INSERT INTO attendances (
            session_id, user_id, status, registration_type, confirmed_at, reserved_at, created_at, updated_at
          ) VALUES (
            $1::uuid, $2::uuid, 'CONFIRMED', 'MONTHLY_FIXED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
          );
        `, [sess.id, sub.user_id]);

        // Tự động loại khỏi hàng chờ (đánh dấu CLAIMED) nếu user đang trong Waitlist
        await client.query(`
          UPDATE session_waitlist
          SET status = 'CLAIMED', confirmed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
          WHERE session_id = $1::uuid AND user_id = $2::uuid AND status IN ('WAITING', 'OFFERED');
        `, [sess.id, sub.user_id]);

        sessionEnrolledCount++;
        totalEnrolled++;
      }
    }

    const sessDate = sess.session_start ? new Date(sess.session_start) : new Date(sess.date_time);
    sessionsDetail.push({
      sessionId: sess.id,
      title: sess.title,
      date: sessDate,
      slotCode: sessionSlotCode,
      slotLabel: getSlotLabel(sessionSlotCode),
      enrolledCount: sessionEnrolledCount,
      protectedCancellationCount: sessionProtectedCount
    });
  }

  return {
    monthYear,
    totalSessionsProcessed: sessions.length,
    totalEnrolled,
    totalProtectedCancellations,
    totalAlreadyEnrolled,
    sessionsDetail
  };
}

/**
 * Tự động đăng ký cho các thuê bao tháng khi tạo mới một session
 * Khớp chính xác theo SLOT CODE (weekday + start_time + end_time)
 */
async function autoEnrollSubscribersForSession(sessionId, client = db) {
  const sessRes = await client.query(`
    SELECT id, title, date_time, session_start, session_end, slot_code, capacity, is_closed
    FROM sessions
    WHERE id = $1::uuid;
  `, [sessionId]);

  if (sessRes.rows.length === 0) return { enrolledCount: 0 };
  const sess = sessRes.rows[0];
  if (sess.is_closed) return { enrolledCount: 0 };

  const sessDate = sess.session_start ? new Date(sess.session_start) : new Date(sess.date_time);
  const sessionSlotCode = getSessionSlotCode(sess);

  // Cập nhật slot_code vào DB nếu chưa có
  if (!sess.slot_code && sessionSlotCode) {
    await client.query(`UPDATE sessions SET slot_code = $1 WHERE id = $2::uuid`, [sessionSlotCode, sess.id]);
  }

  // Lấy month_year từ ngày session theo giờ VN
  const vnYear = sessDate.toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric' });
  const vnMonth = sessDate.toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', month: '2-digit' });
  const monthYear = `${vnYear}-${vnMonth}`;
  const weekdayToken = getWeekdayFromDate(sessDate);

  // Tìm các monthly subscriptions khớp chính xác slot_code (kèm fallback backward compatibility)
  const subsRes = await client.query(`
    SELECT ms.user_id, u.full_name
    FROM monthly_subscriptions ms
    JOIN users u ON ms.user_id = u.id
    WHERE ms.month_year = $1
      AND (
        $2 = ANY(ms.registered_slots)
        OR (
          (ms.registered_slots IS NULL OR array_length(ms.registered_slots, 1) IS NULL)
          AND $3 = ANY(ms.registered_days)
          AND ($3 != 'THURSDAY' OR $2 = 'THU_18_20')
        )
      )
      AND (u.role IS NULL OR u.role != 'candidate')
      AND (u.status IS NULL OR u.status = 'active')
      AND (u.is_blocked IS NULL OR u.is_blocked = false)
      AND u.deleted_at IS NULL;
  `, [monthYear, sessionSlotCode, weekdayToken]);

  let count = 0;
  for (const sub of subsRes.rows) {
    const attRes = await client.query(`
      SELECT id, status, cancelled_at
      FROM attendances
      WHERE session_id = $1::uuid AND user_id = $2::uuid;
    `, [sessionId, sub.user_id]);

    if (attRes.rows.length === 0) {
      await client.query(`
        INSERT INTO attendances (
          session_id, user_id, status, registration_type, confirmed_at, reserved_at, created_at, updated_at
        ) VALUES (
          $1::uuid, $2::uuid, 'CONFIRMED', 'MONTHLY_FIXED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        );
      `, [sessionId, sub.user_id]);

      // Tự động loại khỏi hàng chờ (đánh dấu CLAIMED) nếu user đang trong Waitlist
      await client.query(`
        UPDATE session_waitlist
        SET status = 'CLAIMED', confirmed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE session_id = $1::uuid AND user_id = $2::uuid AND status IN ('WAITING', 'OFFERED');
      `, [sessionId, sub.user_id]);

      count++;
    }
  }

  return {
    sessionId,
    slotCode: sessionSlotCode,
    slotLabel: getSlotLabel(sessionSlotCode),
    monthYear,
    enrolledCount: count
  };
}

/**
 * Lấy số liệu thống kê đăng ký tháng và danh sách thành viên cố định
 * Thống kê rõ ràng theo từng SLOT CODE
 */
async function getMonthlySubscriptionStats(monthYear, client = db) {
  const subsRes = await client.query(`
    SELECT ms.*, u.full_name, u.nickname, u.phone_zalo, u.role, u.badminton_level, u.status, u.avatar_url
    FROM monthly_subscriptions ms
    JOIN users u ON ms.user_id = u.id
    WHERE ms.month_year = $1
    ORDER BY u.full_name ASC;
  `, [monthYear]);

  // Bộ đếm theo từng mã slot
  const slotCounts = Object.keys(CLUB_SLOTS).reduce((acc, code) => {
    acc[code] = 0;
    return acc;
  }, {});

  const subscribers = subsRes.rows.map(row => {
    const slots = Array.isArray(row.registered_slots) && row.registered_slots.length > 0
      ? row.registered_slots
      : [];

    for (const code of slots) {
      if (slotCounts[code] !== undefined) {
        slotCounts[code]++;
      }
    }

    return {
      id: row.id,
      userId: row.user_id,
      fullName: row.full_name,
      nickname: row.nickname,
      badmintonLevel: row.badminton_level,
      phone: row.phone_zalo,
      registeredSlots: slots,
      registeredSlotsLabels: slots.map(getSlotLabel),
      registeredDays: row.registered_days || [],
      registeredDaysVi: (row.registered_days || []).map(formatWeekdayVi),
      paymentStatus: row.payment_status,
      receiptUrl: row.receipt_url,
      note: row.note,
      createdAt: row.created_at
    };
  });

  const slotCountsLabels = Object.entries(slotCounts).reduce((acc, [code, count]) => {
    acc[getSlotLabel(code)] = count;
    return acc;
  }, {});

  return {
    monthYear,
    totalSubscribers: subscribers.length,
    clubSlots: CLUB_SLOTS,
    slotCounts,
    slotCountsLabels,
    subscribers
  };
}

/**
 * Xóa toàn bộ danh sách đăng ký cố định của một tháng (Reset tháng)
 * Tùy chọn dọn dẹp các bản ghi tự động ghi danh (MONTHLY_FIXED) trong các buổi tập chưa diễn ra
 */
async function resetMonthSubscriptions({ monthYear, cleanupAttendances = true, adminUserId = null }) {
  if (!monthYear) {
    throw new Error('Thiếu thông tin monthYear để reset.');
  }

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    // 1. Xóa các subscriptions trong tháng
    const delSubsRes = await client.query(`
      DELETE FROM monthly_subscriptions 
      WHERE month_year = $1 
      RETURNING id, user_id;
    `, [monthYear]);

    const deletedSubsCount = delSubsRes.rows.length;

    // 2. Nếu cleanupAttendances = true, xóa các attendances đã tự động xếp cố định
    // Chỉ xóa các buổi trong tháng đó chưa check in và chưa đóng (is_closed = false)
    let deletedAttendancesCount = 0;
    if (cleanupAttendances) {
      const [yearStr, monthStr] = monthYear.split('-');
      const year = parseInt(yearStr, 10);
      const month = parseInt(monthStr, 10);
      const pad = n => String(n).padStart(2, '0');
      const startIso = `${year}-${pad(month)}-01T00:00:00+07:00`;
      const lastDay = new Date(year, month, 0).getDate();
      const endIso = `${year}-${pad(month)}-${pad(lastDay)}T23:59:59+07:00`;

      const delAttRes = await client.query(`
        DELETE FROM attendances a
        USING sessions s
        WHERE a.session_id = s.id
          AND s.date_time >= $1::timestamptz
          AND s.date_time <= $2::timestamptz
          AND s.is_closed = false
          AND a.registration_type = 'MONTHLY_FIXED'
          AND a.status = 'CONFIRMED'
          AND a.checked_in_at IS NULL
        RETURNING a.id, a.session_id;
      `, [startIso, endIso]);

      deletedAttendancesCount = delAttRes.rows.length;

      // Đồng thời chuyển các lượt ghi danh còn lại trong tháng từ MONTHLY_FIXED về STANDARD
      await client.query(`
        UPDATE attendances a
        SET registration_type = 'STANDARD', updated_at = CURRENT_TIMESTAMP
        FROM sessions s
        WHERE a.session_id = s.id
          AND s.date_time >= $1::timestamptz
          AND s.date_time <= $2::timestamptz
          AND a.registration_type = 'MONTHLY_FIXED';
      `, [startIso, endIso]);
    }

    // 3. Ghi log kiểm toán
    await client.query(`
      INSERT INTO admin_logs (admin_id, action_type, details)
      VALUES ($1::uuid, 'RESET_MONTHLY_SUBSCRIPTIONS', $2::jsonb);
    `, [
      adminUserId || null,
      JSON.stringify({
        monthYear,
        deletedSubsCount,
        deletedAttendancesCount,
        cleanupAttendances
      })
    ]);

    await client.query('COMMIT');

    // 4. Kích hoạt hàng chờ Waitlist cho các buổi tập có slot vừa giải phóng
    if (cleanupAttendances && delAttRes && delAttRes.rows.length > 0) {
      const affectedSessionIds = [...new Set(delAttRes.rows.map(r => r.session_id))];
      const { triggerWaitlistOffers } = require('./sessionReservationService');
      for (const sessId of affectedSessionIds) {
        try {
          await triggerWaitlistOffers(sessId);
        } catch (err) {
          console.error(`[resetMonthSubscriptions] Error triggering waitlist for session ${sessId}:`, err);
        }
      }
    }

    return {
      success: true,
      monthYear,
      deletedSubsCount,
      deletedAttendancesCount
    };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error resetting month subscriptions:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Chỉnh sửa ca và thông tin của 1 thành viên đăng ký cố định
 * Tự động cập nhật registered_slots, registered_days và đồng bộ session attendances
 */
async function updateSingleSubscription({ subscriptionId, registeredSlots, paymentStatus, note, syncSessions = true, adminUserId = null }) {
  if (!subscriptionId) {
    throw new Error('Thiếu subscriptionId.');
  }

  const validSlots = Array.isArray(registeredSlots) ? registeredSlots.filter(validateSlotCode) : [];
  if (validSlots.length === 0) {
    throw new Error('Phải chọn ít nhất 1 khung giờ hợp lệ.');
  }

  const legacyDays = Array.from(new Set(
    validSlots.map(code => CLUB_SLOTS[code]?.weekdayToken).filter(Boolean)
  ));

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    // 1. Cập nhật subscription
    const updateRes = await client.query(`
      UPDATE monthly_subscriptions
      SET registered_slots = $1::text[],
          registered_days = $2::text[],
          payment_status = COALESCE($3, payment_status),
          note = COALESCE($4, note),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $5::uuid
      RETURNING *;
    `, [validSlots, legacyDays, paymentStatus || null, note !== undefined ? note : null, subscriptionId]);

    if (updateRes.rows.length === 0) {
      throw new Error('Không tìm thấy bản ghi đăng ký cố định.');
    }

    const updatedSub = updateRes.rows[0];
    const { user_id, month_year } = updatedSub;

    // 2. Nếu syncSessions = true, đồng bộ lại cho user này trong tháng
    let syncResult = { added: 0, removed: 0 };
    const freedSessionIds = [];
    if (syncSessions) {
      const [yearStr, monthStr] = month_year.split('-');
      const year = parseInt(yearStr, 10);
      const month = parseInt(monthStr, 10);
      const pad = n => String(n).padStart(2, '0');
      const startIso = `${year}-${pad(month)}-01T00:00:00+07:00`;
      const lastDay = new Date(year, month, 0).getDate();
      const endIso = `${year}-${pad(month)}-${pad(lastDay)}T23:59:59+07:00`;

      // Lấy các sessions trong tháng chưa đóng
      const sessRes = await client.query(`
        SELECT id, title, date_time, session_start, session_end, slot_code, is_closed
        FROM sessions
        WHERE date_time >= $1::timestamptz 
          AND date_time <= $2::timestamptz
          AND is_closed = false
        ORDER BY date_time ASC;
      `, [startIso, endIso]);

      for (const sess of sessRes.rows) {
        const sessSlot = sess.slot_code || getSessionSlotCode(sess);

        // Kiểm tra xem session này có nằm trong validSlots mới không
        const isSelectedSlot = validSlots.includes(sessSlot);

        // Lấy attendance hiện tại của user trong session
        const attRes = await client.query(`
          SELECT id, status, registration_type, checked_in_at, cancelled_at
          FROM attendances
          WHERE session_id = $1::uuid AND user_id = $2::uuid;
        `, [sess.id, user_id]);

        if (isSelectedSlot) {
          // Cần có mặt: Nếu chưa có và chưa từng bị hủy, thêm mới
          if (attRes.rows.length === 0) {
            await client.query(`
              INSERT INTO attendances (
                session_id, user_id, status, registration_type, confirmed_at, reserved_at, created_at, updated_at
              ) VALUES (
                $1::uuid, $2::uuid, 'CONFIRMED', 'MONTHLY_FIXED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
              );
            `, [sess.id, user_id]);

            // Tự động loại khỏi hàng chờ (đánh dấu CLAIMED) nếu user đang trong Waitlist
            await client.query(`
              UPDATE session_waitlist
              SET status = 'CLAIMED', confirmed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
              WHERE session_id = $1::uuid AND user_id = $2::uuid AND status IN ('WAITING', 'OFFERED');
            `, [sess.id, user_id]);

            syncResult.added++;
          }
        } else {
          // Không thuộc slot đã đăng ký: Nếu đang là MONTHLY_FIXED và chưa check-in, hủy/xóa
          if (attRes.rows.length > 0) {
            const att = attRes.rows[0];
            if (att.registration_type === 'MONTHLY_FIXED' && att.status === 'CONFIRMED' && !att.checked_in_at) {
              await client.query(`DELETE FROM attendances WHERE id = $1::uuid;`, [att.id]);
              syncResult.removed++;
              freedSessionIds.push(sess.id);
            }
          }
        }
      }
    }

    // Ghi log
    await client.query(`
      INSERT INTO admin_logs (admin_id, action_type, details)
      VALUES ($1::uuid, 'UPDATE_MONTHLY_SUBSCRIPTION', $2::jsonb);
    `, [
      adminUserId || null,
      JSON.stringify({
        subscriptionId,
        userId: user_id,
        monthYear: month_year,
        registeredSlots: validSlots,
        syncResult
      })
    ]);

    await client.query('COMMIT');

    // Kích hoạt hàng chờ Waitlist cho các buổi tập vừa bị xóa slot
    if (freedSessionIds.length > 0) {
      const { triggerWaitlistOffers } = require('./sessionReservationService');
      for (const sessId of [...new Set(freedSessionIds)]) {
        try {
          await triggerWaitlistOffers(sessId);
        } catch (err) {
          console.error(`[updateSingleSubscription] Error triggering waitlist for session ${sessId}:`, err);
        }
      }
    }

    return {
      success: true,
      subscription: updatedSub,
      syncResult
    };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating monthly subscription:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Xóa 1 bản ghi đăng ký cố định của thành viên
 * Tùy chọn dọn dẹp các bản ghi tự động ghi danh (MONTHLY_FIXED) trong các buổi tập chưa diễn ra
 */
async function deleteSingleSubscription({ subscriptionId, cleanupAttendances = true, adminUserId = null }) {
  if (!subscriptionId) {
    throw new Error('Thiếu subscriptionId.');
  }

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const subRes = await client.query(`
      DELETE FROM monthly_subscriptions
      WHERE id = $1::uuid
      RETURNING *;
    `, [subscriptionId]);

    if (subRes.rows.length === 0) {
      throw new Error('Không tìm thấy bản ghi đăng ký cố định.');
    }

    const sub = subRes.rows[0];
    let deletedAttendancesCount = 0;

    if (cleanupAttendances) {
      const [yearStr, monthStr] = sub.month_year.split('-');
      const year = parseInt(yearStr, 10);
      const month = parseInt(monthStr, 10);
      const pad = n => String(n).padStart(2, '0');
      const startIso = `${year}-${pad(month)}-01T00:00:00+07:00`;
      const lastDay = new Date(year, month, 0).getDate();
      const endIso = `${year}-${pad(month)}-${pad(lastDay)}T23:59:59+07:00`;

      const delAttRes = await client.query(`
        DELETE FROM attendances a
        USING sessions s
        WHERE a.session_id = s.id
          AND s.date_time >= $1::timestamptz
          AND s.date_time <= $2::timestamptz
          AND s.is_closed = false
          AND a.user_id = $3::uuid
          AND a.registration_type = 'MONTHLY_FIXED'
          AND a.status = 'CONFIRMED'
          AND a.checked_in_at IS NULL
        RETURNING a.id, a.session_id;
      `, [startIso, endIso, sub.user_id]);

      deletedAttendancesCount = delAttRes.rows.length;
    }

    await client.query(`
      INSERT INTO admin_logs (admin_id, action_type, details)
      VALUES ($1::uuid, 'DELETE_MONTHLY_SUBSCRIPTION', $2::jsonb);
    `, [
      adminUserId || null,
      JSON.stringify({
        subscriptionId,
        userId: sub.user_id,
        monthYear: sub.month_year,
        deletedAttendancesCount
      })
    ]);

    await client.query('COMMIT');

    // Kích hoạt hàng chờ Waitlist cho các buổi tập vừa giải phóng slot
    if (cleanupAttendances && delAttRes && delAttRes.rows.length > 0) {
      const affectedSessionIds = [...new Set(delAttRes.rows.map(r => r.session_id))];
      const { triggerWaitlistOffers } = require('./sessionReservationService');
      for (const sessId of affectedSessionIds) {
        try {
          await triggerWaitlistOffers(sessId);
        } catch (err) {
          console.error(`[deleteSingleSubscription] Error triggering waitlist for session ${sessId}:`, err);
        }
      }
    }

    return {
      success: true,
      subscriptionId,
      deletedAttendancesCount
    };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error deleting monthly subscription:', error);
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  parseExcelBuffer,
  previewSubscriptions,
  commitSubscriptions,
  syncMonthSessions,
  autoEnrollSubscribersForSession,
  getMonthlySubscriptionStats,
  resetMonthSubscriptions,
  updateSingleSubscription,
  deleteSingleSubscription
};
