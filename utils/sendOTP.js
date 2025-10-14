const { generateOTP } = require("./generateOTP");
const nodemailer = require("nodemailer");

const sendOTP = async (userEmail, digits) => {
  const transporter = nodemailer.createTransport({
    service: "Gmail",
    auth: {
      user: process.env.EMAIL_USER || "nonreply.growvest@gmail.com",
      pass: process.env.EMAIL_PASS || "sypmgukwirtcujfn",
    },
  });

  const otp = generateOTP(digits); // 6 digits for better security

  const mailOptions = {
    from: process.env.EMAIL_USER || "nonreply.growvest@gmail.com",
    to: userEmail,
    subject: "Your Withdrawal OTP Code - Growvest",
    html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #1a365d;">Growvest Withdrawal Verification</h2>
                <p>Your One-Time Password (OTP) for withdrawal is:</p>
                <div style="background: #f8f9fa; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; color: #1a365d; margin: 20px 0;">
                  ${otp}
                </div>
                <p>This OTP will expire in <strong>10 minutes</strong>.</p>
                <p style="color: #666; font-size: 14px;">
                  <strong>Security Tip:</strong> Never share this code with anyone. Growvest will never ask for your OTP.
                </p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                <p style="color: #999; font-size: 12px;">
                  If you didn't request this OTP, please ignore this email or contact support immediately.
                </p>
            </div>
        `,
    text: `Your OTP code for withdrawal is: ${otp}. This code will expire in 10 minutes. Do not share this code with anyone.`,
  };

  await transporter.sendMail(mailOptions);
  return otp;
};

module.exports = sendOTP;