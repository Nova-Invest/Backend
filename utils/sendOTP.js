const { generateOTP } = require("./generateOTP");
const nodemailer = require("nodemailer");

const sendOTP = async (adminEmail, adminPass, userEmail) => {
  const transporter = nodemailer.createTransport({
    service: "Gmail",
    auth: {
      user: adminEmail,
      pass: adminPass,
    },
  });

  const otp = generateOTP(6);

  const mailOptions = {
    from: adminEmail,
    to: userEmail,
    subject: "Your OTP Code",
    text: `Your OTP code is ${otp}`,
  };

  await transporter.sendMail(mailOptions);

  return otp;
};

module.exports = { sendOTP };
