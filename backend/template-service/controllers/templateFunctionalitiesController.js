import Template from "../models/templateModel.js";
import { getSchoolCode, buildApprovalMeta, statusQuery } from "../utils/templateUtils.js";
import axios from "axios";

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

    if (!templateData.created_by) {
      templateData.created_by =  req.user?.id;
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
