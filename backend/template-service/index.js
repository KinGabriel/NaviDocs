import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import { dbConnection } from "./config/db.js";
import templateRoutes from "./routes/templateRoutes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8002;

app.use(cors({
  origin: process.env.FRONTEND_URL, 
  credentials: true              
}));

app.use(express.json());
app.use(cookieParser());

// Templates routes
app.use("/api/templates", templateRoutes);

dbConnection();
app.listen(PORT, () => console.log(`Template Service running on port ${PORT}`));


