import Template from "../models/templateModel.js";
import { buildApprovalMeta } from "../utils/templateUtils.js";
import axios from "axios";
import { getActorFromReq } from '../utils/actorUtils.js';
import { fetchUsersProfiles, buildUserServiceHeaders } from '../utils/userServiceUtils.js';


/**
 * @desc Create the template, assign users + approver, then email everyone involved
 * @route POST /api/templates/assign
 * @access Private
 */
export const assignUsersToCreateTemplate = async (req, res) => {
  try {
    const {
      assigned,
      approver,
      templateData,
      deadline,
      title,
      instructions,
      assignmentType,
    } = req.body;

    // --- validation ---
    if (!templateData) {
      return res.status(400).json({ success: false, message: 'templateData is required' });
    }
    if (!Array.isArray(assigned) || assigned.length === 0) {
      return res.status(400).json({ success: false, message: 'Assigned users array required' });
    }
    if (!approver) {
      return res.status(400).json({ success: false, message: 'Approver is required' });
    }

    const userId = String(req.user?.id ?? req.user?._id);

    // --- normalize templateData & notes ---
    const safeTitle = (templateData.title || '').trim() || 'Untitled Template';
    delete templateData.document_code;

    const notes = Array.isArray(templateData.notes) ? templateData.notes : [];
    notes.push({
      added_by: userId,
      role_snapshot: req.user?.role?.name || '',
      type: 'assignment',
      message: templateData.instructions || 'No instructions provided',
      created_at: new Date(),
    });

    // --- create new Template doc (but do not email yet) ---
    const template = new Template({
      title: safeTitle,
      pages_json: Array.isArray(templateData.pages_json)
        ? templateData.pages_json
        : [
            {
              type: 'doc',
              content: [{ type: 'paragraph', content: [{ type: 'text', text: '' }] }],
            },
          ],
      body: templateData.body || '',
      created_by: templateData.created_by || userId,
      notes,
      deadline: deadline || undefined,
    });

    // --- assign properties ---
    template.assigned = assigned;
    template.status = 'assigned';
    template.school = req.user?.school || '';
    template.status_meta = template.status_meta || {};
    template.status_meta.assigned_by = userId;
    template.status_meta.assigned_at = new Date();
    template.status_meta.approvals = template.status_meta.approvals || { dean: {}, secretary: {} };

    // approver structure based on assigner role
    const role = String(req.user?.role?.name || '').toLowerCase();
    if (role === 'dean') {
      template.status_meta.approvals.secretary = {
        assigned_to: approver,
        isApproved: false,
        approved_at: null,
      };
      template.status_meta.approvals.dean = {
        assigned_to: userId,
        isApproved: false,
        approved_at: null,
      };
    } else if (role === 'secretary') {
      template.status_meta.approvals.dean = {
        assigned_to: approver,
        isApproved: false,
        approved_at: null,
      };
      template.status_meta.approvals.secretary = {
        assigned_to: userId,
        isApproved: false,
        approved_at: null,
      };
    }

    if (deadline) template.deadline = deadline;

    await template.save();
    // --- Notify approver(s) via Notification Service (internal call) ---
    try {
      const notificationServiceUrl = process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:8008';
      // Build targeted user IDs: include assigned users and the approver slot(s), but exclude the assigner (req.user.id)
      const assignedIds = Array.isArray(template.assigned) ? template.assigned.slice() : [];
      const approvals = template?.status_meta?.approvals || {};
      const approverIds = [];
      // Collect any assigned_to fields from approvals
      Object.keys(approvals).forEach(slot => {
        const assigned_to = approvals[slot]?.assigned_to;
        if (assigned_to) approverIds.push(assigned_to);
      });

      // Combine and dedupe
      const combinedTargets = Array.from(new Set([...(assignedIds || []), ...(approverIds || [])]));
      // Exclude the assigner
      const targetedUserIds = combinedTargets.filter(id => id && String(id) !== String(req.user.id));

      if (targetedUserIds.length > 0) {
        const payload = {
          recipientUser: targetedUserIds.length === 1 ? targetedUserIds[0] : undefined,
          recipientRoles: ['Dean','Secretary','Document Controller'],
          message: `You have been assigned a template \"${template.title}\" to create.`,
          type: 'template_assignment',
          link: `/document-controller/create-template?templateId=${template._id}`,
          targetedUserIds
        };

        // internal route: /api/notifications/internal (protected by gateway/internal token)
        try {
          const resp = await axios.post(`${notificationServiceUrl}/api/notifications/internal`, payload, {
            headers: {
              'Content-Type': 'application/json',
              'X-Internal-Token': process.env.INTERNAL_TOKEN || ''
            },
            timeout: 5000
          });

          console.log('Notification service responded:', resp.status, resp.data);
        } catch (err) {
          // More descriptive logging to aid debugging (network vs response error)
          if (err.response) {
            // Server responded with a status outside 2xx
            console.error('Notification service error response:', {
              status: err.response.status,
              data: err.response.data
            });
          } else if (err.request) {
            // Request made but no response received
            console.error('No response from Notification service, request sent:', err.request && err.request._currentUrl ? err.request._currentUrl : 'request sent');
          } else {
            // Something else happened when setting up the request
            console.error('Error while calling Notification service:', err.message || err);
          }
        }
      } else {
        console.log('No external users to notify (only assigner present)');
      }
    } catch (notifyErr) {
      console.error('Failed to send internal notification (outer):', notifyErr?.message || notifyErr);
    }

    // ==========================================================
    // FETCH EMAILS (assigned users + approver)
    // ==========================================================
    const USER_BASE = process.env.USER_SERVICE_URL || ''; // e.g., http://localhost:4002
    const getEmailEndpoint = (id) =>
      `${USER_BASE}/api/user/getUserEmail/${encodeURIComponent(id)}`;

    // Forward auth from the current request (Bearer + Cookies if present)
    const headers = {};
    if (req.headers.authorization) headers['Authorization'] = req.headers.authorization;
    if (req.headers.cookie) headers['Cookie'] = req.headers.cookie;

    const uniqueUserIds = Array.from(new Set([...assigned, approver].map(String)));
    const recipients = await fetchUsersProfiles(uniqueUserIds, headers); // [{id,email,name,role}, ...]

    if (recipients.length === 0) {
      return res.status(200).json({
        success: true,
        message:
          'Users and approver assigned successfully (emails skipped: no user emails resolved)',
        template,
        notified: [],
      });
    }

    // ==========================================================
    // SEND EMAILS (assigned + approver)
    // ==========================================================
    const MAIL_BASE = process.env.EMAIL_SERVICE_URL || ''; 
    const mailEndpoint = `${MAIL_BASE}/api/email/assignments`; 

    const actor = getActorFromReq(req);
    const mailPayload = {
      actor,
      template: {
        id: template._id,
        name: template.title,
        code: template.document_code,          // typically set later by dean
        revision: template.revision_no ?? 0,   // fallback to 0
        effectivityDate: template.effectivity || null,
      },
      assignmentType: assignmentType || 'Template Creation',
      deadline: deadline || null,
      now: new Date().toISOString(),
      notes: Array.isArray(template.notes) ? template.notes : (Array.isArray(templateData.notes) ? templateData.notes : []),
  to: recipients.map((r) => r.email),      // actual recipient emails
  recipients: recipients.map(r => ({ id: r.id, email: r.email, name: r.name || undefined, role: r.role || undefined })),
      title: title ?? template.title,
      instructions: instructions ?? templateData.instructions ?? '',
    };

    let mailService = null;
    try {
      const mailResp = await axios.post(mailEndpoint, mailPayload, { timeout: 10000 });
      mailService = { status: mailResp.status, data: mailResp.data };
    } catch (mailErr) {
      mailService = { error: mailErr?.response?.data || mailErr.message || 'mail send failed' };
    }

    // ==========================================================
    // RESPONSE
    // ==========================================================
    return res.status(200).json({
      success: true,
      message:
        'Users and approver assigned successfully' +
        (mailService?.error ? ' (email failed)' : ' and emails sent'),
      template,
      notified: mailPayload.to,
      mailService,
    });
  } catch (error) {
    console.error('assignUsersToCreateTemplate error:', error);
    return res
      .status(500)
      .json({ success: false, message: 'Failed to assign users/approver' });
  }
};

