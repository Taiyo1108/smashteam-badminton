const express = require('express');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const { authenticateToken, isAdmin } = require('../middleware/auth');
const {
  handleAnnouncementUploads,
  getPublicFileUrl,
  safeDeleteLocalUpload
} = require('../utils/announcementStorage');

const publicRouter = express.Router();
const adminRouter = express.Router();

const VALID_CATEGORIES = ['urgent', 'activity', 'shop', 'system', 'general'];

// Middleware trích xuất user tùy chọn cho các route công khai (không bắt buộc đăng nhập)
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    req.user = verified;
  } catch (err) {
    req.user = null;
  }
  next();
};

// Hàm validate URL an toàn (chỉ cho phép http, https hoặc đường dẫn cục bộ /uploads/)
function isSafeUrl(url) {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (trimmed.startsWith('/uploads/')) return true;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

// Helper phân tích danh sách ID đã đọc của khách từ query/body
function parseGuestReadIds(rawInput) {
  if (!rawInput) return [];
  let ids = [];
  if (Array.isArray(rawInput)) {
    ids = rawInput;
  } else if (typeof rawInput === 'string') {
    ids = rawInput.split(',');
  }
  return ids
    .map((v) => parseInt(v, 10))
    .filter((v) => Number.isInteger(v) && v > 0);
}

/* ==========================================================================
   PUBLIC ROUTES (/api/announcements)
   ========================================================================== */

/**
 * GET /api/announcements
 * Lấy danh sách thông báo công khai còn hiệu lực kèm trạng thái đọc và unread_count
 */
publicRouter.get('/', optionalAuth, async (req, res) => {
  try {
    const { category, page = 1, limit = 20, unread_only, guest_read_ids } = req.query;
    const userId = req.user?.id;
    const guestIds = parseGuestReadIds(guest_read_ids);
    const guestIdsSet = new Set(guestIds);

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const offset = (pageNum - 1) * limitNum;

    // Điều kiện thông báo còn hiệu lực: is_active = true, publish_at <= now, expires_at > now
    let whereClauses = [
      'a.is_active = TRUE',
      '(a.publish_at IS NULL OR a.publish_at <= CURRENT_TIMESTAMP)',
      '(a.expires_at IS NULL OR a.expires_at > CURRENT_TIMESTAMP)'
    ];
    let queryParams = [];

    if (category && VALID_CATEGORIES.includes(category)) {
      queryParams.push(category);
      whereClauses.push(`a.category = $${queryParams.length}`);
    }

    const baseWhere = whereClauses.join(' AND ');

    // Truy vấn danh sách
    let listSql;
    let listParams = [...queryParams];

    if (userId) {
      listParams.push(userId);
      const userParamIdx = listParams.length;

      listSql = `
        SELECT 
          a.id, a.title, a.content, a.category,
          a.image_url, a.attachment_url, a.attachment_name, a.attachment_size, a.attachment_mime_type,
          a.is_popup, a.priority, a.publish_at, a.expires_at, a.created_at, a.updated_at,
          (uar.read_at IS NOT NULL) AS is_read
        FROM announcements a
        LEFT JOIN user_announcement_reads uar 
          ON uar.announcement_id = a.id AND uar.user_id = $${userParamIdx}
        WHERE ${baseWhere}
      `;

      if (unread_only === 'true') {
        listSql += ' AND uar.read_at IS NULL';
      }

      listSql += ` ORDER BY a.priority DESC, a.created_at DESC, a.id DESC LIMIT $${listParams.length + 1} OFFSET $${listParams.length + 2}`;
      listParams.push(limitNum, offset);
    } else {
      listSql = `
        SELECT 
          a.id, a.title, a.content, a.category,
          a.image_url, a.attachment_url, a.attachment_name, a.attachment_size, a.attachment_mime_type,
          a.is_popup, a.priority, a.publish_at, a.expires_at, a.created_at, a.updated_at
        FROM announcements a
        WHERE ${baseWhere}
        ORDER BY a.priority DESC, a.created_at DESC, a.id DESC
        LIMIT $${listParams.length + 1} OFFSET $${listParams.length + 2}
      `;
      listParams.push(limitNum, offset);
    }

    const listResult = await pool.query(listSql, listParams);
    let announcements = listResult.rows;

    // Nếu là khách, gắn cờ is_read từ guestIdsSet
    if (!userId) {
      announcements = announcements.map((item) => ({
        ...item,
        is_read: guestIdsSet.has(item.id)
      }));

      if (unread_only === 'true') {
        announcements = announcements.filter((item) => !item.is_read);
      }
    }

    // Đếm tổng số thông báo thỏa mãn điều kiện
    const countSql = `SELECT COUNT(*)::int AS total FROM announcements a WHERE ${baseWhere}`;
    const countResult = await pool.query(countSql, queryParams);
    const total = countResult.rows[0].total;

    // Đếm số lượng unread_count thực tế
    let unreadCount = 0;
    if (userId) {
      const unreadSql = `
        SELECT COUNT(*)::int AS unread
        FROM announcements a
        WHERE ${baseWhere}
          AND NOT EXISTS (
            SELECT 1 FROM user_announcement_reads uar 
            WHERE uar.announcement_id = a.id AND uar.user_id = $${queryParams.length + 1}
          )
      `;
      const unreadRes = await pool.query(unreadSql, [...queryParams, userId]);
      unreadCount = unreadRes.rows[0].unread;
    } else {
      if (guestIds.length > 0) {
        const unreadSql = `
          SELECT COUNT(*)::int AS unread
          FROM announcements a
          WHERE ${baseWhere} AND a.id != ALL($${queryParams.length + 1}::int[])
        `;
        const unreadRes = await pool.query(unreadSql, [...queryParams, guestIds]);
        unreadCount = unreadRes.rows[0].unread;
      } else {
        unreadCount = total;
      }
    }

    res.json({
      announcements,
      unread_count: unreadCount,
      total,
      page: pageNum,
      limit: limitNum,
      total_pages: Math.ceil(total / limitNum)
    });
  } catch (error) {
    console.error('Error fetching announcements:', error);
    res.status(500).json({ error: 'Lỗi máy chủ khi tải danh sách thông báo.' });
  }
});

/**
 * GET /api/announcements/popup
 * Lấy duy nhất 1 thông báo pop-up mới nhất hợp lệ chưa đọc
 */
publicRouter.get('/popup', optionalAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    const guestIds = parseGuestReadIds(req.query.guest_read_ids);

    let whereClauses = [
      'a.is_active = TRUE',
      'a.is_popup = TRUE',
      '(a.publish_at IS NULL OR a.publish_at <= CURRENT_TIMESTAMP)',
      '(a.expires_at IS NULL OR a.expires_at > CURRENT_TIMESTAMP)'
    ];
    let params = [];

    if (userId) {
      params.push(userId);
      whereClauses.push(`
        NOT EXISTS (
          SELECT 1 FROM user_announcement_reads uar 
          WHERE uar.announcement_id = a.id AND uar.user_id = $${params.length}
        )
      `);
    } else if (guestIds.length > 0) {
      params.push(guestIds);
      whereClauses.push(`a.id != ALL($${params.length}::int[])`);
    }

    const sql = `
      SELECT 
        a.id, a.title, a.content, a.category,
        a.image_url, a.attachment_url, a.attachment_name, a.attachment_size, a.attachment_mime_type,
        a.is_popup, a.priority, a.publish_at, a.expires_at, a.created_at, a.updated_at
      FROM announcements a
      WHERE ${whereClauses.join(' AND ')}
      ORDER BY a.priority DESC, a.created_at DESC, a.id DESC
      LIMIT 1
    `;

    const result = await pool.query(sql, params);
    if (result.rows.length === 0) {
      return res.json({ announcement: null, has_popup: false });
    }

    return res.json({
      announcement: { ...result.rows[0], is_read: false },
      has_popup: true
    });
  } catch (error) {
    console.error('Error fetching popup announcement:', error);
    res.status(500).json({ error: 'Lỗi máy chủ khi kiểm tra thông báo pop-up.' });
  }
});

