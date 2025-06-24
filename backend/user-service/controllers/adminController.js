import User from "../models/userModel.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

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
 * @route POST /api/admin/crete-user
 * @access Public
 */
export const createUser = async (req, res) => {
  try {
    let { email,  firstname, lastname, role, school, department } = req.body;

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

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }


    const hashedPassword = await bcrypt.hash('123456', 10); // fix password generator

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
      role,
      school,
      department
    });

    await user.save();
    res.status(201).json({ message: "User created successfully" });
  } catch (error) {
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