/**
 * @desc Assign or add document controllers to a template
 * @route POST /api/templates/assign-controllers
 * 
 */
export const assignControllersToTemplate = async (req, res) => {
  try {
    const { templateId, controllers } = req.body;
    if (!templateId || !Array.isArray(controllers) || controllers.length === 0) {
      return res.status(400).json({ success:false, message:'templateId and controllers array are required' });
    }
    const template = await Template.findById(templateId);
    if (!template) return res.status(404).json({ success:false, message:'Template not found' });
    template.assigned = controllers;
    await template.save();

    // Notify assigned Document Controllers and Secretary (if present)
    try {
      const notificationServiceUrl = process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:8008';
      const assignerId = String(req.user?.id || req.user?._id || '');
      const approvals = template?.status_meta?.approvals || {};
      const secretaryId = approvals?.secretary?.assigned_to ? String(approvals.secretary.assigned_to) : null;
      const targets = Array.from(new Set([
        ...controllers.map(String),
        ...(secretaryId ? [secretaryId] : [])
      ])).filter(id => id && id !== assignerId);

      if (targets.length > 0) {
        const payload = {
          recipientUser: targets.length === 1 ? targets[0] : undefined,
          recipientRoles: ['Document Controller', 'Secretary'],
          message: `You have been assigned to work on template "${template.title}"`,
          type: 'template_assignment',
          link: `/document-controller/templates?highlight=${template._id}`,
          targetedUserIds: targets
        };

        try {
          const resp = await axios.post(`${notificationServiceUrl}/api/notifications/internal`, payload, {
            headers: {
              'Content-Type': 'application/json',
              'X-Internal-Token': process.env.INTERNAL_TOKEN || ''
            },
            timeout: 5000
          });
          console.log('Notification (assign controllers) responded:', resp.status, resp.data);
        } catch (err) {
          if (err.response) {
            console.error('Notification service error (assign controllers):', { status: err.response.status, data: err.response.data });
          } else if (err.request) {
            console.error('No response from Notification service (assign controllers).');
          } else {
            console.error('Error calling Notification service (assign controllers):', err.message || err);
          }
        }
      }
    } catch (notifyErr) {
      console.error('Failed to send controller assignment notifications:', notifyErr?.message || notifyErr);
    }
    return res.status(200).json({ success:true, message:'Controllers assigned to template', template: template.toObject() });
  } catch (error) {
    console.error('Error assigning controllers:', error);
    return res.status(500).json({ success:false, message:'Failed to assign controllers to template' });
  }
}


