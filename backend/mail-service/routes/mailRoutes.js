import express from 'express';
import { sendWelcomeEmail,sendNotificationEmail, sendAssignmentEmails, sendPasswordResetEmail, sendResetPasswordPlainEmail } from '../controllers/mailController.js';


const router = express.Router();

router.post('/send-welcome', sendWelcomeEmail);
router.post('/send-access', sendNotificationEmail);
router.get('/health', (req, res) => {
  res.status(200).json({ message: 'Email Service is running' });
});

router.post('/assignments', sendAssignmentEmails);
router.post('/password-reset', sendPasswordResetEmail);
router.post('/send-password-reset', sendPasswordResetEmail);
router.post('/send-reset-password', sendResetPasswordPlainEmail);

export default router;
