import User from "../models/userModel.js";

/**
 * @desc Get secretaries filtered by school
 * @route GET /api/secretaries?school=SchoolName    
 *  
 */
export const getSecretariesPerSchool = async (req, res) => {
  try {
    const school = req.user?.role?.school;
    const secretaries = await User.find({ "role.name": "secretary", "role.school": school, is_deleted: false });
    res.json({ secretaries });
  } catch (error) {
    console.error("Error fetching secretaries:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

