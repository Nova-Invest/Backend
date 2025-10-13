const nodemailer = require("nodemailer");

const sendOTP = async (userEmail, otp) => {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: "nonreply.growvest@gmail.com",
      pass: "sypmgukwirtcujfn"
    }
  });

  const mailOptions = {
    from: '"Growvest" <nonreply.growvest@gmail.com>',
    to: userEmail,
    subject: "Your OTP Code",
    text: `Your OTP is: ${otp}. Valid for 10 minutes.`
  };

  await transporter.sendMail(mailOptions);
};

module.exports = { sendOTP };