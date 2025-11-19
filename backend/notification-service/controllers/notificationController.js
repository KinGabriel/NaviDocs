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

    // Support two modes:
    // A) Targeted users (preferred when caller knows IDs)
    // B) Role-based broadcast (when approver IDs are not yet known)
    // At least one of targetedUserIds, recipientUser, recipientRoles must be provided
    if ((!targetedUserIds || targetedUserIds.length === 0) && !recipientUser && (!recipientRoles || recipientRoles.length === 0)) {
      return res.status(400).json({ message: 'Provide targetedUserIds, recipientUser, or recipientRoles.' });
    }

    // 1. Create the initial isRead Map
    // - If targetedUserIds are provided, mark all as unread
    // - Else, start with an empty map (users will match via recipientRoles/recipientUser)
    const initialReadStatus = Array.isArray(targetedUserIds) && targetedUserIds.length > 0
      ? targetedUserIds.reduce((acc, userId) => {
          acc[userId] = false;
          return acc;
        }, {})
      : {};
    // Optionally mark direct recipientUser as unread for convenience
    if (recipientUser) {
      initialReadStatus[recipientUser] = false;
    }

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
  // user injected by our auth middleware (cookie-based JWT)
  const userId = String(req.user?.id || req.user?._id || '');
  const userRole = typeof req.user?.role === 'string' ? req.user.role : (req.user?.role?.name || null);

  try {
    // Build OR conditions safely
    const orConditions = [
      // notifications explicitly targeted to this user via targetedUserIds (isRead.<userId> exists)
      { [`isRead.${userId}`]: { $exists: true } },
      // direct user targeting
      { recipientUser: userId },
    ];
    if (userRole) orConditions.push({ recipientRoles: userRole });

    const notifications = await Notification.find({ $or: orConditions })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    // Normalize read status and shape
    const userNotifications = notifications.map((notif) => {
      const map = notif.isRead || {};
      const readVal = typeof map.get === 'function' ? map.get(userId) : map[userId];
      const readStatus = !!readVal;
      return {
        _id: notif._id,
        message: notif.message,
        type: notif.type,
        link: notif.link,
        isRead: readStatus,
        createdAt: notif.createdAt,
      };
    });

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