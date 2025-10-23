require("dotenv").config();
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_USER,      
    pass: process.env.SMTP_PASS,     
  },
});

async function sendEmaill(toEmail, subject, htmlContent) {
  const mailOptions = {
    from: "VNR Campus Hall Booings",
    to: toEmail,
    subject,
    html: htmlContent,
  };

  return transporter.sendMail(mailOptions);
}

module.exports = { sendEmaill };
