const generateOTP = require("./generateOTP");
const nodemailer = require("nodemailer");

const sendOTP = async (adminEmail, adminPass, userEmail) => {
  try {
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
  } catch (error) {
    console.log("Error sending OTP:", error);
    throw new Error("Failed to send OTP");
  }
};

module.exports = { sendOTP };
