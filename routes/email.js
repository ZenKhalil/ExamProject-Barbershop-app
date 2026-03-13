const { Resend } = require('resend');
require('dotenv').config();

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Sends an email using Resend.
 * @param {Object} mailOptions - Options for the email (from, to, subject, text, attachments).
 * @returns {Promise} - Resolves when the email is sent successfully.
 */
const sendEmail = async (mailOptions) => {
  const { data, error } = await resend.emails.send({
    from: 'Salon Sindbad <onboarding@resend.dev>',
    to: mailOptions.to,
    subject: mailOptions.subject,
    text: mailOptions.text,
    attachments: mailOptions.attachments
      ? mailOptions.attachments.map((attachment) => ({
          filename: attachment.filename,
          content: Buffer.isBuffer(attachment.content)
            ? attachment.content
            : Buffer.from(attachment.content),
        }))
      : undefined,
  });

  if (error) {
    console.error('Error sending email:', error);
    throw new Error(error.message);
  }

  console.log('Email sent:', data);
  return data;
};

module.exports = { sendEmail };