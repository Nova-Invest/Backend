const { generateOTP } = require("./generateOTP");
const nodemailer = require("nodemailer");
require('dotenv').config();

const sendOTP = async (userEmail) => {
  // Basic transporter configuration
  const transporter = nodemailer.createTransport({
    service: "Gmail",
    auth: {
      user: "thegrowvest@gmail.com",
      pass: "umdsvjpikwixzpww",
    }
  });

  const otp = generateOTP(6);
  const currentYear = new Date().getFullYear();

  // Simplified HTML template (still looks good but with less code)
  const htmlTemplate = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #172554; text-align: center;">GROWVEST</h1>
      <h2 style="color: #172554;">Your One-Time Password</h2>
      
      <p>Hello,</p>
      <p>Please use this OTP to verify your account:</p>
      
      <div style="background: #f8f9fa; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
        <div style="font-size: 28px; font-weight: bold; letter-spacing: 3px; color: #2c3e50; background: white; padding: 10px; border-radius: 5px; display: inline-block;">
          ${otp}
        </div>
        <p>Valid for 20 minutes</p>
      </div>
      
      <p>If you didn't request this, please ignore this email.</p>
      
      <div style="text-align: center; margin-top: 30px; font-size: 12px; color: #7f8c8d; border-top: 1px solid #eee; padding-top: 15px;">
        <p>© ${currentYear} Growvest. All rights reserved.</p>
        <p>Suit 44 Vicbalkon Towers Jabi, Abuja, Nigeria</p>
      </div>
    </div>
  `;

  // Plain text version
  const textTemplate = `
    Growvest OTP
    
    Your verification code is: ${otp}
    This code expires in 20 minutes.
    
    © ${currentYear} Growvest
  `;

  const mailOptions = {
    from: '"Growvest Support" <thegrowvest@gmail.com>',
    to: userEmail,
    subject: "Your Growvest OTP Code",
    text: textTemplate,
    html: htmlTemplate
  };

  try {
    await transporter.sendMail(mailOptions);
    return otp;
  } catch (error) {
    console.error("Error sending OTP:", error);
    throw new Error("Failed to send OTP email. Please try again later.");
  }
};

module.exports = { sendOTP };