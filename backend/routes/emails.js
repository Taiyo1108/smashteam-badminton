const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, isAdmin } = require('../middleware/auth');
const {
  getWelcomeTemplate,
  saveWelcomeTemplate,
  renderWelcomeEmail,
  renderBroadcastEmail,
  sendTestEmail,
  sendBroadcastEmails
} = require('../utils/emailService');

// Yêu cầu xác thực quyền Admin cho toàn bộ phân hệ Email
router.use(authenticateToken);
router.use(isAdmin);

/**
 * GET /api/admin/emails/template/welcome
 * Lấy mẫu email chào mừng / trúng tuyển và bản render mẫu
 */
router.get('/template/welcome', async (req, res) => {
  try {
    const template = await getWelcomeTemplate();
    const preview = renderWelcomeEmail(template, {
      ho_ten: 'Nguyễn Văn Mẫu',
      so_sao: 4,
      diem_elo: 1450
    });

    res.json({
      template,
      previewHtml: preview.html,
      previewSubject: preview.subject
    });
  } catch (error) {
    console.error('[Emails Route] Lỗi lấy template welcome:', error);
    res.status(500).json({ error: 'Không thể tải mẫu email trúng tuyển.' });
  }
});

/**
 * PUT /api/admin/emails/template/welcome
 * Cập nhật cấu hình mẫu email chào mừng
 */
router.put('/template/welcome', async (req, res) => {
  try {
    const { subject, heading, subheading, body, show_stats, call_to_action_text, footer_text } = req.body;

    if (!subject || !heading || !body) {
      return res.status(400).json({ error: 'Vui lòng điền đầy đủ Tiêu đề, Lời mở đầu và Nội dung thư.' });
    }

    const saved = await saveWelcomeTemplate({
      subject: subject.trim(),
      heading: heading.trim(),
      subheading: subheading ? subheading.trim() : '',
      body: body.trim(),
      show_stats: !!show_stats,
      call_to_action_text: call_to_action_text ? call_to_action_text.trim() : 'KÍCH HOẠT TÀI KHOẢN',
      footer_text: footer_text ? footer_text.trim() : ''
    });

    const preview = renderWelcomeEmail(saved, {
      ho_ten: 'Nguyễn Văn Mẫu',
      so_sao: 4,
      diem_elo: 1450
    });

    res.json({
      message: 'Đã lưu mẫu email trúng tuyển thành công!',
      template: saved,
      previewHtml: preview.html
    });
  } catch (error) {
    console.error('[Emails Route] Lỗi lưu template welcome:', error);
    res.status(500).json({ error: 'Không thể lưu mẫu email.' });
  }
});

/**
 * POST /api/admin/emails/render-preview
 * Render xem trước theo thời gian thực (Live Preview)
 */
router.post('/render-preview', (req, res) => {
  try {
    const { type, template, broadcastData } = req.body;

    if (type === 'welcome') {
      const preview = renderWelcomeEmail(template, {
        ho_ten: 'Nguyễn Văn Mẫu',
        so_sao: 4,
        diem_elo: 1450
      });
      return res.json({ subject: preview.subject, html: preview.html });
    } else {
      const b = broadcastData || {};
      const html = renderBroadcastEmail({
        heading: b.heading || 'THÔNG BÁO GIẢI ĐẤU SMASHTEAM MÙA THU 2026',
        body: b.body || 'Nội dung thông báo chi tiết...',
        ctaText: b.ctaText || 'XEM CHI TIẾT TRÊN WEBSITE',
        ctaLink: b.ctaLink || '',
        footerText: b.footerText || ''
      });
      return res.json({ subject: b.subject || 'Thông báo từ CLB SmashTeam', html });
    }
  } catch (error) {
    console.error('[Emails Route] Lỗi render preview:', error);
    res.status(500).json({ error: 'Lỗi khi tạo bản xem trước.' });
  }
});

/**
 * POST /api/admin/emails/send-test
 * Gửi email thử nghiệm tới 1 địa chỉ email được chỉ định
 */
