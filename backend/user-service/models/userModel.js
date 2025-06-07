import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  firstname: {
    type: String,
    required: true
  },
  lastname: {
    type: String,
    required: true
  },
  profile_picture: {
    type: String
  },
  role: {
    name: {
    type: String,
    required: true,
    enum: ["Dean", "Faculty", "Document Controller"]
  },
  school: String,       
  department: String   
  }
}, { timestamps: true });



export default mongoose.model("User", userSchema);
