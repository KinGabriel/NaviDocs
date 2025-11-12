import Template from "../models/templateModel.js";
import { fetchUserInfoById } from '../../document-service/utils/userServiceUtils.js';

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
        { [`${udcRolePath}.approved_at`]: { $exists: true, $ne: null } },
        { [`${udcRolePath}.returned_at`]: { $exists: true, $ne: null } }
      ]
    };

    const ldcQuery = {
      ...baseFilter,
      $or: [
        { status: 'endorsed' },
        { [`${ldcRolePath}.approved_at`]: { $exists: true, $ne: null } },
        { [`${ldcRolePath}.returned_at`]: { $exists: true, $ne: null } }
      ]
    };

    // DCO: items that are endorsed and have been approved by the lead (ldc) OR items DCO already acted on
    const dcoQuery = {
      ...baseFilter,
      $or: [
        { $and: [ { status: 'endorsed' }, { [`${ldcRolePath}.approved_at`]: { $exists: true, $ne: null } } ] },
        { [`${dcoRolePath}.approved_at`]: { $exists: true, $ne: null } },
        { [`${dcoRolePath}.returned_at`]: { $exists: true, $ne: null } }
      ]
    };

    // If the templates are scoped by school in your app, filter by school when available
    if (school) {
      udcQuery.school = school;
      ldcQuery.school = school;
      dcoQuery.school = school;
    }

    // Also fetch recently published templates (for the dashboard "Recently Published Templates")
    const publishedQuery = { ...baseFilter, status: 'published' };
    if (school) publishedQuery.school = school;

    // Fetch recent items in parallel (small queries)
    const [udcRecent, ldcRecent, dcoRecent, publishedRecent, counts] = await Promise.all([
      Template.find(udcQuery, projection).sort({ 'status_meta.submitted_at': -1, updatedAt: -1 }).limit(limit).lean(),
      Template.find(ldcQuery, projection).sort({ 'status_meta.submitted_at': -1, updatedAt: -1 }).limit(limit).lean(),
      Template.find(dcoQuery, projection).sort({ 'status_meta.submitted_at': -1, updatedAt: -1 }).limit(limit).lean(),
      Template.find(publishedQuery, { _id: 1, title: 1, document_code: 1, revision_no: 1, created_by: 1, 'status_meta.published_at': 1 }).sort({ 'status_meta.published_at': -1, updatedAt: -1 }).limit(limit).lean(),
      // counts for dashboard badges/metrics
      Template.aggregate([
        { $match: baseFilter },
        { $facet: {
          udc: [ { $match: udcQuery }, { $count: 'count' } ],
          ldc: [ { $match: ldcQuery }, { $count: 'count' } ],
          dco: [ { $match: dcoQuery }, { $count: 'count' } ],
          total: [ { $count: 'count' } ]
        }}
      ])
    ]);

    const parsedCounts = (counts && counts[0]) ? counts[0] : { udc: [], ldc: [], dco: [], total: [] };

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
        if (u && u.data) {
          // Attempt common fields
          userIdMap[id] = u.data.displayName || u.data.fullName || u.data.name || `${u.data.firstName || ''} ${u.data.lastName || ''}`.trim();
        } else if (u) {
          userIdMap[id] = u.displayName || u.fullName || u.name || `${u.firstName || ''} ${u.lastName || ''}`.trim();
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
        dco: enrich(dcoRecent)
      },
      counts: {
        udc: (parsedCounts.udc && parsedCounts.udc[0] && parsedCounts.udc[0].count) || 0,
        ldc: (parsedCounts.ldc && parsedCounts.ldc[0] && parsedCounts.ldc[0].count) || 0,
        dco: (parsedCounts.dco && parsedCounts.dco[0] && parsedCounts.dco[0].count) || 0,
        total: (parsedCounts.total && parsedCounts.total[0] && parsedCounts.total[0].count) || 0
      },
      role: userRole
    };

    return res.status(200).json({ success: true, message: 'Dashboard data retrieved', data: result });
  } catch (error) {
    console.error('Error in dashboardInfoDocConroller:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch dashboard data', error: process.env.NODE_ENV === 'development' ? error.message : undefined });
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


