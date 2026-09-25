const { Resend } = require('resend');
const pool = require('../db');

// Khởi tạo Resend SDK an toàn
const getResendClient = () => {
  if (!process.env.RESEND_API_KEY) return null;
  return new Resend(process.env.RESEND_API_KEY);
};

const getFromEmail = () => {
  return process.env.RESEND_FROM_EMAIL || 'SMASH TEAM <clb@smashteam.id.vn>';
};

const getFrontendUrl = () => {
  return process.env.FRONTEND_URL || 'https://smashteam.id.vn';
};

const DEFAULT_WELCOME_TEMPLATE = {
  subject: '🏸 Chúc mừng bạn đã gia nhập gia đình SMASH TEAM!',
  heading: 'SMASH TEAM ACADEMY 🏸',
  subheading: 'Chúc mừng bạn đã chính thức vượt qua kỳ Casting chuyên môn!',
  body: 'Chào mừng bạn đã trở thành một phần của đại gia đình SmashTeam. Dưới đây là thông số đánh giá chuyên môn ban đầu của bạn được Ban Tuyển Trạch ghi nhận:',
  show_stats: true,
  call_to_action_text: 'KÍCH HOẠT TÀI KHOẢN',
  footer_text: 'Đây là email tự động từ Ban Quản Trị SMASH TEAM. Vui lòng không trả lời thư này.'
};

/**
 * Lấy mẫu email chào mừng từ database (site_settings)
 */
async function getWelcomeTemplate() {
  try {
    const res = await pool.query("SELECT value FROM site_settings WHERE key = 'email_welcome_template' LIMIT 1");
    if (res.rows.length > 0 && res.rows[0].value) {
      const parsed = typeof res.rows[0].value === 'string' 
        ? JSON.parse(res.rows[0].value) 
        : res.rows[0].value;
      return { ...DEFAULT_WELCOME_TEMPLATE, ...parsed };
    }
  } catch (err) {
    console.error('[EmailService] Lỗi khi lấy mẫu email:', err);
  }
  return DEFAULT_WELCOME_TEMPLATE;
}

/**
 * Lưu mẫu email chào mừng vào database
 */
async function saveWelcomeTemplate(templateData) {
  const merged = { ...DEFAULT_WELCOME_TEMPLATE, ...templateData };
  await pool.query(`
    INSERT INTO site_settings (key, value, updated_at)
    VALUES ('email_welcome_template', $1, CURRENT_TIMESTAMP)
    ON CONFLICT (key) DO UPDATE
    SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP
  `, [JSON.stringify(merged)]);
  return merged;
}

/**
 * Tạo giao diện HTML hoàn chỉnh cho email chào mừng/trúng tuyển
 */
