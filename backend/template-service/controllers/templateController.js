import e from "express";
import Template from "../models/templateModel.js";
import { validSchools, schoolMap, getSchoolCode, generateDocumentCode, buildApprovalMeta, statusQuery } from "../utils/templateUtils.js";
import axios from "axios";

/**
 * @desc Get dashboard information for document controller
 * @route POST /api/templates/dashboard-info
 * @access Private (Document Controller)
 */
export const dashboardInfo = async (req, res) => {
  try{
    const [counts, recentPublished] = await Promise.all([
      Template.aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } }
      ]),
      Template.find({ status: 'published' })
        .sort({ 'status_meta.published_at': -1, updatedAt: -1 })
        .limit(20)
        .select('_id title document_code createdAt status revision_no effectivity created_by status_meta.published_at')
        .lean()
    ]);

    const countMap = counts.reduce((acc,c)=>{ acc[c._id] = c.count; return acc; }, {});
    const countPublished = countMap.published || 0;
    //const countDraft = countMap.draft || 0;
    const countPendingApproval = countMap.pending || 0;
    const countApproved = countMap.approved || 0;
    const getPublishedTemplates = recentPublished;
    res.status(200).json({
      success: true,
      data: {
        countPublished,
        //countDraft,
        countPendingApproval,
        countApproved,
        getPublishedTemplates
      }
    });
  }catch(error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve dashboard information',
    });   
  }
}

/**
 * @desc Create a new template
 * @route POST /api/templates/create-template
 * @access Private (Document Controller)
 */
