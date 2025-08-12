import User from "../models/userModel.js";

/**
 * @desc Get approvers (Secretary & Dean) filtered by school
 * @route GET /api/doc-controller/approvers?school=SchoolName
 * @access Private ( Document Controller)
 */
export const getApprovers = async (req, res) => {
  try {
    const { school } = req.query;
    const query = { "role.name": { $in: ["Secretary", "Dean"] } };
    if (school && school !== 'All') {
      query["role.school"] = school;
    }
    const approvers = await User.find(query)
      .select("firstname lastname email role.school")
      .sort({ "role.name": 1, lastname: 1 });
    res.status(200).json({ success: true, approvers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export default { getApprovers };
