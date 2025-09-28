import Template from "../models/templateModel.js";
import { buildApprovalMeta } from "../utils/templateUtils.js";
import axios from "axios";

/**
 * @desc Assign users and set assigner/approver for a template
 * @route POST /api/templates/assign
 * @access Private
 */
export const assignUsersToCreateTemplate = async (req, res) => {
  try {
    const { assigned, approver, templateData, deadline } = req.body;
    console.log("Assigning users to template:", { assigned, approver, deadline, templateData });
    // Always create the template from templateData
    if (!templateData) {
      console.log('templateData missing:', req.body);
      return res.status(400).json({ success: false, message: 'templateData is required' });
    }
    console.log(templateData.instructions);

    templateData.title = templateData.title ? templateData.title.trim() : 'Untitled Template';
 
    delete templateData.document_code;
    templateData.notes = templateData.notes || [];
      templateData.notes.push({
        added_by: req.user.id,
        role_snapshot: req.user?.role?.name || '',
        type: 'assignment',
        message: templateData.instructions || 'No instructions provided',
        created_at: new Date()
      });

    if (deadline) {
      templateData.deadline = deadline;
    }
    if (!templateData.created_by) {
      templateData.created_by = req.user.id;
    }
    // Minimal template creation logic 
    const { title, pages_json, body, created_by, notes } = templateData;
    const template = new Template({
      title: title && title.trim() !== '' ? title.trim() : 'Untitled Template',
      pages_json: Array.isArray(pages_json) ? pages_json : [
        {
          type: 'doc',
          content: [
            { type: 'paragraph', content: [{ type: 'text', text: '' }] }
          ]
        }
      ],
      body: body || '',
      created_by: created_by || req.user.id,
      notes: Array.isArray(notes) ? notes : [],
      deadline: deadline || undefined
    });
    await template.save();

    if (!Array.isArray(assigned) || assigned.length === 0) {
      console.log('assigned missing or empty:', assigned);
      return res.status(400).json({ success: false, message: 'Assigned users array required' });
    }

    if (!approver) {
      console.log('approver missing:', approver);
      return res.status(400).json({ success: false, message: 'Approver is required' });
    }

    // Set assigned users
    template.assigned = assigned;
    // Set deadline if provided
    if (deadline) {
      template.deadline = deadline;
    }
    // Set status to 'assigned'
    template.status = 'assigned';
    template.school = req.user?.school || '';
    // Set assigner (current user)
    template.status_meta = template.status_meta || {};
    template.status_meta.assigned_by = req.user.id;
    template.status_meta.assigned_at = new Date();
    
    // Set approver slot based on assigner's role
    const role = req.user?.role?.name?.toLowerCase();
    if (role === 'dean') {
      template.status_meta.approvals = template.status_meta.approvals || {};
      template.status_meta.approvals.secretary = {
        assigned_to: approver,
        isApproved: false,
        approved_at: null
      };
      template.status_meta.approvals.dean = {
        assigned_to: req.user.id,
        isApproved: false,
        approved_at: null
      };
    } else if (role === 'secretary') {
      template.status_meta.approvals = template.status_meta.approvals || {};
      template.status_meta.approvals.dean = {
        assigned_to: approver,
        isApproved: false ,
        approved_at: null
      };
      template.status_meta.approvals.secretary = {
        assigned_to: req.user.id,
        isApproved: false,
        approved_at: null
      };
    }

    console.log('Saving template with assigned:', template.assigned);
    await template.save();
    res.json({ success: true, message: 'Users and approver assigned successfully', template });
  } catch (error) {
    console.error('Error assigning users/approver:', error);
    res.status(500).json({ success: false, message: 'Failed to assign users/approver' });
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
    return res.status(200).json({ success:true, message:'Template unpublished', template: template.toObject() });
  } catch (err) {
    console.error('Unpublish error', err);
    return res.status(500).json({ success:false, message:'Failed to unpublish template' });
  }
};