/**
 * @desc Adjust template deadline
 * @route PATCH /api/templates/:id/deadline
 * 
 */
export const adjustTemplateDeadline = async (req, res) => {
  try {
    const { deadline } = req.body;
    if (!deadline) {
      return res.status(400).json({ success:false, message:'Deadline is required' });
    }
    const template = await Template.findById(req.params.id);
    if (!template) return res.status(404).json({ success:false, message:'Template not found' });
    template.deadline = deadline;
    await template.save();
    // Notify all assigned users and approvers about the deadline update
    try {
      const notificationServiceUrl = process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:8008';
      const assignerId = String(req.user?.id || req.user?._id || '');
      const assignedIds = Array.isArray(template.assigned) ? template.assigned.map(String) : [];
      const approvals = template?.status_meta?.approvals || {};
      const approverIds = [];
      Object.keys(approvals).forEach(slot => {
        const id = approvals[slot]?.assigned_to;
        if (id) approverIds.push(String(id));
      });
      const targets = Array.from(new Set([...assignedIds, ...approverIds]))
        .filter(id => id && id !== assignerId);

      if (targets.length > 0) {
        const payload = {
          recipientUser: targets.length === 1 ? targets[0] : undefined,
          recipientRoles: ['Document Controller', 'Secretary', 'Dean'],
          message: `Deadline for template "${template.title}" has been updated.`,
          type: 'template_deadline_update',
          link: `/document-controller/templates?highlight=${template._id}`,
          targetedUserIds: targets
        };
        try {
          const resp = await axios.post(`${notificationServiceUrl}/api/notifications/internal`, payload, {
            headers: {
              'Content-Type': 'application/json',
              'X-Internal-Token': process.env.INTERNAL_TOKEN || ''
            },
            timeout: 5000
          });
          console.log('Notification (deadline update) responded:', resp.status, resp.data);
        } catch (err) {
          if (err.response) {
            console.error('Notification service error (deadline update):', { status: err.response.status, data: err.response.data });
          } else if (err.request) {
            console.error('No response from Notification service (deadline update).');
          } else {
            console.error('Error calling Notification service (deadline update):', err.message || err);
          }
        }
      }
    } catch (notifyErr) {
      console.error('Failed to send deadline update notifications:', notifyErr?.message || notifyErr);
    }
    return res.status(200).json({ success:true, message:'Template deadline updated', template: template.toObject() });
  } catch (err) {
    console.error('Deadline update error', err);
    return res.status(500).json({ success:false, message:'Failed to update template deadline' });
  }
};


