const nodemailer = require('nodemailer');
const dns = require('dns').promises;

/**
 * Gửi email chào mừng thành viên mới
 * @param {string} toEmail Địa chỉ email nhận
 * @param {string} userName Tên thành viên
 * @param {number} stars Số sao đánh giá (1-5)
 * @param {number} eloPoints Số ELO khởi điểm
 */
const sendWelcomeEmail = async (toEmail, userName, stars, eloPoints) => {
  try {
    if (!toEmail) {
      console.warn('[EmailService] Bỏ qua gửi email do địa chỉ email trống.');
      return;
    }

    const hostUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const emailSubject = '🏸 Chúc mừng bạn đã gia nhập gia đình SMASH TEAM!';
    const emailHtml = `
      <div style="background-color: #0c0a1a; padding: 40px 20px; font-family: sans-serif; text-align: center; color: #f8fafc; border-radius: 12px; max-width: 600px; margin: 0 auto; border: 1px solid #7A22E0;">
        <h1 style="color: #9D4EDD; font-size: 28px; margin-bottom: 10px; text-shadow: 0 0 10px rgba(157,78,221,0.5);">SMASH TEAM ACADEMY 🏸</h1>
        <p style="font-size: 16px; color: #cbd5e1; margin-bottom: 30px;">Chúc mừng bạn đã chính thức vượt qua kỳ Casting chuyên môn!</p>
        
        <div style="background: rgba(122, 34, 224, 0.1); border: 1px dashed #7A22E0; padding: 20px; border-radius: 8px; margin-bottom: 30px; display: inline-block; text-align: left; width: 80%;">
          <p style="margin: 5px 0; color: #f8fafc;"><strong>Học viên:</strong> ${userName}</p>
          <p style="margin: 5px 0; color: #f8fafc;"><strong>Trình độ Casting:</strong> ${stars} ⭐</p>
          <p style="margin: 5px 0; color: #f8fafc;"><strong>Điểm số khởi điểm:</strong> ${eloPoints} ELO</p>
        </div>

        <p style="font-size: 14px; color: #94a3b8; margin-bottom: 20px;">Vui lòng nhấn vào nút bên dưới để thiết lập mật khẩu và kích hoạt Thẻ Vận Động Viên của bạn:</p>
        
        <a href="${hostUrl}/claim-account" style="background-color: #7A22E0; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block; box-shadow: 0 4px 15px rgba(122, 34, 224, 0.4); transition: transform 0.2s;">KÍCH HOẠT TÀI KHOẢN</a>
        
        <p style="font-size: 12px; color: #64748b; margin-top: 40px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 20px;">Đây là email tự động từ Ban tuyển trạch SMASH TEAM. Vui lòng không trả lời thư này.</p>
      </div>
    `;

    // 1. Ưu tiên gửi qua Google Apps Script Web App (Để tránh bị chặn cổng SMTP trên Render)
    if (process.env.EMAIL_SCRIPT_URL) {
      console.log(`[EmailService] Bắt đầu gửi email chào mừng tới: ${toEmail} qua Google Apps Script...`);
      try {
        const response = await fetch(process.env.EMAIL_SCRIPT_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            token: process.env.EMAIL_PASS,
            to: toEmail,
            subject: emailSubject,
            htmlBody: emailHtml
          })
        });

        const responseText = await response.text();
        console.log(`[EmailService] Google Apps Script raw response (first 500 chars):`, responseText.substring(0, 500));

        let resData;
        try {
          resData = JSON.parse(responseText);
        } catch (parseErr) {
          console.warn('[EmailService] Không thể parse JSON từ response của Google Apps Script:', parseErr.message);
        }

        if (resData && resData.success) {
          console.log(`[EmailService] Gửi email qua Google Apps Script thành công!`);
          return; // Kết thúc gửi thành công
        } else {
          console.warn('[EmailService] Google Apps Script báo lỗi:', resData ? resData.error : 'Không phản hồi hoặc phản hồi không hợp lệ');
        }
      } catch (scriptErr) {
        console.warn('[EmailService] Lỗi kết nối Google Apps Script, chuyển sang SMTP dự phòng:', scriptErr.message);
      }
    }

    // 2. SMTP Dự phòng (Hoạt động ở Local hoặc khi không cấu hình Script URL)
    console.log(`[EmailService] Bắt đầu gửi email chào mừng tới: ${toEmail} qua SMTP dự phòng...`);
    let resolvedIp = 'smtp.gmail.com';
    try {
      const ipAddresses = await dns.resolve4('smtp.gmail.com');
      if (ipAddresses && ipAddresses.length > 0) {
        resolvedIp = ipAddresses[0];
      }
    } catch (dnsErr) {
      console.warn('[EmailService] Không thể phân giải IP cho SMTP:', dnsErr.message);
    }

    const transporter = nodemailer.createTransport({
      host: resolvedIp,
      port: 465,
      secure: true,
      tls: {
        servername: 'smtp.gmail.com'
      },
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS ? process.env.EMAIL_PASS.replace(/\s+/g, '') : ''
      }
    });

    const mailOptions = {
      from: `"SMASH TEAM" <${process.env.EMAIL_USER}>`,
      to: toEmail,
      subject: emailSubject,
      html: emailHtml
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`[EmailService] Gửi email qua SMTP thành công: ${info.messageId}`);
  } catch (error) {
    console.error('[EmailService] Lỗi khi gửi email chào mừng:', error);
  }
};

module.exports = {
  sendWelcomeEmail
};
