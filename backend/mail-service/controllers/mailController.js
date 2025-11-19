
import nodemailer from 'nodemailer';
import { welcomeEmailTemplate } from '../templates/welcomeTemplate.js';
import { folderAccessTemplate } from '../templates/folderAccessTemplate.js';
import { buildAssignmentEmail } from '../templates/buildAssignmentTemplate.js';
import { buildPasswordResetEmail } from '../templates/passwordResetTemplate.js';
import { resetPasswordPlainTemplate } from '../templates/resetPasswordPlainTemplate.js';


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
      // forward now if present so the template can show timestamp
      finalHtml = folderAccessTemplate({ ...(templateData || {}), now: templateData?.now });
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

/**
 * @desc Send assignment emails to recipients
 * @route POST /api/mail/assignments   // matches: router.post('/mail/assignments', sendAssignmentEmails)
 */
export async function sendAssignmentEmails(req, res) {
  try {
    const {
      actor,
      template,
      recipients = [],
      assignmentType,
      deadline,
      to = [],
      title,
      instructions,
      notes = [],
      now = null,
    } = req.body || {};

    // Build recipient list from either rich objects or plain emails
    const list = Array.isArray(recipients) && recipients.length
      ? recipients
      : (to || []).map((email) => ({ email }));

    if (!list.length) {
      return res.status(400).json({ message: 'No recipients provided' });
    }

    // Create transporter (same approach as your other handlers)
    const transporter = createTransporter();

    // Send one email per recipient (like your other single-recipient flows)
    const sendJobs = list.map((recipient) => {
      const { subject, html, text } = buildAssignmentEmail({
        actor,
        template,
        assignmentType,
        deadline,
        recipient: {
          name: recipient.name || (recipient.email ? recipient.email.split('@')[0] : 'there'),
          email: recipient.email,
          role: recipient.role,
        },
        now,
        notes,
        instructions: instructions || undefined,
      });

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: recipient.email,
        subject,
        text,   // keep text fallback
        html,   // primary body
      };

      return transporter.sendMail(mailOptions);
    });

    const results = await Promise.allSettled(sendJobs);
    const sent = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected');

    if (failed.length && sent === 0) {
      // nothing got through
      return res.status(500).json({
        message: 'Failed to send assignment emails',
        errors: failed.map(f => f.reason?.message || 'Unknown error'),
      });
    }

    return res.status(200).json({
      message: 'Assignment emails processed',
      sent,
      failed: failed.length,
      recipients: list.map(r => r.email),
    });
  } catch (error) {
    console.error('sendAssignmentEmails error:', error);
    return res.status(500).json({ message: 'Failed to send assignment emails', error: error.message });
  }
}

/**
 * @desc Send password reset OTP email
 * @route POST /api/email/password-reset
 * @access Internal (from other services)
 */
export const sendPasswordResetEmail = async (req, res) => {
  try {
    const { to, firstname = "", lastname = "", otp } = req.body || {};
    
    if (!to || !otp) {
      return res.status(400).json({ message: 'Missing required fields: to, otp' });
    }

    const transporter = createTransporter();
    
    // Use the dedicated password reset template
    const { subject, html, text } = buildPasswordResetEmail({ 
      firstname, 
      lastname, 
      otp 
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to,
      subject: "NaviDocs Password Reset Code",
      html,
      text,
    };

    await transporter.sendMail(mailOptions);
    
    console.log(`Password reset email sent successfully to ${to}`);
    return res.status(200).json({ 
      message: 'Password reset email sent successfully', 
      recipient: to 
    });
  } catch (error) {
    console.error('sendPasswordResetEmail error:', error);
    return res.status(500).json({ 
      message: 'Failed to send password reset email', 
      error: error.message 
    });
  }
};

/**
 * @desc Send admin-triggered password email containing a temporary password
 * @route POST /api/email/send-reset-password
 * @access Internal (from other services)
 */
export const sendResetPasswordPlainEmail = async (req, res) => {
  try {
    const { email: to, firstname = '', lastname = '', password, role } = req.body || {};

    if (!to || !password) {
      return res.status(400).json({ message: 'Missing required fields: email, password' });
    }

    const transporter = createTransporter();

    const html = resetPasswordPlainTemplate({ firstname, lastname, email: to, password, role });
    const subject = 'Your account password has been reset';

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to,
      subject,
      html,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Admin password email sent successfully to ${to}`);
    return res.status(200).json({ message: 'Admin password email sent successfully', recipient: to });
  } catch (error) {
    console.error('sendResetPasswordPlainEmail error:', error);
    return res.status(500).json({ message: 'Failed to send admin password email', error: error.message });
  }
};
