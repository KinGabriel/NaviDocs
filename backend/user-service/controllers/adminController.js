
import User from "../models/userModel.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import axios from "axios";
import FormData from "form-data";
import { generatePassword } from "../utils/passwordGenerator.js";

/**
 * @desc Get all users
 * @route GET /api/admin/get-users
 * @access Private (Admin only)
 */
export const getUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password");
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


/**
 * @desc Create a new user with File Service integration
 * @route POST /api/admin/create-user
 * @access Private (Admin only)
 */
export const createUser = async (req, res) => {
  try {
    let { email, firstname, lastname, role, school, department } = req.body;
    console.log("Received data:", { email, firstname, lastname, role, school, department });
    // Parse role if it's a JSON string
    if (typeof role === "string") {
      try {
        role = JSON.parse(role);
      } catch {
        role = {
          name: role,
          school: school || null,
          department: department || null
        };
      }
    }
    console.log("Parsed role:", role);

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Generate secure password
    const generatedPassword = generatePassword(12, true);
    const hashedPassword = await bcrypt.hash(generatedPassword, 10);

    // Handle profile picture upload via File Service
    let profile_picture = null;
    if (req.file) {
      try {
        console.log("Uploading profile picture to File Service...");

        // Create FormData for File Service
        const formData = new FormData();
        formData.append('profile_picture', req.file.buffer, {
          filename: req.file.originalname,
          contentType: req.file.mimetype
        });
        formData.append('userId', email.split('@')[0]); // Use email prefix as user ID

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
        console.log("Profile picture uploaded:", profile_picture);

      } catch (fileError) {
        console.error("File upload failed:", fileError.message);
        console.log("Continuing user creation without profile picture");
      }
    }

    // Create user object
    const user = new User({
      email,
      password: hashedPassword,
      firstname,
      lastname,
      profile_picture,
      role: {
        name: role.name,
        school: role.school || null,
        department: role.department || null
      }
    });

    await user.save();


    // Send welcome email via Email Service
    try {
      await axios.post(`${process.env.EMAIL_SERVICE_URL}/api/email/send-welcome`, {
        email,
        firstname,
        lastname,
        password: generatedPassword,
        role: {
          name: role.name,
          school: role.school || null,
          department: role.department || null
        }
      });



      res.status(201).json({
        message: "User created successfully and welcome email sent",
        user: {
          id: user._id,
          email: user.email,
          firstname: user.firstname,
          lastname: user.lastname,
          profile_picture: user.profile_picture,
          role: {
            name: role.name,
            school: role.school,
            department: role.department
          }
        }
      });

    } catch (emailError) {
      console.error('User created but email failed:', emailError.message);

      res.status(201).json({
        message: "User created successfully, but welcome email failed",
        warning: "Please manually provide login credentials to the user",
        user: {
          id: user._id,
          email: user.email,
          firstname: user.firstname,
          lastname: user.lastname,
          profile_picture: user.profile_picture,
          role: user.role
        }
      });
    }

  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ message: error.message });
  }
};
/**
 * @desc Get dashboard information
 * @route GET /api/admin/dashboard-info
 * @access Private (Admin only)
 */
export const getDashboardInfo = async (req, res) => {
  try {
    const total = await User.countDocuments();
    const dean = await User.countDocuments({ "role.name": "Dean" });
    const deptHead = await User.countDocuments({ "role.name": "Department Head" });
    const faculty = await User.countDocuments({ "role.name": "Faculty" });
    console.log('Backend sees cookies:', req.headers.cookie);
    // Get 5 most recently created users
    const recentUsers = await User.find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .select("email firstname lastname profile_picture role.department role.school role.name createdAt");
    console.log("Dashboard info retrieved successfully");

    res.status(200).json({
      total,
      dean,
      deptHead,
      faculty,
      recentUsers
    });
  } catch (error) {
    console.error('Error fetching dashboard info:', error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc Archive a user
 * @route PUT /api/admin/archive-user/:id
 * @access Private (Admin only)
 */
export const archiveUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Find user by ID and update isDeleted flag
    const user = await User.findByIdAndUpdate(
      id,
      { is_deleted: true },
      { new: true }
    );
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ message: "User archived successfully", user });
  } catch (error) {
    console.error('Error archiving user:', error);
    res.status(500).json({ message: error.message });
  }
};

