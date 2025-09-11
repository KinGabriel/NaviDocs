import User from "../models/userModel.js";

/**
 * @desc Get approvers (Secretary & Dean) filtered by school
 * @route GET /api/doc-controller/approvers?school=SchoolName
 * @access Private ( Document Controller)
 */
export const getApprovers = async (req, res) => {
  try {
    console.log("Fetching approvers for school:", req.query.school || req.user?.role?.school || 'All');
      const school = req.user?.role?.school;
    const roles = ["Secretary", "Dean"];
    const approvers = [];
    for (const role of roles) {
        const query = { "role.name": role, "role.school": school };
        const user = await User.findOne(query)
        .select("firstname lastname email role.school role.name createdAt")
        .sort({ createdAt: -1 }); 
      if (user) approvers.push(user);
    }
    console.log(approvers);
    res.status(200).json({ success: true, approvers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export default { getApprovers };
