import User from "../models/userModel.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import axios from "axios";
import FormData from "form-data";


/**
 * Get user email by user ID
 * @route POST /api/user/getUserEmail/:id
 * @access Private
 */

export const getUserEmail = async (req, res) => {
  try {
    const userId = req.params.id; // Extract user ID from request parameters
    const user = await User.findById(userId).select("email");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json({ email: user.email });
  } catch (error) {
    console.error("Error fetching user email:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * Convert email to user ID
 * @route GET /api/user/getUserIdByEmail/:email
 * @access Private
 */
export const getUserIdByEmail = async (req, res) => {
  try {
    const email = req.params.email; // Extract email from request parameters
    const user = await User.findOne({ email }).select("_id");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json({ userId: user._id });
  } catch (error) {
    console.error("Error fetching user ID by email:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
/**
 * Get basic user info (firstname and lastname) by user ID
 * @route GET /api/users/getUserInfo/:id
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
 * Get user profile by user ID (email, name, role, profile_picture)
 * @route GET /api/user/:id
 * @access Private
 */
export const getUserProfile = async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId).select('_id email firstname lastname role profile_picture');
    if (!user) return res.status(404).json({ message: 'User not found' });

    const firstname = user.firstname || '';
    const lastname = user.lastname || '';
    const name = `${firstname} ${lastname}`.trim() || user.email?.split('@')[0] || '';

    // Normalize role to either string or { name }
    let role = null;
    if (user.role) {
      if (typeof user.role === 'string') role = user.role;
      else if (typeof user.role === 'object' && user.role.name) role = user.role.name;
    }

    return res.json({ id: user._id, email: user.email, firstname, lastname, name, role, profile_picture: user.profile_picture });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Search users by email substring (for autocomplete suggestions)
 * @route GET /api/user/searchByEmail?query=xxx
 * @access Private
 */
export const searchUsersByEmail = async (req, res) => {
  try {
    const query = req.query.query;
    if (!query || query.length < 2) {
      return res.status(400).json({ message: "Query too short" });
    }
    // Find users whose email contains the query (case-insensitive)
    // Include firstname and lastname so the client can display a friendly name
    const users = await User.find({ email: { $regex: query, $options: "i" } })
      .select("_id email firstname lastname")
      .limit(10);
    res.json({ users: users.map(u => ({ userId: u._id, email: u.email, firstname: u.firstname || '', lastname: u.lastname || '', name: `${(u.firstname || '').trim()} ${(u.lastname || '').trim()}`.trim() })) });
  } catch (error) {
    console.error("Error searching users by email:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
/**
 * Update a user's password by user ID.
 * @route PATCH /api/user/updatePassword/:id
 * @access Private
 * @param {Object} req - Express request object (expects params.id and body.newPassword)
 * @param {Object} res - Express response object
 * @returns {Object} 200 - Success | 400/404/500 - Error message
 */
export const updateUserPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    if (!user.password) {
      return res.status(400).json({ message: "User does not have a password set." });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Password is incorrect" });
    }

    // Prevent reusing the same password
    const isSame = await bcrypt.compare(newPassword, user.password);
    if (isSame) {
      return res.status(400).json({ message: "New password must be different from the old password" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    res.status(200).json({ message: "Password updated successfully." });
  } catch (error) {
    console.error("Error updating user password:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * Update a user's account settings (firstname, lastname) by user ID.
 * @route PATCH /api/user/updateAccountSettings/:id
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

    // Handle profile picture upload via File Service
    let profile_picture = null;
    if (req.file) {
      try {
        console.log("Uploading profile picture to File Service...");

        // Save previous profile picture path
        const prevProfilePic = user.profile_picture;
        console.log("Previous profile picture:", prevProfilePic);
        // Create FormData for File Service
        const formData = new FormData();
        formData.append('profile_picture', req.file.buffer, {
          filename: req.file.originalname,
          contentType: req.file.mimetype
        });
        // Use email prefix as user ID (if available)
        const email = user.email || '';
        formData.append('userId', email.split('@')[0]);

        // Upload to File Service
        const fileResponse = await axios.post(
          `${process.env.FILE_SERVICE_URL}/api/files/upload/profile`,
          formData,
          {
            headers: {
              ...formData.getHeaders(),
            },
            timeout: 15000
          }
        );

        profile_picture = fileResponse.data.filePath;
        user.profile_picture = profile_picture;

        // Delete previous profile picture from File Service if it exists and is not default
        if (prevProfilePic && !prevProfilePic.includes('default')) {
          try {
            await axios.delete(
              `${process.env.FILE_SERVICE_URL}/api/files/delete`,
              {
                data: { filePath: prevProfilePic },
                timeout: 10000
              }
            );
          } catch (deleteErr) {
            console.warn("Failed to delete previous profile picture from File Service:", deleteErr.message);
          }
        }
      } catch (err) {
        console.error("Failed to upload profile picture to File Service:", err.message);
        return res.status(500).json({ message: "Failed to upload profile picture." });
      }
    }

    await user.save();

  // Query the user again to get only the latest profile_picture from DB
  const updatedUser = await User.findById(user._id).select("profile_picture");
  res.status(200).json({ message: "Account settings updated successfully.", profile_picture: updatedUser.profile_picture });
  } catch (error) {
    console.error("Error updating user account settings:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * Get both Document Controllers and Secretaries for the user's school
 * @route GET /api/user/schoolStaff
 * @access Private
 */
export const getSchoolStaff = async (req, res) => {
  try {
    const school = req.user?.role?.school;
    if (!school) {
      return res.status(400).json({ message: "School not found in user role." });
    }
    const [docControllers, secretaries, deans] = await Promise.all([
      User.find({ "role.name": "Document Controller", "role.school": school, is_deleted: false }).select('_id firstname lastname'),
      User.find({ "role.name": { $in: ["secretary", "Secretary"] }, "role.school": school, is_deleted: false }).select('_id firstname lastname'),
      User.find({ "role.name": { $in: ["dean", "Dean"] }, "role.school": school, is_deleted: false }).select('_id firstname lastname')
    ]);
    console.log(docControllers, secretaries, deans);
    // Map to return only id and name (combine firstname and lastname)
    const mapUser = u => ({ id: u._id, name: `${u.firstname} ${u.lastname}`.trim() });
    res.json({
      docControllers: docControllers.map(mapUser),
      secretaries: secretaries.map(mapUser),
      deans: deans.map(mapUser)
    });
  } catch (error) {
    console.error("Error fetching school staff:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * Batch get user info for multiple ids
 * @route POST /api/user/getUsersInfo
 * @access Private
 * body: { ids: [id1, id2, ...] }
 */
export const getUsersInfoByBatch = async (req, res) => {
  try {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];
    if (!ids.length) return res.json({ users: [] });
    const users = await User.find({ _id: { $in: ids } }).select('_id email firstname lastname');
    const mapped = users.map(u => ({ userId: u._id, email: u.email, firstname: u.firstname || '', lastname: u.lastname || '', name: `${(u.firstname || '').trim()} ${(u.lastname || '').trim()}`.trim() }));
    return res.json({ users: mapped });
  } catch (error) {
    console.error('Error in getUsersInfo', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
