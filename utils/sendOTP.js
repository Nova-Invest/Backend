const { generateOTP } = require("./generateOTP");
const nodemailer = require("nodemailer");

const sendOTP = async (userEmail) => {
  const transporter = nodemailer.createTransporter({
    service: "Gmail",
    auth: {
      user: process.env.EMAIL_USER || "thegrowvest@gmail.com",
      pass: process.env.EMAIL_PASS || "qwwfmuobfmqyjlgc",
    },
  });

  const otp = generateOTP(6);

  const mailOptions = {
    from: process.env.EMAIL_USER || "thegrowvest@gmail.com",
    to: userEmail,
    subject: "Your OTP Code - Growvest",
    text: `Your OTP code is ${otp}. It expires in 5 minutes. Do not share it.`,
    html: `<p>Your OTP code is <strong>${otp}</strong>. It expires in 5 minutes.</p>`,
  };

  await transporter.sendMail(mailOptions);
  console.log(`OTP ${otp} sent to ${userEmail}`); // Debug log
  return otp;
};

module.exports = { sendOTP };