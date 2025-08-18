import User from "../models/userModel.js";

/**
 * Get basic user info (firstname and lastname) by user ID
 * @route GET /api/users/:id/basic-info
 * @access Private
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} 200 - { firstname, lastname } | 404 - { message } | 500 - { message }
 */
export const getUserBasicInfo = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("firstname lastname");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json({ firstname: user.firstname, lastname: user.lastname });
  } catch (error) {
    console.error("Error fetching user info:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};