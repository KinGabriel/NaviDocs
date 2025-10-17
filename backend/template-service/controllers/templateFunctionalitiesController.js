import Template from "../models/templateModel.js";
import { getSchoolCode, buildApprovalMeta, statusQuery } from "../utils/templateUtils.js";
import { generateTemplateThumbnail } from "../utils/thumbnailUtils.js";
import axios from "axios";
import { createTemplateVersion } from './templateVersionController.js';
import { fetchUserInfoById } from '../utils/userServiceUtils.js';

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
    const template = new Template({
      ...templateData
    });

  template.school = req.user?.school || req.user?.role?.school || '';
    // Remove transient / client-only fields
    delete template.school_identifier; // not stored separately

    await template.save();

    // Create initial version for the newly created template (non-blocking)
    try {
      await createTemplateVersion({ templateId: template._id, snapshot: template.toObject(), userId: req.user?.id, note: 'Initial version' });
    } catch (e) {
      console.error('Failed to create initial template version', e);
    }

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
//console.log(updateOps);
    // Use per-operation timestamps so Mongoose updates `updatedAt` automatically
    const updatedTemplate = await Template.findByIdAndUpdate(
      req.params.id,
      updateOps,
      { new: true, runValidators: true, timestamps: true }
    );

    // Create a version for the update (non-blocking). Use provided version_note or fallback to empty.
    try {
      const note = (req.body && typeof req.body.version_note === 'string') ? req.body.version_note : '';
      // Provide a snapshot object with only allowed keys to let createTemplateVersion decide
        const snapshot = {
          pages_json: updatedTemplate.pages_json,
          fields: updatedTemplate.fields,
          pageSetup: updatedTemplate.pageSetup,
          dateFormat: updatedTemplate.dateFormat,
          logoConfig: updatedTemplate.logoConfig || {}
        };
      // fire-and-forget; createTemplateVersion contains its own try/catch where necessary
      createTemplateVersion({ templateId: updatedTemplate._id, snapshot, userId: req.user?.id, note }).catch(e => {
        console.error('Non-blocking createTemplateVersion failed:', e);
      });
    } catch (e) {
      console.error('Failed to enqueue createTemplateVersion', e);
    }

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
  // Trigger thumbnail generation after update using the updated document
  await generateTemplateThumbnailInternal(updatedTemplate || template);
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

    // Determine requester relationship to template
    const requesterId = req.user && req.user.id ? String(req.user.id) : null;
    const isOwner = template.created_by && String(template.created_by) === requesterId;
    const isAdmin = req.user && (req.user.role === 'admin' || req.user.role === 'Admin' || req.user.isAdmin);
    const assignedIds = Array.isArray(template.assigned) ? template.assigned.map(a => String(a)) : [];
    const isAssigned = requesterId ? assignedIds.includes(requesterId) : false;

    // If requester is not owner but is in assigned list, treat DELETE as self-remove unless status === 'assigned'
    if (!isOwner && !isAdmin) {
      if (isAssigned) {
        if (String(template.status) === 'assigned') {
          return res.status(403).json({
            success: false,
            message: 'Not authorized to remove assignment while template is assigned'
          });
        }

        // Remove requester from assigned array
        // Use per-operation timestamps so Mongoose updates `updatedAt`
        const updated = await Template.findByIdAndUpdate(
          req.params.id,
          { $pull: { assigned: req.user.id } },
          { new: true, timestamps: true }
        );

        return res.status(200).json({
          success: true,
          message: 'Removed from assigned list',
          template: {
            ...updated.toObject(),
            approvalMeta: buildApprovalMeta(updated, req.user?.id)
          }
        });
      }

      // Not owner/admin and not assigned -> forbidden to delete
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this template'
      });
    }

    // Owner proceed to delete
    await Template.findByIdAndDelete(req.params.id);

    //  delete the thumbnail from the file-service if present
    try {
      const fileServerUrl = process.env.FILE_SERVICE_URL || 'http://localhost:5005';
      if (template.thumbnailUrl) {
        // file-service expects DELETE /api/files/delete with JSON body { filePath }
        const filePath = template.thumbnailUrl;
        await axios.delete(fileServerUrl + '/api/files/delete', { data: { filePath } });
        console.log(`Thumbnail deleted from file-service: ${filePath}`);
      }
    } catch (err) {
      console.error('Error deleting thumbnail from file-service:', err?.message || err);
    }
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

    // Helper to fetch user display name by id using shared utility
    const fetchUserName = async (userId) => {
      if (!userId) return null;
      try {
        const info = await fetchUserInfoById(userId, req, { basic: false });
        if (info && info.firstname && info.lastname) return `${info.firstname} ${info.lastname}`;
      } catch (e) {
        // swallow and return null
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
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Template.countDocuments(query);

    // Fetch creator and assigned names using shared userService helper (headers/token handled centrally)
    const withMeta = await Promise.all(templates.map(async t => {
      let createdByName = null;
      let assignedNames = [];
      try {
        if (t.created_by) {
          try {
            const info = await fetchUserInfoById(String(t.created_by), req, { basic: true });
            // console.log('Creator info:', info);
            if (info && (info.firstname || info.lastname)) createdByName = [info.firstname, info.lastname].filter(Boolean).join(' ');
          } catch (e) {
            createdByName = null;
          }
        }

        if (Array.isArray(t.assigned) && t.assigned.length > 0) {
          assignedNames = await Promise.all(t.assigned.map(async userId => {
            try {
              const info = await fetchUserInfoById(String(userId), req, { basic: true });
              if (info && (info.firstname || info.lastname)) return [info.firstname, info.lastname].filter(Boolean).join(' ');
            } catch (e) {
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
      .sort({ updatedAt: -1 })
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

    // Base query: published templates
    let query = { status: 'published' };

    // If a specific school is requested (and not 'All'), restrict by that school's document_code
    // and include FAA-VAA global templates as well.
    if (school && school !== 'All') {
      const schoolCode = getSchoolCode(school);
      // Match by document_code (FM-<code>-NN) OR by the `school` DB field (either name or code)
      const docCodePattern = { document_code: { $regex: `^FM-${schoolCode}-\\d+$`, $options: 'i' } };
      const schoolFieldPatternName = { school: { $regex: `^${school}$`, $options: 'i' } };
      const schoolFieldPatternCode = { school: { $regex: `^${schoolCode}$`, $options: 'i' } };
      const globalPattern = { document_code: { $regex: '^FAA-VAA-\\d+$', $options: 'i' } };

      // Include templates that either have the FM document code for the school,
      query.$or = [docCodePattern, schoolFieldPatternName, schoolFieldPatternCode, globalPattern];

      // If search is present, combine the school-based $or with title/document_code search
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
    } else {
      // No specific school requested (or 'All'): return all published templates.
      if (search) {
        query.$or = [
          { title: { $regex: search, $options: 'i' } },
          { document_code: { $regex: search, $options: 'i' } }
        ];
      }
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const templates = await Template.find(query)
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Template.countDocuments(query);

    // Fetch creator names using shared userService helper
    const withMeta = await Promise.all(templates.map(async t => {
      let createdByName = null;
      try {
        if (t.created_by) {
          try {
            const info = await fetchUserInfoById(String(t.created_by), req, { basic: true });
            if (info && (info.firstname || info.lastname)) createdByName = [info.firstname, info.lastname].filter(Boolean).join(' ');
          } catch (e) {
            createdByName = null;
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
 * @desc Rename  template's title 
 * @route PATCH /api/templates/:id/rename
 * @param {*} template 
 * @returns 
 */
export const renameTemplate = async (req, res) => {
  try {
    const template = await Template.findById(req.params.id);
    if (!template) {
      return res.status(404).json({ success: false, message: 'Template not found' });
    }
    const newName = (req.body && (typeof req.body.newName === 'string' ? req.body.newName : req.body.title)) || '';
    const finalTitle = newName && newName.trim() !== '' ? newName.trim() : 'Untitled Template';

    template.title = finalTitle;
    await template.save();
    return res.status(200).json({ success: true, message: 'Template renamed successfully', template });
  } catch (error) {
    console.error('Error renaming template:', error);
    return res.status(500).json({ success: false, message: 'Failed to rename template', error:  'Internal server error' });
  }
};


/**
 * @desc Duplicate a template by id — only copies pages_json, pageSetup, dateFormat, fields.
 * @route POST /api/templates/:id/duplicate
 * @access Private
 */
export const duplicateTemplate = async (req, res) => {
  try {
    const template = await Template.findById(req.params.id);
    if (!template) {
      return res.status(404).json({ success: false, message: 'Template not found' });
    }

    // Accept new title from client
    const requestedTitle = (req.body && typeof req.body.title === 'string') ? req.body.title.trim() : '';
    const newTitle = requestedTitle && requestedTitle.length > 0 ? requestedTitle : `Copy of ${template.title}`;

    // Build minimal payload copying only the allowed template parts
    const newTemplateData = {
      title: newTitle,
      pages_json: Array.isArray(template.pages_json) && template.pages_json.length ? template.pages_json : [
        { type: 'doc', content: [ { type: 'paragraph', content: [ { type: 'text', text: '' } ] } ] }
      ],
      pageSetup: template.pageSetup || {},
      dateFormat: template.dateFormat || {},
      fields: Array.isArray(template.fields) ? template.fields : [],
      // Set sensible defaults 
      status: 'draft',
      thumbnailUrl: null
    };

    // created_by is the requester
    if (req.user && req.user.id) newTemplateData.created_by = req.user.id;
    // copy school from requester
    newTemplateData.school = req.user?.school || req.user?.role?.school || '';

    // Ensure not to copy document_code/revision_no or other identifying fields
    delete newTemplateData.document_code;
    delete newTemplateData.revision_no;

    const newTemplate = new Template(newTemplateData);
    // Save
    await newTemplate.save();

    return res.status(201).json({ success: true, message: 'Template duplicated successfully', template: newTemplate });
  } catch (error) {
    console.error('Error duplicating template by id:', error);
    return res.status(500).json({ success: false, message: 'Failed to duplicate template', error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error' });
  }
};

// Helper to generate and save thumbnail URL to template
export const generateTemplateThumbnailInternal = async (template) => {
  try {
    const url = await generateTemplateThumbnail(template);
    if (url) {
      template.thumbnailUrl = url;
      await template.save();
    }
    return url;
  } catch (error) {
    console.error("Error generating thumbnail (internal):", error);
    return null;
  }
};