import User from "../models/userModel.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import axios from "axios";
import FormData from "form-data";

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
