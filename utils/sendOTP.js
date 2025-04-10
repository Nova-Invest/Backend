const { generateOTP } = require("./generateOTP");
const nodemailer = require("nodemailer");
require('dotenv').config(); // Load environment variables

const sendOTP = async (userEmail) => {
  // Create transporter with more robust configuration
  const transporter = nodemailer.createTransport({
    service: "Gmail",
    host: "smtp.gmail.com",
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user:  "thegrowvest@gmail.com",
      pass:  "umdsvjpikwixzpww", // Use app password
    },
    tls: {
      rejectUnauthorized: false // For local testing only, remove in production
    }
  });

  const otp = generateOTP(6);
  const currentYear = new Date().getFullYear();

  // Fixed HTML email template with corrected CSS
  const htmlTemplate = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Your OTP Code</title>
      <style>
        body {
          font-family: 'Arial', sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        
        h1 {
          color: #172554;
          text-align: center;
        }
        
        h2 {
          text-align: left;
          font-size: 1.875rem;
          font-weight: 800;
          color: #172554;
        }
        
        .header {
          text-align: center;
          padding: 20px 0;
        }
        
        .logo {
          max-width: 150px;
          height: auto;
        }
        
        .otp-container {
          background-color: #f8f9fa;
          border-radius: 8px;
          padding: 20px;
          text-align: center;
          margin: 20px 0;
          border: 1px solid #e1e1e1;
        }
        
        .otp-code {
          font-size: 28px;
          font-weight: bold;
          letter-spacing: 3px;
          color: #2c3e50;
          margin: 10px 0;
          padding: 10px;
          background-color: #ffffff;
          border-radius: 5px;
          display: inline-block;
        }
        
        .footer {
          text-align: center;
          margin-top: 30px;
          font-size: 12px;
          color: #7f8c8d;
          border-top: 1px solid #eee;
          padding-top: 15px;
        }
        
        .button {
          display: inline-block;
          padding: 10px 20px;
          background-color: #3498db;
          color: white;
          text-decoration: none;
          border-radius: 5px;
          margin: 15px 0;
        }
        
        p {
          margin: 10px 0;
          line-height: 1.5;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>GROWVEST</h1>
        <h2>Your One-Time Password</h2>
      </div>
      
      <p>Hello,</p>
      <p>We received a request to authenticate your account. Please use the following OTP code to proceed:</p>
      
      <div class="otp-container">
        <div class="otp-code">${otp}</div>
        <p>This code is valid for 20 minutes.</p>
      </div>
      
      <p>If you didn't request this code, please ignore this email or contact support if you have concerns.</p>
      
      <div class="footer">
        <p>© ${currentYear} Growvest. All rights reserved.</p>
        <p>Suit 44 Vicbalkon Towers Jabi, Abuja, Nigeria</p>
      </div>
    </body>
    </html>
  `;

  // Plain text fallback
  const textTemplate = `
    Your OTP Code
    
    Hello,
    
    We received a request to authenticate your account. Please use the following OTP code to proceed:
    
    OTP Code: ${otp}
    (This code is valid for 20 minutes)
    
    If you didn't request this code, please ignore this email or contact support if you have concerns.
    
    © ${currentYear} Growvest. All rights reserved.
    Suit 44 Vicbalkon Towers Jabi, Abuja, Nigeria
  `;

  const mailOptions = {
    from: '"Growvest Support" <thegrowvest@gmail.com>',
    to: userEmail,
    subject: "Your Growvest OTP Code",
    text: textTemplate,
    html: htmlTemplate,
    headers: {
      "X-Mailer": "Growvest OTP Service",
      "X-Priority": "1",
      "Importance": "high"
    }
  };

  try {
    // Verify connection configuration
    await transporter.verify();
    console.log("Server is ready to take our messages");
    
    // Send mail
    const info = await transporter.sendMail(mailOptions);
    console.log("Message sent: %s", info.messageId);
    return otp;
  } catch (error) {
    console.error("Full error details:", {
      message: error.message,
      stack: error.stack,
      response: error.response
    });
    throw new Error("Failed to send OTP email. Please try again later.");
  }
};

module.exports = { sendOTP };