/**
 * GET /api/announcements/:id
 * Lấy chi tiết thông báo hợp lệ
 */
publicRouter.get('/:id', optionalAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'ID thông báo không hợp lệ.' });
    }

    const userId = req.user?.id;
    let sql;
    let params = [id];

    if (userId) {
      params.push(userId);
      sql = `
        SELECT 
          a.id, a.title, a.content, a.category,
          a.image_url, a.attachment_url, a.attachment_name, a.attachment_size, a.attachment_mime_type,
          a.is_popup, a.priority, a.publish_at, a.expires_at, a.created_at, a.updated_at,
          (uar.read_at IS NOT NULL) AS is_read
        FROM announcements a
        LEFT JOIN user_announcement_reads uar 
          ON uar.announcement_id = a.id AND uar.user_id = $2
        WHERE a.id = $1 
          AND a.is_active = TRUE
          AND (a.publish_at IS NULL OR a.publish_at <= CURRENT_TIMESTAMP)
          AND (a.expires_at IS NULL OR a.expires_at > CURRENT_TIMESTAMP)
      `;
    } else {
      sql = `
        SELECT 
          a.id, a.title, a.content, a.category,
          a.image_url, a.attachment_url, a.attachment_name, a.attachment_size, a.attachment_mime_type,
          a.is_popup, a.priority, a.publish_at, a.expires_at, a.created_at, a.updated_at
        FROM announcements a
        WHERE a.id = $1 
          AND a.is_active = TRUE
          AND (a.publish_at IS NULL OR a.publish_at <= CURRENT_TIMESTAMP)
          AND (a.expires_at IS NULL OR a.expires_at > CURRENT_TIMESTAMP)
      `;
    }

    const result = await pool.query(sql, params);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Thông báo không tồn tại hoặc đã hết hạn.' });
    }

    res.json({ announcement: result.rows[0] });
  } catch (error) {
    console.error('Error fetching announcement detail:', error);
    res.status(500).json({ error: 'Lỗi máy chủ khi lấy chi tiết thông báo.' });
  }
});

