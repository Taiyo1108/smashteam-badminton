const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, isAdmin } = require('../middleware/auth');

// GET /api/campaigns/active - Lấy chiến dịch tuyển thành viên đang diễn ra
router.get('/active', async (req, res) => {
  try {
    const campaignResult = await db.query(
      `SELECT * FROM recruitment_campaigns 
       WHERE is_active = true 
       ORDER BY start_date DESC LIMIT 1`
    );

    if (campaignResult.rows.length === 0) {
      return res.json(null); // Không có đợt tuyển nào
    }

    const campaign = campaignResult.rows[0];

    // Lấy danh sách slots cho đợt này kèm số lượng ứng viên đã đăng ký
    const slotsResult = await db.query(
      `SELECT s.*, 
        (SELECT COUNT(*) FROM users u WHERE u.casting_slot_id = s.id) as registered_count
       FROM casting_slots s 
       WHERE s.campaign_id = $1 
       ORDER BY s.casting_time ASC`,
      [campaign.id]
    );

    // Lấy tổng số lượng hồ sơ nộp cho đợt tuyển này
    const totalResult = await db.query(
      `SELECT COUNT(*) FROM users u 
       JOIN casting_slots s ON u.casting_slot_id = s.id 
       WHERE s.campaign_id = $1`,
      [campaign.id]
    );
    const total_registered = parseInt(totalResult.rows[0]?.count || '0');

    res.json({
      ...campaign,
      total_registered,
      slots: slotsResult.rows
    });
  } catch (error) {
    console.error('Error fetching active campaign:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/campaigns - Lấy danh sách tất cả đợt tuyển (Active & Lịch sử)
router.get('/', authenticateToken, isAdmin, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT c.*,
        (SELECT COUNT(*) FROM users u JOIN casting_slots s ON u.casting_slot_id = s.id WHERE s.campaign_id = c.id) as total_registered,
        (SELECT COUNT(*) FROM casting_slots s WHERE s.campaign_id = c.id) as total_slots,
        (SELECT COALESCE(SUM(s.max_capacity), 0) FROM casting_slots s WHERE s.campaign_id = c.id) as total_capacity
       FROM recruitment_campaigns c 
       ORDER BY c.is_active DESC, c.start_date DESC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching campaigns list:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/campaigns - Tạo đợt tuyển mới (Admin)
router.post('/', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { 
      name, start_date, end_date, is_active, 
      badge_text, description, location, target_audience, target_capacity, timeline_steps 
    } = req.body;
    
    if (!name || !start_date || !end_date) {
      return res.status(400).json({ error: 'Vui lòng cung cấp Tên chiến dịch, Ngày bắt đầu và Ngày kết thúc.' });
    }

    const active = is_active === true || is_active === 'true';

    // Nếu kích hoạt đợt này, chuyển các đợt khác vào lịch sử (is_active = false)
    if (active) {
      await db.query(`UPDATE recruitment_campaigns SET is_active = false`);
    }

    const result = await db.query(
      `INSERT INTO recruitment_campaigns (
        name, start_date, end_date, is_active,
        badge_text, description, location, target_audience, target_capacity, timeline_steps
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [
        name, 
        start_date, 
        end_date, 
        active,
        badge_text || 'Mùa Tuyển Quân 2026',
        description || '',
        location || 'Sân Cầu Lông Lan Anh, 291 CMT8, Q.10, TP.HCM',
        target_audience || 'Mọi cấp độ tay vợt',
        target_capacity || 60,
        timeline_steps ? (typeof timeline_steps === 'string' ? timeline_steps : JSON.stringify(timeline_steps)) : null
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating campaign:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/campaigns/:id/slots - Thêm ca casting vào đợt (Admin)
router.post('/:id/slots', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { casting_time, location, max_capacity } = req.body;

    const result = await db.query(
      `INSERT INTO casting_slots (campaign_id, casting_time, location, max_capacity)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [id, casting_time, location, max_capacity]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/campaigns/:id - Cập nhật chiến dịch theo thời gian thực (Admin)
router.put('/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      name, start_date, end_date, is_active,
      badge_text, description, location, target_audience, target_capacity, timeline_steps
    } = req.body;
    
    const active = is_active === true || is_active === 'true';

    if (active) {
      await db.query(`UPDATE recruitment_campaigns SET is_active = false WHERE id != $1`, [id]);
    }

    const result = await db.query(
      `UPDATE recruitment_campaigns 
       SET 
         name = COALESCE($1, name), 
         start_date = COALESCE($2, start_date), 
         end_date = COALESCE($3, end_date), 
         is_active = $4,
         badge_text = COALESCE($5, badge_text),
         description = COALESCE($6, description),
         location = COALESCE($7, location),
         target_audience = COALESCE($8, target_audience),
         target_capacity = COALESCE($9, target_capacity),
         timeline_steps = COALESCE($10, timeline_steps)
       WHERE id = $11 RETURNING *`,
      [
        name, start_date, end_date, active,
        badge_text, description, location, target_audience, target_capacity,
        timeline_steps ? (typeof timeline_steps === 'string' ? timeline_steps : JSON.stringify(timeline_steps)) : null,
        id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy chiến dịch.' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating campaign:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/campaigns/:id/toggle-active - Bật/Tắt kích hoạt chiến dịch (Admin)
router.put('/:id/toggle-active', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const curr = await db.query(`SELECT is_active FROM recruitment_campaigns WHERE id = $1`, [id]);
    if (curr.rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy chiến dịch.' });
    }

    const newStatus = !curr.rows[0].is_active;

    if (newStatus) {
      await db.query(`UPDATE recruitment_campaigns SET is_active = false WHERE id != $1`, [id]);
    }

    const result = await db.query(
      `UPDATE recruitment_campaigns SET is_active = $1 WHERE id = $2 RETURNING *`,
      [newStatus, id]
    );

    res.json({
      success: true,
      message: newStatus ? 'Đã kích hoạt chiến dịch tuyển quân lên trang chủ!' : 'Đã tạm dừng nhận đơn chiến dịch.',
      campaign: result.rows[0]
    });
  } catch (error) {
    console.error('Error toggling campaign active status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/campaigns/:id/stats - Thống kê chi tiết Đợt tuyển
router.get('/:id/stats', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Lấy thông tin đợt tuyển
    const campaignResult = await db.query(`SELECT * FROM recruitment_campaigns WHERE id = $1`, [id]);
    if (campaignResult.rows.length === 0) return res.status(404).json({ error: 'Campaign not found' });
    const campaign = campaignResult.rows[0];

    // Lấy tổng số đăng ký
    const totalResult = await db.query(
      `SELECT COUNT(*) FROM users u JOIN casting_slots s ON u.casting_slot_id = s.id WHERE s.campaign_id = $1`, 
      [id]
    );
    const total_registered = parseInt(totalResult.rows[0].count);

    // Lấy các slots kèm số lượng đăng ký
    const slotsResult = await db.query(
      `SELECT s.*, (SELECT COUNT(*) FROM users u WHERE u.casting_slot_id = s.id) as registered_count
       FROM casting_slots s WHERE s.campaign_id = $1 ORDER BY s.casting_time ASC`,
      [id]
    );

    res.json({
      ...campaign,
      total_registered,
      slots: slotsResult.rows
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/campaigns/slots/:id - Sửa ca casting (hoặc Toggle is_active)
router.put('/slots/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { casting_time, location, max_capacity, is_active } = req.body;

    const result = await db.query(
      `UPDATE casting_slots 
       SET casting_time = $1, location = $2, max_capacity = $3, is_active = $4
       WHERE id = $5 RETURNING *`,
      [casting_time, location, max_capacity, is_active, id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/campaigns/slots/:id - Xóa ca casting
router.delete('/slots/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Check registered count
    const countResult = await db.query(`SELECT COUNT(*) FROM users WHERE casting_slot_id = $1`, [id]);
    if (parseInt(countResult.rows[0].count) > 0) {
      return res.status(400).json({ error: 'Không thể xóa ca casting đã có ứng viên đăng ký. Vui lòng chuyển ứng viên sang ca khác hoặc Đóng ca này.' });
    }

    await db.query(`DELETE FROM casting_slots WHERE id = $1`, [id]);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
