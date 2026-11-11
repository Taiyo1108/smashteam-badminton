const db = require('../db');
const { CLUB_SLOTS: DEFAULT_CLUB_SLOTS } = require('../config/clubSlots');

const WEEKDAY_CONFIG = [
  { weekday: 0, dayPrefix: 'SUN', weekdayToken: 'SUNDAY', viName: 'Chủ Nhật', viShort: 'CN' },
  { weekday: 1, dayPrefix: 'MON', weekdayToken: 'MONDAY', viName: 'Thứ 2', viShort: 'T2' },
  { weekday: 2, dayPrefix: 'TUE', weekdayToken: 'TUESDAY', viName: 'Thứ 3', viShort: 'T3' },
  { weekday: 3, dayPrefix: 'WED', weekdayToken: 'WEDNESDAY', viName: 'Thứ 4', viShort: 'T4' },
  { weekday: 4, dayPrefix: 'THU', weekdayToken: 'THURSDAY', viName: 'Thứ 5', viShort: 'T5' },
  { weekday: 5, dayPrefix: 'FRI', weekdayToken: 'FRIDAY', viName: 'Thứ 6', viShort: 'T6' },
  { weekday: 6, dayPrefix: 'SAT', weekdayToken: 'SATURDAY', viName: 'Thứ 7', viShort: 'T7' }
];

/**
 * Lấy cấu hình các ca đánh cho một tháng chỉ định (hoặc mặc định nếu chưa cấu hình)
 * @param {string|null} monthYear - Định dạng 'YYYY-MM' (ví dụ: '2026-11')
 * @param {object} client - pg client
 */
async function getClubSlotsForMonth(monthYear = null, client = db) {
  let isCustomized = false;
  let rows = [];

  if (monthYear && /^\d{4}-\d{2}$/.test(monthYear)) {
    const customRes = await client.query(`
      SELECT id, month_year, code, weekday, day_prefix, weekday_token, 
             start_time, end_time, start_hour, end_hour, label, short_label, 
             color, display_order, is_active
      FROM club_slots
      WHERE month_year = $1 AND is_active = true
      ORDER BY display_order ASC, weekday ASC, start_hour ASC;
    `, [monthYear]);

    if (customRes.rows.length > 0) {
      isCustomized = true;
      rows = customRes.rows;
    }
  }

  // Nếu tháng chưa có cấu hình riêng, lấy cấu hình toàn cục (month_year IS NULL)
  if (rows.length === 0) {
    const defaultRes = await client.query(`
      SELECT id, month_year, code, weekday, day_prefix, weekday_token, 
             start_time, end_time, start_hour, end_hour, label, short_label, 
             color, display_order, is_active
      FROM club_slots
      WHERE month_year IS NULL AND is_active = true
      ORDER BY display_order ASC, weekday ASC, start_hour ASC;
    `);

    rows = defaultRes.rows;
  }

  // Nếu vẫn chưa có gì trong DB, rớt về DEFAULT_CLUB_SLOTS tĩnh
  if (rows.length === 0) {
    rows = Object.values(DEFAULT_CLUB_SLOTS).map((s, idx) => ({
      id: null,
      month_year: null,
      code: s.code,
      weekday: s.weekday,
      day_prefix: s.dayPrefix,
      weekday_token: s.weekdayToken,
      start_time: s.startTime,
      end_time: s.endTime,
      start_hour: s.startHour,
      end_hour: s.endHour,
      label: s.label,
      short_label: s.shortLabel,
      color: s.color || 'purple',
      display_order: idx + 1,
      is_active: true
    }));
  }

  const slotsMap = {};
  const slotsArray = [];
  const slotsByWeekday = {};

  for (const r of rows) {
    const slotObj = {
      id: r.id,
      code: r.code,
      weekday: parseInt(r.weekday, 10),
      dayPrefix: r.day_prefix,
      weekdayToken: r.weekday_token,
      startTime: r.start_time,
      endTime: r.end_time,
      startHour: parseInt(r.start_hour, 10),
      endHour: parseInt(r.end_hour, 10),
      label: r.label,
      shortLabel: r.short_label,
      color: r.color || 'purple',
      displayOrder: parseInt(r.display_order, 10) || 0,
      isActive: Boolean(r.is_active)
    };

    slotsMap[r.code] = slotObj;
    slotsArray.push(slotObj);

    if (!slotsByWeekday[slotObj.weekday]) {
      slotsByWeekday[slotObj.weekday] = [];
    }
    slotsByWeekday[slotObj.weekday].push(slotObj.code);
  }

  return {
    monthYear,
    isCustomized,
    slotsMap,
    slotsArray,
    slotsByWeekday
  };
}

/**
 * Lưu hoặc cập nhật danh sách ca đánh cho một tháng
 * @param {object} params - { monthYear, slots, adminId, client }
 */
