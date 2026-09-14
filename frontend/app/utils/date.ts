/**
 * Bộ tiện ích quy đổi và định dạng ngày giờ chuẩn giờ Việt Nam (UTC+7 / Asia/Ho_Chi_Minh)
 * Giải quyết triệt để lỗi lệch múi giờ giữa máy chủ (UTC/Cloud) và trình duyệt người dùng.
 */

export const VIETNAM_TIMEZONE = "Asia/Ho_Chi_Minh";

/**
 * Định dạng ngày giờ theo giờ Việt Nam: dd/MM/yyyy HH:mm
 */
export function formatVietnamDate(
  dateInput?: string | Date | null,
  formatType: "full" | "date" | "time" = "full"
): string {
  if (!dateInput) return "";
  const d = parseVietnamTime(dateInput);
  if (isNaN(d.getTime())) return String(dateInput);

  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: VIETNAM_TIMEZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(d);
  const p = Object.fromEntries(parts.map((x) => [x.type, x.value]));

  if (formatType === "date") {
    return `${p.day}/${p.month}/${p.year}`;
  }
  if (formatType === "time") {
    return `${p.hour}:${p.minute}`;
  }
  return `${p.day}/${p.month}/${p.year} ${p.hour}:${p.minute}`;
}

/**
 * Chuyển đổi an toàn từ Date/ISO string sang định dạng YYYY-MM-DDTHH:mm 
 * theo giờ Việt Nam để điền vào <input type="datetime-local">
 */
export function toVietnamDatetimeInput(dateInput?: string | Date | null): string {
  if (!dateInput) return "";
  const d = parseVietnamTime(dateInput);
  if (isNaN(d.getTime())) return "";

  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: VIETNAM_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(d);
  const p = Object.fromEntries(parts.map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

/**
 * Chuyển đổi chuỗi từ <input type="datetime-local"> (YYYY-MM-DDTHH:mm) 
 * thành ISO 8601 UTC string (ví dụ 18:30 VN -> 11:30:00.000Z)
 */
export function vietnamInputToIso(inputStr?: string | null): string {
  if (!inputStr) return "";
  const trimmed = String(inputStr).trim();
  if (!trimmed) return "";

  // Nếu chuỗi đã có định dạng múi giờ (kết thúc Z hoặc có offset +07:00 / -05:00)
  if (trimmed.endsWith("Z") || trimmed.includes("+") || /-\d{2}:\d{2}$/.test(trimmed)) {
    const d = new Date(trimmed);
    return isNaN(d.getTime()) ? trimmed : d.toISOString();
  }

  // Chuỗi dạng local YYYY-MM-DDTHH:mm hoặc YYYY-MM-DD HH:mm:ss -> gắn múi giờ Việt Nam +07:00
  const normalized = trimmed.replace(" ", "T");
  const isoWithOffset = normalized.length === 16 ? `${normalized}:00+07:00` : `${normalized}+07:00`;
  const d = new Date(isoWithOffset);
  return isNaN(d.getTime()) ? trimmed : d.toISOString();
}

/**
 * Parse bất kỳ chuỗi ngày giờ nào thành đối tượng Date chuẩn
 * Nếu là chuỗi không có múi giờ, mặc định coi là giờ Việt Nam (+07:00)
 */
export function parseVietnamTime(dateInput?: string | Date | null): Date {
  if (!dateInput) return new Date(NaN);
  if (dateInput instanceof Date) return dateInput;

  const str = String(dateInput).trim();
  if (!str) return new Date(NaN);

  // Đã có múi giờ
  if (str.endsWith("Z") || str.includes("+") || /-\d{2}:\d{2}$/.test(str)) {
    return new Date(str);
  }

  // Không có múi giờ (dạng YYYY-MM-DDTHH:mm hoặc YYYY-MM-DD HH:mm:ss)
  const normalized = str.replace(" ", "T");
  const withOffset = normalized.length === 16 ? `${normalized}:00+07:00` : `${normalized}+07:00`;
  return new Date(withOffset);
}