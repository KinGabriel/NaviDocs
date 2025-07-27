import User from "../models/userModel.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import axios from "axios";
import { generatePassword } from "../utils/passwordGenerator.js";

/**
 * @desc Register a new user
 * @route GET /api/admin/get-users
 * @access Public
 */ 
export const getUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password");
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}
/**
 * @desc Register a new user
 * @route POST /api/admin/create-user
 * @access Public
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

    // Handle uploaded file
    let profile_picture = null;
    if (req.file) {
      profile_picture = `/uploads/${req.file.filename}`;
    }

    // Create user
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
      
      console.log(`User created and welcome email sent to ${email}`);
      
      res.status(201).json({ 
        message: "User created successfully and welcome email sent",
        user: {
          id: user._id,
          email: user.email,
          firstname: user.firstname,
          lastname: user.lastname,
          role: {
        name: role.name , 

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
 * @access Public
 */
export const getDashboardInfo = async (req, res) => {
  try {
    const total = await User.countDocuments();
    const dean = await User.countDocuments({ "role.name": "Dean" });
    const deptHead = await User.countDocuments({ "role.name": "Department Head"});
    const faculty = await User.countDocuments({ "role.name": "Faculty" });

    //  5 most recently created users
    const recentUsers = await User.find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .select("email role.department role.school role.name createdAt");

    res.status(200).json({
      total,
      dean,
      deptHead,
      faculty,
      recentUsers
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};