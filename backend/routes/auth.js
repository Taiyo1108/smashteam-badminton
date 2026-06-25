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

module.exports = router;
