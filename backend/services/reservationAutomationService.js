const db = require('../db');

/**
 * Tự động chuyển các reservation sang CONFIRMED khi tới reservation_deadline
 */
async function processAutoConfirmations() {
  const client = await db.connect();
  try {
    // Tìm các session đã qua deadline nhưng chưa chạy auto confirm
    const sessionsRes = await client.query(
      `SELECT id, title, reservation_deadline 
       FROM sessions 
       WHERE reservation_deadline <= CURRENT_TIMESTAMP 
         AND session_end > CURRENT_TIMESTAMP
         AND (auto_confirm_processed IS FALSE OR auto_confirm_processed IS NULL);`
    );

    let confirmedCount = 0;

    for (const session of sessionsRes.rows) {
      await client.query('BEGIN');

      const updateRes = await client.query(
        `UPDATE attendances
         SET status = 'CONFIRMED',
             confirmed_at = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE session_id = $1::uuid AND status = 'RESERVED';`,
        [session.id]
      );

      await client.query(
        `UPDATE sessions SET auto_confirm_processed = TRUE WHERE id = $1::uuid;`,
        [session.id]
      );

      await client.query('COMMIT');
      confirmedCount += updateRes.rowCount;
    }

    return confirmedCount;
  } catch (error) {
    console.error('[Automation] Error processing auto confirmations:', error);
    return 0;
  } finally {
    client.release();
  }
}

/**
 * Tự động kiểm tra hết hạn Waitlist Offer và chuyển sang cho người kế tiếp
 */
async function processWaitlistExpirations() {
  const client = await db.connect();
  try {
    // 1. Tìm các waitlist item đã hết hạn
    const expiredRes = await client.query(
      `SELECT w.id, w.session_id, w.user_id, s.waitlist_offer_duration_minutes, s.session_end
       FROM session_waitlist w
       JOIN sessions s ON w.session_id = s.id
       WHERE w.status = 'OFFERED' AND w.offer_expires_at < CURRENT_TIMESTAMP;`
    );

    let expiredCount = 0;

    for (const item of expiredRes.rows) {
      await client.query('BEGIN');

      // Đánh dấu EXPIRED
      await client.query(
        `UPDATE session_waitlist SET status = 'EXPIRED', updated_at = CURRENT_TIMESTAMP WHERE id = $1::uuid;`,
        [item.id]
      );

      // Tìm người tiếp theo để offer
      const now = new Date();
      const sessionEnd = new Date(item.session_end);

      if (now.getTime() + 10 * 60000 < sessionEnd.getTime()) {
        const nextUserRes = await client.query(
          `SELECT id, position FROM session_waitlist
           WHERE session_id = $1::uuid AND status = 'WAITING'
           ORDER BY position ASC
           LIMIT 1
           FOR UPDATE;`,
          [item.session_id]
        );

        if (nextUserRes.rows.length > 0) {
          const nextUser = nextUserRes.rows[0];
          const offerMinutes = item.waitlist_offer_duration_minutes || 10;
          const offerExpiresAt = new Date(Date.now() + offerMinutes * 60000);

          await client.query(
            `UPDATE session_waitlist
             SET status = 'OFFERED',
                 offered_at = CURRENT_TIMESTAMP,
                 offer_expires_at = $1,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $2::uuid;`,
            [offerExpiresAt, nextUser.id]
          );
        }
      }

      await client.query('COMMIT');
      expiredCount++;
    }

    return expiredCount;
  } catch (error) {
    console.error('[Automation] Error processing waitlist expirations:', error);
    return 0;
  } finally {
    client.release();
  }
}

/**
 * Tự động chuyển các reservation CONFIRMED / RESERVED chưa check-in thành NO_SHOW sau khi kết thúc buổi tập
 */
async function processNoShows() {
  const client = await db.connect();
  try {
    // Tìm các session đã kết thúc nhưng chưa xử lý no-show
    const endedSessions = await client.query(
      `SELECT id, title, session_end 
       FROM sessions 
       WHERE session_end <= CURRENT_TIMESTAMP 
         AND (no_show_processed IS FALSE OR no_show_processed IS NULL);`
    );

    let noShowCount = 0;

    for (const session of endedSessions.rows) {
      await client.query('BEGIN');

      const updateRes = await client.query(
        `UPDATE attendances
         SET status = 'NO_SHOW',
             updated_at = CURRENT_TIMESTAMP
         WHERE session_id = $1::uuid 
           AND status IN ('RESERVED', 'CONFIRMED');`,
        [session.id]
      );

      await client.query(
        `UPDATE sessions SET no_show_processed = TRUE WHERE id = $1::uuid;`,
        [session.id]
      );

      await client.query('COMMIT');
      noShowCount += updateRes.rowCount;
    }

    return noShowCount;
  } catch (error) {
    console.error('[Automation] Error processing no-shows:', error);
    return 0;
  } finally {
    client.release();
  }
}

/**
 * Tự động chuyển các attendance CHECKED_IN thành MISSING_CHECKOUT sau khi buổi tập kết thúc
 */
async function processMissingCheckouts() {
  const client = await db.connect();
  try {
    const endedSessions = await client.query(
      `SELECT id, title, session_start, session_end, checkout_close_at 
       FROM sessions 
       WHERE (session_end <= CURRENT_TIMESTAMP OR (session_end IS NULL AND date_time <= CURRENT_TIMESTAMP - INTERVAL '2 hours'))
         AND (missing_checkout_processed IS FALSE OR missing_checkout_processed IS NULL);`
    );

    let missingCount = 0;

    for (const session of endedSessions.rows) {
      await client.query('BEGIN');

      const sEnd = session.session_end ? new Date(session.session_end) : new Date();

      const updateRes = await client.query(
        `UPDATE attendances
         SET status = 'MISSING_CHECKOUT',
             checkout_status = 'missing',
             checkout_method = 'auto',
             duration_minutes = GREATEST(1, ROUND(EXTRACT(EPOCH FROM ($1::timestamptz - COALESCE(checked_in_at, created_at))) / 60)),
             updated_at = CURRENT_TIMESTAMP
         WHERE session_id = $2::uuid 
           AND status = 'CHECKED_IN';`,
        [sEnd, session.id]
      );

      await client.query(
        `UPDATE sessions SET missing_checkout_processed = TRUE WHERE id = $1::uuid;`,
        [session.id]
      );

      await client.query('COMMIT');
      missingCount += updateRes.rowCount;
    }

    return missingCount;
  } catch (error) {
    console.error('[Automation] Error processing missing checkouts:', error);
    return 0;
  } finally {
    client.release();
  }
}

/**
 * Chạy toàn bộ các automation jobs
 */
async function runAllAutomationJobs() {
  try {
    await processAutoConfirmations();
    await processWaitlistExpirations();
    await processNoShows();
    await processMissingCheckouts();
  } catch (err) {
    console.error('[Automation Worker Error]:', err);
  }
}

let workerInterval = null;

function startAutomationWorker(intervalMs = 30000) {
  if (workerInterval) return;
  console.log(`[Automation Worker] Started reservation background worker (interval: ${intervalMs / 1000}s).`);
  // Chạy lần đầu ngay khi start
  runAllAutomationJobs();
  workerInterval = setInterval(runAllAutomationJobs, intervalMs);
}

module.exports = {
  processAutoConfirmations,
  processWaitlistExpirations,
  processNoShows,
  processMissingCheckouts,
  runAllAutomationJobs,
  startAutomationWorker
};
