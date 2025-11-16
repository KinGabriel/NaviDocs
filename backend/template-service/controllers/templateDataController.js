import Template from "../models/templateModel.js";
import { fetchUserInfoById } from '../utils/userServiceUtils.js';
import { getRecentPublished } from '../utils/recentTemplates.js';

/**
 * @desc Get dashboard information for document controller
 * @route POST /api/templates/dashboard-info
 * @access Private (Document Controller)
 */
export const dashboardInfoDocConroller = async (req, res) => {
  try{
    // Normalize user role string safely
    const userRoleRaw = req.user?.role?.name || req.user?.role || '';
    const userRole = String(userRoleRaw).toLowerCase().replace(/[_\s]+/g, ' ').trim();
    const school = req.user?.school || '';

    // Base filter: ignore archived templates
    const baseFilter = { $or: [{ isArchived: { $exists: false } }, { isArchived: false }] };

    // Projections: return only metadata useful for dashboard (avoid heavy fields like pages_json)
    const projection = {
      title: 1,
      document_code: 1,
      revision_no: 1,
      status: 1,
      school: 1,
      status_meta: 1,
      created_by: 1,
      updatedAt: 1,
      createdAt: 1
    };

    const limit = 5;

    // Build queries for the three approver roles
    // Allow each role to see items that are currently their turn OR items they already approved/returned
    const udcRolePath = 'status_meta.approvals.unit_document_controller';
    const ldcRolePath = 'status_meta.approvals.lead_document_controller';
    const dcoRolePath = 'status_meta.approvals.document_controller_officer';

    const udcQuery = {
      ...baseFilter,
      $or: [
        { status: 'pending' },
        { status: 'rejected' },
        { [`${udcRolePath}.approved_at`]: { $exists: true, $ne: null } },
        { [`${udcRolePath}.returned_at`]: { $exists: true, $ne: null } }
      ]
    };

    const ldcQuery = {
      ...baseFilter,
      $or: [
        { status: 'endorsed' },
        { status: 'rejected' },
        { [`${ldcRolePath}.approved_at`]: { $exists: true, $ne: null } },
        { [`${ldcRolePath}.returned_at`]: { $exists: true, $ne: null } }
      ]
    };

    // DCO: items that are endorsed and have been approved by the lead (ldc) OR items DCO already acted on
    const dcoQuery = {
      ...baseFilter,
      $or: [
        { $and: [ { status: 'endorsed' }, { [`${ldcRolePath}.approved_at`]: { $exists: true, $ne: null } } ] },
        { status: 'rejected' },
        { [`${dcoRolePath}.approved_at`]: { $exists: true, $ne: null } },
        { [`${dcoRolePath}.returned_at`]: { $exists: true, $ne: null } }
      ]
    };


  // Also fetch the 5 most recently published templates for the dashboard.
  const publishedQuery = { status: 'published' };


    const userId = req.user && req.user.id ? String(req.user.id) : null;
    const userRoleNorm = userRole; // already normalized

    const buildMyTurnFilterForRole = (role) => {
      if (role === 'unit_document_controller') {
        return {
          $or: [
            { $and: [ { status: 'pending' }, { $or: [ { 'status_meta.approvals.unit_document_controller.approved_at': { $exists: false } }, { 'status_meta.approvals.unit_document_controller.approved_at': null } ] } ] },
            { status: 'returned' }
          ]
        };
      }
      if (role === 'lead_document_controller') {
        return {
          $or: [
            { $and: [
                { $or: [
                  { $and: [ { status: 'pending' }, { 'status_meta.approvals.unit_document_controller.approved_at': { $ne: null } } ] },
                  { status: 'endorsed' }
                ] },
                { $or: [ { 'status_meta.approvals.lead_document_controller.approved_at': { $exists: false } }, { 'status_meta.approvals.lead_document_controller.approved_at': null } ] }
              ]
            },
            { $and: [ { status: 'returned' }, { $or: [ { 'status_meta.approvals.unit_document_controller.approved_at': { $exists: true } } ] } ] }
          ]
        };
      }
      if (role === 'document_controller_officer') {
        return {
          $or: [
            { $and: [
                { 'status_meta.approvals.lead_document_controller.approved_at': { $ne: null } },
                { $or: [ { status: { $ne: 'pending' } }, { 'status_meta.approvals.unit_document_controller.approved_at': { $ne: null } } ] },
                { $or: [ { 'status_meta.approvals.document_controller_officer.approved_at': { $exists: false } }, { 'status_meta.approvals.document_controller_officer.approved_at': null } ] }
              ]
            },
            { $and: [ { status: 'returned' }, { 'status_meta.approvals.lead_document_controller.approved_at': { $ne: null } } ] }
          ]
        };
      }
      return null;
    };

    const udcMyTurn = buildMyTurnFilterForRole('unit_document_controller');
    const ldcMyTurn = buildMyTurnFilterForRole('lead_document_controller');
    const dcoMyTurn = buildMyTurnFilterForRole('document_controller_officer');

    // Visibility base for this user (creator, assigned, or explicitly assigned approver)
    const visibilityOr = [
      { created_by: userId },
      { assigned: userId },
      { 'status_meta.approvals.lead_document_controller.assigned_to': userId },
      { 'status_meta.approvals.document_controller_officer.assigned_to': userId },
      { 'status_meta.approvals.unit_document_controller.assigned_to': userId }
    ];

    if (udcMyTurn) visibilityOr.push(udcMyTurn);
    if (ldcMyTurn) visibilityOr.push(ldcMyTurn);
    if (dcoMyTurn) visibilityOr.push(dcoMyTurn);

    const visibilityFilter = { ...baseFilter, $or: visibilityOr };

    // Fetch recent items for each role (limited projection) and published list in parallel (global across schools)
    const [udcRecent, ldcRecent, dcoRecent, publishedRecent] = await Promise.all([
      Template.find(udcQuery, projection).sort({ 'status_meta.submitted_at': -1, updatedAt: -1 }).limit(limit).lean(),
      Template.find(ldcQuery, projection).sort({ 'status_meta.submitted_at': -1, updatedAt: -1 }).limit(limit).lean(),
      Template.find(dcoQuery, projection).sort({ 'status_meta.submitted_at': -1, updatedAt: -1 }).limit(limit).lean(),
      getRecentPublished(limit)
    ]);

    // Compute counts scoped to user's visibility for each role (global across schools)
  // Exclude 'approved' and 'rejected' from pending counts so rejected items are considered responded
  const dcoCountFilter = { ...baseFilter, $and: [ dcoMyTurn || {}, { $or: visibilityOr }, { status: { $nin: ['approved', 'rejected'] } } ] };

    const [udcCount, ldcCount, dcoCount, approvedCount, publishedCount, totalCount] = await Promise.all([
      Template.countDocuments({ ...baseFilter, $and: [ udcMyTurn || {}, { $or: visibilityOr } ] }),
      Template.countDocuments({ ...baseFilter, $and: [ ldcMyTurn || {}, { $or: visibilityOr } ] }),
      Template.countDocuments(dcoCountFilter),
  // Count responded items (both approved and rejected)
  Template.countDocuments({ ...baseFilter, status: { $in: ['approved', 'rejected'] } }),
      Template.countDocuments({ ...baseFilter, status: 'published' }),
      Template.countDocuments({ ...baseFilter })
    ]);

    // approval-by-role counts
    // Count approvals either by timestamp (approved_at) or boolean flag (is_approved / isApproved)
    const [udcApprovalsCount, ldcApprovalsCount, dcoApprovalsCount] = await Promise.all([
      Template.countDocuments({
        ...baseFilter,
        $or: [
          { 'status_meta.approvals.unit_document_controller.approved_at': { $exists: true, $ne: null } },
          { 'status_meta.approvals.unit_document_controller.is_approved': true },
          { 'status_meta.approvals.unit_document_controller.isApproved': true }
        ]
      }),
      Template.countDocuments({
        ...baseFilter,
        $or: [
          { 'status_meta.approvals.lead_document_controller.approved_at': { $exists: true, $ne: null } },
          { 'status_meta.approvals.lead_document_controller.is_approved': true },
          { 'status_meta.approvals.lead_document_controller.isApproved': true }
        ]
      }),
      Template.countDocuments({
        ...baseFilter,
        $or: [
          { 'status_meta.approvals.document_controller_officer.approved_at': { $exists: true, $ne: null } },
          { 'status_meta.approvals.document_controller_officer.is_approved': true },
          { 'status_meta.approvals.document_controller_officer.isApproved': true },
          // Consider DCO 'responded' when they returned/rejected as well
          { 'status_meta.approvals.document_controller_officer.returned_at': { $exists: true, $ne: null } },
          { 'status_meta.approvals.document_controller_officer.rejected_at': { $exists: true, $ne: null } },
          { 'status_meta.approvals.document_controller_officer.is_rejected': true },
          { 'status_meta.approvals.document_controller_officer.isRejected': true }
        ]
      })
    ]);
    // Enrich created_by -> createdByName using user service (best-effort)
    const allUserIds = new Set();
    [udcRecent, ldcRecent, dcoRecent, publishedRecent].forEach(list => {
      (list || []).forEach(item => {
        if (item && item.created_by) allUserIds.add(String(item.created_by));
      });
    });

    const userIdMap = {};
    if (allUserIds.size > 0) {
      // Parallel fetch user info (deduplicated)
      const fetches = Array.from(allUserIds).map(id => fetchUserInfoById(id, req, { basic: true }).then(u => ({ id, u })));
      const fetchResults = await Promise.all(fetches);
      fetchResults.forEach(({ id, u }) => {
        if (u) {
          // User service returns { firstname, lastname } for basic info, or full profile with name.
          const name = u.name || `${u.firstname || ''} ${u.lastname || ''}`.trim() || u.displayName || u.email || null;
          userIdMap[id] = name || null;
        } else {
          userIdMap[id] = null;
        }
      });
    }

    const enrich = (list) => (list || []).map(item => ({
      ...item,
      createdByName: item.created_by ? (userIdMap[String(item.created_by)] || null) : null
    }));

    const result = {
      recent: {
        udc: enrich(udcRecent),
        ldc: enrich(ldcRecent),
        dco: enrich(dcoRecent),
        published: enrich(publishedRecent)
      },
      counts: {
        // Counts scoped to the current user's visibility where appropriate
        udc_pending: udcCount || 0,
        ldc_endorsed: ldcCount || 0,
        dco_ready: dcoCount || 0,
        udc_approvals: udcApprovalsCount || 0,
        ldc_approvals: ldcApprovalsCount || 0,
        dco_approvals: dcoApprovalsCount || 0,
        approved: approvedCount || 0,
        published: publishedCount || 0,
        total: totalCount || 0
      },
      role: userRole
    };

    // Provide a UI-friendly recentlySubmitted list chosen by the current user's role
    // Map to the simple shape used by the frontend table: { id, title, createdBy, status, createdAt }
    const pickRecentForRole = () => {
      const r = userRole || '';
      const lc = r.toLowerCase();
      if (lc.includes('unit')) return enrich(udcRecent);
      if (lc.includes('lead')) return enrich(ldcRecent);
      if (lc.includes('document')) return enrich(dcoRecent);
      // combine all recent lists ordered by submission time (status_meta.submitted_at) primary
      const combined = (enrich(udcRecent) || []).concat(enrich(ldcRecent) || []).concat(enrich(dcoRecent) || []);
      // sort by submitted_at desc (fallback to createdAt/updatedAt)
      combined.sort((a, b) => {
        const aSubmitted = (a && a.status_meta && a.status_meta.submitted_at) || a?.createdAt || a?.updatedAt || 0;
        const bSubmitted = (b && b.status_meta && b.status_meta.submitted_at) || b?.createdAt || b?.updatedAt || 0;
        return new Date(bSubmitted) - new Date(aSubmitted);
      });
      return combined.slice(0, limit);
    };

    const recentlyForUI = (pickRecentForRole() || []).map(item => ({
      id: item._id || item.id,
      title: item.title || '',
      createdBy: item.createdByName || item.created_by_user?.displayName || item.created_by || '',
      status: item.status || '',
      // Prefer the submission timestamp for recently-submitted items
      createdAt: (item && item.status_meta && item.status_meta.submitted_at) ? item.status_meta.submitted_at : (item.createdAt || null)
    }));

    result.recentlySubmitted = recentlyForUI;

    return res.status(200).json({ success: true, message: 'Dashboard data retrieved', data: result });
  } catch (error) {
    console.error('Error in dashboardInfoDocConroller:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch dashboard data', error: process.env.NODE_ENV === 'development' ? error.message : undefined });
  }
}

