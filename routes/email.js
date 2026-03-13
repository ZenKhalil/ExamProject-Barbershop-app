const nodemailer = require('nodemailer');
require('dotenv').config();

// Create a transporter using Brevo SMTP
const transporter = nodemailer.createTransport({
  host: 'smtp-relay.brevo.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.BREVO_SMTP_USER,
    pass: process.env.BREVO_SMTP_PASS,
  },
});

// Verify the transporter configuration
transporter.verify(function (error, success) {
  if (error) {
    console.error('Error with email transporter:', error);
  } else {
    console.log('Email transporter is ready to send messages');
  }
});

/**
 * Sends an email using the configured Brevo SMTP transporter.
 * @param {Object} mailOptions - Options for the email.
 * @returns {Promise} - Resolves when the email is sent successfully.
 */
const sendEmail = (mailOptions) => {
  return new Promise((resolve, reject) => {
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error('Error sending email:', error);
        reject(error);
      } else {
        console.log('Email sent:', info.response);
        resolve(info);
      }
    });
  });
};

module.exports = { sendEmail };