function renderWelcomeEmail(template, variables = {}) {
  const t = { ...DEFAULT_WELCOME_TEMPLATE, ...template };
  const hostUrl = getFrontendUrl();

  const userName = variables.ho_ten || 'Vận Động Viên';
  const stars = variables.so_sao || 3;
  const elo = variables.diem_elo || 1200;
  const claimUrl = `${hostUrl}/claim-account`;

  // Thay thế các biến động trong nội dung
  const replaceVars = (str) => {
    if (!str) return '';
    return str
      .replace(/{ho_ten}/g, userName)
      .replace(/{so_sao}/g, `${stars} ⭐`)
      .replace(/{diem_elo}/g, `${elo} ELO`)
      .replace(/{link_kich_hoat}/g, claimUrl)
      .replace(/{ten_clb}/g, 'SmashTeam');
  };

  const subject = replaceVars(t.subject);
  const heading = replaceVars(t.heading);
  const subheading = replaceVars(t.subheading);
  const body = replaceVars(t.body);
  const ctaText = replaceVars(t.call_to_action_text || 'KÍCH HOẠT TÀI KHOẢN');
  const footerText = replaceVars(t.footer_text);

  const statsBlock = t.show_stats ? `
    <div style="background: rgba(122, 34, 224, 0.12); border: 1px dashed #7A22E0; padding: 20px; border-radius: 12px; margin: 25px 0; text-align: left;">
      <p style="margin: 6px 0; color: #f8fafc; font-size: 14px;"><strong>Họ và tên:</strong> ${userName}</p>
      <p style="margin: 6px 0; color: #f8fafc; font-size: 14px;"><strong>Đánh giá Casting:</strong> ${stars} ⭐</p>
      <p style="margin: 6px 0; color: #f8fafc; font-size: 14px;"><strong>Điểm số khởi điểm:</strong> <span style="color: #9D4EDD; font-weight: bold;">${elo} ELO</span></p>
    </div>
  ` : '';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
    </head>
    <body style="margin: 0; padding: 20px; background-color: #06050c; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      <div style="background-color: #0c0a1a; padding: 40px 24px; text-align: center; color: #f8fafc; border-radius: 20px; max-width: 580px; margin: 0 auto; border: 1px solid #7A22E0; box-shadow: 0 10px 30px rgba(122, 34, 224, 0.25);">
        
        <!-- Logo Badge -->
        <div style="margin-bottom: 20px;">
          <span style="display: inline-block; background: linear-gradient(135deg, #7A22E0, #9D4EDD); color: #ffffff; padding: 6px 16px; border-radius: 50px; font-size: 11px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase;">
            THƯ CHÚC MỪNG TRÚNG TUYỂN
          </span>
        </div>

        <h1 style="color: #ffffff; font-size: 26px; font-weight: 900; margin: 0 0 12px 0; letter-spacing: -0.5px;">${heading}</h1>
        <p style="font-size: 15px; color: #9D4EDD; font-weight: 600; margin: 0 0 25px 0;">${subheading}</p>
        
        <div style="font-size: 14px; line-height: 1.6; color: #cbd5e1; text-align: left; background: rgba(255,255,255,0.03); padding: 20px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.06);">
          ${body.replace(/\n/g, '<br/>')}
          ${statsBlock}
        </div>

        <div style="margin: 35px 0 25px 0;">
          <a href="${claimUrl}" style="background: linear-gradient(135deg, #7A22E0, #9D4EDD); color: #ffffff; padding: 14px 36px; text-decoration: none; border-radius: 50px; font-weight: 800; font-size: 14px; display: inline-block; box-shadow: 0 4px 20px rgba(122, 34, 224, 0.5); letter-spacing: 0.5px; text-transform: uppercase;">
            ${ctaText}
          </a>
        </div>
        
        <p style="font-size: 12px; color: #64748b; margin-top: 35px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 20px; line-height: 1.5;">
          ${footerText}
        </p>
      </div>
    </body>
    </html>
  `;

  return { subject, html };
}

/**
 * Tạo giao diện HTML cho email thông báo giải đấu / sinh hoạt hàng loạt (Broadcast)
 */
function renderBroadcastEmail({ heading, body, ctaText, ctaLink, footerText } = {}) {
  const hostUrl = getFrontendUrl();
  const safeHeading = heading || 'THÔNG BÁO TỪ SMASHTEAM BADMINTON';
  const safeBody = (body || '').replace(/\n/g, '<br/>');
  const targetCtaLink = ctaLink || hostUrl;
  const targetCtaText = ctaText || 'XEM CHI TIẾT TRÊN WEBSITE';
  
  // Dòng chân trang chống spam bắt buộc theo chuẩn của CLB
  const MANDATORY_COMPLIANCE_FOOTER = 'Email thông báo từ SmashTeam Badminton Club. Nhận theo tư cách thành viên/ứng viên câu lạc bộ.';
  const customFooter = footerText ? footerText.trim() : 'Đây là thông báo chính thức từ Ban Quản Trị Câu Lạc Bộ Cầu Lông SmashTeam.';
  const targetFooter = `${customFooter}<br/><span style="display: block; margin-top: 8px; font-size: 11px; opacity: 0.8; color: #94a3b8;">${MANDATORY_COMPLIANCE_FOOTER}</span>`;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 20px; background-color: #06050c; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      <div style="background-color: #0c0a1a; padding: 40px 24px; text-align: center; color: #f8fafc; border-radius: 20px; max-width: 580px; margin: 0 auto; border: 1px solid #7A22E0; box-shadow: 0 10px 30px rgba(122, 34, 224, 0.25);">
        
        <!-- Header Brand -->
        <div style="margin-bottom: 24px;">
          <span style="display: inline-block; background: linear-gradient(135deg, #7A22E0, #9D4EDD); color: #ffffff; padding: 6px 18px; border-radius: 50px; font-size: 11px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase;">
            SMASHTEAM BADMINTON
          </span>
        </div>

        <h1 style="color: #ffffff; font-size: 24px; font-weight: 900; margin: 0 0 20px 0; line-height: 1.3;">
          ${safeHeading}
        </h1>
        
        <div style="font-size: 14px; line-height: 1.7; color: #e2e8f0; text-align: left; background: rgba(255,255,255,0.03); padding: 22px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.06); margin-bottom: 30px;">
          ${safeBody}
        </div>

        ${ctaText ? `
          <div style="margin: 30px 0;">
            <a href="${targetCtaLink}" style="background: linear-gradient(135deg, #7A22E0, #9D4EDD); color: #ffffff; padding: 14px 34px; text-decoration: none; border-radius: 50px; font-weight: 800; font-size: 13px; display: inline-block; box-shadow: 0 4px 20px rgba(122, 34, 224, 0.5); letter-spacing: 0.5px; text-transform: uppercase;">
              ${targetCtaText}
            </a>
          </div>
        ` : ''}

        <p style="font-size: 12px; color: #64748b; margin-top: 35px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 20px; line-height: 1.6;">
          ${targetFooter}
        </p>
      </div>
    </body>
    </html>
  `;
}

