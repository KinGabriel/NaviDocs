import express from "express";
import dotenv from "dotenv";
// cors handled centrally by the gateway
import cookieParser from "cookie-parser";
import { dbConnection } from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4001;
const HOST = process.env.HOST || "127.0.0.1";


app.use(express.json());
app.use(cookieParser());

// Serve static files from the uploads directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// all auth functionality
app.use("/api/auth", authRoutes);

dbConnection();

app.listen(PORT, HOST, () => {
  console.log(`Auth Service running at http://${HOST}:${PORT}`);
});
