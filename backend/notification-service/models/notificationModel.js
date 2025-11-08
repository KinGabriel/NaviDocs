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
    enum: [
      // Core org roles
      'Admin', 'Faculty', 'Secretary', 'Dean', 'Department Head',
      // Generalized role (kept for backward compatibility)
      'Document Controller',
      // New, explicit roles used in the template workflow
      'Unit Document Controller', 'Lead Document Controller', 'Document Control Officer'
    ], 
    required: true,
  }],
  message: {
    type: String,
    required: false,
  },
  type: {
    type: String,
    enum: [
      // Existing (keep for backward compatibility)
      'document_submitted',
      'document_approved',
      'document_rejected',
      'template_update',
      'system_alert',
      'template_approval_request',
      // New template workflow events
      'template_assignment',
      'template_deadline_update',
      'template_review_requested', // preferred over template_approval_request
      'template_partially_approved',
      'template_fully_approved',
      'template_rejected',
      'template_returned',
      'template_published',
      'template_unpublished',
      // Document workflow events
      'document_shared',
      'submission_bin_assignment',
      'submission_bin_forwarded',
      'submission_item_submitted',
      'submission_item_unsubmitted',
      'submission_item_returned',
      'submission_item_approved'
    ],
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