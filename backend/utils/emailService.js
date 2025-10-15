const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: 'smtp.zoho.com.au',
      port: 587,
      secure: false, // TLS
      auth: {
        user: 'verify@wanguo.co.nz',
        pass: '@$N#5HUCRu5VYr!'
      },
      tls: {
        rejectUnauthorized: false
      }
    });
  }

  generateVerificationCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  async sendVerificationCode(email, code) {
    const mailOptions = {
      from: 'verify@wanguo.co.nz',
      to: email,
      subject: '邮箱验证码 - 护照上传验证',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #1890ff; margin: 0; text-align: center;">邮箱验证码</h2>
          </div>
          
          <div style="background-color: white; padding: 30px; border-radius: 8px; border: 1px solid #e8e8e8;">
            <p style="font-size: 16px; line-height: 1.6; color: #333;">您好，</p>
            
            <p style="font-size: 16px; line-height: 1.6; color: #333;">
              您正在进行护照信息上传验证，您的验证码是：
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <span style="background-color: #1890ff; color: white; padding: 15px 30px; font-size: 24px; font-weight: bold; border-radius: 6px; letter-spacing: 3px;">
                ${code}
              </span>
            </div>
            
            <p style="font-size: 14px; line-height: 1.6; color: #666;">
              • 验证码有效期为10分钟<br>
              • 请勿将验证码泄露给他人<br>
              • 如果您没有申请此验证码，请忽略此邮件
            </p>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e8e8e8; text-align: center;">
              <p style="font-size: 12px; color: #999; margin: 0;">
                此邮件由系统自动发送，请勿回复
              </p>
            </div>
          </div>
        </div>
      `
    };

    try {
      await this.transporter.sendMail(mailOptions);
      return { success: true };
    } catch (error) {
      console.error('发送验证码邮件失败:', error);
      return { success: false, error: error.message };
    }
  }

  async verifyConnection() {
    try {
      await this.transporter.verify();
      console.log('邮件服务连接成功');
      return true;
    } catch (error) {
      console.error('邮件服务连接失败:', error);
      return false;
    }
  }
}

module.exports = new EmailService();