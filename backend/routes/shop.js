const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, isAdmin } = require('../middleware/auth');

// GET /api/shop/items - Lấy danh sách sản phẩm hoạt động
router.get('/items', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT * FROM shop_items WHERE is_active = true ORDER BY id ASC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching shop items:', error);
    res.status(500).json({ error: 'Lỗi hệ thống khi lấy danh sách sản phẩm.' });
  }
});

// POST /api/shop/buy - Mua sản phẩm
router.post('/buy', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const { itemId } = req.body;

  if (!itemId) {
    return res.status(400).json({ error: 'Thiếu thông tin sản phẩm (itemId).' });
  }

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    // 1. Khóa thông tin người dùng và sản phẩm bằng FOR UPDATE để tránh Race Conditions
    const userRes = await client.query(
      `SELECT smash_coins FROM users WHERE id = $1 FOR UPDATE`,
      [userId]
    );
    if (userRes.rows.length === 0) {
      throw new Error('Không tìm thấy thông tin tài khoản người dùng.');
    }
    const user = userRes.rows[0];

    const itemRes = await client.query(
      `SELECT * FROM shop_items WHERE id = $1 AND is_active = true FOR UPDATE`,
      [itemId]
    );
    if (itemRes.rows.length === 0) {
      throw new Error('Sản phẩm không tồn tại hoặc đã bị khóa.');
    }
    const item = itemRes.rows[0];

    // 2. Kiểm tra số dư xu
    if (user.smash_coins < item.coin_price) {
      return res.status(400).json({ error: `Số xu không đủ. Bạn cần ${item.coin_price} xu nhưng chỉ có ${user.smash_coins} xu.` });
    }

    // 3. Nếu là đồ vật lý, kiểm tra tồn kho
    if (item.item_type === 'physical' && item.stock <= 0) {
      return res.status(400).json({ error: 'Sản phẩm này đã hết hàng trong kho.' });
    }

    // 4. Trừ xu của người chơi
    await client.query(
      `UPDATE users SET smash_coins = smash_coins - $1 WHERE id = $2`,
      [item.coin_price, userId]
    );

    // 5. Nếu là đồ vật lý, trừ 1 sản phẩm trong kho
    if (item.item_type === 'physical') {
      await client.query(
        `UPDATE shop_items SET stock = stock - 1 WHERE id = $1`,
        [item.id]
      );
    }

    // 6. Xác định item_type và value trong user_inventory
    let invItemType = 'physical';
    let invItemValue = null;
    let couponCode = null;

    if (item.item_type === 'virtual') {
      if (item.name.toLowerCase().includes('khung') || item.name.toLowerCase().includes('avatar')) {
        invItemType = 'avatar_frame';
        invItemValue = 'glory-neon'; // Giá trị khung viền ảo mẫu
      } else if (item.name.toLowerCase().includes('danh hiệu') || item.name.toLowerCase().includes('title') || item.name.toLowerCase().includes('smash king')) {
        invItemType = 'title';
        invItemValue = 'Smash King';
      } else {
        invItemType = 'virtual';
      }
    } else {
      // Đồ vật lý -> tạo coupon code ngẫu nhiên duy nhất
      let attempts = 0;
      while (attempts < 10) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 6; i++) {
          code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        const tempCode = `SMASH-${code}`;

        const checkRes = await client.query('SELECT id FROM user_inventory WHERE coupon_code = $1', [tempCode]);
        if (checkRes.rows.length === 0) {
          couponCode = tempCode;
          break;
        }
        attempts++;
      }
      if (!couponCode) {
        throw new Error('Không thể tạo mã Coupon duy nhất, vui lòng thử lại.');
      }
    }

    // 7. Thêm vật phẩm vào túi đồ
    await client.query(
      `INSERT INTO user_inventory (user_id, item_type, item_name, item_value, shop_item_id, coupon_code, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        userId,
        invItemType,
        item.name,
        invItemValue,
        item.id,
        couponCode,
        item.item_type === 'physical' ? 'unused' : 'unused'
      ]
    );

    await client.query('COMMIT');
    res.json({
      success: true,
      message: `Đổi thành công: ${item.name}!`,
      couponCode
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error buying item:', error);
    res.status(500).json({ error: error.message || 'Lỗi hệ thống khi thực hiện đổi quà.' });
  } finally {
    client.release();
  }
});

// GET /api/admin/redemptions - Lấy danh sách chờ nhận quà (chỉ admin)
router.get('/redemptions', authenticateToken, isAdmin, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT ui.id, u.full_name AS member_name, ui.item_name, ui.coupon_code, ui.acquired_at
       FROM user_inventory ui
       JOIN users u ON ui.user_id = u.id
       WHERE ui.status = 'unused' AND ui.coupon_code IS NOT NULL
       ORDER BY ui.acquired_at DESC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching redemptions:', error);
    res.status(500).json({ error: 'Lỗi hệ thống khi lấy danh sách đổi quà.' });
  }
});

// PUT /api/admin/redemptions/:id/deliver - Xác nhận đã trao quà (chỉ admin)
router.put('/redemptions/:id/deliver', authenticateToken, isAdmin, async (req, res) => {
  const redemptionId = req.params.id;
  try {
    const result = await db.query(
      `UPDATE user_inventory
       SET status = 'redeemed', redeemed_at = NOW()
       WHERE id = $1 AND status = 'unused' AND coupon_code IS NOT NULL
       RETURNING id, item_name`,
      [redemptionId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy yêu cầu đổi quà chưa sử dụng này.' });
    }

    res.json({
      success: true,
      message: `Xác nhận trao quà: ${result.rows[0].item_name} thành công!`
    });
  } catch (error) {
    console.error('Error delivering redemption:', error);
    res.status(500).json({ error: 'Lỗi hệ thống khi xác nhận trao quà.' });
  }
});

module.exports = router;
