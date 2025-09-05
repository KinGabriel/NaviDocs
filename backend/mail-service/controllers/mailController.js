
import nodemailer from 'nodemailer';
import { welcomeEmailTemplate } from '../templates/welcomeTemplate.js';
import { folderAccessTemplate } from '../templates/folderAccessTemplate.js';

// Create transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
};

/**
 * @desc Send welcome email to new user
 * @route POST /api/email/send-welcome
 * @access Internal (from other services)
 */
export const sendWelcomeEmail = async (req, res) => {
  try {
    const { email, firstname, lastname, password, role } = req.body;

    // Validate required fields
    if (!email || !firstname || !lastname || !password) {
      return res.status(400).json({ 
        message: 'Missing required fields: email, firstname, lastname, password' 
      });
    }

    const transporter = createTransporter();
    
    // Use the template function
    const htmlContent = welcomeEmailTemplate({
      firstname,
      lastname,
      email,
      password,
      role,
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Welcome to NaviDocs - Your Account Details',
      html: htmlContent,
    };

    await transporter.sendMail(mailOptions);
    
    console.log(`Welcome email sent successfully to ${email}`);
    res.status(200).json({ 
      message: 'Welcome email sent successfully',
      recipient: email 
    });

  } catch (error) {
    console.error('Error sending welcome email:', error);
    res.status(500).json({ 
      message: 'Failed to send welcome email',
      error: error.message 
    });
  }
};

/**
 * @desc Send notification email for folder access
 * @route POST /api/email/send-access
 * @access Internal (from other services)
 */
export const sendNotificationEmail = async (req, res) => {
  try {
    const { to, subject, text, html, template, templateData } = req.body;
    if (!to || !subject) {
      return res.status(400).json({ message: 'Missing required fields: to, subject' });
    }

    let finalHtml = html;
    // If a template is specified, render it
    if (template === 'folderAccess') {
      // Import here to avoid circular deps if not needed
      finalHtml = folderAccessTemplate(templateData || {});
    }

    if (!finalHtml && !text) {
      return res.status(400).json({ message: 'Missing email content: text or html/template' });
    }

    const transporter = createTransporter();
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to,
      subject,
      text,
      html: finalHtml,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Notification email sent successfully to ${to}`);
    res.status(200).json({ message: 'Notification email sent successfully', recipient: to });
  } catch (error) {
    console.error('Error sending notification email:', error);
    res.status(500).json({ message: 'Failed to send notification email', error: error.message });
  }
};