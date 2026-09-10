const express = require('express');
const router = express.Router();
const db = require('../db');
const { upload, uploadBufferToImageKit, deleteImageByUrl } = require('../utils/imagekit');
const { authenticateToken, isAdmin } = require('../middleware/auth');

// GET /api/media - Lấy danh sách media posts
router.get('/', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, title, content_url, is_featured, created_at 
       FROM media_posts 
       ORDER BY is_featured DESC, created_at DESC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/media - Tạo post mới (Image via ImageKit, Video via URL)
router.post('/', authenticateToken, isAdmin, upload.single('image'), async (req, res) => {
  try {
    const { title, is_featured, video_url } = req.body;
    let content_url = '';

    if (req.file) {
      // ImageKit: upload buffer từ multer memoryStorage
      const uploaded = await uploadBufferToImageKit(req.file.buffer, req.file.originalname, '/smashteam/media');
      content_url = uploaded.url;
    } else if (video_url) {
      content_url = video_url;
    } else {
      return res.status(400).json({ error: 'Must provide an image or a video URL' });
    }

    const result = await db.query(
      `INSERT INTO media_posts (title, content_url, is_featured) 
       VALUES ($1, $2, $3) RETURNING *`,
      [title, content_url, is_featured === 'true' || is_featured === true]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Helper giữ tương thích: trước đây dùng Cloudinary, giờ dùng ImageKit.
// Chỉ xóa remote nếu là URL ImageKit, URL Cloudinary cũ chỉ xóa DB.
async function cleanupImageByUrl(url) {
  if (!url) return;
  await deleteImageByUrl(url);
}

// DELETE /api/media/:id - Xóa post
router.delete('/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Fetch post details first
    const selectResult = await db.query(`SELECT content_url FROM media_posts WHERE id = $1`, [id]);
    if (selectResult.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    const contentUrl = selectResult.rows[0].content_url;
    
    // Nếu là URL ImageKit thì xóa ảnh remote, URL Cloudinary cũ chỉ xóa DB
    await cleanupImageByUrl(contentUrl);
    
    await db.query(`DELETE FROM media_posts WHERE id = $1`, [id]);
    res.json({ message: 'Deleted successfully' });
  } catch (error) {
    console.error('Error deleting media post:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
