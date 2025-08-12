import Template from "../models/templateModel.js";
import { validSchools, schoolMap, getSchoolCode, generateDocumentCode } from "../utils/templateUtils.js";

// Unified status query helper
const statusQuery = (status) => {
  if (!status || status === 'All') return {};
  if (['draft','pending','approved','published'].includes(status)) return { status };
  return {};
};

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
        .select('title document_code createdAt status revision_no effectivity created_by status_meta.published_at')
        .lean()
    ]);

    const countMap = counts.reduce((acc,c)=>{ acc[c._id] = c.count; return acc; }, {});
    const countPublished = countMap.published || 0;
    const countDraft = countMap.draft || 0;
    const countPendingApproval = countMap.pending || 0;
    const getPublishedTemplates = recentPublished;
    res.status(200).json({
      success: true,
      data: {
        countPublished,
        countDraft,
        countPendingApproval,
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

    if (!templateData.created_by) {
      return res.status(400).json({
        success: false,
        message: 'created_by is required'
      });
    }

    const schoolIdentifier = templateData.school_identifier;
    if (!schoolIdentifier) {
      return res.status(400).json({
        success: false,
        message: 'School identifier is required to generate document code'
      });
    }

    if (!validSchools.includes(schoolIdentifier)) {
      return res.status(400).json({
        success: false,
        message: `Invalid school identifier. Must be one of: ${validSchools.join(', ')}`
      });
    }

    // Find existing templates for document code generation
    const existingTemplates = await Template.find({
      document_code: { $regex: `^FM-${schoolIdentifier}-\\d+$` }
    }).sort({ document_code: -1 });

    const generatedDocumentCode = generateDocumentCode(existingTemplates, schoolIdentifier);

    const existingTemplate = await Template.findOne({
      document_code: generatedDocumentCode,
      revision_no: templateData.revision_no || 0
    });

    if (existingTemplate) {
      return res.status(400).json({
        success: false,
        message: `Template ${generatedDocumentCode} revision ${templateData.revision_no || 0} already exists`
      });
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
      ...templateData,
      document_code: generatedDocumentCode
    });

    // Remove transient / client-only fields
    delete template.school_identifier; // not stored separately

    await template.save();

    console.log('Template created successfully:', `${template.document_code} Rev ${template.revision_no} - "${template.title}"`);

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
    let query = {};

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
        { title: { $regex: search, $options: 'i' } },
        { document_code: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);


    // Fetch templates with pagination
    const templates = await Template.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Template.countDocuments(query);

    res.status(200).json({
      success: true,
      message: 'Templates retrieved successfully',
      data: {
  templates: templates,
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

    res.status(200).json({
      success: true,
      message: 'Template retrieved successfully',
      template: template
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
      template: updatedTemplate
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
    if (status) {
      if (status === 'draft') {
        query['status.draft'] = true;
      } else if (status === 'published') {
        query['status.published'] = true;
      } else if (status === 'pending') {
        query['status.pending_approval'] = true;
      }
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const templates = await Template.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    const total = await Template.countDocuments(query);

    res.status(200).json({
      success: true,
      message: 'User templates retrieved successfully',
      data: {
        templates: templates,
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