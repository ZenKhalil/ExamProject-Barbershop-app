const nodemailer = require('nodemailer');
require('dotenv').config();

// Destructure environment variables
const { EMAIL_SERVICE, EMAIL_USERNAME, EMAIL_PASSWORD } = process.env;

// Create a transporter
const transporter = nodemailer.createTransport({
  service: EMAIL_SERVICE, // 'gmail'
  auth: {
    user: EMAIL_USERNAME,
    pass: EMAIL_PASSWORD,
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
 * Sends an email using the configured transporter.
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