/**
 * Ghi log email đã gửi vào bảng sent_emails_log
 */
async function logSentEmail({ recipient_email, subject, email_type = 'broadcast', status = 'sent', resend_id = null, broadcast_log_id = null, error_message = null }) {
  try {
    await pool.query(`
      INSERT INTO sent_emails_log (recipient_email, subject, email_type, status, resend_id, broadcast_log_id, error_message, sent_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
    `, [recipient_email, subject, email_type, status, resend_id, broadcast_log_id, error_message]);
  } catch (err) {
    console.error('[EmailService] Lỗi khi ghi nhật ký email:', err);
  }
}

/**
 * Ghi log email hàng loạt vào bảng sent_emails_log
 */
async function logSentEmailsBatch(rows) {
  if (!rows || rows.length === 0) return;
  try {
    const values = [];
    const params = [];
    let p = 1;
    for (const r of rows) {
      values.push(`($${p}, $${p+1}, $${p+2}, $${p+3}, $${p+4}, $${p+5}, $${p+6}, CURRENT_TIMESTAMP)`);
      params.push(
        r.recipient_email,
        r.subject || '',
        r.email_type || 'broadcast',
        r.status || 'sent',
        r.resend_id || null,
        r.broadcast_log_id || null,
        r.error_message || null
      );
      p += 7;
    }
    await pool.query(`
      INSERT INTO sent_emails_log (recipient_email, subject, email_type, status, resend_id, broadcast_log_id, error_message, sent_at)
      VALUES ${values.join(', ')}
    `, params);
  } catch (err) {
    console.error('[EmailService] Lỗi khi ghi batch nhật ký email:', err);
  }
}

/**
 * Lấy số lượng email đã gửi và số lượng còn lại trong ngày / tháng
 * - Hạn mức Resend Free: 100 email/ngày, 3000 email/tháng
 * - Đảm bảo tính toán chính xác theo cả chu kỳ reset của Resend (00:00 UTC) và múi giờ Việt Nam
 */
async function getEmailQuota() {
  try {
    const res = await pool.query(`
      SELECT
        COUNT(CASE WHEN sent_at >= DATE_TRUNC('day', CURRENT_TIMESTAMP AT TIME ZONE 'UTC') AT TIME ZONE 'UTC' THEN 1 END)::int as sent_today_utc,
        COUNT(CASE WHEN sent_at >= DATE_TRUNC('day', CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh') AT TIME ZONE 'Asia/Ho_Chi_Minh' THEN 1 END)::int as sent_today_vn,
        COUNT(CASE WHEN sent_at >= DATE_TRUNC('month', CURRENT_TIMESTAMP AT TIME ZONE 'UTC') AT TIME ZONE 'UTC' THEN 1 END)::int as sent_month_utc,
        COUNT(CASE WHEN sent_at >= DATE_TRUNC('month', CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh') AT TIME ZONE 'Asia/Ho_Chi_Minh' THEN 1 END)::int as sent_month_vn
      FROM sent_emails_log
      WHERE status = 'sent';
    `);

    const row = res.rows[0] || {};
    // Lấy giá trị an toàn nhất giữa UTC và VN để bảo đảm không chạm trần Resend
    const sentToday = Math.max(row.sent_today_utc || 0, row.sent_today_vn || 0);
    const sentMonth = Math.max(row.sent_month_utc || 0, row.sent_month_vn || 0);

    const DAILY_LIMIT = 100;
    const MONTHLY_LIMIT = 3000;

    return {
      daily: {
        limit: DAILY_LIMIT,
        sent: sentToday,
        remaining: Math.max(0, DAILY_LIMIT - sentToday),
        percent: Math.min(100, Math.round((sentToday / DAILY_LIMIT) * 100))
      },
      monthly: {
        limit: MONTHLY_LIMIT,
        sent: sentMonth,
        remaining: Math.max(0, MONTHLY_LIMIT - sentMonth),
        percent: Math.min(100, Math.round((sentMonth / MONTHLY_LIMIT) * 100))
      },
      timestamp: new Date().toISOString()
    };
  } catch (err) {
    console.error('[EmailService] Lỗi khi tính quota email:', err);
    return {
      daily: { limit: 100, sent: 0, remaining: 100, percent: 0 },
      monthly: { limit: 3000, sent: 0, remaining: 3000, percent: 0 }
    };
  }
}

