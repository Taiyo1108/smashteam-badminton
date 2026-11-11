/**
 * Chuẩn hóa các thứ trong tuần giữa chuỗi tiếng Việt (Google Form/Excel) và Token chuẩn hệ thống
 */

const WEEKDAY_TOKENS = Object.freeze([
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY'
]);

const JS_DAY_TO_TOKEN = Object.freeze({
  0: 'SUNDAY',
  1: 'MONDAY',
  2: 'TUESDAY',
  3: 'WEDNESDAY',
  4: 'THURSDAY',
  5: 'FRIDAY',
  6: 'SATURDAY'
});

const TOKEN_TO_VI = Object.freeze({
  MONDAY: 'Thứ Hai',
  TUESDAY: 'Thứ Ba',
  WEDNESDAY: 'Thứ Tư',
  THURSDAY: 'Thứ Năm',
  FRIDAY: 'Thứ Sáu',
  SATURDAY: 'Thứ Bảy',
  SUNDAY: 'Chủ Nhật'
});

/**
 * Phân tích chuỗi hoặc mảng đầu vào để nhận diện các thứ đăng ký
 * Ví dụ: "18-20h Thứ Tư, 18-20h Thứ Bảy" -> ['WEDNESDAY', 'SATURDAY']
 * "18-20h Thứ Bảy, Thứ 4" -> ['WEDNESDAY', 'SATURDAY']
 */
function parseRegisteredDays(input) {
  if (!input) return [];

  let text = '';
  if (Array.isArray(input)) {
    text = input.join(' ');
  } else {
    text = String(input);
  }

  // Chuyển không dấu, chữ thường và chuẩn hóa khoảng trắng
  const normalized = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ');

  const daysFound = new Set();

  // Thứ Hai / Thứ 2 / Monday
  if (/\b(thu hai|thu 2|t2|monday)\b/.test(normalized)) {
    daysFound.add('MONDAY');
  }

  // Thứ Ba / Thứ 3 / Tuesday (loại trừ thu bay)
  if (/\b(thu ba\b(?!y)|thu 3|t3|tuesday)\b/.test(normalized)) {
    daysFound.add('TUESDAY');
  }

  // Thứ Tư / Thứ 4 / Wednesday
  if (/\b(thu tu|thu 4|t4|wednesday)\b/.test(normalized)) {
    daysFound.add('WEDNESDAY');
  }

  // Thứ Năm / Thứ 5 / Thursday
  if (/\b(thu nam|thu 5|t5|thursday)\b/.test(normalized)) {
    daysFound.add('THURSDAY');
  }

  // Thứ Sáu / Thứ 6 / Friday
  if (/\b(thu sau|thu 6|t6|friday)\b/.test(normalized)) {
    daysFound.add('FRIDAY');
  }

  // Thứ Bảy / Thứ 7 / Saturday
  if (/\b(thu bay|thu 7|t7|saturday)\b/.test(normalized)) {
    daysFound.add('SATURDAY');
  }

  // Chủ Nhật / CN / Sunday
  if (/\b(chu nhat|cn|sunday)\b/.test(normalized)) {
    daysFound.add('SUNDAY');
  }

  // Sắp xếp theo thứ tự tuần: MONDAY -> SUNDAY
  return WEEKDAY_TOKENS.filter(t => daysFound.has(t));
}

/**
 * Lấy Token Thứ từ Date object hoặc string date theo giờ Việt Nam (+7)
 */
function getWeekdayFromDate(dateInput) {
  if (!dateInput) return null;
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return null;

  // Chuyển sang chuỗi theo timezone Asia/Ho_Chi_Minh
  const vnDateStr = d.toLocaleDateString('en-US', {
    timeZone: 'Asia/Ho_Chi_Minh',
    weekday: 'long'
  });

  const map = {
    'Monday': 'MONDAY',
    'Tuesday': 'TUESDAY',
    'Wednesday': 'WEDNESDAY',
    'Thursday': 'THURSDAY',
    'Friday': 'FRIDAY',
    'Saturday': 'SATURDAY',
    'Sunday': 'SUNDAY'
  };

  return map[vnDateStr] || JS_DAY_TO_TOKEN[d.getDay()];
}

/**
 * Hiển thị nhãn tiếng Việt dễ đọc
 */
function formatWeekdayVi(token) {
  return TOKEN_TO_VI[token] || token;
}

module.exports = {
  WEEKDAY_TOKENS,
  JS_DAY_TO_TOKEN,
  TOKEN_TO_VI,
  parseRegisteredDays,
  getWeekdayFromDate,
  formatWeekdayVi
};
