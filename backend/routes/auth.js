const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { onboardingRateLimiter } = require('../middleware/rateLimiter');
const { validateOnboarding } = require('../validators/onboardingValidator');

// POST /api/auth/login - Đăng nhập hệ thống (hỗ trợ Admin, Member và Guest qua SĐT hoặc Email)
router.post('/login', async (req, res) => {
  try {
    const { phone_zalo, password } = req.body;
    
    if (!phone_zalo || !password) {
      return res.status(400).json({ error: 'Vui lòng điền đầy đủ số điện thoại hoặc email và mật khẩu.' });
    }

    const cleanIdentifier = String(phone_zalo).trim();

    // Check if user exists by phone_zalo OR email and belongs to valid roles
    const userResult = await db.query(
      `SELECT * FROM users 
       WHERE (phone_zalo = $1 OR LOWER(email) = LOWER($1))
         AND role IN ('admin', 'member', 'guest')`,
      [cleanIdentifier]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'Tài khoản hoặc mật khẩu không chính xác.' });
    }

    const user = userResult.rows[0];

    // Check if user is blocked
    if (user.is_blocked) {
      return res.status(403).json({ error: 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ Ban chủ nhiệm.' });
    }

    // Check if account has password set (activated)
    if (!user.password_hash) {
      return res.status(403).json({ 
        error: 'Tài khoản thành viên chưa được kích hoạt mật khẩu. Vui lòng kích hoạt tài khoản của bạn trước.',
        is_unactivated: true
      });
    }

    // Validate password
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Tài khoản hoặc mật khẩu không chính xác.' });
    }

    // Generate JWT (7d for admin, 30d for member/guest)
    const expiresIn = user.role === 'admin' ? '7d' : '30d';
    const isCompleted = Boolean(user.is_profile_completed);
    const token = jwt.sign(
      { 
        id: user.id, 
        role: user.role, 
        name: user.full_name,
        is_profile_completed: isCompleted
      },
      process.env.JWT_SECRET,
      { expiresIn }
    );

    res.json({ 
      token, 
      user: { 
        id: user.id, 
        name: user.full_name, 
        role: user.role,
        email: user.email,
        phone_zalo: user.phone_zalo,
        avatar_url: user.avatar_url,
        is_profile_completed: isCompleted
      } 
    });
  } catch (error) {
    console.error('Error logging in:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/register-guest - Đăng ký nhanh tài khoản vãng lai (Guest)
router.post('/register-guest', onboardingRateLimiter, async (req, res) => {
  try {
    const { email, password, full_name } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Vui lòng cung cấp email và mật khẩu.' });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanName = (full_name && String(full_name).trim()) || 'Người chơi Vãng lai';

    if (password.length < 6) {
      return res.status(400).json({ error: 'Mật khẩu phải có độ dài tối thiểu là 6 ký tự.' });
    }

    // Check if email already registered
    const existingUser = await db.query(
      'SELECT id FROM users WHERE LOWER(email) = $1',
      [cleanEmail]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'Địa chỉ Email này đã được đăng ký trên hệ thống. Vui lòng đăng nhập.' });
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Insert guest account
    const insertResult = await db.query(
      `INSERT INTO users (
        full_name, email, password_hash, role,
        elo_singles, elo_doubles, rating_points,
        matches_singles, matches_doubles, matches_played,
        is_profile_completed, status
      ) VALUES (
        $1, $2, $3, 'guest',
        950, 950, 950,
        0, 0, 0,
        false, 'active'
      ) RETURNING id, full_name, email, role, is_profile_completed`,
      [cleanName, cleanEmail, passwordHash]
    );

    const newUser = insertResult.rows[0];

    // Issue JWT
    const token = jwt.sign(
      { 
        id: newUser.id, 
        role: newUser.role, 
        name: newUser.full_name,
        is_profile_completed: false
      },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.status(201).json({
      message: 'Đăng ký tài khoản thành công.',
      token,
      user: {
        id: newUser.id,
        name: newUser.full_name,
        email: newUser.email,
        role: newUser.role,
        is_profile_completed: false
      }
    });
  } catch (error) {
    console.error('Error in register-guest:', error);
    res.status(500).json({ error: 'Lỗi đăng ký tài khoản.' });
  }
});

// Helper xác thực / decode Google Token
async function verifyGoogleToken(credential) {
  if (!credential) return null;
  try {
    // 1. Thử gọi API tokeninfo của Google để xác thực chữ ký chính chủ từ Google OAuth
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const googleRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`, {
      signal: controller.signal
    });
    clearTimeout(timeout);
    
    if (googleRes.ok) {
      const payload = await googleRes.json();
      if (payload && payload.email) {
        return {
          email: payload.email.toLowerCase(),
          name: payload.name || payload.given_name || 'Người chơi',
          picture: payload.picture || null
        };
      }
    }
  } catch (e) {
    // Tiếp tục phương án decode JWT payload dự phòng nếu mạng bị chặn
  }

  // 2. Decode JWT an toàn không throw lỗi
  try {
    const parts = credential.split('.');
    if (parts.length === 3) {
      const decodedPayload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
      if (decodedPayload && decodedPayload.email) {
        return {
          email: decodedPayload.email.toLowerCase(),
          name: decodedPayload.name || decodedPayload.given_name || 'Người chơi',
          picture: decodedPayload.picture || null
        };
      }
    }
  } catch (err) {
    console.error('Error decoding google credential:', err);
  }
  return null;
}

// POST /api/auth/google - Đăng nhập / Đăng ký nhanh qua Google OAuth
router.post('/google', onboardingRateLimiter, async (req, res) => {
  try {
    const { credential, email, name, picture } = req.body;

    let googleData = null;
    if (credential) {
      googleData = await verifyGoogleToken(credential);
    }

    // Nếu gửi direct email (từ Google SDK client-side)
    if (!googleData && email) {
      googleData = {
        email: String(email).trim().toLowerCase(),
        name: name ? String(name).trim() : 'Người chơi',
        picture: picture || null
      };
    }

    if (!googleData || !googleData.email) {
      return res.status(400).json({ error: 'Không thể xác thực thông tin tài khoản Google.' });
    }

    // Kiểm tra xem email đã tồn tại trong DB chưa
    const userRes = await db.query(
      'SELECT id, full_name, email, role, phone_zalo, avatar_url, is_blocked, is_profile_completed FROM users WHERE LOWER(email) = $1',
      [googleData.email]
    );

    let user;
    if (userRes.rows.length > 0) {
      user = userRes.rows[0];

      if (user.is_blocked) {
        return res.status(403).json({ error: 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ Ban chủ nhiệm.' });
      }

      // Cập nhật avatar từ Google nếu user chưa có avatar
      if (!user.avatar_url && googleData.picture) {
        await db.query('UPDATE users SET avatar_url = $1 WHERE id = $2', [googleData.picture, user.id]);
        user.avatar_url = googleData.picture;
      }
    } else {
      // Người dùng mới -> Khởi tạo tài khoản Guest
      const insertRes = await db.query(
        `INSERT INTO users (
          full_name, email, avatar_url, role,
          elo_singles, elo_doubles, rating_points,
          matches_singles, matches_doubles, matches_played,
          is_profile_completed, status
        ) VALUES (
          $1, $2, $3, 'guest',
          950, 950, 950,
          0, 0, 0,
          false, 'active'
        ) RETURNING id, full_name, email, avatar_url, role, is_profile_completed`,
        [googleData.name, googleData.email, googleData.picture]
      );
      user = insertRes.rows[0];
    }

    const isCompleted = Boolean(user.is_profile_completed);
    const token = jwt.sign(
      { 
        id: user.id, 
        role: user.role, 
        name: user.full_name,
        is_profile_completed: isCompleted
      },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.full_name,
        email: user.email,
        role: user.role,
        phone_zalo: user.phone_zalo || null,
        avatar_url: user.avatar_url,
        is_profile_completed: isCompleted
      }
    });
  } catch (error) {
    console.error('Error in google auth:', error);
    res.status(500).json({ error: 'Lỗi xác thực Google.' });
  }
});

// POST /api/auth/onboarding - Hoàn tất hồ sơ Onboarding (3 trường bắt buộc: Họ tên, SĐT Zalo, Giới tính)
router.post('/onboarding', authenticateToken, onboardingRateLimiter, async (req, res) => {
  try {
    const userId = req.user.id;

    // 1. Validate dữ liệu qua Zod schema & chống honeypot bot
    const validation = validateOnboarding(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error, code: validation.code });
    }

    const { full_name, phone_zalo, gender, avatar_url } = validation.data;

    // 2. Kiểm tra xem phone_zalo đã có người khác sử dụng chưa
    const duplicateCheck = await db.query(
      'SELECT id FROM users WHERE phone_zalo = $1 AND id != $2',
      [phone_zalo, userId]
    );

    if (duplicateCheck.rows.length > 0) {
      return res.status(400).json({
        error: 'Số điện thoại Zalo này đã được đăng ký bởi một tài khoản khác. Vui lòng kiểm tra lại.',
        code: 'PHONE_ALREADY_EXISTS'
      });
    }

    // 3. Cập nhật thông tin Onboarding vào DB
    const updateRes = await db.query(
      `UPDATE users 
       SET full_name = $1, 
           phone_zalo = $2, 
           gender = $3, 
           avatar_url = COALESCE($4, avatar_url),
           is_profile_completed = true
       WHERE id = $5
       RETURNING id, full_name, phone_zalo, email, role, avatar_url, gender, is_profile_completed`,
      [full_name, phone_zalo, gender, avatar_url || null, userId]
    );

    if (updateRes.rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy người dùng.' });
    }

    const updatedUser = updateRes.rows[0];

    // 4. Cấp lại token JWT mới mang cờ is_profile_completed: true
    const freshToken = jwt.sign(
      {
        id: updatedUser.id,
        role: updatedUser.role,
        name: updatedUser.full_name,
        is_profile_completed: true
      },
      process.env.JWT_SECRET,
      { expiresIn: updatedUser.role === 'admin' ? '7d' : '30d' }
    );

    res.json({
      success: true,
      message: 'Hoàn tất thiết lập thông tin cá nhân thành công!',
      token: freshToken,
      user: {
        id: updatedUser.id,
        name: updatedUser.full_name,
        phone_zalo: updatedUser.phone_zalo,
        email: updatedUser.email,
        role: updatedUser.role,
        avatar_url: updatedUser.avatar_url,
        gender: updatedUser.gender,
        is_profile_completed: true
      }
    });
  } catch (error) {
    console.error('Error in onboarding:', error);
    res.status(500).json({ error: 'Lỗi cập nhật hồ sơ onboarding.' });
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