/**
 * @desc Add note to template
 * @route PATCH /api/templates/:id/note
 * 
 */
export const addTemplateNote = async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ success:false, message:'Note message is required' });
    }
    const template = await Template.findById(req.params.id);
    if (!template) return res.status(404).json({ success:false, message:'Template not found' });
    template.notes = template.notes || [];
    template.notes.push({
      added_by: req.user.id,
      role_snapshot: req.user?.role?.name || '',
      type: 'general',
      message: message,
      created_at: new Date()
    });
    await template.save();
    return res.status(200).json({ success:true, message:'Note added to template', template: template.toObject() });
  } catch (err) {
    console.error('Add note error', err);
    return res.status(500).json({ success:false, message:'Failed to add note to template' });
  }
};

/**
 * @desc Approve template as dean or secretary
 * @route PATCH /api/templates/:id/approve
 */
export const approveTemplate = async (req, res) => {
  try {
    const { document_code, effectivity, revision_no } = req.body;
    const role = req.user.role.name.toLowerCase();
    if (!['dean','secretary'].includes(role)) {
      return res.status(400).json({ success:false, message:'Invalid role' });
    }
    const template = await Template.findById(req.params.id);
    if (!template) return res.status(404).json({ success:false, message:'Template not found' });
    if (!['pending','draft','approved','assigned'].includes(template.status)) {
      return res.status(400).json({ success:false, message:'Template not in approvable state' });
    }
    template.status_meta = template.status_meta || {};
    template.status_meta.approvals = template.status_meta.approvals || { dean:{}, secretary:{} };
    const slot = template.status_meta.approvals[role];
    if (slot.approved_at) {
      return res.status(400).json({ success:false, message: `${role} already approved` });
    }
    slot.approved_at = new Date();
    slot.isApproved = true;

    // If dean, allow assigning document_code, effectivity, revision_no
    if (role === 'dean') {
      if (document_code) template.document_code = document_code;
      if (effectivity) template.effectivity = effectivity;
      if (revision_no !== undefined) template.revision_no = revision_no;
    }

    // If both approved set overall approved
    const bothApproved = template.status_meta.approvals.dean?.approved_at && template.status_meta.approvals.secretary?.approved_at;
    if (bothApproved) {
      template.status = 'approved';
      if (!template.status_meta.approved_at) template.status_meta.approved_at = new Date();
    } else if (template.status === 'draft') {
      template.status = 'pending'; // incase
      if (!template.status_meta.submitted_for_approval_at) template.status_meta.submitted_for_approval_at = new Date();
    } else if (template.status === 'pending') {
      // keep pending until both
    }
    await template.save();
    const approvalMeta = buildApprovalMeta(template, req.user?.id);

    // Notify assigned Document Controllers that an approval has been recorded
    try {
      const notificationServiceUrl = process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:8008';
      const actorId = String(req.user?.id || req.user?._id || '');
      const controllerIds = Array.isArray(template.assigned) ? template.assigned.map(String) : [];
      const targets = Array.from(new Set(controllerIds)).filter(id => id && id !== actorId);
      if (targets.length > 0) {
        const actionMsg = bothApproved
          ? `Template "${template.title}" has been fully approved.`
          : `Template "${template.title}" was approved by the ${role}.`;
        const payload = {
          recipientUser: targets.length === 1 ? targets[0] : undefined,
          recipientRoles: ['Document Controller'],
          message: actionMsg,
          type: bothApproved ? 'template_fully_approved' : 'template_partially_approved',
          link: `/document-controller/templates?highlight=${template._id}`,
          targetedUserIds: targets
        };
        try {
          await axios.post(`${notificationServiceUrl}/api/notifications/internal`, payload, {
            headers: { 'Content-Type': 'application/json', 'X-Internal-Token': process.env.INTERNAL_TOKEN || '' },
            timeout: 5000
          });
        } catch (err) {
          console.error('Notification service error (approve):', err?.response?.status || err?.message || err);
        }
      }
    } catch (notifyErr) {
      console.error('Failed to notify on approval:', notifyErr?.message || notifyErr);
    }
    return res.status(200).json({ success:true, message:'Approval recorded', template: template.toObject(), approvalMeta });
  } catch (err) {
    console.error('Approve error', err);
    return res.status(500).json({ success:false, message:'Failed to approve template' });
  }
};

