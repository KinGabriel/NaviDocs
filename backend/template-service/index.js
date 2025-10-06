import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import { dbConnection } from "./config/db.js";
import templateRoutes from "./routes/templateRoutes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8002;
const HOST = process.env.HOST || "127.0.0.1";
// CORS is handled by the gateway; backend services should not set CORS headers.

app.use(express.json());
app.use(cookieParser());

// Templates routes
app.use("/api/templates", templateRoutes);

dbConnection();
app.listen(PORT, HOST, () => console.log(`Template Service running on port ${PORT}`));


