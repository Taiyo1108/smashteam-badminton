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

// POST /api/shop/buy - Mua sản phẩm (Chống spam, Row locking, Giới hạn mua, Cấp độ)
router.post('/buy', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const { itemId } = req.body;

  if (!itemId) {
    return res.status(400).json({ error: 'Thiếu thông tin sản phẩm (itemId).' });
  }

  // 1. Chống Spam (Cooldown 500ms)
  try {
    const lastPurchaseRes = await db.query(
      `SELECT purchased_at FROM user_inventory 
       WHERE user_id = $1 
       ORDER BY purchased_at DESC LIMIT 1`,
      [userId]
    );
    if (lastPurchaseRes.rows.length > 0) {
      const lastPurchase = new Date(lastPurchaseRes.rows[0].purchased_at);
      const now = new Date();
      if (now.getTime() - lastPurchase.getTime() < 500) {
        return res.status(429).json({ error: 'Bạn đang thao tác quá nhanh. Vui lòng đợi trong giây lát!' });
      }
    }
  } catch (err) {
    console.error('Error checking cooldown:', err);
  }

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    // 2. Khóa dòng dữ liệu (Row Locking) người dùng và sản phẩm
    const userRes = await client.query(
      `SELECT level, smash_coins FROM users WHERE id = $1 FOR UPDATE`,
      [userId]
    );
    if (userRes.rows.length === 0) {
      throw new Error('Không tìm thấy tài khoản người dùng.');
    }
    const user = userRes.rows[0];

    const itemRes = await client.query(
      `SELECT * FROM shop_items WHERE id = $1 AND is_active = true FOR UPDATE`,
      [itemId]
    );
    if (itemRes.rows.length === 0) {
      throw new Error('Sản phẩm không tồn tại hoặc đã bị ẩn.');
    }
    const item = itemRes.rows[0];

    // 3. Kiểm tra cấp độ SmashPass yêu cầu
    if (user.level < item.level_required) {
      return res.status(400).json({ error: `Yêu cầu Cấp độ ${item.level_required} trở lên để mua vật phẩm này (Cấp hiện tại của bạn: ${user.level}).` });
    }

    // 4. Kiểm tra giới hạn mua tối đa của mỗi người
    const ownedRes = await client.query(
      `SELECT COUNT(*)::int AS count FROM user_inventory 
       WHERE user_id = $1 AND shop_item_id = $2 AND (expires_at IS NULL OR expires_at > NOW())`,
      [userId, item.id]
    );
    const ownedCount = ownedRes.rows[0].count;
    if (ownedCount >= item.max_per_user) {
      return res.status(400).json({ error: `Bạn đã đạt giới hạn mua tối đa cho vật phẩm này (Tối đa: ${item.max_per_user} lần).` });
    }

    // 5. Kiểm tra số dư xu
    if (user.smash_coins < item.coin_price) {
      return res.status(400).json({ error: `Số xu không đủ. Bạn cần ${item.coin_price} xu nhưng chỉ có ${user.smash_coins} xu.` });
    }

    // 6. Kiểm tra tồn kho đối với quà vật lý
    if (item.item_type === 'physical' && item.stock <= 0) {
      return res.status(400).json({ error: 'Sản phẩm này đã hết hàng trong kho.' });
    }

    // 7. Thực hiện trừ xu
    await client.query(
      `UPDATE users SET smash_coins = smash_coins - $1 WHERE id = $2`,
      [item.coin_price, userId]
    );

    // 8. Trừ tồn kho nếu là quà vật lý
    if (item.item_type === 'physical') {
      await client.query(
        `UPDATE shop_items SET stock = stock - 1 WHERE id = $1`,
        [item.id]
      );
    }

    // 9. Xác định item_type và giá trị trong user_inventory
    let invItemType = 'physical';
    let invItemValue = null;
    let couponCode = null;

    if (item.item_type === 'virtual') {
      if (item.name.toLowerCase().includes('khung') || item.name.toLowerCase().includes('avatar')) {
        invItemType = 'avatar_frame';
        invItemValue = 'glory-neon';
      } else if (item.name.toLowerCase().includes('danh hiệu') || item.name.toLowerCase().includes('title') || item.name.toLowerCase().includes('smash king')) {
        invItemType = 'title';
        invItemValue = 'Smash King';
      } else {
        invItemType = 'virtual';
      }
    } else {
      // Quà vật lý -> Sinh mã Coupon thông minh dựa theo category
      let prefix = 'SM-ITEM';
      const cat = (item.category || '').toLowerCase();
      if (cat.includes('grip') || cat.includes('cán')) {
        prefix = 'SM-GRIP';
      } else if (cat.includes('drink') || cat.includes('nước') || cat.includes('uống')) {
        prefix = 'SM-DRK';
      } else if (cat.includes('apparel') || cat.includes('áo') || cat.includes('quần')) {
        prefix = 'SM-TEE';
      } else if (cat.includes('voucher') || cat.includes('giảm')) {
        prefix = 'SM-VOU';
      }

      // Tạo mã duy nhất
      let attempts = 0;
      while (attempts < 10) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 6; i++) {
          code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        const tempCode = `${prefix}-${code}`;

        const checkRes = await client.query('SELECT id FROM user_inventory WHERE coupon_code = $1', [tempCode]);
        if (checkRes.rows.length === 0) {
          couponCode = tempCode;
          break;
        }
        attempts++;
      }
      if (!couponCode) {
        throw new Error('Lỗi đồng bộ mã coupon, vui lòng thử lại.');
      }
    }

    // 10. Ghi nhận vào túi đồ
    await client.query(
      `INSERT INTO user_inventory (user_id, item_type, item_name, item_value, shop_item_id, coupon_code, status, purchase_price, purchased_at, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NULL)`,
      [
        userId,
        invItemType,
        item.name,
        invItemValue,
        item.id,
        couponCode,
        item.item_type === 'physical' ? 'unused' : 'unused',
        item.coin_price
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

// GET /api/shop/redemptions - Lấy danh sách chờ nhận quà (chỉ admin)
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

// PUT /api/shop/redemptions/:id/deliver - Xác nhận đã trao quà và ghi audit log (chỉ admin)
router.put('/redemptions/:id/deliver', authenticateToken, isAdmin, async (req, res) => {
  const redemptionId = req.params.id;
  const adminId = req.user.id;

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    // 1. Khóa bản ghi đổi quà để kiểm tra trùng lặp
    const redRes = await client.query(
      `SELECT ui.*, u.full_name AS member_name
       FROM user_inventory ui
       JOIN users u ON ui.user_id = u.id
       WHERE ui.id = $1 FOR UPDATE`,
      [redemptionId]
    );

    if (redRes.rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy yêu cầu đổi quà này.' });
    }

    const redemption = redRes.rows[0];

    // 2. Chặn Admin bấm đúp nút duyệt lần hai (Idempotency Check)
    if (redemption.status === 'redeemed') {
      return res.status(400).json({ error: 'Yêu cầu đổi quà này đã được xác nhận trao trước đó!' });
    }

    // 3. Cập nhật trạng thái
    await client.query(
      `UPDATE user_inventory
       SET status = 'redeemed', redeemed_at = NOW()
       WHERE id = $1`,
      [redemptionId]
    );

    // Fetch thông tin Admin phục vụ ghi log
    const adminRes = await client.query('SELECT full_name FROM users WHERE id = $1', [adminId]);
    const adminName = adminRes.rows[0]?.full_name || 'Admin';

    // 4. Ghi Audit Log vào bảng admin_logs
    const logDetails = `Admin ${adminName} đã trao quà "${redemption.item_name}" cho thành viên ${redemption.member_name} (Mã: ${redemption.coupon_code})`;
    await client.query(
      `INSERT INTO admin_logs (admin_id, action_type, details)
       VALUES ($1, 'deliver_item', $2)`,
      [adminId, logDetails]
    );

    await client.query('COMMIT');
    res.json({
      success: true,
      message: `Xác nhận trao quà: ${redemption.item_name} thành công!`
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error delivering redemption:', error);
    res.status(500).json({ error: 'Lỗi hệ thống khi xác nhận trao quà.' });
  } finally {
    client.release();
  }
});

// POST /api/shop/mystery-box - Mở hộp quà bí ẩn hàng ngày (Daily Box, Cooldown 24h)
router.post('/mystery-box', authenticateToken, async (req, res) => {
  const userId = req.user.id;

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    // 1. Kiểm tra Cooldown 24h
    const lastClaimRes = await client.query(
      `SELECT purchased_at FROM user_inventory
       WHERE user_id = $1 AND item_type = 'mystery_box_claim'
       ORDER BY purchased_at DESC LIMIT 1`,
      [userId]
    );

    const now = new Date();
    if (lastClaimRes.rows.length > 0) {
      const lastClaim = new Date(lastClaimRes.rows[0].purchased_at);
      const diffMs = now.getTime() - lastClaim.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);

      if (diffHours < 24) {
        const remainingHours = Math.ceil(24 - diffHours);
        return res.status(400).json({ 
          error: `Hộp quà đang trong thời gian chờ. Vui lòng quay lại sau ${remainingHours} giờ!` 
        });
      }
    }

    // 2. Quay thưởng ngẫu nhiên
    // 70% -> Smash Coins (10-30), 20% -> Streak Shield (1-2), 10% -> Khung Avatar Vinh Quang (7 Ngày)
    const rand = Math.random() * 100;
    let rewardType = '';
    let rewardName = '';
    let rewardValue = '';
    let expiresAt = null;

    if (rand < 70) {
      // 70% -> Coins
      rewardType = 'coins';
      const coinsAwarded = Math.floor(Math.random() * 21) + 10; // 10 to 30
      rewardName = `${coinsAwarded} Smash Coins`;
      rewardValue = coinsAwarded.toString();
      
      await client.query(
        `UPDATE users SET smash_coins = smash_coins + $1 WHERE id = $2`,
        [coinsAwarded, userId]
      );
    } else if (rand < 90) {
      // 20% -> Streak Shield
      rewardType = 'streak_shield';
      const shieldsAwarded = Math.floor(Math.random() * 2) + 1; // 1 to 2
      rewardName = `${shieldsAwarded} Khiên bảo vệ chuỗi`;
      rewardValue = shieldsAwarded.toString();

      await client.query(
        `UPDATE users SET streak_shields = streak_shields + $1 WHERE id = $2`,
        [shieldsAwarded, userId]
      );
    } else {
      // 10% -> Khung Avatar Vinh Quang 7 ngày
      rewardType = 'avatar_frame';
      rewardName = 'Khung Avatar Vinh Quang (7 Ngày)';
      rewardValue = 'glory-neon';
      
      // Có thời hạn 7 ngày
      const sevenDays = new Date();
      sevenDays.setDate(sevenDays.getDate() + 7);
      expiresAt = sevenDays;

      await client.query(
        `INSERT INTO user_inventory (user_id, item_type, item_name, item_value, is_equipped, expires_at)
         VALUES ($1, $2, $3, $4, false, $5)`,
        [userId, rewardType, rewardName, rewardValue, expiresAt]
      );
    }

    // 3. Ghi nhận claim vào inventory để giữ cooldown
    await client.query(
      `INSERT INTO user_inventory (user_id, item_type, item_name, item_value, purchased_at)
       VALUES ($1, 'mystery_box_claim', $2, $3, NOW())`,
      [userId, `Hộp quà hàng ngày (${rewardType})`, rewardValue]
    );

    await client.query('COMMIT');
    res.json({
      success: true,
      message: `Chúc mừng bạn đã nhận được: ${rewardName}!`,
      reward: {
        type: rewardType,
        name: rewardName,
        value: rewardValue,
        expiresAt
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error opening mystery box:', error);
    res.status(500).json({ error: 'Lỗi hệ thống khi mở hộp quà.' });
  } finally {
    client.release();
  }
});

module.exports = router;
