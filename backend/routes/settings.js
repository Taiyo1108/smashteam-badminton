const express = require('express');
const router = express.Router();
const db = require('../db');
const { upload } = require('../utils/cloudinary');
const { authenticateToken, isAdmin } = require('../middleware/auth');

// GET /api/settings - Lấy cấu hình website (công khai)
router.get('/', async (req, res) => {
  try {
    const result = await db.query('SELECT key, value FROM site_settings');
    const settings = {};
    result.rows.forEach(row => {
      settings[row.key] = row.value;
    });
    res.json(settings);
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/settings - Cập nhật cấu hình key-value (yêu cầu Admin)
router.put('/', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { key, value } = req.body;
    if (!key || value === undefined) {
      return res.status(400).json({ error: 'Key and value are required' });
    }

    await db.query(
      `INSERT INTO site_settings (key, value, updated_at)
       VALUES ($1, $2, CURRENT_TIMESTAMP)
       ON CONFLICT (key)
       DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP`,
      [key, value]
    );

    res.json({ message: `Setting '${key}' updated successfully` });
  } catch (error) {
    console.error('Error updating setting:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/settings/upload-cover - Tải ảnh bìa mới lên Cloudinary (yêu cầu Admin)
router.post('/upload-cover', authenticateToken, isAdmin, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file uploaded' });
    }

    const coverUrl = req.file.path; // Cloudinary URL trả về từ middleware

    await db.query(
      `INSERT INTO site_settings (key, value, updated_at)
       VALUES ('homepage_cover_url', $1, CURRENT_TIMESTAMP)
       ON CONFLICT (key)
       DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP`,
      [coverUrl]
    );

    res.json({ url: coverUrl });
  } catch (error) {
    console.error('Error uploading cover photo:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
