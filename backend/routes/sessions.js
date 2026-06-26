const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/sessions - Lấy danh sách các buổi tập sắp diễn ra
router.get('/', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT * FROM sessions 
       WHERE date_time >= NOW() - INTERVAL '2 hours' 
       ORDER BY date_time ASC LIMIT 10`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