router.post('/send-test', async (req, res) => {
  try {
    const { toEmail, type, template, broadcastData } = req.body;

    if (!toEmail || !toEmail.includes('@')) {
      return res.status(400).json({ error: 'Vui lòng nhập địa chỉ email nhận thử nghiệm hợp lệ.' });
    }

    let subject = '';
    let htmlContent = '';

    if (type === 'welcome') {
      const rendered = renderWelcomeEmail(template, {
        ho_ten: 'Quản Trị Viên (Test)',
        so_sao: 5,
        diem_elo: 1500
      });
      subject = rendered.subject;
      htmlContent = rendered.html;
    } else {
      const b = broadcastData || {};
      subject = b.subject || 'Thông Báo Thử Nghiệm Từ SmashTeam';
      htmlContent = renderBroadcastEmail({
        heading: b.heading || 'THÔNG BÁO THỬ NGHIỆM',
        body: b.body || 'Đây là nội dung thử nghiệm email thông báo từ Ban Quản Trị.',
        ctaText: b.ctaText || 'XEM WEBSITE',
        ctaLink: b.ctaLink || '',
        footerText: b.footerText || ''
      });
    }

    const result = await sendTestEmail({ toEmail: toEmail.trim(), subject, htmlContent });
    res.json({
      message: `Đã gửi thư thử nghiệm thành công tới ${toEmail}! Vui lòng kiểm tra hộp thư đến (hoặc hòm thư Spam/Quảng cáo).`,
      result
    });
  } catch (error) {
    console.error('[Emails Route] Lỗi gửi test email:', error);
    res.status(500).json({ error: error.message || 'Gửi email thử nghiệm thất bại.' });
  }
});

/**
 * GET /api/admin/emails/recipients-count
 * Tính số lượng người nhận hợp lệ theo nhóm đối tượng
 */
router.get('/recipients-count', async (req, res) => {
  try {
    const { target_audience, campaign_id } = req.query;

    let query = '';
    let params = [];

    if (target_audience === 'all_members') {
      query = `SELECT COUNT(*) as count FROM users WHERE role = 'member' AND email IS NOT NULL AND email != ''`;
    } else if (target_audience === 'all_candidates') {
      query = `SELECT COUNT(*) as count FROM users WHERE role = 'candidate' AND email IS NOT NULL AND email != ''`;
    } else if (target_audience === 'all_users') {
      query = `SELECT COUNT(*) as count FROM users WHERE email IS NOT NULL AND email != ''`;
    } else if (target_audience === 'by_campaign' && campaign_id) {
      query = `
        SELECT COUNT(*) as count 
        FROM users u 
        JOIN casting_slots s ON u.casting_slot_id = s.id 
        WHERE s.campaign_id = $1 AND u.email IS NOT NULL AND u.email != ''
      `;
      params = [campaign_id];
    } else {
      query = `SELECT COUNT(*) as count FROM users WHERE role = 'member' AND email IS NOT NULL AND email != ''`;
    }

    const result = await db.query(query, params);
    const count = parseInt(result.rows[0]?.count || '0');

    res.json({ count });
  } catch (error) {
    console.error('[Emails Route] Lỗi đếm recipients:', error);
    res.status(500).json({ error: 'Không thể tính toán số lượng người nhận.' });
  }
});

/**
 * POST /api/admin/emails/broadcast
 * Gửi email hàng loạt (Bulk Announcement)
 */
