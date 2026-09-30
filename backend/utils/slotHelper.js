const { CLUB_SLOTS, SLOTS_BY_WEEKDAY, VI_WEEKDAY_MAP } = require('../config/clubSlots');

/**
 * Kiểm tra xem một mã slot có tồn tại trong cấu hình hệ thống không
 */
function validateSlotCode(code) {
  if (!code || typeof code !== 'string') return false;
  return Boolean(CLUB_SLOTS[code.trim().toUpperCase()]);
}

/**
 * Lấy cấu hình chi tiết của một slot
 */
function getSlotConfig(code) {
  if (!code || typeof code !== 'string') return null;
  return CLUB_SLOTS[code.trim().toUpperCase()] || null;
}

/**
 * Lấy nhãn hiển thị thân thiện của slot
 * Ví dụ: THU_17_19 -> "Thứ 5 — 17:00–19:00"
 */
function getSlotLabel(code) {
  const conf = getSlotConfig(code);
  return conf ? conf.label : code;
}

/**
 * Lấy mã slot chính xác từ một session record
 * Dựa trên:
 * 1. session.slot_code nếu đã có sẵn trong DB
 * 2. Ngược lại: derive từ weekday + start_time + end_time theo múi giờ Việt Nam (+7)
 */
function getSessionSlotCode(session) {
  if (!session) return null;

  // 1. Nếu session đã được lưu slot_code trong DB
  if (session.slot_code) {
    const trimmed = String(session.slot_code).trim().toUpperCase();
    if (trimmed) return trimmed;
  }

  // 2. Derive từ session_start/date_time và session_end theo múi giờ Asia/Ho_Chi_Minh
  const tStart = session.session_start ? new Date(session.session_start) : new Date(session.date_time);
  if (isNaN(tStart.getTime())) return null;

  const tEnd = session.session_end 
    ? new Date(session.session_end) 
    : new Date(tStart.getTime() + 2 * 3600000); // Mặc định 2 tiếng nếu không có session_end

  // Lấy weekday 3 ký tự (MON, TUE, WED, THU, FRI, SAT, SUN)
  const vnWeekdayStr = tStart.toLocaleDateString('en-US', { 
    timeZone: 'Asia/Ho_Chi_Minh', 
    weekday: 'short' 
  }).toUpperCase();
  const dayPrefix = vnWeekdayStr.slice(0, 3);

  // Lấy giờ bắt đầu và giờ kết thúc (24h format)
  const vnStartHour = parseInt(
    tStart.toLocaleTimeString('en-US', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', hour12: false }),
    10
  );
  const vnEndHour = parseInt(
    tEnd.toLocaleTimeString('en-US', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', hour12: false }),
    10
  );

  const derivedCode = `${dayPrefix}_${vnStartHour}_${vnEndHour}`;
  return derivedCode;
}

/**
 * Chuẩn hóa một token code đơn lẻ
 * Xử lý:
 * - "THU_17_19" -> "THU_17_19"
 * - "THU_17_19 | Thứ 5 — 17:00–19:00" -> "THU_17_19"
 */
function normalizeSlotCode(token) {
  if (!token || typeof token !== 'string') return null;
  const trimmed = token.trim();
  
  // Trích xuất mã SLOT_CODE dạng AAA_HH_HH (ví dụ THU_17_19, WED_18_20, SAT_18_20)
  const match = trimmed.match(/\b([A-Z]{3}_\d{1,2}_\d{1,2})\b/i);
  if (match) {
    const code = match[1].toUpperCase();
    if (CLUB_SLOTS[code]) return code;
  }

  return null;
}

/**
 * PARSER CHUYỂN TIẾP CHO DỮ LIỆU ĐĂNG KÝ (Legacy & New Format)
 * 
 * Đầu vào có thể là:
 * 1. Định dạng mới (Google Form): "WED_18_20 | Thứ 4 — 18:00–20:00, THU_17_19 | Thứ 5 — 17:00–19:00"
 * 2. Mã code thuần: "THU_17_19, THU_18_20"
 * 3. Chuỗi cũ có khung giờ: "18-20h Thứ Tư, 18-20h Thứ Bảy", "17-19h Thứ 5"
 * 4. Chuỗi cũ thiếu giờ (AMBIGUOUS): "Thứ 5", "Thứ Năm"
 * 
 * NGUYÊN TẮC:
 * - Nếu nhận diện được slot chính xác -> thêm vào slots[]
 * - Nếu chuỗi chỉ ghi thứ (ví dụ "Thứ 5") mà CLB có nhiều slot cho thứ đó:
 *   -> TUYỆT ĐỐI KHÔNG TỰ ĐOÁN, đưa vào ambiguousDays[] và gán isAmbiguous = true
 *   -> Đánh dấu row cần Admin review.
 */
function normalizeLegacyScheduleInput(rawValue) {
  const result = {
    slots: [],            // Danh sách các mã slot hợp lệ duy nhất, ví dụ: ['THU_17_19', 'SAT_18_20']
    ambiguousDays: [],    // Danh sách các thứ bị nhập thiếu giờ gây mâu thuẫn
    invalidTokens: [],    // Các đoạn text không nhận diện được
    isAmbiguous: false,   // True nếu có thứ bị ambiguous cần admin xác nhận
    error: null
  };

  if (!rawValue) {
    result.error = 'Không có dữ liệu đăng ký khung giờ.';
    return result;
  }

  let text = '';
  if (Array.isArray(rawValue)) {
    text = rawValue.join(', ');
  } else {
    text = String(rawValue);
  }

  // Tách thành các đoạn nhỏ dựa trên dấu phẩy hoặc chấm phẩy
  const chunks = text.split(/[,;\n]+/).map(c => c.trim()).filter(Boolean);
  const detectedSlots = new Set();
  const ambiguousSet = new Set();

  for (const chunk of chunks) {
    // 1. Thử match mã slot chuẩn trước (ví dụ THU_17_19, WED_18_20...)
    const exactCode = normalizeSlotCode(chunk);
    if (exactCode) {
      detectedSlots.add(exactCode);
      continue;
    }

    // 2. Xử lý chuỗi tiếng Việt (chuyển chữ thường, không dấu)
    const normalizedChunk = chunk
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ');

    // Trích xuất khung giờ nếu có: ví dụ "17-19h", "17h-19h", "17:00-19:00", "18-20"
    const hourMatch = normalizedChunk.match(/(\d{1,2})(?:h|:00)?\s*[-~–—to]\s*(\d{1,2})(?:h|:00)?/);
    const startHour = hourMatch ? parseInt(hourMatch[1], 10) : null;
    const endHour = hourMatch ? parseInt(hourMatch[2], 10) : null;

    // Nhận diện thứ trong chunk
    let detectedWeekday = null;
    let dayTokenName = null;

    if (/\b(thu tu|thu 4|t4|wed)\b/.test(normalizedChunk)) {
      detectedWeekday = 3;
      dayTokenName = 'Thứ Tư';
    } else if (/\b(thu nam|thu 5|t5|thursday)\b/.test(normalizedChunk)) {
      detectedWeekday = 4;
      dayTokenName = 'Thứ Năm';
    } else if (/\b(thu bay|thu 7|t7|sat)\b/.test(normalizedChunk)) {
      detectedWeekday = 6;
      dayTokenName = 'Thứ Bảy';
    } else if (/\b(thu hai|thu 2|t2|mon)\b/.test(normalizedChunk)) {
      detectedWeekday = 1;
      dayTokenName = 'Thứ Hai';
    } else if (/\b(thu ba\b(?!y)|thu 3|t3|tue)\b/.test(normalizedChunk)) {
      detectedWeekday = 2;
      dayTokenName = 'Thứ Ba';
    } else if (/\b(thu sau|thu 6|t6|fri)\b/.test(normalizedChunk)) {
      detectedWeekday = 5;
      dayTokenName = 'Thứ Sáu';
    } else if (/\b(chu nhat|cn|sun)\b/.test(normalizedChunk)) {
      detectedWeekday = 0;
      dayTokenName = 'Chủ Nhật';
    }

    if (detectedWeekday === null) {
      result.invalidTokens.push(chunk);
      continue;
    }

    // Nếu có khung giờ cụ thể: tìm slot có weekday và start/end tương ứng
    if (startHour !== null && endHour !== null) {
      const matchedSlot = Object.values(CLUB_SLOTS).find(s => 
        s.weekday === detectedWeekday && 
        s.startHour === startHour && 
        s.endHour === endHour
      );

      if (matchedSlot) {
        detectedSlots.add(matchedSlot.code);
      } else {
        // Có giờ nhưng không khớp slot nào trong CLUB_SLOTS
        result.invalidTokens.push(chunk);
      }
    } else {
      // KHÔNG CÓ KHUNG GIỜ CỤ THỂ TRONG CHUNK (ví dụ chỉ ghi "Thứ 5" hoặc "Thứ Tư")
      const candidateSlots = SLOTS_BY_WEEKDAY[detectedWeekday] || [];
      
      if (candidateSlots.length === 1) {
        // Thứ này chỉ có DUY NHẤT 1 khung giờ trong CLB (ví dụ Thứ 4 chỉ có 18-20h)
        detectedSlots.add(candidateSlots[0]);
      } else if (candidateSlots.length > 1) {
        // THỨ NÀY CÓ NHIỀU KHUNG GIỜ (Ví dụ Thứ 5 có 17-19h và 18-20h)
        // NGUYÊN TẮC: TUYỆT ĐỐI KHÔNG TỰ ĐOÁN!
        ambiguousSet.add(dayTokenName);
      } else {
        result.invalidTokens.push(chunk);
      }
    }
  }

  result.slots = Array.from(detectedSlots);
  result.ambiguousDays = Array.from(ambiguousSet);

  if (result.ambiguousDays.length > 0) {
    result.isAmbiguous = true;
    const daysStr = result.ambiguousDays.join(', ');
    const candidateLabels = result.ambiguousDays
      .flatMap(d => {
        const wIdx = VI_WEEKDAY_MAP[d.toLowerCase()] ?? 4;
        return (SLOTS_BY_WEEKDAY[wIdx] || []).map(code => CLUB_SLOTS[code].label);
      })
      .join(' hoặc ');
    result.error = `Đăng ký "${daysStr}" thiếu khung giờ cụ thể trong khi CLB có nhiều ca (${candidateLabels}). Cần Admin chọn slot cụ thể.`;
  } else if (result.slots.length === 0 && result.invalidTokens.length > 0) {
    result.error = `Không nhận diện được khung giờ hợp lệ từ: "${result.invalidTokens.join(', ')}".`;
  }

  return result;
}

module.exports = {
  validateSlotCode,
  getSlotConfig,
  getSlotLabel,
  getSessionSlotCode,
  normalizeSlotCode,
  normalizeLegacyScheduleInput
};