async function saveClubSlotsForMonth({ monthYear, slots, adminId = null, client = db }) {
  if (!monthYear || !/^\d{4}-\d{2}$/.test(monthYear)) {
    throw new Error('monthYear không hợp lệ. Yêu cầu định dạng YYYY-MM (ví dụ 2026-11).');
  }

  if (!Array.isArray(slots) || slots.length === 0) {
    throw new Error('Danh sách ca đánh không được rỗng. Cần có ít nhất 1 ca sinh hoạt.');
  }

  const validatedSlots = slots.map((s, idx) => {
    const weekday = parseInt(s.weekday, 10);
    if (isNaN(weekday) || weekday < 0 || weekday > 6) {
      throw new Error(`Thứ không hợp lệ cho ca "${s.label || idx + 1}" (phải từ 0 đến 6).`);
    }

    const wdConfig = WEEKDAY_CONFIG[weekday];
    const startTime = String(s.startTime || '18:00').trim();
    const endTime = String(s.endTime || '20:00').trim();

    const startMatch = startTime.match(/^(\d{1,2}):(\d{2})$/);
    const endMatch = endTime.match(/^(\d{1,2}):(\d{2})$/);
    if (!startMatch || !endMatch) {
      throw new Error(`Định dạng giờ không hợp lệ (${startTime} - ${endTime}). Yêu cầu dạng HH:mm.`);
    }

    const startHour = parseInt(startMatch[1], 10);
    const endHour = parseInt(endMatch[1], 10);
    if (startHour >= endHour) {
      throw new Error(`Giờ kết thúc (${endTime}) phải lớn hơn giờ bắt đầu (${startTime}).`);
    }

    // Sinh code nếu chưa có hoặc sanitize code
    const autoCode = `${wdConfig.dayPrefix}_${startHour}_${endHour}`;
    const cleanCode = (s.code ? String(s.code).trim().toUpperCase() : autoCode).replace(/[^A-Z0-9_]/g, '');

    const label = (s.label || `${wdConfig.viName} — ${startTime}–${endTime}`).trim();
    const shortLabel = (s.shortLabel || `${wdConfig.viShort} (${startHour}-${endHour}h)`).trim();
    const color = s.color || 'purple';

    return {
      code: cleanCode || autoCode,
      weekday,
      dayPrefix: wdConfig.dayPrefix,
      weekdayToken: wdConfig.weekdayToken,
      startTime,
      endTime,
      startHour,
      endHour,
      label,
      shortLabel,
      color,
      displayOrder: idx + 1
    };
  });

  // Kiểm tra trùng mã code trong cùng danh sách
  const codeSet = new Set();
  for (const s of validatedSlots) {
    if (codeSet.has(s.code)) {
      throw new Error(`Trùng mã ca đánh "${s.code}". Mỗi ca trong tháng phải có mã duy nhất.`);
    }
    codeSet.add(s.code);
  }

  // Thực hiện transaction lưu vào database
  const isIsolatedClient = client !== db;
  const pgClient = isIsolatedClient ? client : await db.connect();

  try {
    if (!isIsolatedClient) await pgClient.query('BEGIN');

    // Xóa cấu hình cũ của tháng này nếu có
    await pgClient.query(`
      DELETE FROM club_slots WHERE month_year = $1;
    `, [monthYear]);

    // Chèn danh sách ca mới
    for (const s of validatedSlots) {
      await pgClient.query(`
        INSERT INTO club_slots (
          month_year, code, weekday, day_prefix, weekday_token, 
          start_time, end_time, start_hour, end_hour, 
          label, short_label, color, display_order, is_active
        ) VALUES (
          $1, $2, $3, $4, $5, 
          $6, $7, $8, $9, 
          $10, $11, $12, $13, true
        );
      `, [
        monthYear, s.code, s.weekday, s.dayPrefix, s.weekdayToken,
        s.startTime, s.endTime, s.startHour, s.endHour,
        s.label, s.shortLabel, s.color, s.displayOrder
      ]);
    }

    // Ghi audit log
    await pgClient.query(`
      INSERT INTO admin_logs (admin_id, action_type, details)
      VALUES ($1::uuid, 'UPDATE_MONTHLY_CLUB_SLOTS', $2::jsonb);
    `, [
      adminId || null,
      JSON.stringify({
        monthYear,
        slotsCount: validatedSlots.length,
        slots: validatedSlots
      })
    ]);

    if (!isIsolatedClient) await pgClient.query('COMMIT');

    return await getClubSlotsForMonth(monthYear, pgClient);
  } catch (err) {
    if (!isIsolatedClient) await pgClient.query('ROLLBACK');
    console.error('Error saving club slots for month:', err);
    throw err;
  } finally {
    if (!isIsolatedClient) pgClient.release();
  }
}

/**
 * Khôi phục cấu hình ca đánh của tháng về danh sách mặc định
 * @param {string} monthYear
 * @param {string} adminId
 * @param {object} client
 */
async function resetClubSlotsForMonth({ monthYear, adminId = null, client = db }) {
  if (!monthYear || !/^\d{4}-\d{2}$/.test(monthYear)) {
    throw new Error('monthYear không hợp lệ. Yêu cầu định dạng YYYY-MM.');
  }

  await client.query(`
    DELETE FROM club_slots WHERE month_year = $1;
  `, [monthYear]);

  await client.query(`
    INSERT INTO admin_logs (admin_id, action_type, details)
    VALUES ($1::uuid, 'RESET_MONTHLY_CLUB_SLOTS_TO_DEFAULT', $2::jsonb);
  `, [
    adminId || null,
    JSON.stringify({ monthYear })
  ]);

  return await getClubSlotsForMonth(monthYear, client);
}

module.exports = {
  WEEKDAY_CONFIG,
  getClubSlotsForMonth,
  saveClubSlotsForMonth,
  resetClubSlotsForMonth
};
