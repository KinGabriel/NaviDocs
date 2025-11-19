import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

export const dbConnection = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Database connection established successfully");
  } catch (err) {
    console.error("Database connection error:", err.message);
    process.exit(1);
  }
};