export const createTemplate = async (req, res) => {
  try {
  const templateData = { ...req.body };

    if (!templateData.title || templateData.title.trim() === '') {
      templateData.title = 'Untitled Template';
    }

    // Accept only pages_json (array of page JSONs) and body (HTML)
    if (!Array.isArray(templateData.pages_json)) {
      templateData.pages_json = [
        {
          type: 'doc',
          content: [
            { type: 'paragraph', content: [{ type: 'text', text: '' }] }
          ]
        }
      ];
    }
    if (!templateData.body) {
      templateData.body = '';
    }

    const template = new Template({
      ...templateData
    });

    template.schoool = req.user?.school || '';
    // Remove transient / client-only fields
    delete template.school_identifier; // not stored separately

    await template.save();

    res.status(201).json({
      success: true,
      message: 'Template created successfully',
      template: template
    });

  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Template with this document code and revision already exists'
      });
    }

    console.error('Error creating template:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create template',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * @desc Get all templates with filtering and pagination
 * @route GET /api/templates
 * @access Private
 */
export const getTemplates = async (req, res) => {
  try {
    const { school, status, search, limit = 50, page = 1 } = req.query;

    let query = {
      $or: [
        { created_by: req.user.id },
        { assigned: req.user.id },
        { "status_meta.approvals.dean.assigned_to": req.user.id },
        { "status_meta.approvals.secretary.assigned_to": req.user.id }
      ]
    };

    // School filtering
    if (school && school !== 'All') {
      const schoolCode = getSchoolCode(school);
      query.document_code = { $regex: `^FM-${schoolCode}-\\d+$`, $options: 'i' };
    }

    // Status filtering
    Object.assign(query, statusQuery(status));

    // Search
    if (search) {
      query.$or = [
        { $and: [ { $or: [
          { created_by: req.user.id },
          { assigned: req.user.id },
          { "status_meta.approvals.dean.assigned_to": req.user.id },
          { "status_meta.approvals.secretary.assigned_to": req.user.id }
        ] }, { title: { $regex: search, $options: 'i' } } ] },
        { $and: [ { $or: [
          { created_by: req.user.id },
          { assigned: req.user.id },
          { "status_meta.approvals.dean.assigned_to": req.user.id },
          { "status_meta.approvals.secretary.assigned_to": req.user.id }
        ] }, { document_code: { $regex: search, $options: 'i' } } ] }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Fetch templates with pagination
    const templates = await Template.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Template.countDocuments(query);

    // Fetch creator names for each template
    const userServiceUrl = process.env.USER_SERVICE_URL || "http://localhost:5002";
    // Get token from cookie or header 
    let token = null;
    if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }
    const withMeta = await Promise.all(templates.map(async t => {
      let createdByName = null;
      let assignedNames = [];
      try {
        // Fetch creator name
        if (t.created_by) {
          const headers = {};
          if (token) {
            headers['Cookie'] = `token=${token}`;
          }
          const resp = await axios.get(
            `${userServiceUrl}/api/user/getUserInfo/${t.created_by}`,
            { headers, withCredentials: true }
          );
          if (resp.data && resp.data.firstname && resp.data.lastname) {
            createdByName = `${resp.data.firstname} ${resp.data.lastname}`;
          }
        }
        // Fetch assigned user names
        if (Array.isArray(t.assigned) && t.assigned.length > 0) {
          assignedNames = await Promise.all(t.assigned.map(async userId => {
            try {
              const headers = {};
              if (token) {
                headers['Cookie'] = `token=${token}`;
              }
              const resp = await axios.get(
                `${userServiceUrl}/api/user/getUserInfo/${userId}`,
                { headers, withCredentials: true }
              );
              if (resp.data && resp.data.firstname && resp.data.lastname) {
                return `${resp.data.firstname} ${resp.data.lastname}`;
              }
            } catch (err) {
              return null;
            }
            return null;
          }));
        }
      } catch (err) {
        createdByName = null;
      }
      return {
        ...t.toObject(),
        approvalMeta: buildApprovalMeta(t, req.user?.id),
        createdByName,
        assignedNames
      };
    }));
    res.status(200).json({
      success: true,
      message: 'Templates retrieved successfully',
      data: {
        templates: withMeta,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(total / parseInt(limit)),
          total_templates: total,
          has_next: skip + templates.length < total,
          has_prev: parseInt(page) > 1,
          per_page: parseInt(limit)
        },
        filters_applied: {
          school: school || 'All',
          status: status || 'All',
          search: search || null
        }
      }
    });

  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({
      success: false,
      message: "Error fetching templates",
    });
  }
};


/**
 * @desc Get all published templates visible to user (by school or FAA-VAA)
 * @route GET /api/templates/published
 * @access Private
 */
export const getPublishedTemplates = async (req, res) => {
  try {
    const { school, search, limit = 50, page = 1 } = req.query;
    let schoolCode = school && school !== 'All' ? getSchoolCode(school) : (req.user?.school ? getSchoolCode(req.user.school) : null);

    let query = {
      status: 'published',
      $or: []
    };
    if (schoolCode) {
      query.$or.push({ document_code: { $regex: `^FM-${schoolCode}-\\d+$`, $options: 'i' } });
    }
    // FAA-VAA global templates
    query.$or.push({ document_code: { $regex: '^FAA-VAA-\\d+$', $options: 'i' } });

    // Search
    if (search) {
      query.$and = [
        { $or: query.$or },
        { $or: [
          { title: { $regex: search, $options: 'i' } },
          { document_code: { $regex: search, $options: 'i' } }
        ] }
      ];
      delete query.$or;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const templates = await Template.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Template.countDocuments(query);

    // Fetch creator names for each template
    const userServiceUrl = process.env.USER_SERVICE_URL || "http://localhost:5002";
    let token = null;
    if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }
    const withMeta = await Promise.all(templates.map(async t => {
      let createdByName = null;
      try {
        if (t.created_by) {
          const headers = {};
          if (token) {
            headers['Cookie'] = `token=${token}`;
          }
          const resp = await axios.get(
            `${userServiceUrl}/api/user/getUserInfo/${t.created_by}`,
            { headers, withCredentials: true }
          );
          if (resp.data && resp.data.firstname && resp.data.lastname) {
            createdByName = `${resp.data.firstname} ${resp.data.lastname}`;
          }
        }
      } catch (err) {
        createdByName = null;
      }
      return {
        ...t.toObject(),
        approvalMeta: buildApprovalMeta(t, req.user?.id),
        createdByName
      };
    }));
    res.status(200).json({
      success: true,
      message: 'Published templates retrieved successfully',
      data: {
        templates: withMeta,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(total / parseInt(limit)),
          total_templates: total,
          has_next: skip + templates.length < total,
          has_prev: parseInt(page) > 1,
          per_page: parseInt(limit)
        },
        filters_applied: {
          school: school || req.user?.school || 'All',
          search: search || null
        }
      }
    });
  } catch (error) {
    console.error('Error fetching published visible templates:', error);
    res.status(500).json({
      success: false,
      message: "Error fetching published visible templates",
    });
  }
};

