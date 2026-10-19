const { z } = require('zod');

// Regex chuẩn số điện thoại di động Việt Nam: 10 chữ số, đầu số 03, 05, 07, 08, 09
const VIETNAM_PHONE_REGEX = /^(03|05|07|08|09)[0-9]{8}$/;

/**
 * Chuẩn hóa số điện thoại:
 * - Xóa khoảng trắng, dấu gạch ngang, dấu chấm
 * - Chuyển đổi tiền tố quốc tế +84 hoặc 84 về đầu số 0
 */
function normalizeVietnamPhone(phone) {
  if (!phone || typeof phone !== 'string') return '';
  let cleaned = phone.replace(/[\s\.\-\(\)]/g, '');
  if (cleaned.startsWith('+84')) {
    cleaned = '0' + cleaned.slice(3);
  } else if (cleaned.startsWith('84') && cleaned.length === 11) {
    cleaned = '0' + cleaned.slice(2);
  }
  return cleaned;
}

const onboardingSchema = z.object({
  full_name: z
    .string({ required_error: 'Họ và tên đầy đủ là bắt buộc.' })
    .trim()
    .min(2, 'Họ và tên đầy đủ phải có ít nhất 2 ký tự.')
    .max(50, 'Họ và tên đầy đủ không được vượt quá 50 ký tự.'),
  phone_zalo: z
    .string({ required_error: 'Số điện thoại Zalo là bắt buộc.' })
    .transform(normalizeVietnamPhone)
    .refine((val) => VIETNAM_PHONE_REGEX.test(val), {
      message: 'Số điện thoại không hợp lệ. Phải là số điện thoại Việt Nam 10 chữ số (đầu số 03, 05, 07, 08, 09).'
    }),
  gender: z
    .enum(['Nam', 'Nữ'], {
      errorMap: () => ({ message: 'Vui lòng chọn giới tính hợp lệ (Nam hoặc Nữ).' })
    }),
  avatar_url: z
    .string()
    .refine((val) => !val || val.startsWith('/') || val.startsWith('http://') || val.startsWith('https://'), {
      message: 'Đường dẫn ảnh đại diện không hợp lệ.'
    })
    .nullable()
    .optional(),
  honeypot: z
    .string()
    .optional()
    .nullable()
});

/**
 * Validate payload Onboarding
 */
function validateOnboarding(data) {
  // Chống Bot: nếu trường ẩn honeypot có giá trị -> coi là spam bot
  if (data && data.honeypot && String(data.honeypot).trim() !== '') {
    return {
      success: false,
      error: 'Phát hiện hành vi tự động không hợp lệ (Spam protection).',
      code: 'BOT_DETECTED'
    };
  }

  const result = onboardingSchema.safeParse(data);
  if (!result.success) {
    const firstError = result.error.errors[0]?.message || 'Dữ liệu không hợp lệ.';
    return {
      success: false,
      error: firstError,
      code: 'VALIDATION_ERROR',
      details: result.error.flatten()
    };
  }

  return {
    success: true,
    data: result.data
  };
}

module.exports = {
  normalizeVietnamPhone,
  validateOnboarding,
  VIETNAM_PHONE_REGEX
};