router.post('/broadcast', async (req, res) => {
  try {
    const {
      target_audience,
      target_label,
      campaign_id,
      subject,
      heading,
      body,
      ctaText,
      ctaLink,
      footerText
    } = req.body;

    if (!subject || !heading || !body) {
      return res.status(400).json({ error: 'Vui lòng nhập đầy đủ Tiêu đề, Tiêu đề chính và Nội dung thông báo.' });
    }

    // 1. Lấy danh sách email người nhận từ database
    let query = '';
    let params = [];

    if (target_audience === 'all_members') {
      query = `SELECT DISTINCT email, full_name FROM users WHERE role = 'member' AND email IS NOT NULL AND email != ''`;
    } else if (target_audience === 'all_candidates') {
      query = `SELECT DISTINCT email, full_name FROM users WHERE role = 'candidate' AND email IS NOT NULL AND email != ''`;
    } else if (target_audience === 'all_users') {
      query = `SELECT DISTINCT email, full_name FROM users WHERE email IS NOT NULL AND email != ''`;
    } else if (target_audience === 'by_campaign' && campaign_id) {
      query = `
        SELECT DISTINCT u.email, u.full_name 
        FROM users u 
        JOIN casting_slots s ON u.casting_slot_id = s.id 
        WHERE s.campaign_id = $1 AND u.email IS NOT NULL AND u.email != ''
      `;
      params = [campaign_id];
    } else {
      query = `SELECT DISTINCT email, full_name FROM users WHERE role = 'member' AND email IS NOT NULL AND email != ''`;
    }

    const usersResult = await db.query(query, params);
    const recipientList = usersResult.rows;

    if (recipientList.length === 0) {
      return res.status(400).json({ error: 'Không tìm thấy người nhận nào có email hợp lệ trong nhóm đã chọn.' });
    }

    // 2. Tạo HTML thông báo chuẩn hóa kèm Anti-Spam Footer
    const htmlContent = renderBroadcastEmail({
      heading: heading.trim(),
      body: body.trim(),
      ctaText: ctaText ? ctaText.trim() : '',
      ctaLink: ctaLink ? ctaLink.trim() : '',
      footerText: footerText ? footerText.trim() : ''
    });

    const safeSubject = subject.trim();
    const safeHeading = heading.trim();
    const safeBody = body.trim();
    const finalTargetLabel = target_label || target_audience;

    // 3. Tạo ngay bản ghi trong email_broadcast_logs với trạng thái 'processing'
    const initialLogResult = await db.query(`
      INSERT INTO email_broadcast_logs (
        title, subject, content, target_audience, target_label, 
        total_recipients, success_count, failed_count, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      safeHeading,
      safeSubject,
      safeBody,
      target_audience,
      finalTargetLabel,
      recipientList.length,
      0,
      0,
      'processing'
    ]);

    const broadcastLog = initialLogResult.rows[0];
    const broadcastId = broadcastLog.id;

    // 4. Phản hồi ngay lập tức HTTP 202 Accepted cho Frontend (Non-blocking)
    res.status(202).json({
      message: `Chiến dịch gửi thư đã được đưa vào hàng đợi xử lý ngầm (${recipientList.length} người nhận).`,
      broadcastId,
      log: broadcastLog
    });

    // 5. Kích hoạt Worker ngầm (Background Worker) không chặn luồng chính
    setImmediate(async () => {
      try {
        console.log(`[Broadcast Worker] Bắt đầu chiến dịch ${broadcastId} cho ${recipientList.length} người nhận...`);

        const sendStats = await sendBroadcastEmails({
          recipientList,
          subject: safeSubject,
          htmlContent,
          onBatchProgress: async ({ successCount, failedCount, isCompleted }) => {
            try {
              await db.query(`
                UPDATE email_broadcast_logs
                SET success_count = $1, failed_count = $2
                WHERE id = $3
              `, [successCount, failedCount, broadcastId]);
              console.log(`[Broadcast Worker ${broadcastId}] Tiến độ: ${successCount} thành công, ${failedCount} lỗi.`);
            } catch (dbErr) {
              console.error(`[Broadcast Worker] Lỗi cập nhật tiến độ DB cho ${broadcastId}:`, dbErr);
            }
          }
        });

        // Xác định trạng thái kết thúc
        let finalStatus = 'completed';
        if (sendStats.failedCount > 0 && sendStats.successCount > 0) {
          finalStatus = 'partial';
        } else if (sendStats.failedCount > 0 && sendStats.successCount === 0) {
          finalStatus = 'failed';
        }

        await db.query(`
          UPDATE email_broadcast_logs
          SET success_count = $1, failed_count = $2, status = $3
          WHERE id = $4
        `, [sendStats.successCount, sendStats.failedCount, finalStatus, broadcastId]);

        console.log(`[Broadcast Worker] Hoàn thành chiến dịch ${broadcastId} với trạng thái: ${finalStatus} (${sendStats.successCount}/${sendStats.total})`);
      } catch (workerErr) {
        console.error(`[Broadcast Worker] Lỗi nghiêm trọng khi xử lý chiến dịch ${broadcastId}:`, workerErr);
        try {
          await db.query(`
            UPDATE email_broadcast_logs
            SET status = 'failed'
            WHERE id = $1
          `, [broadcastId]);
        } catch (dbErr) {
          console.error(`[Broadcast Worker] Không thể cập nhật trạng thái lỗi vào DB cho ${broadcastId}:`, dbErr);
        }
      }
    });
  } catch (error) {
    console.error('[Emails Route] Lỗi tiếp nhận broadcast:', error);
    res.status(500).json({ error: error.message || 'Lỗi hệ thống khi tiếp nhận gửi email hàng loạt.' });
  }
});

/**
 * GET /api/admin/emails/broadcast-logs
 * Lấy lịch sử các chiến dịch gửi email gần đây
 */
router.get('/broadcast-logs', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT * FROM email_broadcast_logs 
      ORDER BY created_at DESC 
      LIMIT 30
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('[Emails Route] Lỗi lấy broadcast logs:', error);
    res.status(500).json({ error: 'Không thể tải lịch sử gửi email.' });
  }
});

module.exports = router;
