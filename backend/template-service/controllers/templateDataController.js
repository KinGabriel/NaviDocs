import Template from "../models/templateModel.js";

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