/**
 * Gửi email chào mừng/trúng tuyển cho 1 ứng viên
 */
const sendWelcomeEmail = async (toEmail, userName, stars, eloPoints) => {
  try {
    if (!toEmail) return;
    const resend = getResendClient();
    if (!resend) {
      console.warn('[EmailService] Bỏ qua gửi email do chưa cấu hình RESEND_API_KEY.');
      return;
    }

    const template = await getWelcomeTemplate();
    const { subject, html } = renderWelcomeEmail(template, {
      ho_ten: userName,
      so_sao: stars,
      diem_elo: eloPoints
    });

    console.log(`[EmailService] Bắt đầu gửi email chào mừng tới: ${toEmail}...`);
    const { data, error } = await resend.emails.send({
      from: getFromEmail(),
      to: [toEmail],
      subject,
      html
    });

    if (error) {
      console.error('[EmailService] Lỗi Resend khi gửi welcome email:', error);
      await logSentEmail({
        recipient_email: toEmail,
        subject,
        email_type: 'welcome',
        status: 'failed',
        error_message: error.message
      });
      return;
    }

    await logSentEmail({
      recipient_email: toEmail,
      subject,
      email_type: 'welcome',
      status: 'sent',
      resend_id: data?.id || null
    });
    console.log(`[EmailService] Gửi welcome email thành công! ID: ${data?.id}`);
  } catch (error) {
    console.error('[EmailService] Lỗi hệ thống khi gửi welcome email:', error);
  }
};

/**
 * Gửi email thử nghiệm cho Admin
 */
const sendTestEmail = async ({ toEmail, subject, htmlContent }) => {
  if (!toEmail) throw new Error('Địa chỉ email nhận thử nghiệm không được để trống.');
  const resend = getResendClient();
  if (!resend) throw new Error('Chưa cấu hình khóa RESEND_API_KEY trong hệ thống.');

  const testSubject = `[THỬ NGHIỆM] ${subject}`;
  const { data, error } = await resend.emails.send({
    from: getFromEmail(),
    to: [toEmail],
    subject: testSubject,
    html: htmlContent
  });

  if (error) {
    await logSentEmail({
      recipient_email: toEmail,
      subject: testSubject,
      email_type: 'test',
      status: 'failed',
      error_message: error.message
    });
    throw new Error(error.message || 'Lỗi từ Resend API khi gửi thử nghiệm.');
  }

  await logSentEmail({
    recipient_email: toEmail,
    subject: testSubject,
    email_type: 'test',
    status: 'sent',
    resend_id: data?.id || null
  });

  return { success: true, id: data.id };
};

/**
 * Gửi email hàng loạt (Broadcast) cho danh sách người nhận
 * - Sử dụng batching (tối đa 50 email / mẻ gửi)
 * - Sử dụng resend.batch.send() chính thức tránh 429 Too Many Requests
 * - Giãn cách 600ms giữa các mẻ
 * - Báo cáo tiến độ qua callback onBatchProgress
 * - Ghi nhật ký đầy đủ từng email gửi thành công vào sent_emails_log
 */
