const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const db = require('../db');
const { upload, cloudinary } = require('../utils/cloudinary');
const { authenticateToken, isAdmin } = require('../middleware/auth');

// Helper function to extract public_id from Cloudinary URL
function getPublicIdFromUrl(url) {
  if (!url || !url.includes('res.cloudinary.com')) return null;
  try {
    const parts = url.split('/upload/');
    if (parts.length < 2) return null;
    
    const pathAfterUpload = parts[1];
    const pathParts = pathAfterUpload.split('/');
    
    let startIndex = 0;
    if (pathParts[0].startsWith('v') || !isNaN(pathParts[0])) {
      startIndex = 1;
    }
    
    const fileWithExtension = pathParts.slice(startIndex).join('/');
    const publicId = fileWithExtension.substring(0, fileWithExtension.lastIndexOf('.'));
    return publicId;
  } catch (e) {
    console.error('Error parsing public_id from Cloudinary URL:', e);
    return null;
  }
}

// Helper to safely delete stored media file (Cloudinary or local /uploads/)
async function deleteStoredMedia(contentUrl) {
  if (!contentUrl) return;
  try {
    if (contentUrl.includes('res.cloudinary.com')) {
      const publicId = getPublicIdFromUrl(contentUrl);
      if (publicId) {
        console.log(`Deleting image from Cloudinary: ${publicId}`);
        await cloudinary.uploader.destroy(publicId);
      }
    } else if (contentUrl.includes('/uploads/')) {
      const filename = path.basename(contentUrl.split('/uploads/')[1] || '');
      const uploadsDir = path.join(__dirname, '..', 'uploads');
      const localPath = path.join(uploadsDir, filename);
      if (fs.existsSync(localPath)) {
        fs.unlinkSync(localPath);
      }
    }
  } catch (e) {
    console.warn('[Media Storage] Error deleting media file:', e.message);
  }
}

