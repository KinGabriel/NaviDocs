import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import { dbConnection } from "./config/db.js";
import adminRoutes from "./routes/adminRoutes.js";
import docControllerRoutes from "./routes/docControllerRoutes.js";
import path from "path";
import { fileURLToPath } from "url";
dotenv.config();



const app = express();
const PORT = process.env.PORT || 4001;

app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Serve static files from the uploads directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


// admin functionality
app.use("/api/admin", adminRoutes);
app.use("/api/doc-controller", docControllerRoutes);

dbConnection();
app.listen(PORT, () => console.log(`User Service running on port ${PORT}`));


