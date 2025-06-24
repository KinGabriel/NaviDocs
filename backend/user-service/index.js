import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { dbConnection } from "./config/db.js";
import userRoutes from "./routes/userRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import path from "path";
import { fileURLToPath } from "url";
dotenv.config();



const app = express();
const PORT = process.env.PORT || 4001;

app.use(cors());
app.use(express.json());

// Serve static files from the uploads directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// all user functionality
app.use("/api/users", userRoutes);

// admin functionality
app.use("/api/admin", adminRoutes);

dbConnection();
app.listen(PORT, () => console.log(`User Service running on port ${PORT}`));


