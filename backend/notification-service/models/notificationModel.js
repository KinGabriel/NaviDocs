// backend/notification-service/models/notificationModel.js
import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  // Optional: ID of a specific user for direct notification 
  recipientUser: { 
    type: String, // Stored as a string ID since we are cross-service
    required: false,
  },
  // Roles this notification applies to (e.g., ['document controller', 'department head'])
  recipientRoles: [{ 
    type: String,
    enum: ['Admin', 'Faculty', 'Secretary', 'Dean', 'Department Head', 'Document Controller'], 
    required: true,
  }],
  message: {
    type: String,
    required: false,
  },
  type: {
    type: String,
    enum: ['document_submitted', 'document_approved', 'document_rejected', 'template_update', 'system_alert'],
    required: true,
  },
  link: { // Frontend route path (e.g., /dashboard/approval/123)
    type: String,
    required: true,
  },
  // Tracks read status for each user ID
  isRead: { 
    type: Map, 
    of: Boolean, 
    default: {},
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 60 * 60 * 24 * 60, // Auto-delete after 60 days
  },
});

export default mongoose.model('Notification', notificationSchema);