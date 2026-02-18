const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT, 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

transporter.verify()
    .then(() => console.log('✅ Email transporter ready'))
    .catch((err) => console.warn('⚠️ Email transporter error:', err.message));

/**
 * Send an email
 */
const sendEmail = async ({ to, subject, html, text }) => {
    const mailOptions = {
        from: `"Prakriti AI" <${process.env.SMTP_USER}>`,
        to,
        subject,
        html,
        text,
    };

    return transporter.sendMail(mailOptions);
};

/**
 * Send OTP verification email
 */
const sendOtpEmail = async (email, otp, type = 'verification') => {
    const subjects = {
        verification: 'Verify your Prakriti AI account',
        reset: 'Reset your Prakriti AI password',
        login: 'Prakriti AI Login Verification',
    };

    const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #2d6a4f;">🌿 Prakriti AI</h1>
        <p style="color: #666;">Ayurvedic Wellness Platform</p>
      </div>
      <div style="background: #f8f9fa; border-radius: 10px; padding: 30px; text-align: center;">
        <h2 style="color: #333;">Your Verification Code</h2>
        <p style="color: #666; margin-bottom: 20px;">
          ${type === 'verification' ? 'Please use the following code to verify your email address:' : ''}
          ${type === 'reset' ? 'Please use the following code to reset your password:' : ''}
          ${type === 'login' ? 'Please use the following code to complete your login:' : ''}
        </p>
        <div style="background: #2d6a4f; color: white; font-size: 32px; letter-spacing: 8px; padding: 15px 30px; border-radius: 8px; display: inline-block; font-weight: bold;">
          ${otp}
        </div>
        <p style="color: #999; margin-top: 20px; font-size: 14px;">
          This code will expire in <strong>10 minutes</strong>.
        </p>
      </div>
      <div style="text-align: center; margin-top: 30px; color: #999; font-size: 12px;">
        <p>If you didn't request this code, please ignore this email.</p>
        <p>&copy; ${new Date().getFullYear()} Prakriti AI. All rights reserved.</p>
      </div>
    </div>
  `;

    return sendEmail({
        to: email,
        subject: subjects[type] || subjects.verification,
        html,
        text: `Your Prakriti AI verification code is: ${otp}. It expires in 10 minutes.`,
    });
};

module.exports = { sendEmail, sendOtpEmail };
