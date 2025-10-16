// backend/notification-service/routes/notificationRoutes.js
const express = require('express');
const { getNotifications, markAsRead, createInternalNotification } = require('../controllers/notificationController');

const router = express.Router();

// ----------------------------------------------------
// 1. PUBLIC ROUTES (Exposed via Gateway, authenticated by Gateway)
// ----------------------------------------------------
// The Gateway handles token verification and injects req.user = { id: '...', role: '...' }
router.get('/', getNotifications);
router.patch('/:id/read', markAsRead);

// ----------------------------------------------------
// 2. INTERNAL ROUTE (Only callable by other microservices)
// ----------------------------------------------------
// This MUST be protected by an internal token/IP whitelist on the Gateway/WAF
router.post('/internal', createInternalNotification); 

module.exports = router;