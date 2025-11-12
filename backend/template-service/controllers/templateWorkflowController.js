import Template from "../models/templateModel.js";
import { buildApprovalMeta } from "../utils/templateUtils.js";
import axios from "axios";
import { getActorFromReq } from '../utils/actorUtils.js';
import { fetchUsersProfiles, buildUserServiceHeaders } from '../utils/userServiceUtils.js';
import { normalizeRoleDisplay, toApprovalKey, toDisplayFromKey, isRole, APPROVAL_KEYS } from '../utils/roleUtils.js';
import { linkFor, groupTargetsByRole, preservePriorApprovals } from '../utils/workflowUtils.js';



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
  template.status_meta.approvals = template.status_meta.approvals || { lead_document_controller: {}, document_controller_officer: {} };

    // approver structure based on assigner role (allow variants via normalization)
    const roleDisplay = String(req.user?.role?.name || '');
    if (isRole(roleDisplay, 'Lead Document Controller')) {
      template.status_meta.approvals.document_controller_officer = {
        assigned_to: approver,
        isApproved: false,
        approved_at: null,
      };
      template.status_meta.approvals.lead_document_controller = {
        assigned_to: userId,
        isApproved: false,
        approved_at: null,
      };
    } else if (isRole(roleDisplay, 'Document Control Officer')) {
      template.status_meta.approvals.lead_document_controller = {
        assigned_to: approver,
        isApproved: false,
        approved_at: null,
      };
      template.status_meta.approvals.document_controller_officer = {
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
        // Group targets by role and send role-specific deep links
        const byRole = await groupTargetsByRole(targetedUserIds, req);
        const message = `You have been assigned a template "${template.title}" to create.`;
        const type = 'template_assignment';
        for (const [roleName, ids] of Object.entries(byRole)) {
          if (!ids || ids.length === 0) continue;
          const link = linkFor(type, template._id, roleName);
          const payload = {
            recipientUser: ids.length === 1 ? ids[0] : undefined,
            recipientRoles: [roleName],
            message,
            type,
            link,
            targetedUserIds: ids
          };
          try {
            const resp = await axios.post(`${notificationServiceUrl}/api/notifications/internal`, payload, {
              headers: { 'Content-Type': 'application/json', 'X-Internal-Token': process.env.INTERNAL_TOKEN || '' },
              timeout: 5000
            });
            console.log('Notification (assignment) sent for role', roleName, resp.status);
          } catch (err) {
            if (err.response) {
              console.error('Notification service error response (assignment):', { status: err.response.status, data: err.response.data });
            } else if (err.request) {
              console.error('No response from Notification service (assignment).');
            } else {
              console.error('Error while calling Notification service (assignment):', err.message || err);
            }
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
  code: template.document_code,          // typically set later by Document Control Officer
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

  // Notify assigned Document Controllers and approvers (if present)
    try {
      const notificationServiceUrl = process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:8008';
      const assignerId = String(req.user?.id || req.user?._id || '');
      const approvals = template?.status_meta?.approvals || {};
      const approverIds = Object.values(approvals)
        .map(a => (a && a.assigned_to ? String(a.assigned_to) : null))
        .filter(Boolean);
      const targets = Array.from(new Set([
        ...controllers.map(String),
        ...approverIds
      ])).filter(id => id && id !== assignerId);

      if (targets.length > 0) {
        const byRole = await groupTargetsByRole(targets, req);
        const message = `You have been assigned to work on template "${template.title}"`;
        const type = 'template_assignment';
        for (const [roleName, ids] of Object.entries(byRole)) {
          if (!ids || ids.length === 0) continue;
          const link = linkFor(type, template._id, roleName);
          const payload = {
            recipientUser: ids.length === 1 ? ids[0] : undefined,
            recipientRoles: [roleName],
            message,
            type,
            link,
            targetedUserIds: ids
          };
          try {
            const resp = await axios.post(`${notificationServiceUrl}/api/notifications/internal`, payload, {
              headers: { 'Content-Type': 'application/json', 'X-Internal-Token': process.env.INTERNAL_TOKEN || '' },
              timeout: 5000
            });
            console.log('Notification (assign controllers) for role', roleName, resp.status);
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
        const byRole = await groupTargetsByRole(targets, req);
        const message = `Deadline for template "${template.title}" has been updated.`;
        const type = 'template_deadline_update';
        for (const [roleName, ids] of Object.entries(byRole)) {
          if (!ids || ids.length === 0) continue;
          const link = linkFor(type, template._id, roleName);
          const payload = {
            recipientUser: ids.length === 1 ? ids[0] : undefined,
            recipientRoles: [roleName],
            message,
            type,
            link,
            targetedUserIds: ids
          };
          try {
            const resp = await axios.post(`${notificationServiceUrl}/api/notifications/internal`, payload, {
              headers: { 'Content-Type': 'application/json', 'X-Internal-Token': process.env.INTERNAL_TOKEN || '' },
              timeout: 5000
            });
            console.log('Notification (deadline update) for role', roleName, resp.status);
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
 * @desc Approve template as Lead Document Controller or Document Control Officer
 * @route PATCH /api/templates/:id/approve
 */
export const approveTemplate = async (req, res) => {
  try {
    const { document_code, effectivity, revision_no } = req.body;
    // Map any role format to internal approval key via util
    const roleKey = toApprovalKey(req.user?.role?.name || req.user?.role || '');
    if (!roleKey || !APPROVAL_KEYS.includes(roleKey)) {
      return res.status(400).json({ success:false, message:'Invalid role' });
    }
    const template = await Template.findById(req.params.id);
    if (!template) return res.status(404).json({ success:false, message:'Template not found' });
    if (!['pending','endorsed','draft','approved','assigned','rejected'].includes(template.status)) {
      return res.status(400).json({ success:false, message:'Template not in approvable state' });
    }
    template.status_meta = template.status_meta || {};
    template.status_meta.approvals = template.status_meta.approvals || { unit_document_controller:{}, lead_document_controller:{}, document_controller_officer:{} };
    const slot = template.status_meta.approvals[roleKey] || (template.status_meta.approvals[roleKey] = {});
    if (slot.approved_at) {
      return res.status(400).json({ success:false, message: `${roleKey} already approved` });
    }
    slot.approved_at = new Date();
    slot.isApproved = true;
    // Record which user performed the approval in the assigned_to field (left blank at submission time)
    try {
      const actorId = req.user?.id || req.user?._id;
      if (actorId) slot.assigned_to = actorId;
    } catch (e) {
      // noop
    }

  // If Document Control Officer, allow assigning document_code, effectivity, revision_no
    if (roleKey === 'document_controller_officer') {
      if (document_code) template.document_code = document_code;
      if (effectivity) template.effectivity = effectivity;
      if (revision_no !== undefined) template.revision_no = revision_no;
    }

  // Determine if all required approvals are complete
  const approvals = template.status_meta.approvals;
  // Determine if Unit DC endorsement is required.
  // Normally, status 'pending' signals UDC is part of the chain (Faculty submissions).
  // When coming from a previously 'rejected' state, infer from assignment state.
  const unitAssigned = !!approvals?.unit_document_controller?.assigned_to;
  const unitApproved = !!approvals?.unit_document_controller?.approved_at;
  const requiresUDC = (template.status === 'pending') || (unitAssigned && !unitApproved);
    const needed = ['lead_document_controller','document_controller_officer'].concat(requiresUDC ? ['unit_document_controller'] : []);
    const allApproved = needed.every(k => !!approvals[k]?.approved_at);
    if (allApproved) {
      template.status = 'approved';
      if (!template.status_meta.approved_at) template.status_meta.approved_at = new Date();
    } else if (template.status === 'draft' || template.status === 'rejected' || template.status === 'assigned') {
      template.status = 'pending'; // in case
      if (!template.status_meta.submitted_for_approval_at) template.status_meta.submitted_for_approval_at = new Date();
    } else if (template.status === 'pending') {
      // If UDC just approved and not all approved, mark as endorsed
      if (roleKey === 'unit_document_controller') {
        template.status = 'endorsed';
      }
    } else if (template.status === 'endorsed') {
      // keep endorsed until all required approvals are complete
    }
    await template.save();
    const approvalMeta = buildApprovalMeta(template, req.user?.id);

  // Notify assigned Document Controllers that an approval has been recorded
    try {
      const notificationServiceUrl = process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:8008';
      const actorId = String(req.user?.id || req.user?._id || '');
      const controllerIds = Array.isArray(template.assigned) ? template.assigned.map(String) : [];
      // Also include created_by as a fallback target (some flows may not populate assigned controllers yet)
      const createdBy = template.created_by ? String(template.created_by) : null;
      const fallback = createdBy && createdBy !== actorId ? [createdBy] : [];
      const targets = Array.from(new Set([...controllerIds, ...fallback])).filter(id => id && id !== actorId);
      if (targets.length > 0) {
  const friendlyRole = toDisplayFromKey(roleKey) || roleKey;
        const actionMsg = allApproved
          ? `Template "${template.title}" has been fully approved.`
          : (roleKey === 'unit_document_controller'
              ? `Template "${template.title}" was endorsed by the ${friendlyRole}.`
              : `Template "${template.title}" was approved by the ${friendlyRole}.`);
        const type = allApproved ? 'template_fully_approved' : 'template_partially_approved';
        // Only controllers here; still use role-based link helper for safety
        const byRole = await groupTargetsByRole(targets, req);
        for (const [roleName, ids] of Object.entries(byRole)) {
          if (!ids || ids.length === 0) continue;
          const link = linkFor(type, template._id, roleName);
          const payload = {
            recipientUser: ids.length === 1 ? ids[0] : undefined,
            recipientRoles: [roleName],
            message: actionMsg,
            type,
            link,
            targetedUserIds: ids
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
      }
    } catch (notifyErr) {
      console.error('Failed to notify on approval:', notifyErr?.message || notifyErr);
    }

    // Notify only the next approver in the hierarchy (UDC -> LDC -> DCO)
    try {
      const notificationServiceUrl = process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:8008';
      const actorId = String(req.user?.id || req.user?._id || '');
      const approvals = template?.status_meta?.approvals || {};
      if (!allApproved) {
        if (roleKey === 'unit_document_controller') {
          // Next: LDC
          const ldcId = approvals?.lead_document_controller?.assigned_to ? String(approvals.lead_document_controller.assigned_to) : undefined;
          const type = 'template_partially_approved';
          const link = linkFor(type, template._id, 'Lead Document Controller');
          const payload = {
            recipientUser: ldcId,
            recipientRoles: ['Lead Document Controller'],
            message: `"${template.title}" has been endorsed by the Unit Document Controller. Please review and manage.`,
            type,
            link,
            targetedUserIds: ldcId ? [ldcId] : undefined
          };
          await axios.post(`${notificationServiceUrl}/api/notifications/internal`, payload, {
            headers: { 'Content-Type': 'application/json', 'X-Internal-Token': process.env.INTERNAL_TOKEN || '' },
            timeout: 5000
          });
        } else if (roleKey === 'lead_document_controller') {
          // Next: DCO
          const dcoId = approvals?.document_controller_officer?.assigned_to ? String(approvals.document_controller_officer.assigned_to) : undefined;
          const type = 'template_partially_approved';
          const link = linkFor(type, template._id, 'Document Control Officer');
          const payload = {
            recipientUser: dcoId,
            recipientRoles: ['Document Control Officer'],
            message: `"${template.title}" has been endorsed by the Unit Document Controller, and has been approved by the Lead Document Controller. Please review and manage.`,
            type,
            link,
            targetedUserIds: dcoId ? [dcoId] : undefined
          };
          await axios.post(`${notificationServiceUrl}/api/notifications/internal`, payload, {
            headers: { 'Content-Type': 'application/json', 'X-Internal-Token': process.env.INTERNAL_TOKEN || '' },
            timeout: 5000
          });
        }
      }
    } catch (cbErr) {
      console.error('Failed to send next-approver callback after partial approval:', cbErr?.message || cbErr);
    }
    return res.status(200).json({ success:true, message:'Approval recorded', template: template.toObject(), approvalMeta });
  } catch (err) {
    console.error('Approve error', err);
    return res.status(500).json({ success:false, message:'Failed to approve template' });
  }
};

/**
 * @desc Reject template as Lead Document Controller or Document Control Officer
 * @route PATCH /api/templates/:id/reject
 */
export const rejectTemplate = async (req, res) => {
  try {
    const { reason } = req.body;
  const roleKey = toApprovalKey(req.user?.role?.name || req.user?.role || '') || null;

    // Only Document Control Officer can reject; UDC and LDC must use 'return' (change request)
    if (roleKey !== 'document_controller_officer') {
      return res.status(403).json({ success:false, message:'Only the Document Control Officer can reject; other approvers may return for changes.' });
    }
    const template = await Template.findById(req.params.id);
    if (!template) return res.status(404).json({ success:false, message:'Template not found' });
    // if already rejected, inform client instead of attempting again
    if (String(template.status) === 'rejected') {
      return res.status(409).json({ success:false, code:'ALREADY_REJECTED', message:'Template already rejected', template: template.toObject?.() || template });
    }
    if (!['pending','endorsed','draft','approved','assigned','returned'].includes(template.status)) {
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
    // Persist the rejecting actor into the DCO approvals slot for attribution
    try {
      template.status_meta = template.status_meta || {};
      template.status_meta.approvals = template.status_meta.approvals || { unit_document_controller: {}, lead_document_controller: {}, document_controller_officer: {} };
      const actorId = String(req.user?.id || req.user?._id || '');
      if (actorId) {
        template.status_meta.approvals.document_controller_officer = template.status_meta.approvals.document_controller_officer || {};
        // only set assigned_to if not already present
        if (!template.status_meta.approvals.document_controller_officer.assigned_to) {
          template.status_meta.approvals.document_controller_officer.assigned_to = actorId;
        }
        // mark rejection timestamp (do not clear other prior approval fields)
        template.status_meta.approvals.document_controller_officer.rejected_at = new Date();
        template.status_meta.approvals.document_controller_officer.isApproved = false;
      }
    } catch (_e) {
      // best-effort attribution; do not fail rejection if this write fails
    }
  // Top-level rejection timestamp (overwrite any prior rejected_at to reflect this event)
  try {
    template.status_meta = template.status_meta || {};
    template.status_meta.rejected_at = new Date();
    template.status_meta.rejected_by = String(req.user?.id || req.user?._id || '');
  } catch (e) {
    // noop
  }
  // Preserve any previously approved slots (do not clear UDC/LDC/DCO approvals)
  template.status = 'rejected';
  template.status_meta.approvals = preservePriorApprovals(template.status_meta.approvals, template.status_meta.approvals);
  await template.save();

  // Notify assigned Document Controllers of rejection
    try {
      const notificationServiceUrl = process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:8008';
      const actorId = String(req.user?.id || req.user?._id || '');
      const controllerIds = Array.isArray(template.assigned) ? template.assigned.map(String) : [];
      const targets = Array.from(new Set(controllerIds)).filter(id => id && id !== actorId);
      if (targets.length > 0) {
  const friendlyRole = toDisplayFromKey(roleKey) || roleKey;
        const message = `Template "${template.title}" was rejected by the ${friendlyRole}${reason ? `: ${reason}` : ''}.`;
        const type = 'template_rejected';
        const byRole = await groupTargetsByRole(targets, req);
        for (const [roleName, ids] of Object.entries(byRole)) {
          if (!ids || ids.length === 0) continue;
          const link = linkFor(type, template._id, roleName);
          const payload = {
            recipientUser: ids.length === 1 ? ids[0] : undefined,
            recipientRoles: [roleName],
            message,
            type,
            link,
            targetedUserIds: ids
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
    template.status_meta.approvals = template.status_meta.approvals || { unit_document_controller: {}, lead_document_controller: {}, document_controller_officer: {} };

  // Capture existing approvals and whether this is a resubmission
  const submitterRole = normalizeRoleDisplay(String(req.user?.role?.name || ''));
  const approvals = template.status_meta.approvals;
  const priorApprovals = JSON.parse(JSON.stringify(approvals || {}));
    const wasReturned = template.status === 'returned';
    const preUnit = approvals?.unit_document_controller || {};
    const preLead = approvals?.lead_document_controller || {};
    const preOfficer = approvals?.document_controller_officer || {};
    const unitApproved = !!preUnit.approved_at || preUnit.isApproved === true;
    const leadApproved = !!preLead.approved_at || preLead.isApproved === true;
    const officerApproved = !!preOfficer.approved_at || preOfficer.isApproved === true;

    // Preserve approvals across submissions. On resubmission from 'returned', we may clear assigned_to to re-route.
    if (!wasReturned) {
      for (const key of ['unit_document_controller','lead_document_controller','document_controller_officer']) {
        approvals[key] = approvals[key] || {};
      }
    }

  // Decide next role and status
    let nextRoleFriendly = null; // 'Unit Document Controller' | 'Lead Document Controller' | 'Document Control Officer'
    let nextAssignedUser = null;
    
  // Determine role categories and whether UDC endorsement is required for this submission
  const isDeptHead = submitterRole === 'Department Head';
  const isDeanOrSecretary = submitterRole === 'Dean' || submitterRole === 'Secretary';
  const requiresUDC = isDeptHead || !!approvals?.unit_document_controller?.assigned_to;

  if (unitApproved) {
      // UDC already endorsed → status stays 'endorsed', go to LDC or DCO depending on LDC state
      template.status = 'endorsed';
      
      if (!leadApproved) {
        nextRoleFriendly = 'Lead Document Controller';
        if (wasReturned && template.status_meta?.returned_role === 'lead_document_controller' && template.status_meta?.returned_by) {
          nextAssignedUser = String(template.status_meta.returned_by);
          approvals.lead_document_controller.assigned_to = nextAssignedUser;
        }
      } else if (!officerApproved) {
        nextRoleFriendly = 'Document Control Officer';
        if (wasReturned && template.status_meta?.returned_role === 'document_controller_officer' && template.status_meta?.returned_by) {
          nextAssignedUser = String(template.status_meta.returned_by);
          approvals.document_controller_officer.assigned_to = nextAssignedUser;
        }
      } else {
        // all already approved
        template.status = 'approved';
      }
    } else {
      // UDC not approved yet
      if (wasReturned) {
        // On resubmission, non-Department-Head flows should not go to 'pending'; they stay endorsed and route to who returned.
        if (requiresUDC) {
          template.status = 'pending';
          nextRoleFriendly = 'Unit Document Controller';
          if (template.status_meta?.returned_role === 'unit_document_controller' && template.status_meta?.returned_by) {
            nextAssignedUser = String(template.status_meta.returned_by);
            approvals.unit_document_controller.assigned_to = nextAssignedUser;
          }
        } else {
          // No UDC required -> route to the returning approver (LDC or DCO)
          template.status = 'pending';
          if (template.status_meta?.returned_role === 'lead_document_controller') {
            nextRoleFriendly = 'Lead Document Controller';
            if (template.status_meta?.returned_by) {
              nextAssignedUser = String(template.status_meta.returned_by);
              approvals.lead_document_controller.assigned_to = nextAssignedUser;
            }
          } else {
            nextRoleFriendly = 'Document Control Officer';
            if (template.status_meta?.returned_by) {
              nextAssignedUser = String(template.status_meta.returned_by);
              approvals.document_controller_officer.assigned_to = nextAssignedUser;
            }
          }
        }
      } else {
        // Fresh submission
        template.status = 'pending';
        
        if (requiresUDC) {
          nextRoleFriendly = 'Unit Document Controller';
        } else {
          // Dean/Secretary → goes directly to LDC (but still 'pending' status)
          nextRoleFriendly = 'Lead Document Controller';
        }
      }
    }

    // Enforce explicit status rules for certain submitter roles:
    // - Dean or Secretary submissions should be treated as 'endorsed' (skip UDC)
    // - Department Head submissions should be treated as 'pending' (UDC endorsement expected)
    if (isDeanOrSecretary) {
      template.status = 'endorsed';
      // Ensure nextRoleFriendly routes to LDC when dean/secretary submit
      if (!nextRoleFriendly || nextRoleFriendly === 'Unit Document Controller') {
        nextRoleFriendly = 'Lead Document Controller';
      }
    } else if (isDeptHead) {
      template.status = 'pending';
      if (!nextRoleFriendly) nextRoleFriendly = 'Unit Document Controller';
    }

    // Stamp submission time (always overwrite to reflect this submission)
  template.status_meta = template.status_meta || {};
  template.status_meta.submitted_at = new Date();

  // Preserve any prior approvals (especially UDC endorsement) from being lost
  template.status_meta.approvals = preservePriorApprovals(approvals, priorApprovals);
  await template.save();

  // Notify initial approver (based on approvals state and resubmission context)
    try {
      const notificationServiceUrl = process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:8008';
      const type = 'template_review_requested';
      
      if (!nextRoleFriendly) {
        // Nothing to notify (already fully approved)
      } else if (nextAssignedUser) {
        const message = `Template \"${template.title}\" has been resubmitted for your review.`;
        const link = linkFor(type, template._id, nextRoleFriendly);
        const payload = { recipientUser: nextAssignedUser, recipientRoles: [nextRoleFriendly], message, type, link, targetedUserIds: [nextAssignedUser] };
        try {
          await axios.post(`${notificationServiceUrl}/api/notifications/internal`, payload, {
            headers: { 'Content-Type': 'application/json', 'X-Internal-Token': process.env.INTERNAL_TOKEN || '' },
            timeout: 5000
          });
        } catch (err) {
          console.error('Notification service error (submit/targeted):', err?.response?.status || err?.message || err);
        }
      } else {
        const message = (nextRoleFriendly === 'Unit Document Controller')
          ? `"${template.title}" has been submitted for your endorsement.`
          : `"${template.title}" has been submitted for your approval.`;
        const link = linkFor(type, template._id, nextRoleFriendly);
        const payload = { recipientRoles: [nextRoleFriendly], message, type, link };
        try {
          await axios.post(`${notificationServiceUrl}/api/notifications/internal`, payload, {
            headers: { 'Content-Type': 'application/json', 'X-Internal-Token': process.env.INTERNAL_TOKEN || '' },
            timeout: 5000
          });
        } catch (err) {
          console.error('Notification service error (submit/by-role):', err?.response?.status || err?.message || err);
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
  // Only Unit Document Controller, Lead Document Controller, or Document Control Officer can return (normalize then map)
  const roleKey = toApprovalKey(req.user?.role?.name || req.user?.role || '') || null;
    if (!['unit_document_controller','lead_document_controller','document_controller_officer'].includes(roleKey)) {
      return res.status(403).json({ success:false, message:'Only Unit/Lead Document Controller or Document Control Officer may return for changes.' });
    }
    const template = await Template.findById(req.params.id);
    if (!template) return res.status(404).json({ success:false, message:'Template not found' });
    // Note: allow multiple returns — returning is a feedback action and should
    // overwrite prior returned timestamps/actors. Do NOT reject here if the
    // template is already in 'returned' state; proceed to record the new return
    // event so the returned_at/returned_by fields are refreshed.
    // If already rejected, cannot return; inform client
    if (String(template.status) === 'rejected') {
      return res.status(409).json({ success:false, code:'ALREADY_REJECTED', message:'Template already rejected; cannot return', template: template.toObject?.() || template });
    }
    // Allow return from pending and endorsed states (and keep existing allowed states)
    if (!['pending','endorsed','draft','approved','assigned'].includes(template.status)) {
      return res.status(400).json({ success:false, message:'Template not in returnable state' });
    }
    // Add a change note
    template.notes = template.notes || [];
    template.notes.push({
      added_by: req.user.id,
      role_snapshot: req.user?.role?.name || '',
      type: 'change',
      message: reason || 'No reason provided',
      created_at: new Date()
    });
    // Stamp who returned it so resubmission can route back to them
    template.status_meta = template.status_meta || {};
  template.status_meta.returned_by = String(req.user?.id || req.user?._id || '');
  template.status_meta.returned_role = roleKey;
  template.status_meta.returned_at = new Date();

    // Ensure approvals object exists and, if UDC is the actor, persist their id in the UDC slot
    template.status_meta.approvals = template.status_meta.approvals || { unit_document_controller: {}, lead_document_controller: {}, document_controller_officer: {} };
    const actorId = String(req.user?.id || req.user?._id || '');
    if (actorId) {
      if (roleKey === 'unit_document_controller') {
        template.status_meta.approvals.unit_document_controller = template.status_meta.approvals.unit_document_controller || {};
        if (!template.status_meta.approvals.unit_document_controller.assigned_to) template.status_meta.approvals.unit_document_controller.assigned_to = actorId;
        // stamp returned_at on the slot (do not clear prior approvals)
        template.status_meta.approvals.unit_document_controller.returned_at = new Date();
      } else if (roleKey === 'lead_document_controller') {
        template.status_meta.approvals.lead_document_controller = template.status_meta.approvals.lead_document_controller || {};
        if (!template.status_meta.approvals.lead_document_controller.assigned_to) template.status_meta.approvals.lead_document_controller.assigned_to = actorId;
        template.status_meta.approvals.lead_document_controller.returned_at = new Date();
      } else if (roleKey === 'document_controller_officer') {
        template.status_meta.approvals.document_controller_officer = template.status_meta.approvals.document_controller_officer || {};
        if (!template.status_meta.approvals.document_controller_officer.assigned_to) template.status_meta.approvals.document_controller_officer.assigned_to = actorId;
        template.status_meta.approvals.document_controller_officer.returned_at = new Date();
      }
    }
  // Preserve any previously approved slots (do not clear UDC/LDC/DCO approvals)
  template.status = 'returned';
  template.status_meta.approvals = preservePriorApprovals(template.status_meta.approvals, template.status_meta.approvals);
  await template.save();

    // Notify assigned Document Controllers of return
    try {
      const notificationServiceUrl = process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:8008';
      const actorId = String(req.user?.id || req.user?._id || '');
      const controllerIds = Array.isArray(template.assigned) ? template.assigned.map(String) : [];
      const targets = Array.from(new Set(controllerIds)).filter(id => id && id !== actorId);
      if (targets.length > 0) {
        const byRole = await groupTargetsByRole(targets, req);
        const message = `Template "${template.title}" was returned for changes${reason ? `: ${reason}` : ''}.`;
        const type = 'template_returned';
        for (const [roleName, ids] of Object.entries(byRole)) {
          if (!ids || ids.length === 0) continue;
          const link = linkFor(type, template._id, roleName);
          const payload = {
            recipientUser: ids.length === 1 ? ids[0] : undefined,
            recipientRoles: [roleName],
            message,
            type,
            link,
            targetedUserIds: ids
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
    // Only Document Control Officer can publish (normalize then map)
    if (toApprovalKey(req.user?.role?.name || req.user?.role || '') !== 'document_controller_officer') {
      return res.status(403).json({ success:false, message:'Only the Document Control Officer can publish templates.' });
    }

    const template = await Template.findById(req.params.id);
    console.log("Publishing template:", template?._id);
    if (!template) return res.status(404).json({ success:false, message:'Template not found' });
    // Allow publishing if status is approved or pending but both approvals exist
    if (template.status !== 'approved') {
      const approvals = template.status_meta?.approvals || {};
      const fullyApproved = approvals.lead_document_controller?.approved_at && approvals.document_controller_officer?.approved_at;
      if (template.status === 'pending' && fullyApproved) {
        template.status = 'approved';
        if (!template.status_meta.approved_at) template.status_meta.approved_at = new Date();
      } else {
        return res.status(400).json({ success:false, message:'Template must be approved before publishing' });
      }
    }
  // Accept document details during publish
  const { document_code, effectivity, revision_no } = req.body || {};
  // Validate uniqueness of document_code + revision_no if provided
  try {
    const normalizedDocCode = document_code !== undefined && document_code !== null ? String(document_code).trim() : undefined;
    const hasRevision = revision_no !== undefined && revision_no !== null && revision_no !== '';
    const rn = hasRevision ? Number(revision_no) : undefined;
    if (normalizedDocCode && hasRevision && !Number.isNaN(rn)) {
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
  } catch (vErr) {
    console.warn('Validation (publish) doc_code+revision uniqueness check failed:', vErr?.message || vErr);
  }
  if (document_code) template.document_code = document_code;
  if (effectivity) template.effectivity = effectivity;
  if (revision_no !== undefined) template.revision_no = revision_no;

  template.status = 'published';
    template.status_meta = template.status_meta || {};
    template.status_meta.published_at = new Date();
    await template.save();
    const approvalMeta = buildApprovalMeta(template, req.user?.id);

  // Notify end users (Dean, Secretary, Department Head, Faculty) of the new template
    try {
      const notificationServiceUrl = process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:8008';
      const type = 'template_published';
      const message = `A new template "${template.title}" has been published and is now available.`;
      const rolesToNotify = ['Dean', 'Secretary', 'Department Head', 'Faculty'];
      const link = linkFor(type, template._id, 'Faculty');

      const payload = {
        recipientRoles: rolesToNotify,
        message,
        type,
        link
      };

      await axios.post(`${notificationServiceUrl}/api/notifications/internal`, payload, {
        headers: { 'Content-Type': 'application/json', 'X-Internal-Token': process.env.INTERNAL_TOKEN || '' },
        timeout: 5000
      });
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
    // Only Document Control Officer can unpublish (normalize then map)
    if (toApprovalKey(req.user?.role?.name || req.user?.role || '') !== 'document_controller_officer') {
      return res.status(403).json({ success:false, message:'Only the Document Control Officer can unpublish templates.' });
    }
    const template = await Template.findById(req.params.id);
    if (!template) return res.status(404).json({ success:false, message:'Template not found' });
    if (template.status !== 'published') {
      return res.status(400).json({ success:false, message:'Only published templates can be unpublished' });
    }
    template.status = 'approved';
    await template.save();

  // Notify end users (Dean, Secretary, Department Head, Faculty) that the template has been unpublished
    try {
      const notificationServiceUrl = process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:8008';
      const type = 'template_unpublished';
      const message = `Template "${template.title}" has been unpublished.`;
      const rolesToNotify = ['Dean', 'Secretary', 'Department Head', 'Faculty'];
      const link = linkFor(type, template._id, 'Faculty');

      const payload = {
        recipientRoles: rolesToNotify,
        message,
        type,
        link
      };

      await axios.post(`${notificationServiceUrl}/api/notifications/internal`, payload, {
        headers: { 'Content-Type': 'application/json', 'X-Internal-Token': process.env.INTERNAL_TOKEN || '' },
        timeout: 5000
      });
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
 * @access Private (Document Control Officer)
 */
export const insertDocumentCode = async (req, res) => {
  try {
    const { document_code, effectivity, revision_no } = req.body;

  // Only Document Control Officer is allowed to perform this action
    if (toApprovalKey(req.user?.role?.name || req.user?.role || '') !== 'document_controller_officer') {
      return res.status(403).json({ success: false, message: 'Only Document Control Officer is authorized to insert document code' });
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