/**
 * @desc Get department-head specific dashboard data. Returns the latest non-draft templates owned by the requesting user and the most recent published templates
 * @route GET /api/templates/dashboard-dept-head
 * @access Private (Department Head)
 * @returns {Promise<import('express').Response>} JSON payload with `ownerTemplates` and `publishedRecent`
 */
export const dashboardDeptHead = async (req, res) => {
  try {
    // Return two sets of templates for the department head dashboard:
    const userId = req.user && req.user.id ? String(req.user.id) : null;
    const limit = 5;

    if (!userId) {
      return res.status(400).json({ success: false, message: 'Missing user id' });
    }

    const baseFilter = { $or: [{ isArchived: { $exists: false } }, { isArchived: false }] };

    // Owner templates: exclude drafts and archived items
    const ownerFilter = {
      ...baseFilter,
      created_by: userId,
      status: { $ne: 'draft' }
    };

    const projection = {
      title: 1,
      status: 1,
      updatedAt: 1,
      createdAt: 1,
      status_meta: 1
    };

    const ownerTemplates = await Template.find(ownerFilter, projection).sort({ createdAt: -1, updatedAt: -1 }).limit(limit).lean();

    // Reuse helper to fetch recent published templates (global)
    const publishedRecent = await getRecentPublished(limit);

    // Map returned lists to include explicit `submittedAt` and avoid exposing
    // creator display fields. Frontend should use `submittedAt` for the
    // "Submitted At" column instead of a "Created By" column.
    const mapSubmitted = (list) => (list || []).map(item => {
      const submittedAtVal = (item && item.status_meta && item.status_meta.submitted_at) ? item.status_meta.submitted_at : (item.createdAt || item.updatedAt || null);
      return {
        id: item._id || item.id || null,
        title: item.title || '',
        status: item.status || '',
        createdAt: item.createdAt || item.updatedAt || null,
        submittedAt: submittedAtVal,
        // keep lightweight passthroughs for published list where useful
        code: item.document_code || item.code || null,
        rev: item.revision_no || item.rev || null
      };
    });

    return res.status(200).json({
      success: true,
      message: 'Department head dashboard data retrieved',
      data: {
        ownerTemplates: mapSubmitted(ownerTemplates),
        publishedRecent: mapSubmitted(publishedRecent)
      }
    });
  } catch (error) {
    console.error('Error in dashboardDeptHead:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch department head dashboard data', error: process.env.NODE_ENV === 'development' ? error.message : undefined });
  }
};


