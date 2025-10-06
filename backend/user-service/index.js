import express from "express";
import dotenv from "dotenv";
// cors handled centrally by the gateway
import cookieParser from "cookie-parser";
import { dbConnection } from "./config/db.js";
import adminRoutes from "./routes/adminRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import docControllerRoutes from "./routes/docControllerRoutes.js";
import path from "path";
import { fileURLToPath } from "url";
dotenv.config();



const app = express();
const PORT = process.env.PORT || 4001;
const HOST = process.env.HOST || "127.0.0.1";
// CORS is handled by the gateway; backend services assume requests come through the gateway
app.use(express.json());
app.use(cookieParser());

// Serve static files from the uploads directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


// admin functionality
app.use("/api/admin", adminRoutes);
// doc controller functionality
app.use("/api/doc-controller", docControllerRoutes);
// basic functionalities
app.use("/api/user", userRoutes);

dbConnection();
app.listen(PORT, HOST, () => console.log(`User Service running on port ${PORT}`));


