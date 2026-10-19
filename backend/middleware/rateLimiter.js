/**
 * In-memory Sliding Window Rate Limiter
 * Limits requests per IP within a specified time window.
 */

function createRateLimiter({ windowMs = 15 * 60 * 1000, max = 5, message = 'Bạn đã gửi quá nhiều yêu cầu trong thời gian ngắn. Vui lòng thử lại sau 15 phút.' } = {}) {
  const requests = new Map();

  // Periodic cleanup of expired records every 5 minutes
  setInterval(() => {
    const now = Date.now();
    for (const [ip, timestamps] of requests.entries()) {
      const active = timestamps.filter(t => now - t < windowMs);
      if (active.length === 0) {
        requests.delete(ip);
      } else {
        requests.set(ip, active);
      }
    }
  }, 5 * 60 * 1000).unref();

  return function rateLimiterMiddleware(req, res, next) {
    const ip = req.headers['x-forwarded-for'] 
      ? String(req.headers['x-forwarded-for']).split(',')[0].trim() 
      : (req.socket.remoteAddress || 'unknown');

    const now = Date.now();
    const timestamps = requests.get(ip) || [];
    const validTimestamps = timestamps.filter(t => now - t < windowMs);

    if (validTimestamps.length >= max) {
      return res.status(429).json({
        error: message,
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfterMs: Math.max(0, windowMs - (now - validTimestamps[0]))
      });
    }

    validTimestamps.push(now);
    requests.set(ip, validTimestamps);
    next();
  };
}

// Preset rate limiters
const onboardingRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 phút
  max: 5, // tối đa 5 requests / 15 phút / IP
  message: 'Bạn đã thực hiện đăng ký/onboarding quá nhiều lần. Vui lòng thử lại sau 15 phút.'
});

module.exports = {
  createRateLimiter,
  onboardingRateLimiter
};