/**
 * Get Dean/Secretary dashboard for templates.
 * @desc Returns counts and recent lists for templates relevant to the current user (Dean/Secretary).
 *       Response payload is normalized for the frontend and includes:
 *         - submittedCount: number (count of non-draft templates owned by the user)
 *         - recentSubmitted: Array of recently submitted templates (limited)
 *         - publishedRecent: Array of recently published templates (global limit)
 * @route GET /api/templates/dashboard-dean-sec
 * @access Private (Dean/Secretary)
 * @returns {Promise<import('express').Response>} - JSON response
 */
export const dashboardDeanSec = async (req, res) => {
  try {
    const userId = req.user && req.user.id ? String(req.user.id) : null;
    if (!userId) return res.status(400).json({ success: false, message: 'Missing user id' });

    const limit = 5;
    const baseFilter = { $or: [{ isArchived: { $exists: false } }, { isArchived: false }] };

    // Count of submitted templates owned by this user (exclude drafts)
    const ownerFilter = { ...baseFilter, created_by: userId, status: { $ne: 'draft' } };

    const projection = {
      title: 1,
      document_code: 1,
      revision_no: 1,
      status: 1,
      school: 1,
      status_meta: 1,
      created_by: 1,
      updatedAt: 1,
      createdAt: 1
    };

    // Execute queries in parallel: count, recent submitted (owner), recent published (global helper)
    const [submittedCount, recentSubmittedRaw, publishedRecent] = await Promise.all([
      Template.countDocuments(ownerFilter),
      Template.find(ownerFilter, projection).sort({ 'status_meta.submitted_at': -1, updatedAt: -1 }).limit(limit).lean(),
      getRecentPublished(limit)
    ]);

    // Enrich created_by -> createdByName using user service (best-effort)
    const allUserIds = new Set();
    (recentSubmittedRaw || []).forEach(item => { if (item && item.created_by) allUserIds.add(String(item.created_by)); });
    (publishedRecent || []).forEach(item => { if (item && item.created_by) allUserIds.add(String(item.created_by)); });

    const userIdMap = {};
    if (allUserIds.size > 0) {
      const fetches = Array.from(allUserIds).map(id => fetchUserInfoById(id, req, { basic: true }).then(u => ({ id, u })));
      const fetchResults = await Promise.all(fetches);
      fetchResults.forEach(({ id, u }) => {
        if (u) {
          const name = u.name || `${u.firstname || ''} ${u.lastname || ''}`.trim() || u.displayName || u.email || null;
          userIdMap[id] = name || null;
        } else {
          userIdMap[id] = null;
        }
      });
    }

    const enrich = (list) => (list || []).map(item => {
      const submittedAtVal = (item && item.status_meta && item.status_meta.submitted_at) ? item.status_meta.submitted_at : (item.createdAt || item.updatedAt || null);
      return {
        id: item._id || item.id || null,
        title: item.title || '',
        code: item.document_code || item.code || '',
        rev: item.revision_no || item.rev || '',
        status: item.status || '',
        createdBy: item.created_by ? (userIdMap[String(item.created_by)] || item.created_by) : null,
        // Keep original createdAt (record creation) and provide explicit submittedAt for UI
        createdAt: item.createdAt || item.updatedAt || null,
        submittedAt: submittedAtVal,
        // Additional fields passed through to match canonical template shape
        document_code: item.document_code || item.code || '',
        revision_no: item.revision_no || item.rev || '',
        effectivity: item.effectivity || item.effectivity_date || null,
        thumbnailUrl: item.thumbnailUrl || item.thumbnail_url || null,
        pageSetup: item.pageSetup || item.page_setup || null,
        fields: item.fields || [],
        pages_json: item.pages_json || item.pagesJson || null,
        status_meta: item.status_meta || null,
        deadline: item.deadline || null,
        assigned: item.assigned || [],
        isArchived: typeof item.isArchived !== 'undefined' ? item.isArchived : (item.is_archived || false),
        notes: item.notes || [],
        headerConfig: item.headerConfig || item.header_config || null,
        school: item.school || null,
        created_by_raw: item.created_by || null
      };
    });

    const result = {
      submittedCount: submittedCount || 0,
      recentSubmitted: enrich(recentSubmittedRaw),
      publishedRecent: enrich(publishedRecent)
    };
console.log(result);
    return res.status(200).json({ success: true, message: 'Dean/Secretary dashboard data retrieved', data: result });
  } catch (error) {
    console.error('Error in dashboardDeanSec:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch dean dashboard data', error: process.env.NODE_ENV === 'development' ? error.message : undefined });
  }

}

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


