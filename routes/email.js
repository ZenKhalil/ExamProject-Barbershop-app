const { BrevoClient } = require('@getbrevo/brevo');
require('dotenv').config();

const client = new BrevoClient({ apiKey: process.env.BREVO_API_KEY });

/**
 * Sends an email using the Brevo HTTP API.
 * @param {Object} mailOptions - Options for the email (to, subject, text, attachments).
 * @returns {Promise} - Resolves when the email is sent successfully.
 */
const sendEmail = async (mailOptions) => {
  const emailData = {
    sender: { email: process.env.EMAIL_USERNAME, name: 'Salon Sindbad' },
    to: [{ email: mailOptions.to }],
    subject: mailOptions.subject,
    textContent: mailOptions.text,
  };

  if (mailOptions.attachments && mailOptions.attachments.length > 0) {
    emailData.attachment = mailOptions.attachments.map((att) => ({
      name: att.filename,
      content: Buffer.isBuffer(att.content)
        ? att.content.toString('base64')
        : Buffer.from(att.content).toString('base64'),
    }));
  }

  try {
    const data = await client.transactionalEmails.sendTransacEmail(emailData);
    console.log('Email sent successfully');
    return data;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

module.exports = { sendEmail };