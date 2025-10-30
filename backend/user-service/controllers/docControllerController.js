import User from "../models/userModel.js";

/**
 * @desc Get approvers (university-wide), based on approval workflow roles
 *       Always include Lead Document Controller and Document Control Officer.
 *       Include Unit Document Controller only when the requester is Faculty.
 * @route GET /api/doc-controller/approvers
 * @access Private (Any authenticated user)
 */
export const getApprovers = async (req, res) => {
  try {
    const requesterRole = String(req.user?.role?.name || '').trim();

    console.log("Fetching approvers:", {
      requesterRole,
      requesterId: req.user?.id || req.user?._id,
    });

    // Base approver roles for the workflow
    const approverRoles = [
      'Lead Document Controller',
      'Document Control Officer',
    ];

    // Unit Document Controller endorses first only when submission is initiated by Faculty
    if (requesterRole === 'Faculty') {
      approverRoles.push('Unit Document Controller');
    }

    // University-wide: return ALL users with the approver roles, no school filter
    const approvers = await User.find({ 'role.name': { $in: approverRoles } })
      .select('firstname lastname email role.school role.name createdAt')
      .sort({ 'role.name': 1, createdAt: -1 });

    return res.status(200).json({ success: true, approvers, rolesConsidered: approverRoles, scope: 'university' });
  } catch (error) {
    console.error('getApprovers error:', error?.message || error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to fetch approvers' });
  }
};

export default { getApprovers };
