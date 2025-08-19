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

/**
 * Update a user's password by user ID.
 * @route PUT /api/user/updatePassword/:id
 * @access Private
 * @param {Object} req - Express request object (expects params.id and body.newPassword)
 * @param {Object} res - Express response object
 * @returns {Object} 200 - Success | 400/404/500 - Error message
 */
export const updateUserPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({ message: "New password is required" });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.password === newPassword) {
      return res.status(400).json({ message: "New password must be different from the old password" });
    }

    user.password = newPassword;
    await user.save();

    res.status(200);
  } catch (error) {
    console.error("Error updating user password:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * Update a user's account settings (firstname, lastname) by user ID.
 * @route PUT /api/user/updateAccountSettings/:id
 * @access Private
 * @param {Object} req - Express request object (expects params.id and body.firstname, body.lastname)
 * @param {Object} res - Express response object
 * @returns {Object} 200 - Success message | 404/500 - Error message
 */
export const updateUserAccountSettings = async (req, res) => {
  try {
    const { id } = req.params;
    const { firstname, lastname } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.firstname = firstname || user.firstname;
    user.lastname = lastname || user.lastname;

    await user.save();

    res.status(200);
  } catch (error) {
    console.error("Error updating user account settings:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
