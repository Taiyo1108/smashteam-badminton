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
         AND start_date <= CURRENT_TIMESTAMP 
         AND end_date >= CURRENT_TIMESTAMP
       ORDER BY start_date DESC LIMIT 1`
    );

    if (campaignResult.rows.length === 0) {
      return res.json(null); // Không có đợt tuyển nào
    }

    const campaign = campaignResult.rows[0];

    // Lấy danh sách slots cho đợt này
    const slotsResult = await db.query(
      `SELECT * FROM casting_slots WHERE campaign_id = $1 ORDER BY casting_time ASC`,
      [campaign.id]
    );

    res.json({
      ...campaign,
      slots: slotsResult.rows
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/campaigns - Lấy danh sách tất cả đợt tuyển (Admin)
router.get('/', authenticateToken, isAdmin, async (req, res) => {
  try {
    const result = await db.query(`SELECT * FROM recruitment_campaigns ORDER BY start_date DESC`);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/campaigns - Tạo đợt tuyển mới (Admin)
router.post('/', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { name, start_date, end_date, is_active } = req.body;
    
    // Nếu active đợt này, tắt hết các đợt active cũ
    if (is_active) {
      await db.query(`UPDATE recruitment_campaigns SET is_active = false`);
    }

    const result = await db.query(
      `INSERT INTO recruitment_campaigns (name, start_date, end_date, is_active)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [name, start_date, end_date, is_active]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
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

// PUT /api/campaigns/:id - Cập nhật chiến dịch
router.put('/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, start_date, end_date, is_active } = req.body;
    
    if (is_active) {
      await db.query(`UPDATE recruitment_campaigns SET is_active = false WHERE id != $1`, [id]);
    }

    const result = await db.query(
      `UPDATE recruitment_campaigns 
       SET name = $1, start_date = $2, end_date = $3, is_active = $4 
       WHERE id = $5 RETURNING *`,
      [name, start_date, end_date, is_active, id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
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