/**
 * POST /api/announcements/:id/read
 * Đánh dấu một thông báo đã đọc
 */
publicRouter.post('/:id/read', optionalAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'ID thông báo không hợp lệ.' });
    }

    const userId = req.user?.id;
    if (userId) {
      await pool.query(
        `INSERT INTO user_announcement_reads (user_id, announcement_id, read_at)
         VALUES ($1, $2, CURRENT_TIMESTAMP)
         ON CONFLICT (user_id, announcement_id) DO NOTHING`,
        [userId, id]
      );
      return res.json({ success: true, message: 'Đã đánh dấu đã đọc.', id });
    }

    // Đối với khách vãng lai, trả về thành công để client cập nhật localStorage
    return res.json({ success: true, message: 'Đã đánh dấu đã đọc (khách).', id });
  } catch (error) {
    console.error('Error marking announcement as read:', error);
    res.status(500).json({ error: 'Lỗi máy chủ khi đánh dấu đã đọc.' });
  }
});

/**
 * POST /api/announcements/read-all
 * Đánh dấu toàn bộ thông báo đang hoạt động và chưa hết hạn là đã đọc
 */
publicRouter.post('/read-all', optionalAuth, async (req, res) => {
  try {
    const userId = req.user?.id;

    if (userId) {
      await pool.query(`
        INSERT INTO user_announcement_reads (user_id, announcement_id, read_at)
        SELECT $1, a.id, CURRENT_TIMESTAMP
        FROM announcements a
        WHERE a.is_active = TRUE
          AND (a.publish_at IS NULL OR a.publish_at <= CURRENT_TIMESTAMP)
          AND (a.expires_at IS NULL OR a.expires_at > CURRENT_TIMESTAMP)
        ON CONFLICT (user_id, announcement_id) DO NOTHING
      `, [userId]);

      return res.json({ success: true, message: 'Đã đánh dấu tất cả thông báo là đã đọc.' });
    }

    // Với khách, lấy toàn bộ ID thông báo đang hoạt động để client lưu vào localStorage
    const activeRes = await pool.query(`
      SELECT id FROM announcements
      WHERE is_active = TRUE
        AND (publish_at IS NULL OR publish_at <= CURRENT_TIMESTAMP)
        AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
    `);
    const readIds = activeRes.rows.map((r) => r.id);

    return res.json({
      success: true,
      message: 'Đã đánh dấu tất cả thông báo là đã đọc (khách).',
      read_ids: readIds
    });
  } catch (error) {
    console.error('Error marking all announcements as read:', error);
    res.status(500).json({ error: 'Lỗi máy chủ khi đánh dấu tất cả đã đọc.' });
  }
});

/* ==========================================================================
   ADMIN ROUTES (/api/admin/announcements)
   Protected with authenticateToken & isAdmin
   ========================================================================== */

/**
 * GET /api/admin/announcements
 * Lấy tất cả thông báo (kể cả ẩn/hết hạn) và thống kê
 */