/**
 * @desc Reject template as dean or secretary
 * @route PATCH /api/templates/:id/reject
 */
export const rejectTemplate = async (req, res) => {
  try {
    const { reason } = req.body;
    const role = req.user.role.name.toLowerCase();
    if (!['dean','secretary'].includes(role)) {
      return res.status(400).json({ success:false, message:'Invalid role' });
    }
    const template = await Template.findById(req.params.id);
    if (!template) return res.status(404).json({ success:false, message:'Template not found' });
    if (!['pending','draft','approved','assigned'].includes(template.status)) {
      return res.status(400).json({ success:false, message:'Template not in rejectable state' });
    }
    // Add a rejection note
    template.notes = template.notes || [];
    template.notes.push({
      added_by: req.user.id,
      role_snapshot: req.user?.role?.name || '',
      type: 'rejection',
      message: reason || 'No Reason provided',
      created_at: new Date()
    });
    template.status = 'rejected';
    await template.save();

    // Notify assigned Document Controllers of rejection
    try {
      const notificationServiceUrl = process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:8008';
      const actorId = String(req.user?.id || req.user?._id || '');
      const controllerIds = Array.isArray(template.assigned) ? template.assigned.map(String) : [];
      const targets = Array.from(new Set(controllerIds)).filter(id => id && id !== actorId);
      if (targets.length > 0) {
        const payload = {
          recipientUser: targets.length === 1 ? targets[0] : undefined,
          recipientRoles: ['Document Controller'],
          message: `Template "${template.title}" was rejected by the ${role}${reason ? `: ${reason}` : ''}.`,
          type: 'template_rejected',
          link: `/document-controller/templates?highlight=${template._id}`,
          targetedUserIds: targets
        };
        try {
          await axios.post(`${notificationServiceUrl}/api/notifications/internal`, payload, {
            headers: { 'Content-Type': 'application/json', 'X-Internal-Token': process.env.INTERNAL_TOKEN || '' },
            timeout: 5000
          });
        } catch (err) {
          console.error('Notification service error (reject):', err?.response?.status || err?.message || err);
        }
      }
    } catch (notifyErr) {
      console.error('Failed to notify on rejection:', notifyErr?.message || notifyErr);
    }
    return res.status(200).json({ success:true, message:'Template rejected', template: template.toObject() });
  } catch (err) {
    console.error('Reject error', err);
    return res.status(500).json({ success:false, message:'Failed to reject template' });
  }
};

/**
 * @desc Submit template for approval
 * @route PATCH /api/templates/:id/submit
 */
export const submitTemplate = async (req, res) => {
  try {
    const template = await Template.findById(req.params.id);
    if (!template) return res.status(404).json({ success:false, message:'Template not found' });
    // Check if template is already submitted
    if (template.status === 'pending') {
      return res.status(400).json({ success:false, message:'Template already submitted for approval' });
    }

    // Ensure status_meta.approvals exists
    template.status_meta = template.status_meta || {};
    template.status_meta.approvals = template.status_meta.approvals || { dean: {}, secretary: {} };

    // Set assigned_to for dean/secretary from request body if provided
    const { dean_id, secretary_id } = req.body;
    if (dean_id) {
      template.status_meta.approvals.dean.assigned_to = dean_id;
    }
    if (secretary_id) {
      template.status_meta.approvals.secretary.assigned_to = secretary_id;
    }

    template.status = 'pending';
    await template.save();

    // Notify selected Dean and Secretary of submission
    try {
      const notificationServiceUrl = process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:8008';
      const actorId = String(req.user?.id || req.user?._id || '');
      const approvals = template.status_meta?.approvals || {};
      const deanAssigned = approvals.dean?.assigned_to ? String(approvals.dean.assigned_to) : null;
      const secAssigned = approvals.secretary?.assigned_to ? String(approvals.secretary.assigned_to) : null;
      const targets = Array.from(new Set([deanAssigned, secAssigned].filter(Boolean))).filter(id => id !== actorId);
      if (targets.length > 0) {
        const payload = {
          recipientUser: targets.length === 1 ? targets[0] : undefined,
          recipientRoles: ['Dean','Secretary'],
          message: `Template "${template.title}" has been submitted for your approval.`,
          type: 'template_review_requested',
          link: `/approvals/templates?highlight=${template._id}`,
          targetedUserIds: targets
        };
        try {
          await axios.post(`${notificationServiceUrl}/api/notifications/internal`, payload, {
            headers: { 'Content-Type': 'application/json', 'X-Internal-Token': process.env.INTERNAL_TOKEN || '' },
            timeout: 5000
          });
        } catch (err) {
          console.error('Notification service error (submit):', err?.response?.status || err?.message || err);
        }
      }
    } catch (notifyErr) {
      console.error('Failed to notify on submission:', notifyErr?.message || notifyErr);
    }
    return res.status(200).json({ success:true, message:'Template submitted for approval', template: template.toObject() });
  } catch (err) {
    console.error('Submit error', err);
    return res.status(500).json({ success:false, message:'Failed to submit template for approval' });
  }
};