/**
 * @desc Get template by ID
 * @route GET /api/templates/:id
 * @access Private
 */
export const getTemplateById = async (req, res) => {
  try {
    const template = await Template.findById(req.params.id);
    if (!template) {
      return res.status(404).json({ 
        success: false,
        message: 'Template not found' 
      });
    }

    // User service URL and token
    const userServiceUrl = process.env.USER_SERVICE_URL || "http://localhost:5002";
    let token = null;
    if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }
    const headers = token ? { 'Cookie': `token=${token}` } : {};

    // Helper to fetch user info by id
    const fetchUserName = async (userId) => {
      if (!userId) return null;
      try {
        const resp = await axios.get(
          `${userServiceUrl}/api/user/getUserInfo/${userId}`,
          { headers, withCredentials: true }
        );
        if (resp.data && resp.data.firstname && resp.data.lastname) {
          return `${resp.data.firstname} ${resp.data.lastname}`;
        }
      } catch (err) {
        return null;
      }
      return null;
    };

    const tObj = template.toObject();

    // created_by
    let createdByName = null;
    if (tObj.created_by) {
      createdByName = await fetchUserName(tObj.created_by);
    }

    // assigned (array of user ids)
    let assignedNames = [];
    if (Array.isArray(tObj.assigned) && tObj.assigned.length > 0) {
      assignedNames = await Promise.all(tObj.assigned.map(uid => fetchUserName(uid)));
    }

    // status_meta.approvals.*.assigned_to
    let approvals = null;
    if (tObj.status_meta && tObj.status_meta.approvals) {
      approvals = {};
      for (const role of Object.keys(tObj.status_meta.approvals)) {
        const appr = tObj.status_meta.approvals[role];
        let assignedToName = appr.assigned_to ? await fetchUserName(appr.assigned_to) : null;
        approvals[role] = {
          ...appr,
          assigned_to_name: assignedToName
        };
      }
    }

    // notes[].added_by
    let notes = [];
    if (Array.isArray(tObj.notes)) {
      notes = await Promise.all(tObj.notes.map(async note => {
        let addedByName = note.added_by ? await fetchUserName(note.added_by) : null;
        return {
          ...note,
          added_by_name: addedByName
        };
      }));
    }

    // Compose response
    res.status(200).json({
      success: true,
      message: 'Template retrieved successfully',
      template: {
        ...tObj,
        approvalMeta: buildApprovalMeta(template, req.user?.id),
        createdByName,
        assignedNames,
        approvals,
        notes
      }
    });

  } catch (error) {
    console.error('Error fetching template:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch template',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * @desc Update template
 * @route PUT /api/templates/:id
 * @access Private (Creator )
 */
export const updateTemplate = async (req, res) => {
  try {
    const template = await Template.findById(req.params.id);

    if (!template) {
      return res.status(404).json({ 
        success: false,
        message: 'Template not found' 
      });
    }

    // Basic permission check using created_by field
    if (req.body.created_by && template.created_by.toString() !== req.body.created_by) {
      return res.status(403).json({ 
        success: false,
        message: 'Not authorized to update this template' 
      });
    }

    const updatePayload = { ...req.body };
    // Map content (HTML) to body if present
    if (typeof updatePayload.content === 'string') {
      updatePayload.body = updatePayload.content;
      delete updatePayload.content;
    }
    // Accept only pages_json and body
    if (!Array.isArray(updatePayload.pages_json)) {
      updatePayload.pages_json = [
        {
          type: 'doc',
          content: [
            { type: 'paragraph', content: [{ type: 'text', text: '' }] }
          ]
        }
      ];
    }
    if (!updatePayload.body) {
      updatePayload.body = '';
    }
    // console.log(updatePayload);
    if (updatePayload.document_code) {
      delete updatePayload.document_code;
    }

    let updateOps = { $set: updatePayload };
    if (req.body.notes_append && req.body.notes_append.message) {
      updateOps.$push = { notes: {
        added_by: req.body.notes_append.added_by || req.body.created_by || template.created_by,
        role_snapshot: req.body.notes_append.role_snapshot || '',
        type: req.body.notes_append.type || 'general',
        message: req.body.notes_append.message,
        created_at: new Date()
      }};
      // Prevent full overwrite if notes array also sent
      delete updateOps.$set.notes;
    }
console.log(updateOps);
    const updatedTemplate = await Template.findByIdAndUpdate(
      req.params.id,
      updateOps,
      { new: true, runValidators: true }
    );

    /** 
    // Emit socket event for real-time updates
    if (req.io) {
      req.io.emit('template_updated', {
        template: updatedTemplate,
        updater: {
          id: req.body.created_by,
          timestamp: new Date()
        }
      });
    }
    */

    res.status(200).json({
      success: true,
      message: 'Template updated successfully',
      template: {
        ...updatedTemplate.toObject(),
        approvalMeta: buildApprovalMeta(updatedTemplate, req.user?.id)
      }
    });

  } catch (error) {
    console.error('Error updating template:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update template',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * @desc Delete template
 * @route DELETE /api/templates/:id
 * @access Private (Creator or Admin)
 */
export const deleteTemplate = async (req, res) => {
  try {
    const template = await Template.findById(req.params.id);

    if (!template) {
      return res.status(404).json({ 
        success: false,
        message: 'Template not found' 
      });
    }

    await Template.findByIdAndDelete(req.params.id);
    /** 
    // Emit socket event for real-time updates
    if (req.io) {
      req.io.emit('template_deleted', {
        templateId: req.params.id,
        timestamp: new Date()
      });
    }
    */

    res.status(200).json({
      success: true,
      message: 'Template deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting template:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete template',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * @desc Get templates by user
 * @route GET /api/templates/user/:userId
 * @access Private
 */
export const getTemplatesByUser = async (req, res) => {
  try {
    const { status, limit = 20, page = 1 } = req.query;
    
    // Build query
    let query = { created_by: req.params.userId };
    
    // Filter by status if provided
    if (status && ['draft','pending','approved','published'].includes(status)) {
      query.status = status;
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const templates = await Template.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    const total = await Template.countDocuments(query);

    const withMeta = templates.map(t => ({ ...t.toObject(), approvalMeta: buildApprovalMeta(t, req.user?.id) }));
    res.status(200).json({
      success: true,
      message: 'User templates retrieved successfully',
      data: {
        templates: withMeta,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(total / parseInt(limit)),
          total_templates: total,
          has_next: skip + templates.length < total,
          has_prev: parseInt(page) > 1
        }
      }
    });

  } catch (error) {
    console.error(' Error fetching user templates:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user templates',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * @desc Get template statistics
 * @route GET /api/templates/stats
 * @access Private
 * NOTE: To be fixed later based on the needed requirements
 */
export const getTemplateStats = async (req, res) => {
  try {
    const stats = await Template.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          drafts: { $sum: { $cond: ['$status.draft', 1, 0] } },
          published: { $sum: { $cond: ['$status.published', 1, 0] } },
          pending: { $sum: { $cond: ['$status.pending_approval', 1, 0] } },
          approved: { $sum: { $cond: ['$status.approved', 1, 0] } }
        }
      }
    ]);

    const schoolStats = await Template.aggregate([
      {
        $group: {
          _id: '$school_identifier',
          count: { $sum: 1 }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      message: 'Template statistics retrieved successfully',
      data: {
        overall: stats[0] || {
          total: 0,
          drafts: 0,
          published: 0,
          pending: 0,
          approved: 0
        },
        by_school: schoolStats
      }
    });

  } catch (error) {
    console.error('Error fetching template stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch template statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
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