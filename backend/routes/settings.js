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

// PUT /api/settings/bulk - Cập nhật hàng loạt cấu hình website cùng lúc (Admin)
router.put('/bulk', authenticateToken, isAdmin, async (req, res) => {
  try {
    const settings = req.body; // { key1: val1, key2: val2, ... }
    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ error: 'Payload must be an object of key-value settings' });
    }

    const keys = Object.keys(settings);
    for (const key of keys) {
      const val = settings[key] !== undefined && settings[key] !== null ? String(settings[key]) : '';
      await db.query(
        `INSERT INTO site_settings (key, value, updated_at)
         VALUES ($1, $2, CURRENT_TIMESTAMP)
         ON CONFLICT (key)
         DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP`,
        [key, val]
      );
    }

    res.json({ success: true, message: `Updated ${keys.length} settings successfully` });
  } catch (error) {
    console.error('Error updating bulk settings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/settings/:key - Cập nhật cấu hình theo key trên URL (yêu cầu Admin)
router.put('/:key', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { key } = req.params;
    const value = req.body.value !== undefined ? String(req.body.value) : '';

    await db.query(
      `INSERT INTO site_settings (key, value, updated_at)
       VALUES ($1, $2, CURRENT_TIMESTAMP)
       ON CONFLICT (key)
       DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP`,
      [key, value]
    );

    res.json({ message: `Setting '${key}' updated successfully` });
  } catch (error) {
    console.error('Error updating setting by key:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/settings - Cập nhật cấu hình key-value qua body (yêu cầu Admin)
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
      [key, String(value)]
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