/**
 * @desc Unsubmit template back to draft
 * @route PATCH /api/templates/:id/unsubmit
 */

export const unsubmitTemplate = async (req, res) => {
    try {
    const template = await Template.findById(req.params.id);
    console.log("Unsubmitting template:", template?._id);
    if (!template) return res.status(404).json({ success:false, message:'Template not found' });
    if (template.status !== 'pending') {
      return res.status(400).json({ success:false, message:'Only pending templates can be unsubmitted' });
    }
    template.status = 'returned';
    await template.save();
    return res.status(200).json({ success:true, message:'Template unsubmitted', template: template.toObject() });
  } catch (err) {
    console.error('Unsubmit error', err);
    return res.status(500).json({ success:false, message:'Failed to unsubmit template' });
  } 
};

/**
 * @desc return the template
 * @route PATCH /api/templates/:id/return
 * 
 */

export const returnTemplate = async (req, res) => {
  try {
    const { reason } = req.body;
    console.log("Return reason:", reason);
    const template = await Template.findById(req.params.id);
    if (!template) return res.status(404).json({ success:false, message:'Template not found' });
    // Check if template is already in returned state
    if (template.status === 'returned') {
      return res.status(400).json({ success:false, message:'Template already in returned state' });
    }
    if (!['pending','draft','approved','assigned'].includes(template.status)) {
      return res.status(400).json({ success:false, message:'Template not in returnable state' });
    }
    // Add a change note
    template.notes = template.notes || [];
    template.notes.push({
      added_by: req.user.id,
      role_snapshot: req.user?.role?.name || '',
      type: 'change',
      message: reason || 'No Reason provided',
      created_at: new Date()
    });
    template.status = 'returned';
    await template.save();

    // Notify assigned Document Controllers of return
    try {
      const notificationServiceUrl = process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:8008';
      const actorId = String(req.user?.id || req.user?._id || '');
      const controllerIds = Array.isArray(template.assigned) ? template.assigned.map(String) : [];
      const targets = Array.from(new Set(controllerIds)).filter(id => id && id !== actorId);
      if (targets.length > 0) {
        const payload = {
          recipientUser: targets.length === 1 ? targets[0] : undefined,
          recipientRoles: ['Document Controller'],
          message: `Template "${template.title}" was returned for changes${reason ? `: ${reason}` : ''}.`,
          type: 'template_returned',
          link: `/document-controller/templates?highlight=${template._id}`,
          targetedUserIds: targets
        };
        try {
          await axios.post(`${notificationServiceUrl}/api/notifications/internal`, payload, {
            headers: { 'Content-Type': 'application/json', 'X-Internal-Token': process.env.INTERNAL_TOKEN || '' },
            timeout: 5000
          });
        } catch (err) {
          console.error('Notification service error (return):', err?.response?.status || err?.message || err);
        }
      }
    } catch (notifyErr) {
      console.error('Failed to notify on return:', notifyErr?.message || notifyErr);
    }
    return res.status(200).json({ success:true, message:'Template returned for changes', template: template.toObject() });
  } catch (err) {
    console.error('Return error', err);
    return res.status(500).json({ success:false, message:'Failed to return template' });
  }

}