const sendBroadcastEmails = async ({ recipientList, subject, htmlContent, broadcastLogId = null, onBatchProgress }) => {
  const resend = getResendClient();
  if (!resend) throw new Error('Chưa cấu hình khóa RESEND_API_KEY trong hệ thống.');
  if (!recipientList || recipientList.length === 0) {
    throw new Error('Danh sách người nhận trống.');
  }

  let successCount = 0;
  let failedCount = 0;
  const errors = [];

  // Giới hạn 50 người nhận mỗi đợt gửi theo chuẩn rate-limit an toàn
  const BATCH_SIZE = 50;

  for (let i = 0; i < recipientList.length; i += BATCH_SIZE) {
    const rawBatch = recipientList.slice(i, i + BATCH_SIZE);
    
    // Lọc các email hợp lệ
    const validBatchEmails = [];
    for (const item of rawBatch) {
      const email = typeof item === 'string' ? item : item.email;
      if (email && email.trim() && email.includes('@')) {
        validBatchEmails.push(email.trim());
      } else {
        failedCount++;
      }
    }

    if (validBatchEmails.length > 0) {
      try {
        // Kiểm tra xem SDK có hỗ trợ batch.send không
        if (resend.batch && typeof resend.batch.send === 'function') {
          const batchPayload = validBatchEmails.map(targetEmail => ({
            from: getFromEmail(),
            to: [targetEmail],
            subject,
            html: htmlContent
          }));

          const { data, error } = await resend.batch.send(batchPayload);

          if (error) {
            console.error(`[EmailService] Lỗi mẻ batch ${i / BATCH_SIZE + 1}:`, error);
            failedCount += validBatchEmails.length;
            errors.push({ batchIndex: i, error: error.message });
            await logSentEmailsBatch(validBatchEmails.map(targetEmail => ({
              recipient_email: targetEmail,
              subject,
              email_type: 'broadcast',
              status: 'failed',
              broadcast_log_id: broadcastLogId,
              error_message: error.message
            })));
          } else {
            const batchSuccessCount = (data && data.data && Array.isArray(data.data))
              ? data.data.length
              : validBatchEmails.length;
            successCount += batchSuccessCount;

            await logSentEmailsBatch(validBatchEmails.map((targetEmail, idx) => ({
              recipient_email: targetEmail,
              subject,
              email_type: 'broadcast',
              status: 'sent',
              resend_id: data?.data?.[idx]?.id || null,
              broadcast_log_id: broadcastLogId
            })));
          }
        } else {
          // Dự phòng nếu không có batch.send: gửi song song nội bộ batch
          await Promise.all(
            validBatchEmails.map(async (email) => {
              try {
                const { data, error } = await resend.emails.send({
                  from: getFromEmail(),
                  to: [email],
                  subject,
                  html: htmlContent
                });
                if (error) {
                  failedCount++;
                  errors.push({ email, error: error.message });
                  await logSentEmail({
                    recipient_email: email,
                    subject,
                    email_type: 'broadcast',
                    status: 'failed',
                    broadcast_log_id: broadcastLogId,
                    error_message: error.message
                  });
                } else {
                  successCount++;
                  await logSentEmail({
                    recipient_email: email,
                    subject,
                    email_type: 'broadcast',
                    status: 'sent',
                    resend_id: data?.id || null,
                    broadcast_log_id: broadcastLogId
                  });
                }
              } catch (err) {
                failedCount++;
                errors.push({ email, error: err.message });
                await logSentEmail({
                  recipient_email: email,
                  subject,
                  email_type: 'broadcast',
                  status: 'failed',
                  broadcast_log_id: broadcastLogId,
                  error_message: err.message
                });
              }
            })
          );
        }
      } catch (batchErr) {
        console.error(`[EmailService] Ngoại lệ khi gửi batch ${i / BATCH_SIZE + 1}:`, batchErr);
        failedCount += validBatchEmails.length;
        errors.push({ batchIndex: i, error: batchErr.message });
      }
    }

    // Thông báo tiến độ qua callback (để cập nhật database real-time)
    if (onBatchProgress && typeof onBatchProgress === 'function') {
      try {
        await onBatchProgress({
          successCount,
          failedCount,
          isCompleted: (i + BATCH_SIZE >= recipientList.length)
        });
      } catch (cbErr) {
        console.error('[EmailService] Lỗi onBatchProgress callback:', cbErr);
      }
    }

    // Giãn cách an toàn 600ms giữa các mẻ gửi theo yêu cầu rate-limit
    if (i + BATCH_SIZE < recipientList.length) {
      await new Promise(resolve => setTimeout(resolve, 600));
    }
  }

  return {
    total: recipientList.length,
    successCount,
    failedCount,
    errors
  };
};

module.exports = {
  DEFAULT_WELCOME_TEMPLATE,
  getWelcomeTemplate,
  saveWelcomeTemplate,
  renderWelcomeEmail,
  renderBroadcastEmail,
  sendWelcomeEmail,
  sendTestEmail,
  sendBroadcastEmails,
  getEmailQuota,
  logSentEmail,
  logSentEmailsBatch
};