adminRouter.get('/', authenticateToken, isAdmin, async (req, res) => {
  try {
    const sql = `
      SELECT 
        a.*,
        u.name AS creator_name,
        u.email AS creator_email,
        (
          SELECT COUNT(*)::int 
          FROM user_announcement_reads uar 
          WHERE uar.announcement_id = a.id
        ) AS read_by_users_count
      FROM announcements a
      LEFT JOIN users u ON a.created_by = u.id
      ORDER BY a.priority DESC, a.created_at DESC, a.id DESC
    `;

    const result = await pool.query(sql);

    // Tính toán thống kê
    const statsSql = `
      SELECT 
        COUNT(*)::int AS total,
        COUNT(CASE WHEN is_active = TRUE AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP) THEN 1 END)::int AS active,
        COUNT(CASE WHEN is_active = TRUE AND is_popup = TRUE AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP) THEN 1 END)::int AS popup,
        COUNT(CASE WHEN expires_at IS NOT NULL AND expires_at <= CURRENT_TIMESTAMP THEN 1 END)::int AS expired,
        COUNT(CASE WHEN is_active = FALSE THEN 1 END)::int AS draft
      FROM announcements
    `;
    const statsRes = await pool.query(statsSql);

    res.json({
      announcements: result.rows,
      stats: statsRes.rows[0]
    });
  } catch (error) {
    console.error('Error fetching admin announcements:', error);
    res.status(500).json({ error: 'Lỗi máy chủ khi tải danh sách quản trị thông báo.' });
  }
});

/**
 * POST /api/admin/announcements
 * Tạo thông báo mới (hỗ trợ upload ảnh và tài liệu)
 */
adminRouter.post('/', authenticateToken, isAdmin, handleAnnouncementUploads, async (req, res) => {
  try {
    const {
      title,
      content,
      category = 'general',
      is_popup = 'true',
      is_active = 'false',
      priority = 0,
      publish_at,
      expires_at
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Tiêu đề thông báo là bắt buộc.' });
    }
    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Nội dung thông báo là bắt buộc.' });
    }

    const safeTitle = title.trim().slice(0, 255);
    const safeContent = content.trim();
    const safeCategory = VALID_CATEGORIES.includes(category) ? category : 'general';
    const safeIsPopup = String(is_popup).toLowerCase() === 'true';
    const safeIsActive = String(is_active).toLowerCase() === 'true';
    const safePriority = parseInt(priority, 10) || 0;

    let imageUrl = req.body.image_url ? req.body.image_url.trim() : null;
    let attachmentUrl = req.body.attachment_url ? req.body.attachment_url.trim() : null;
    let attachmentName = req.body.attachment_name ? req.body.attachment_name.trim() : null;
    let attachmentSize = null;
    let attachmentMimeType = null;

    // Xử lý tệp hình ảnh upload
    if (req.files?.image?.[0]) {
      const img = req.files.image[0];
      imageUrl = getPublicFileUrl(req, img.filename);
    }

    // Xử lý tệp tài liệu upload
    if (req.files?.attachment?.[0]) {
      const att = req.files.attachment[0];
      attachmentUrl = getPublicFileUrl(req, att.filename);
      attachmentName = att.originalname;
      attachmentSize = att.size;
      attachmentMimeType = att.mimetype;
    }

    // Validate URL nếu được cung cấp thủ công
    if (imageUrl && !isSafeUrl(imageUrl)) {
      return res.status(400).json({ error: 'URL hình ảnh không hợp lệ (phải bắt đầu bằng http:// hoặc https://).' });
    }
    if (attachmentUrl && !isSafeUrl(attachmentUrl)) {
      return res.status(400).json({ error: 'URL tài liệu không hợp lệ (phải bắt đầu bằng http:// hoặc https://).' });
    }

    const publishAtVal = publish_at ? new Date(publish_at) : null;
    const expiresAtVal = expires_at ? new Date(expires_at) : null;

    if (publishAtVal && expiresAtVal && publishAtVal >= expiresAtVal) {
      return res.status(400).json({ error: 'Thời gian hết hạn phải sau thời gian phát hành.' });
    }

    const insertSql = `
      INSERT INTO announcements (
        title, content, category,
        image_url, attachment_url, attachment_name, attachment_size, attachment_mime_type,
        is_popup, is_active, priority, publish_at, expires_at, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `;

    const result = await pool.query(insertSql, [
      safeTitle,
      safeContent,
      safeCategory,
      imageUrl,
      attachmentUrl,
      attachmentName,
      attachmentSize,
      attachmentMimeType,
      safeIsPopup,
      safeIsActive,
      safePriority,
      publishAtVal,
      expiresAtVal,
      req.user.id
    ]);

    res.status(201).json({
      announcement: result.rows[0],
      message: 'Tạo thông báo thành công.'
    });
  } catch (error) {
    console.error('Error creating announcement:', error);
    res.status(500).json({ error: 'Lỗi máy chủ khi tạo thông báo.' });
  }
});

