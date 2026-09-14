/**
 * Backend utility for handling Vietnam Timezone (Asia/Ho_Chi_Minh / UTC+7)
 */

const VIETNAM_TIMEZONE = 'Asia/Ho_Chi_Minh';

/**
 * Chuyển đổi an toàn bất kỳ đầu vào ngày giờ (kể cả dạng local YYYY-MM-DDTHH:mm từ form)
 * thành chuỗi ISO 8601 UTC chuẩn (+00:00 / Z), neo đúng theo giờ Việt Nam (+07:00).
 */
function toVietnamIso(dateInput) {
  if (!dateInput) return null;
  if (dateInput instanceof Date) {
    return isNaN(dateInput.getTime()) ? null : dateInput.toISOString();
  }

  const trimmed = String(dateInput).trim();
  if (!trimmed) return null;

  // Đã có múi giờ (Z hoặc offset +07:00 / -05:00)
  if (trimmed.endsWith('Z') || trimmed.includes('+') || /-\d{2}:\d{2}$/.test(trimmed)) {
    const d = new Date(trimmed);
    return isNaN(d.getTime()) ? null : d.toISOString();
  }

  // Dạng local YYYY-MM-DDTHH:mm hoặc YYYY-MM-DD HH:mm:ss -> gắn múi giờ Việt Nam +07:00
  const normalized = trimmed.replace(' ', 'T');
  const withOffset = normalized.length === 16 ? `${normalized}:00+07:00` : `${normalized}+07:00`;
  const d = new Date(withOffset);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

/**
 * Định dạng ngày giờ theo giờ Việt Nam: dd/MM/yyyy HH:mm
 */
function formatVietnamDate(dateInput) {
  if (!dateInput) return '';
  const d = dateInput instanceof Date ? dateInput : new Date(toVietnamIso(dateInput));
  if (isNaN(d.getTime())) return String(dateInput);

  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: VIETNAM_TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(d);
  const p = Object.fromEntries(parts.map((x) => [x.type, x.value]));
  return `${p.day}/${p.month}/${p.year} ${p.hour}:${p.minute}`;
}

module.exports = {
  VIETNAM_TIMEZONE,
  toVietnamIso,
  formatVietnamDate,
};