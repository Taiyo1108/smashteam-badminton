/**
 * Chuẩn hóa số điện thoại Việt Nam dùng chung cho toàn bộ hệ thống
 * Xử lý các trường hợp:
 * - 0332187443 -> 0332187443
 * - 332187443 (Excel tự bỏ số 0 đầu) -> 0332187443
 * - +84332187443 -> 0332187443
 * - 84332187443 -> 0332187443
 * - 033 218 7443 / 033-218-7443 -> 0332187443
 */
function normalizeVietnamPhone(rawPhone) {
  if (!rawPhone) return null;

  // Chuyển sang chuỗi và loại bỏ mọi ký tự không phải số
  let cleaned = String(rawPhone).trim().replace(/\D/g, '');

  if (!cleaned) return null;

  // Nếu bắt đầu bằng 84 và có 11 chữ số (ví dụ 84942083141)
  if (cleaned.startsWith('84') && cleaned.length === 11) {
    cleaned = '0' + cleaned.slice(2);
  }

  // Nếu người dùng nhập 9 số (do Excel tự convert string thành number làm mất số 0 đầu)
  // Các đầu số di động VN hiện tại: 3, 5, 7, 8, 9
  if (cleaned.length === 9) {
    cleaned = '0' + cleaned;
  }

  // Kiểm tra tính hợp lệ của số điện thoại di động VN: 10 chữ số, bắt đầu bằng 03, 05, 07, 08, 09
  if (/^0[35789]\d{8}$/.test(cleaned)) {
    return cleaned;
  }

  // Nếu có 10 chữ số bắt đầu bằng 0 bất kỳ (phòng trường hợp đầu số cố định hoặc đầu số mới)
  if (/^0\d{9}$/.test(cleaned)) {
    return cleaned;
  }

  return null;
}

function isValidVietnamPhone(phone) {
  return normalizeVietnamPhone(phone) !== null;
}

module.exports = {
  normalizeVietnamPhone,
  isValidVietnamPhone
};