/**
 * PUT /api/admin/announcements/:id
 * Chỉnh sửa thông báo
 */
adminRouter.put('/:id', authenticateToken, isAdmin, handleAnnouncementUploads, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'ID thông báo không hợp lệ.' });
    }

    const existingRes = await pool.query('SELECT * FROM announcements WHERE id = $1', [id]);
    if (existingRes.rows.length === 0) {
      return res.status(404).json({ error: 'Thông báo không tồn tại.' });
    }
    const current = existingRes.rows[0];

    const {
      title,
      content,
      category,
      is_popup,
      is_active,
      priority,
      publish_at,
      expires_at,
      remove_image,
      remove_attachment
    } = req.body;

    const safeTitle = title !== undefined ? title.trim().slice(0, 255) : current.title;
    const safeContent = content !== undefined ? content.trim() : current.content;
    const safeCategory = category && VALID_CATEGORIES.includes(category) ? category : current.category;
    const safeIsPopup = is_popup !== undefined ? String(is_popup).toLowerCase() === 'true' : current.is_popup;
    const safeIsActive = is_active !== undefined ? String(is_active).toLowerCase() === 'true' : current.is_active;
    const safePriority = priority !== undefined ? (parseInt(priority, 10) || 0) : current.priority;

    let imageUrl = current.image_url;
    let attachmentUrl = current.attachment_url;
    let attachmentName = current.attachment_name;
    let attachmentSize = current.attachment_size;
    let attachmentMimeType = current.attachment_mime_type;

    // Gỡ bỏ hình ảnh cũ nếu có yêu cầu
    if (String(remove_image) === 'true') {
      if (current.image_url) safeDeleteLocalUpload(current.image_url);
      imageUrl = null;
    }
    // Gỡ bỏ tài liệu cũ nếu có yêu cầu
    if (String(remove_attachment) === 'true') {
      if (current.attachment_url) safeDeleteLocalUpload(current.attachment_url);
      attachmentUrl = null;
      attachmentName = null;
      attachmentSize = null;
      attachmentMimeType = null;
    }

    // Nếu tải lên ảnh mới
    if (req.files?.image?.[0]) {
      if (current.image_url) safeDeleteLocalUpload(current.image_url);
      imageUrl = getPublicFileUrl(req, req.files.image[0].filename);
    } else if (req.body.image_url !== undefined && !req.files?.image) {
      imageUrl = req.body.image_url ? req.body.image_url.trim() : null;
    }

    // Nếu tải lên tài liệu mới
    if (req.files?.attachment?.[0]) {
      if (current.attachment_url) safeDeleteLocalUpload(current.attachment_url);
      const att = req.files.attachment[0];
      attachmentUrl = getPublicFileUrl(req, att.filename);
      attachmentName = att.originalname;
      attachmentSize = att.size;
      attachmentMimeType = att.mimetype;
    } else if (req.body.attachment_url !== undefined && !req.files?.attachment) {
      attachmentUrl = req.body.attachment_url ? req.body.attachment_url.trim() : null;
      if (req.body.attachment_name !== undefined) {
        attachmentName = req.body.attachment_name ? req.body.attachment_name.trim() : null;
      }
    }

    if (imageUrl && !isSafeUrl(imageUrl)) {
      return res.status(400).json({ error: 'URL hình ảnh không hợp lệ.' });
    }
    if (attachmentUrl && !isSafeUrl(attachmentUrl)) {
      return res.status(400).json({ error: 'URL tài liệu không hợp lệ.' });
    }

    const publishAtVal = publish_at !== undefined ? (publish_at ? new Date(publish_at) : null) : current.publish_at;
    const expiresAtVal = expires_at !== undefined ? (expires_at ? new Date(expires_at) : null) : current.expires_at;

    if (publishAtVal && expiresAtVal && publishAtVal >= expiresAtVal) {
      return res.status(400).json({ error: 'Thời gian hết hạn phải sau thời gian phát hành.' });
    }

    const updateSql = `
      UPDATE announcements
      SET 
        title = $1, content = $2, category = $3,
        image_url = $4, attachment_url = $5, attachment_name = $6, attachment_size = $7, attachment_mime_type = $8,
        is_popup = $9, is_active = $10, priority = $11, publish_at = $12, expires_at = $13,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $14
      RETURNING *
    `;

    const result = await pool.query(updateSql, [
      safeTitle,
      safeContent,
      safeCategory,
      imageUrl,
      attachmentUrl,
      attachmentName,
      attachmentSize,
      attachmentMimeType,
      safeIsPopup,
      safeIsActive,
      safePriority,
      publishAtVal,
      expiresAtVal,
      id
    ]);

    res.json({
      announcement: result.rows[0],
      message: 'Cập nhật thông báo thành công.'
    });
  } catch (error) {
    console.error('Error updating announcement:', error);
    res.status(500).json({ error: 'Lỗi máy chủ khi cập nhật thông báo.' });
  }
});

