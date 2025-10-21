// backend/notification-service/controllers/notificationController.js
import Notification from "../models/notificationModel.js";
// NOTE: This service does NOT have direct access to the User model, 
// so user role and ID must come from the request, typically injected by the Gateway/Auth-Service.

// @desc    API to receive notification events from other services (e.g., Document-Service)
// @route   POST /api/internal/notifications
// @access  Internal (Should be secured via Gateway/Internal Token)
export const createInternalNotification = async (req, res) => {
  try {
    const { recipientUser, recipientRoles, message, type, link, targetedUserIds } = req.body;

    // This block replaces the need for the Notification Service to fetch User data.
    // The calling service (e.g., Document-Service) must send the IDs of the users to be notified.
    if (!targetedUserIds || targetedUserIds.length === 0) {
        return res.status(400).json({ message: 'Missing targetedUserIds for notification creation.' });
    }

    // 1. Create the initial isRead Map (all targeted users unread)
    const initialReadStatus = targetedUserIds.reduce((acc, userId) => {
      acc[userId] = false;
      return acc;
    }, {});

    const newNotification = new Notification({
      recipientUser,
      recipientRoles,
      message,
      type,
      link,
      isRead: initialReadStatus,
    });

    console.log('Saving new notification for targeted users:', Object.keys(initialReadStatus));
    await newNotification.save();
    res.status(201).json({ message: 'Notification created successfully', notificationId: newNotification._id });
  } catch (error) {
    console.error('Error creating internal notification:', error);
    res.status(500).json({ message: 'Internal server error during notification creation.' });
  }
};


// @desc    Get notifications for the authenticated user
// @route   GET /api/notifications
// @access  Public (Exposed via Gateway, Auth is done upstream)
export const getNotifications = async (req, res) => {
  // Assuming the Gateway has validated the token and injected user details into req.user 
  // (e.g., { id: 'user_id_string', role: 'faculty' })
  const userId = req.user.id ||  req.user._id ; 
  const userRole = req.user.role || req.user.role.name; 

  try {
    const notifications = await Notification.find({
      $or: [
        { 'isRead': { $exists: true, $ne: {} } }, // Filter out notifications created without targeted users 
        { recipientUser: userId },           // Targeted directly to the user
        { recipientRoles: userRole }         // Targeted to the user's role
      ]
    })
      .sort({ createdAt: -1 })
      .limit(50) 
      .lean();

    // Process results to determine the user's specific read status
    const userNotifications = notifications.map(notif => {
      // Check the Map for the user's specific status, defaulting to false (unread)
      const readStatus = notif.isRead[userId] || false; 

      return {
        _id: notif._id,
        message: notif.message,
        type: notif.type,
        link: notif.link,
        isRead: readStatus, // The key dynamic filter
        createdAt: notif.createdAt,
      };
    });
console.log('Fetched notifications for user:', userId, userNotifications);
    res.json(userNotifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Mark a specific notification as read for the authenticated user
// @route   PATCH /api/notifications/:id/read
// @access  Public
export const markAsRead = async (req, res) => {
  const notificationId = req.params.id;
  const userId = req.user.id; 

  try {
    // Dynamically update the Map key: e.g., 'isRead.65b9...'
    const updateKey = `isRead.${userId}`; 

    await Notification.updateOne(
      { _id: notificationId },
      { $set: { [updateKey]: true } }
    );

    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ message: 'Server error' });
  }
};