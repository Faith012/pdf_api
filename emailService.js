// emailService.js
const { config } = require('dotenv');
const { attachment } = require('express/lib/response');
// import logger from "./logger.js"; // Import the logger
const nodemailer = require("nodemailer")
const path = require("path");


config();

const transporter = nodemailer.createTransport({
    service: "Outlook",
    host: "smtp-mail.outlook.com",
    port: 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
});

const sendEmail = (to, subject, text, pdfPath) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: to,
    subject: subject,
    text: text,
    attachments: [
      {
        filename: path.basename(pdfPath),
        path: pdfPath,
      }
    ],

  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log("Error sending email: ", error);
      // logger.error("Error sending email: ", error);
    } else {
      console.log("Email sent: " + info.response);
      // logger.info("Email sent: " + info.response);
    }
  });
};

module.exports = sendEmail; 