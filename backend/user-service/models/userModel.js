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
    enum: ["Dean", "Faculty", "Document Controller","Admin", "Secretary","Department Head"]
  },
  school: String,
  department: String
  },
  is_deleted: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });



export default mongoose.model("User", userSchema);
