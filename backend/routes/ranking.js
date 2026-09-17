const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const db = require('../db');
const { authenticateToken, isAdmin } = require('../middleware/auth');
const { getRankingHubData } = require('../services/rankingHubService');
const { takeWeeklyRankingSnapshot } = require('../services/rankingSnapshotJob');

/**
 * Middleware: Optional Authentication
 * Extracts user if valid JWT is present, but doesn't block unauthenticated guests.
 */
function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (token) {
    try {
      const verified = jwt.verify(token, process.env.JWT_SECRET);
      req.user = verified;
    } catch (err) {
      // Continue without user
    }
  }
  next();
}

/**
 * GET /api/ranking/hub
 * Comprehensive Ranking Hub data (Read-only, strictly never creates snapshots)
 * Query: ?mode=singles|doubles&filter=all|official|provisional&userId=optional
 */
router.get('/hub', optionalAuth, async (req, res) => {
  try {
    const mode = req.query.mode || 'singles';
    const filter = req.query.filter || 'all';
    const currentUserId = req.user?.id || req.query.userId || null;

    const hubData = await getRankingHubData({
      mode,
      filter,
      currentUserId
    });

    res.json(hubData);
  } catch (error) {
    console.error('Error fetching ranking hub data:', error);
    res.status(500).json({ error: 'Failed to fetch ranking hub data' });
  }
});

/**
 * POST /api/ranking/snapshot
 * Admin endpoint / Scheduled worker trigger to take point-in-time weekly snapshot.
 * Idempotent: UPSERT based on (season_id, mode, user_id, snapshot_week)
 */
router.post('/snapshot', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { mode = 'all', forceDate, forceSeasonId } = req.body;
    const result = await takeWeeklyRankingSnapshot({
      mode,
      forceDate: forceDate ? new Date(forceDate) : undefined,
      forceSeasonId
    });

    res.json({
      message: 'Weekly ranking snapshot recorded successfully',
      ...result
    });
  } catch (error) {
    console.error('Error taking ranking snapshot:', error);
    res.status(500).json({ error: 'Failed to take ranking snapshot' });
  }
});

/**
 * GET /api/ranking/seasons
 * List seasons
 */
router.get('/seasons', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM seasons ORDER BY id DESC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching seasons:', error);
    res.status(500).json({ error: 'Failed to fetch seasons' });
  }
});

module.exports = router;