/**
 * PATCH /api/admin/announcements/:id/toggle
 * Chuyển đổi nhanh trạng thái is_active hoặc is_popup
 */
adminRouter.patch('/:id/toggle', authenticateToken, isAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'ID thông báo không hợp lệ.' });
    }

    const { field, value } = req.body;
    let sql;
    let params;

    if (field === 'is_active') {
      if (typeof value === 'boolean') {
        sql = 'UPDATE announcements SET is_active = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *';
        params = [value, id];
      } else {
        sql = 'UPDATE announcements SET is_active = NOT is_active, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *';
        params = [id];
      }
    } else if (field === 'is_popup') {
      if (typeof value === 'boolean') {
        sql = 'UPDATE announcements SET is_popup = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *';
        params = [value, id];
      } else {
        sql = 'UPDATE announcements SET is_popup = NOT is_popup, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *';
        params = [id];
      }
    } else {
      return res.status(400).json({ error: 'Trường cần chuyển đổi không hợp lệ (hỗ trợ is_active hoặc is_popup).' });
    }

    const result = await pool.query(sql, params);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Thông báo không tồn tại.' });
    }

    res.json({
      announcement: result.rows[0],
      message: 'Cập nhật trạng thái thành công.'
    });
  } catch (error) {
    console.error('Error toggling announcement:', error);
    res.status(500).json({ error: 'Lỗi máy chủ khi đổi trạng thái thông báo.' });
  }
});

/**
 * DELETE /api/admin/announcements/:id
 * Xóa thông báo
 */
adminRouter.delete('/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'ID thông báo không hợp lệ.' });
    }

    const existingRes = await pool.query('SELECT image_url, attachment_url FROM announcements WHERE id = $1', [id]);
    if (existingRes.rows.length === 0) {
      return res.status(404).json({ error: 'Thông báo không tồn tại.' });
    }

    const { image_url, attachment_url } = existingRes.rows[0];
    if (image_url) safeDeleteLocalUpload(image_url);
    if (attachment_url) safeDeleteLocalUpload(attachment_url);

    await pool.query('DELETE FROM announcements WHERE id = $1', [id]);

    res.json({ success: true, message: 'Đã xóa thông báo thành công.' });
  } catch (error) {
    console.error('Error deleting announcement:', error);
    res.status(500).json({ error: 'Lỗi máy chủ khi xóa thông báo.' });
  }
});

/**
 * PATCH /api/admin/announcements/:id/priority
 * Cập nhật điểm ưu tiên nhanh để thay đổi thứ tự hiển thị
 */
adminRouter.patch('/:id/priority', authenticateToken, isAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'ID thông báo không hợp lệ.' });
    }
    const { delta, priority } = req.body;
    let sql;
    let params;

    if (priority !== undefined) {
      sql = 'UPDATE announcements SET priority = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *';
      params = [parseInt(priority, 10) || 0, id];
    } else if (delta !== undefined) {
      sql = 'UPDATE announcements SET priority = GREATEST(0, priority + $1), updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *';
      params = [parseInt(delta, 10) || 0, id];
    } else {
      return res.status(400).json({ error: 'Cần cung cấp delta hoặc priority.' });
    }

    const result = await pool.query(sql, params);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Thông báo không tồn tại.' });
    }

    res.json({ announcement: result.rows[0], message: 'Cập nhật ưu tiên thành công.' });
  } catch (error) {
    console.error('Error updating announcement priority:', error);
    res.status(500).json({ error: 'Lỗi máy chủ khi cập nhật ưu tiên.' });
  }
});

module.exports = {
  publicRouter,
  adminRouter
};