/**
 * @desc Publish template (must be fully approved)
 * @route PATCH /api/templates/:id/publish
 */
export const publishTemplate = async (req, res) => {
  try {
    const template = await Template.findById(req.params.id);
    console.log("Publishing template:", template?._id);
    if (!template) return res.status(404).json({ success:false, message:'Template not found' });
    // Allow publishing if status is approved or pending but both approvals exist
    if (template.status !== 'approved') {
      const approvals = template.status_meta?.approvals || {};
      const fullyApproved = approvals.dean?.approved_at && approvals.secretary?.approved_at;
      if (template.status === 'pending' && fullyApproved) {
        template.status = 'approved';
        if (!template.status_meta.approved_at) template.status_meta.approved_at = new Date();
      } else {
        return res.status(400).json({ success:false, message:'Template must be approved before publishing' });
      }
    }
    template.status = 'published';
    template.status_meta = template.status_meta || {};
    template.status_meta.published_at = new Date();
    await template.save();
    const approvalMeta = buildApprovalMeta(template, req.user?.id);

    // Notify all users in the school (Doc Controllers, Secretaries, Deans) of the new template
    try {
      const USER_BASE = process.env.USER_SERVICE_URL || '';
      const notificationServiceUrl = process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:8008';
      const headers = buildUserServiceHeaders(req);
      const staffResp = await axios.get(`${USER_BASE}/api/user/schoolStaff`, { headers, timeout: 8000 });
      const docControllers = staffResp?.data?.docControllers || [];
      const secretaries = staffResp?.data?.secretaries || [];
      const deans = staffResp?.data?.deans || [];
      const actorId = String(req.user?.id || req.user?._id || '');
      const targets = Array.from(new Set([
        ...docControllers.map(u => String(u.id)),
        ...secretaries.map(u => String(u.id)),
        ...deans.map(u => String(u.id))
      ])).filter(id => id && id !== actorId);
      if (targets.length > 0) {
        const payload = {
          recipientUser: targets.length === 1 ? targets[0] : undefined,
          recipientRoles: ['Document Controller','Secretary','Dean'],
          message: `A new template "${template.title}" has been published and is now available.`,
          type: 'template_published',
          link: `/document-controller/templates?highlight=${template._id}`,
          targetedUserIds: targets
        };
        try {
          await axios.post(`${notificationServiceUrl}/api/notifications/internal`, payload, {
            headers: { 'Content-Type': 'application/json', 'X-Internal-Token': process.env.INTERNAL_TOKEN || '' },
            timeout: 5000
          });
        } catch (err) {
          console.error('Notification service error (publish):', err?.response?.status || err?.message || err);
        }
      }
    } catch (notifyErr) {
      console.error('Failed to notify on publish:', notifyErr?.message || notifyErr);
    }
    return res.status(200).json({ success:true, message:'Template published', template: template.toObject(), approvalMeta });
  } catch (err) {
    console.error('Publish error', err);
    return res.status(500).json({ success:false, message:'Failed to publish template' });
  }
};


/**
 * Unpublish a template
 * @route PATCH /api/templates/:id/unpublish
 */
