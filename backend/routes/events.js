const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, isAdmin } = require('../middleware/auth');

// Helper đồng bộ sự kiện nổi bật vào site_settings để trang chủ nhận ngay tức thì
async function syncToSiteSettings(event) {
  if (!event) return;
  const updates = [
    ['featured_event_title', event.title || ''],
    ['featured_event_subtitle', event.subtitle || ''],
    ['featured_event_date', event.event_date ? new Date(event.event_date).toISOString() : ''],
    ['featured_event_location', event.location || ''],
    ['featured_event_badge', event.badge || 'GIẢI ĐẤU NỔI BẬT'],
    ['featured_event_action_text', event.action_text || 'Đăng ký tham gia ngay'],
    ['featured_event_action_link', event.action_link || '/schedule'],
    ['featured_event_enabled', 'true']
  ];

  for (const [key, value] of updates) {
    await db.query(
      `INSERT INTO site_settings (key, value, updated_at)
       VALUES ($1, $2, CURRENT_TIMESTAMP)
       ON CONFLICT (key)
       DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP`,
      [key, value]
    );
  }
}

// GET /api/events - Lấy danh sách sự kiện & giải đấu (hỗ trợ lọc status: all, active, history)
router.get('/', async (req, res) => {
  try {
    const { status } = req.query;
    let query = 'SELECT * FROM club_events';
    const params = [];

    if (status === 'history') {
      query += ` WHERE status IN ('completed', 'cancelled') OR event_date < CURRENT_TIMESTAMP`;
    } else if (status === 'active' || status === 'upcoming') {
      query += ` WHERE status IN ('upcoming', 'ongoing') AND event_date >= CURRENT_TIMESTAMP - INTERVAL '1 day'`;
    }

    query += ' ORDER BY is_featured DESC, event_date DESC';
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching club events:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/events/featured - Lấy sự kiện đang nổi bật
router.get('/featured', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT * FROM club_events WHERE is_featured = true ORDER BY created_at DESC LIMIT 1`
    );
    if (result.rows.length === 0) {
      // Nếu chưa có, lấy sự kiện sắp tới gần nhất
      const fallback = await db.query(
        `SELECT * FROM club_events WHERE status = 'upcoming' ORDER BY event_date ASC LIMIT 1`
      );
      return res.json(fallback.rows[0] || null);
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching featured event:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/events - Tạo sự kiện/giải đấu mới (Admin)
router.post('/', authenticateToken, isAdmin, async (req, res) => {
  try {
    const {
      title, subtitle, event_date, location, badge,
      action_text, action_link, is_featured, status,
      max_participants, description, results_summary
    } = req.body;

    if (!title || !event_date || !location) {
      return res.status(400).json({ error: 'Vui lòng điền đầy đủ Tiêu đề, Ngày giờ và Địa điểm sự kiện.' });
    }

    const featured = is_featured === true || is_featured === 'true';

    // Nếu đặt làm nổi bật, gỡ nổi bật các sự kiện khác
    if (featured) {
      await db.query(`UPDATE club_events SET is_featured = false`);
    }

    const result = await db.query(
      `INSERT INTO club_events (
        title, subtitle, event_date, location, badge, action_text, action_link,
        is_featured, status, max_participants, description, results_summary
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [
        title,
        subtitle || '',
        event_date,
        location,
        badge || 'GIẢI ĐẤU NỔI BẬT',
        action_text || 'Đăng ký tham gia ngay',
        action_link || '/schedule',
        featured,
        status || 'upcoming',
        max_participants || 50,
        description || '',
        results_summary || ''
      ]
    );

    const newEvent = result.rows[0];

    // Đồng bộ vào site_settings nếu là sự kiện nổi bật
    if (featured) {
      await syncToSiteSettings(newEvent);
    }

    res.status(201).json(newEvent);
  } catch (error) {
    console.error('Error creating club event:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/events/:id - Chỉnh sửa sự kiện/giải đấu theo thời gian thực (Admin)
router.put('/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title, subtitle, event_date, location, badge,
      action_text, action_link, is_featured, status,
      participants_count, max_participants, description, results_summary
    } = req.body;

    const featured = is_featured === true || is_featured === 'true';

    if (featured) {
      await db.query(`UPDATE club_events SET is_featured = false WHERE id != $1`, [id]);
    }

    const result = await db.query(
      `UPDATE club_events
       SET 
         title = COALESCE($1, title),
         subtitle = COALESCE($2, subtitle),
         event_date = COALESCE($3, event_date),
         location = COALESCE($4, location),
         badge = COALESCE($5, badge),
         action_text = COALESCE($6, action_text),
         action_link = COALESCE($7, action_link),
         is_featured = $8,
         status = COALESCE($9, status),
         participants_count = COALESCE($10, participants_count),
         max_participants = COALESCE($11, max_participants),
         description = COALESCE($12, description),
         results_summary = COALESCE($13, results_summary)
       WHERE id = $14
       RETURNING *`,
      [
        title, subtitle, event_date, location, badge, action_text, action_link,
        featured, status, participants_count, max_participants, description, results_summary,
        id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy sự kiện này.' });
    }

    const updatedEvent = result.rows[0];

    // Đồng bộ tức thì nếu đang là sự kiện nổi bật
    if (featured) {
      await syncToSiteSettings(updatedEvent);
    }

    res.json(updatedEvent);
  } catch (error) {
    console.error('Error updating club event:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/events/:id/set-featured - Đặt 1 sự kiện thành sự kiện nổi bật trên trang chủ (Admin)
router.put('/:id/set-featured', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Bỏ cờ nổi bật của toàn bộ sự kiện khác
    await db.query(`UPDATE club_events SET is_featured = false WHERE id != $1`, [id]);

    // Bật nổi bật cho sự kiện này
    const result = await db.query(
      `UPDATE club_events SET is_featured = true WHERE id = $1 RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy sự kiện.' });
    }

    const featuredEvent = result.rows[0];

    // Đồng bộ lập tức vào site_settings để trang chủ cập nhật đếm ngược ngay
    await syncToSiteSettings(featuredEvent);

    res.json({
      success: true,
      message: `Đã đặt "${featuredEvent.title}" làm sự kiện đếm ngược nổi bật trên Trang Chủ!`,
      event: featuredEvent
    });
  } catch (error) {
    console.error('Error setting featured event:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/events/:id - Xóa sự kiện (Admin)
router.delete('/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await db.query(`DELETE FROM club_events WHERE id = $1`, [id]);
    res.json({ success: true, message: 'Đã xóa sự kiện thành công.' });
  } catch (error) {
    console.error('Error deleting club event:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
