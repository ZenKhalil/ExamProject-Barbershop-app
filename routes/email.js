const Brevo = require('@getbrevo/brevo');
require('dotenv').config();

const apiInstance = new Brevo.TransactionalEmailsApi();
apiInstance.authentications['apiKey'].apiKey = process.env.BREVO_API_KEY;

/**
 * Sends an email using the Brevo HTTP API.
 * @param {Object} mailOptions - Options for the email (from, to, subject, text, attachments).
 * @returns {Promise} - Resolves when the email is sent successfully.
 */
const sendEmail = async (mailOptions) => {
  const sendSmtpEmail = new Brevo.SendSmtpEmail();

  sendSmtpEmail.sender = { email: process.env.EMAIL_USERNAME, name: 'Salon Sindbad' };
  sendSmtpEmail.to = [{ email: mailOptions.to }];
  sendSmtpEmail.subject = mailOptions.subject;
  sendSmtpEmail.textContent = mailOptions.text;

  if (mailOptions.attachments && mailOptions.attachments.length > 0) {
    sendSmtpEmail.attachment = mailOptions.attachments.map((att) => ({
      name: att.filename,
      content: Buffer.isBuffer(att.content)
        ? att.content.toString('base64')
        : Buffer.from(att.content).toString('base64'),
    }));
  }

  try {
    const data = await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log('Email sent:', data.messageId);
    return data;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

module.exports = { sendEmail };