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
    const deptHead = await User.countDocuments({ "role.name": "Department Head"});
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