// GET /api/media - Lấy danh sách media posts theo thứ tự hiển thị sắp xếp (display_order)
router.get('/', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, title, content_url, is_featured, display_order, created_at 
       FROM media_posts 
       ORDER BY display_order ASC, created_at DESC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching media posts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/media/reorder - Sắp xếp lại toàn bộ thứ tự hiển thị của các bài đăng
router.put('/reorder', authenticateToken, isAdmin, async (req, res) => {
  const client = await db.connect();
  try {
    const { ordered_ids } = req.body;
    if (!Array.isArray(ordered_ids) || ordered_ids.length === 0) {
      return res.status(400).json({ error: 'ordered_ids phải là mảng các ID bài viết.' });
    }

    await client.query('BEGIN');
    for (let i = 0; i < ordered_ids.length; i++) {
      await client.query(
        'UPDATE media_posts SET display_order = $1 WHERE id = $2',
        [i, ordered_ids[i]]
      );
    }
    await client.query('COMMIT');

    res.json({ message: 'Sắp xếp thứ tự bài viết thành công!', count: ordered_ids.length });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error reordering media posts:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// PATCH /api/media/:id/move - Di chuyển một bài đăng lên (up) hoặc xuống (down) 1 bậc
router.patch('/:id/move', authenticateToken, isAdmin, async (req, res) => {
  const client = await db.connect();
  try {
    const { id } = req.params;
    const { direction } = req.body; // 'up' | 'down'
    if (direction !== 'up' && direction !== 'down') {
      return res.status(400).json({ error: 'Hướng di chuyển phải là "up" hoặc "down".' });
    }

    await client.query('BEGIN');
    const listRes = await client.query(
      'SELECT id, display_order FROM media_posts ORDER BY display_order ASC, created_at DESC'
    );
    const posts = listRes.rows;
    const currentIndex = posts.findIndex((p) => p.id === id);

    if (currentIndex === -1) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Bài viết không tồn tại.' });
    }

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= posts.length) {
      await client.query('COMMIT');
      return res.json({ message: 'Bài viết đã ở vị trí giới hạn.', changed: false });
    }

    // Đổi chỗ 2 bài viết trong danh sách
    const temp = posts[currentIndex];
    posts[currentIndex] = posts[targetIndex];
    posts[targetIndex] = temp;

    // Cập nhật lại display_order tuần tự
    for (let i = 0; i < posts.length; i++) {
      await client.query(
        'UPDATE media_posts SET display_order = $1 WHERE id = $2',
        [i, posts[i].id]
      );
    }

    await client.query('COMMIT');
    res.json({ message: 'Di chuyển vị trí thành công!', new_index: targetIndex, changed: true });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error moving media post:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// POST /api/media - Tạo post mới (Image via Cloudinary/Uploads, Video via URL)
router.post('/', authenticateToken, isAdmin, upload.single('image'), async (req, res) => {
  try {
    const { title, is_featured, video_url } = req.body;
    let content_url = '';

    if (req.file) {
      content_url = req.file.path;
    } else if (video_url && video_url.trim()) {
      content_url = video_url.trim();
    } else {
      return res.status(400).json({ error: 'Vui lòng cung cấp hình ảnh hoặc đường dẫn video.' });
    }

    // Đẩy các bài viết cũ xuống để bài mới lên đầu (display_order = 0)
    await db.query('UPDATE media_posts SET display_order = display_order + 1');

    const result = await db.query(
      `INSERT INTO media_posts (title, content_url, is_featured, display_order) 
       VALUES ($1, $2, $3, 0) RETURNING *`,
      [title ? title.trim() : '', content_url, is_featured === 'true' || is_featured === true]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating media post:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/media/:id - Chỉnh sửa nội dung bài viết đã đăng (Tiêu đề, ảnh/video, nổi bật)
router.put('/:id', authenticateToken, isAdmin, upload.single('image'), async (req, res) => {
  try {
    const { id } = req.params;
    const { title, is_featured, video_url } = req.body;

    const selectResult = await db.query('SELECT * FROM media_posts WHERE id = $1', [id]);
    if (selectResult.rows.length === 0) {
      return res.status(404).json({ error: 'Bài viết không tồn tại.' });
    }

    const existingPost = selectResult.rows[0];
    let newContentUrl = existingPost.content_url;
    let shouldDeleteOldImage = false;

    if (req.file) {
      newContentUrl = req.file.path;
      shouldDeleteOldImage = true;
    } else if (video_url && video_url.trim()) {
      const cleanVideo = video_url.trim();
      if (cleanVideo !== existingPost.content_url) {
        newContentUrl = cleanVideo;
        shouldDeleteOldImage = true;
      }
    }

    const updatedTitle = title !== undefined && title.trim() !== '' ? title.trim() : existingPost.title;
    const updatedFeatured = is_featured !== undefined ? (is_featured === 'true' || is_featured === true) : existingPost.is_featured;

    const updateResult = await db.query(
      `UPDATE media_posts 
       SET title = $1, content_url = $2, is_featured = $3 
       WHERE id = $4 RETURNING *`,
      [updatedTitle, newContentUrl, updatedFeatured, id]
    );

    // Dọn dẹp file ảnh cũ nếu người dùng đã đổi ảnh hoặc chuyển sang video
    if (shouldDeleteOldImage && existingPost.content_url) {
      deleteStoredMedia(existingPost.content_url);
    }

    res.json(updateResult.rows[0]);
  } catch (error) {
    console.error('Error updating media post:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/media/:id - Xóa bài viết
router.delete('/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Fetch post details first
    const selectResult = await db.query(`SELECT content_url FROM media_posts WHERE id = $1`, [id]);
    if (selectResult.rows.length === 0) {
      return res.status(404).json({ error: 'Bài viết không tồn tại.' });
    }
    
    const contentUrl = selectResult.rows[0].content_url;
    if (contentUrl) {
      await deleteStoredMedia(contentUrl);
    }
    
    await db.query(`DELETE FROM media_posts WHERE id = $1`, [id]);
    res.json({ message: 'Xóa bài viết thành công.' });
  } catch (error) {
    console.error('Error deleting media post:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