export const unpublishTemplate = async (req, res) => {
    try {
    const template = await Template.findById(req.params.id);
    if (!template) return res.status(404).json({ success:false, message:'Template not found' });
    if (template.status !== 'published') {
      return res.status(400).json({ success:false, message:'Only published templates can be unpublished' });
    }
    template.status = 'approved';
    await template.save();

    // Notify all users in the school that the template has been unpublished
    try {
      const USER_BASE = process.env.USER_SERVICE_URL || '';
      const notificationServiceUrl = process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:8008';
      const headers = buildUserServiceHeaders(req);
      const staffResp = await axios.get(`${USER_BASE}/api/user/schoolStaff`, { headers, timeout: 8000 });
      const docControllers = staffResp?.data?.docControllers || [];
      const secretaries = staffResp?.data?.secretaries || [];
      const deans = staffResp?.data?.deans || [];
      const actorId = String(req.user?.id || req.user?._id || '');
      const targets = Array.from(new Set([
        ...docControllers.map(u => String(u.id)),
        ...secretaries.map(u => String(u.id)),
        ...deans.map(u => String(u.id))
      ])).filter(id => id && id !== actorId);
      if (targets.length > 0) {
        const payload = {
          recipientUser: targets.length === 1 ? targets[0] : undefined,
          recipientRoles: ['Document Controller','Secretary','Dean'],
          message: `Template "${template.title}" has been unpublished.`,
          type: 'template_unpublished',
          link: `/document-controller/templates?highlight=${template._id}`,
          targetedUserIds: targets
        };
        try {
          await axios.post(`${notificationServiceUrl}/api/notifications/internal`, payload, {
            headers: { 'Content-Type': 'application/json', 'X-Internal-Token': process.env.INTERNAL_TOKEN || '' },
            timeout: 5000
          });
        } catch (err) {
          console.error('Notification service error (unpublish):', err?.response?.status || err?.message || err);
        }
      }
    } catch (notifyErr) {
      console.error('Failed to notify on unpublish:', notifyErr?.message || notifyErr);
    }
    return res.status(200).json({ success:true, message:'Template unpublished', template: template.toObject() });
  } catch (err) {
    console.error('Unpublish error', err);
    return res.status(500).json({ success:false, message:'Failed to unpublish template' });
  }
};

/**
 * @desc Insert a document code
 * @route PATCH /api/templates/:id/insert-document-code
 * @access Private (Dean)
 */
export const insertDocumentCode = async (req, res) => {
  try {
    const { document_code, effectivity, revision_no } = req.body;

    // Only Dean is allowed to perform this action
    const roleName = req.user?.role?.name ? String(req.user.role.name).toLowerCase() : null;
    if (roleName !== 'dean') {
      return res.status(403).json({ success: false, message: 'Only Dean is authorized to insert document code' });
    }

    if (!document_code || String(document_code).trim() === '') {
      return res.status(400).json({ success: false, message: 'document_code is required' });
    }

    const template = await Template.findById(req.params.id);
    if (!template) return res.status(404).json({ success:false, message:'Template not found' });

    // Normalize incoming values
    const normalizedDocCode = String(document_code).trim();
    const hasRevision = revision_no !== undefined && revision_no !== null && revision_no !== '';
    const rn = hasRevision ? Number(revision_no) : undefined;

    // If a different template already has the same document_code + revision_no, disallow
    if (hasRevision && !Number.isNaN(rn)) {
      const conflict = await Template.findOne({
        document_code: normalizedDocCode,
        revision_no: rn,
        _id: { $ne: template._id }
      }).lean();
      if (conflict) {
        return res.status(409).json({
          success: false,
          message: 'doc code and revision no. already exist',
          conflict: { id: conflict._id, title: conflict.title }
        });
      }
    }

    // Set values on template
    template.document_code = normalizedDocCode;
    if (effectivity !== undefined && effectivity !== null && effectivity !== '') {
      const dateVal = new Date(effectivity);
      template.effectivity = isNaN(dateVal.getTime()) ? effectivity : dateVal;
    }
    if (hasRevision && !Number.isNaN(rn)) {
      template.revision_no = rn;
    }

    // Add a change note
    template.notes = template.notes || [];
    template.notes.push({
      added_by: req.user.id,
      role_snapshot: req.user?.role?.name || '',
      type: 'general',
      message: `Document code set to ${template.document_code}${template.revision_no !== undefined ? `, revision ${template.revision_no}` : ''}`,
      created_at: new Date()
    });

    try {
      await template.save();
    } catch (saveErr) {
      if (saveErr && saveErr.code === 11000) {
        // Attempt to find the conflicting document to provide helpful context
        try {
          const conflict = await Template.findOne({ document_code: template.document_code, revision_no: template.revision_no }).lean();
          const conflictInfo = conflict ? { id: conflict._id, title: conflict.title } : undefined;
          return res.status(409).json({ success:false, message:'doc code and revision no. already exist', conflict: conflictInfo });
        } catch (innerErr) {
          return res.status(409).json({ success:false, message:'Document code with this revision already exists' });
        }
      }
      throw saveErr;
    }

    const approvalMeta = buildApprovalMeta(template, req.user?.id);
    return res.status(200).json({ success:true, message:'Document code inserted', template: template.toObject(), approvalMeta });

  } catch (err) {
    console.error('Insert document code error', err);
    return res.status(500).json({ success:false, message:'Failed to insert document code' });
  }
};
