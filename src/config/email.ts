import nodemailer from 'nodemailer';
import logger from './logger.js';

if (!process.env.SMTP_HOST) {
  logger.warn('SMTP_HOST not set - emails will not be sent');
}

export const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for 587
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const sendEmail = async ({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> => {
  if (!process.env.SMTP_HOST) {
    logger.warn(`Email not sent (no SMTP configured): ${subject} to ${to}`);
    return;
  }

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@resona.app',
      to,
      subject,
      html,
    });
    logger.info(`Email sent: ${subject} to ${to}`);
  } catch (error) {
    logger.error(`Error sending email: ${error}`);
    throw new Error('Failed to send email');
  }
};