/*
 * @desc Unarchive a user
 * @route PATCH /api/admin/unarchive-user/:id
 * @access Private (Admin only)
 */
export const unarchiveUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Find user by ID and update isDeleted flag
    const user = await User.findByIdAndUpdate(
      id,
      { is_deleted: false },
      { new: true }
    );
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ message: "User unarchived successfully", user });
  } catch (error) {
    console.error('Error unarchiving user:', error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc Get a single user by ID
 * @route GET /api/admin/get-user/:id
 * @access Private (Admin only)
 */
export const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
/**
* @desc Edit a user with optional profile picture update
* @route PATCH /api/admin/edit-user/:id
* @access Private (Admin only)
 */
export const editUser = async (req, res) => {
  try {
    const userId = req.params.id;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    let { firstname, lastname, email, role, school, department } = req.body;

    if (typeof role === "string") {
      try {
        role = JSON.parse(role);
      } catch {
        role = { name: role, school: school || null, department: department || null };
      }
    }

    const updateData = {
      firstname,
      lastname,
      email,
      role: {
        name: role?.name || user.role.name,
        school: school || role?.school || user.role.school,
        department: department || role?.department || user.role.department,
      },
    };

    // Handle profile picture upload (if provided)
    if (req.file) {
      try {
        const prevProfilePic = user.profile_picture;

        const formData = new FormData();
        formData.append('profile_picture', req.file.buffer, {
          filename: req.file.originalname,
          contentType: req.file.mimetype,
        });
        formData.append('userId', email.split('@')[0] || user.email.split('@')[0]);

        const fileResponse = await axios.post(
          `${process.env.FILE_SERVICE_URL}/api/files/upload/profile`,
          formData,
          { headers: formData.getHeaders(), timeout: 15000 }
        );

        updateData.profile_picture = fileResponse.data.filePath;

        // Delete old profile picture if exists
        if (prevProfilePic && !prevProfilePic.includes('default')) {
          try {
            await axios.delete(
              `${process.env.FILE_SERVICE_URL}/api/files/delete`,
              { data: { filePath: prevProfilePic }, timeout: 10000 }
            );
          } catch (deleteErr) {
            console.warn("Failed to delete previous profile picture:", deleteErr.message);
          }
        }
      } catch (err) {
        console.error("Profile picture upload failed:", err.message);
        return res.status(500).json({ message: "Failed to upload profile picture." });
      }
    }

    // Save updated user
    const updatedUser = await User.findByIdAndUpdate(userId, updateData, { new: true });
    res.status(200).json({ message: "User updated successfully", user: updatedUser });

  } catch (error) {
    console.error("Error editing user:", error);
    res.status(500).json({ message: "Server error", error });
  }
};

/**
 * @desc Reset a user's password and send them a new one via Email Service
 * @route PATCH /api/admin/reset-user-password/:id
 * @access Private (Admin only)
 */
export const resetUserPassword = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const generatedPassword = generatePassword(12, true); 
    const hashedPassword = await bcrypt.hash(generatedPassword, 10);

    user.password = hashedPassword;
    await user.save();

    try {
      await axios.post(
        `${process.env.EMAIL_SERVICE_URL}/api/email/send-reset-password`,
        {
          email: user.email,
          firstname: user.firstname,
          lastname: user.lastname,
          password: generatedPassword,
          role: user.role,
        },
        { timeout: 10000 }
      );

      return res.status(200).json({
        message: "Password reset successfully and email sent",
        user: {
          id: user._id,
          email: user.email,
          firstname: user.firstname,
          lastname: user.lastname,
          profile_picture: user.profile_picture,
          role: user.role,
        },
      });
    } catch (emailError) {
      console.error("Password reset but email failed:", emailError?.message || emailError);

      return res.status(200).json({
        message: "Password reset successfully, but email sending failed",
        warning: "Please manually provide the new password to the user.",
        user: {
          id: user._id,
          email: user.email,
          firstname: user.firstname,
          lastname: user.lastname,
          profile_picture: user.profile_picture,
          role: user.role,
        },
      });
    }
  } catch (error) {
    console.error("Error resetting user password:", error);
    return res.status(500).json({
      message: "Server error while resetting password.",
      error: error.message,
    });
  }
};