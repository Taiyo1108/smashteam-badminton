const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db');

// POST /api/auth/login - Đăng nhập hệ thống (cho cả Admin và Member)
router.post('/login', async (req, res) => {
  try {
    const { phone_zalo, password } = req.body;
    
    // Check if user exists and is admin or member
    const userResult = await db.query(
      'SELECT * FROM users WHERE phone_zalo = $1 AND role IN ($2, $3)',
      [phone_zalo, 'admin', 'member']
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'Số điện thoại hoặc mật khẩu không chính xác.' });
    }

    const user = userResult.rows[0];

    // Check if user is blocked
    if (user.is_blocked) {
      return res.status(403).json({ error: 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ Ban chủ nhiệm.' });
    }

    // Check if account has password set (activated)
    if (!user.password_hash) {
      return res.status(403).json({ error: 'Tài khoản thành viên chưa được kích hoạt. Vui lòng kích hoạt tài khoản của bạn trước.' });
    }

    // Validate password
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Số điện thoại hoặc mật khẩu không chính xác.' });
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, role: user.role, name: user.full_name },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({ token, user: { id: user.id, name: user.full_name, role: user.role } });
  } catch (error) {
    console.error('Error logging in:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/claim-account/verify - Xác minh tài khoản thành viên cũ trước khi kích hoạt
router.post('/claim-account/verify', async (req, res) => {
  try {
    const { phone_zalo, verification_pin } = req.body;

    if (!phone_zalo || !verification_pin) {
      return res.status(400).json({ error: 'Vui lòng điền đầy đủ số điện thoại và mã PIN xác thực.' });
    }

    // Verify Club PIN
    const clubPin = process.env.CLUB_VERIFY_PIN || '123456';
    if (String(verification_pin) !== String(clubPin)) {
      return res.status(400).json({ error: 'Mã PIN xác thực câu lạc bộ không chính xác.' });
    }

    // Check user: role must be 'member' and password_hash must be NULL
    const userResult = await db.query(
      'SELECT id, full_name FROM users WHERE phone_zalo = $1 AND role = $2 AND password_hash IS NULL',
      [phone_zalo, 'member']
    );

    if (userResult.rows.length === 0) {
      // Check if user exists but has already been activated
      const alreadyActivated = await db.query(
        'SELECT id FROM users WHERE phone_zalo = $1 AND role = $2 AND password_hash IS NOT NULL',
        [phone_zalo, 'member']
      );
      if (alreadyActivated.rows.length > 0) {
        return res.status(400).json({ error: 'Tài khoản này đã được kích hoạt trước đó.' });
      }
      return res.status(404).json({ error: 'Không tìm thấy tài khoản thành viên khớp với số điện thoại hoặc tài khoản đã kích hoạt.' });
    }

    const user = userResult.rows[0];
    res.json({ full_name: user.full_name });
  } catch (error) {
    console.error('Error in claim-account/verify:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/claim-account/activate - Thiết lập mật khẩu và kích hoạt tài khoản
router.post('/claim-account/activate', async (req, res) => {
  try {
    const { phone_zalo, verification_pin, new_password } = req.body;

    if (!phone_zalo || !verification_pin || !new_password) {
      return res.status(400).json({ error: 'Vui lòng điền đầy đủ các thông tin yêu cầu.' });
    }

    // Password validation (length >= 6)
    if (new_password.length < 6) {
      return res.status(400).json({ error: 'Mật khẩu phải có độ dài tối thiểu là 6 ký tự.' });
    }

    // Verify Club PIN
    const clubPin = process.env.CLUB_VERIFY_PIN || '123456';
    if (String(verification_pin) !== String(clubPin)) {
      return res.status(400).json({ error: 'Mã PIN xác thực câu lạc bộ không chính xác.' });
    }

    // Find and verify user status
    const userResult = await db.query(
      'SELECT id FROM users WHERE phone_zalo = $1 AND role = $2 AND password_hash IS NULL',
      [phone_zalo, 'member']
    );

    if (userResult.rows.length === 0) {
      return res.status(400).json({ error: 'Tài khoản không đủ điều kiện kích hoạt hoặc đã được kích hoạt trước đó.' });
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(new_password, saltRounds);

    // Update password in DB
    await db.query(
      'UPDATE users SET password_hash = $1 WHERE phone_zalo = $2 AND role = $3 AND password_hash IS NULL',
      [passwordHash, phone_zalo, 'member']
    );

    res.json({ success: true, message: 'Tài khoản đã được kích hoạt thành công.' });
  } catch (error) {
    console.error('Error in claim-account/activate:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Helper che email
function maskEmail(email) {
  if (!email || !email.includes('@')) return '';
  const [local, domain] = email.split('@');
  if (local.length <= 2) {
    return `${local[0]}***@${domain}`;
  }
  return `${local[0]}***${local[local.length - 1]}@${domain}`;
}

// POST /api/auth/forgot-password - Gửi mã OTP hoặc link đặt lại mật khẩu
router.post('/forgot-password', async (req, res) => {
  try {
    const { identifier } = req.body;

    if (!identifier || !String(identifier).trim()) {
      return res.status(400).json({ error: 'Vui lòng nhập số điện thoại Zalo hoặc email của bạn.' });
    }

    const cleanId = String(identifier).trim();

    // Tìm kiếm user theo phone_zalo hoặc email
    const userResult = await db.query(
      `SELECT id, full_name, phone_zalo, email, role, is_blocked, password_hash
       FROM users
       WHERE (phone_zalo = $1 OR LOWER(email) = LOWER($1))
         AND role IN ('member', 'admin')`,
      [cleanId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy tài khoản nào khớp với thông tin đã nhập.' });
    }

    const user = userResult.rows[0];

    if (user.is_blocked) {
      return res.status(403).json({ error: 'Tài khoản của bạn đang bị khóa. Vui lòng liên hệ Ban Chủ Nhiệm CLB.' });
    }

    if (!user.password_hash) {
      return res.status(400).json({
        error: 'Tài khoản của bạn chưa được kích hoạt mật khẩu lần đầu. Vui lòng vào trang "Kích hoạt tài khoản" để thiết lập mật khẩu.',
        is_unactivated: true
      });
    }

    if (!user.email) {
      return res.status(400).json({
        error: 'Tài khoản chưa cập nhật email trên hệ thống nên không thể nhận mã xác thực tự động. Vui lòng liên hệ Admin/Ban Chủ Nhiệm CLB để được cấp lại mật khẩu.'
      });
    }

    // Tạo token và OTP
    const crypto = require('crypto');
    const resetToken = crypto.randomBytes(32).toString('hex');
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 phút

    // Vô hiệu hóa các mã reset cũ chưa dùng của user này
    await db.query(
      'UPDATE password_reset_tokens SET used_at = CURRENT_TIMESTAMP WHERE user_id = $1 AND used_at IS NULL',
      [user.id]
    );

    // Lưu mã mới vào DB
    await db.query(
      `INSERT INTO password_reset_tokens (user_id, token, otp_code, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [user.id, resetToken, otpCode, expiresAt]
    );

    // Gửi email
    const { sendPasswordResetEmail } = require('../utils/emailService');
    const frontendUrl = process.env.FRONTEND_URL || 'https://smashteam.id.vn';
    const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;

    const emailSent = await sendPasswordResetEmail(user.email, user.full_name, otpCode, resetUrl);
    if (!emailSent) {
      return res.status(500).json({
        error: 'Không thể gửi email lúc này. Vui lòng kiểm tra lại địa chỉ email hoặc liên hệ Admin CLB.'
      });
    }

    const masked = maskEmail(user.email);
    res.json({
      success: true,
      message: `Mã OTP 6 số đã được gửi tới email ${masked}. Vui lòng kiểm tra hộp thư (cả mục Spam nếu cần).`,
      masked_email: masked,
      identifier: user.phone_zalo
    });
  } catch (error) {
    console.error('Error in forgot-password:', error);
    res.status(500).json({ error: 'Lỗi máy chủ khi xử lý yêu cầu quên mật khẩu.' });
  }
});

// GET /api/auth/reset-password/verify - Kiểm tra tính hợp lệ của token link
router.get('/reset-password/verify', async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ valid: false, error: 'Thiếu mã token xác thực.' });
    }

    const recordRes = await db.query(
      `SELECT prt.id, prt.expires_at, u.full_name, u.email, u.phone_zalo
       FROM password_reset_tokens prt
       JOIN users u ON prt.user_id = u.id
       WHERE prt.token = $1 AND prt.used_at IS NULL AND prt.expires_at > CURRENT_TIMESTAMP`,
      [token]
    );

    if (recordRes.rows.length === 0) {
      return res.status(400).json({
        valid: false,
        error: 'Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn (sau 15 phút).'
      });
    }

    const rec = recordRes.rows[0];
    res.json({
      valid: true,
      full_name: rec.full_name,
      masked_email: maskEmail(rec.email),
      phone_zalo: rec.phone_zalo
    });
  } catch (error) {
    console.error('Error in reset-password/verify:', error);
    res.status(500).json({ valid: false, error: 'Lỗi xác minh token.' });
  }
});

// POST /api/auth/reset-password - Đặt lại mật khẩu mới
router.post('/reset-password', async (req, res) => {
  try {
    const { token, otp_code, identifier, new_password } = req.body;

    if (!new_password || new_password.length < 6) {
      return res.status(400).json({ error: 'Mật khẩu mới phải có tối thiểu 6 ký tự.' });
    }

    let tokenRecord = null;

    if (token) {
      // Cách 1: Xác thực qua Token trong Link email
      const recordRes = await db.query(
        `SELECT prt.*, u.id as user_id, u.full_name, u.phone_zalo
         FROM password_reset_tokens prt
         JOIN users u ON prt.user_id = u.id
         WHERE prt.token = $1 AND prt.used_at IS NULL AND prt.expires_at > CURRENT_TIMESTAMP`,
        [token]
      );
      if (recordRes.rows.length > 0) {
        tokenRecord = recordRes.rows[0];
      }
    } else if (otp_code && identifier) {
      // Cách 2: Xác thực qua Mã OTP 6 số + SĐT/Email
      const cleanId = String(identifier).trim();
      const cleanOtp = String(otp_code).trim();

      const userRes = await db.query(
        `SELECT id, full_name, phone_zalo
         FROM users
         WHERE (phone_zalo = $1 OR LOWER(email) = LOWER($1))
           AND role IN ('member', 'admin')`,
        [cleanId]
      );

      if (userRes.rows.length > 0) {
        const userId = userRes.rows[0].id;
        const recordRes = await db.query(
          `SELECT prt.*, u.id as user_id, u.full_name, u.phone_zalo
           FROM password_reset_tokens prt
           JOIN users u ON prt.user_id = u.id
           WHERE prt.user_id = $1 AND prt.otp_code = $2 AND prt.used_at IS NULL AND prt.expires_at > CURRENT_TIMESTAMP
           ORDER BY prt.created_at DESC LIMIT 1`,
          [userId, cleanOtp]
        );
        if (recordRes.rows.length > 0) {
          tokenRecord = recordRes.rows[0];
        }
      }
    } else {
      return res.status(400).json({ error: 'Vui lòng cung cấp mã OTP hoặc đường link xác thực hợp lệ.' });
    }

    if (!tokenRecord) {
      return res.status(400).json({
        error: 'Mã xác nhận OTP hoặc liên kết đặt lại mật khẩu không chính xác hoặc đã hết hạn.'
      });
    }

    // Hash mật khẩu mới
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(new_password, saltRounds);

    // Cập nhật mật khẩu và đánh dấu token đã dùng
    await db.query('BEGIN');
    await db.query(
      'UPDATE users SET password_hash = $1 WHERE id = $2',
      [passwordHash, tokenRecord.user_id]
    );
    await db.query(
      'UPDATE password_reset_tokens SET used_at = CURRENT_TIMESTAMP WHERE id = $1',
      [tokenRecord.id]
    );
    await db.query('COMMIT');

    res.json({
      success: true,
      message: 'Đặt lại mật khẩu thành công! Bạn có thể đăng nhập ngay bằng mật khẩu mới.',
      phone_zalo: tokenRecord.phone_zalo
    });
  } catch (error) {
    await db.query('ROLLBACK').catch(() => {});
    console.error('Error in reset-password:', error);
    res.status(500).json({ error: 'Lỗi máy chủ khi đặt lại mật khẩu.' });
  }
});

module.exports = router;

