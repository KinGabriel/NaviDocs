import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import { dbConnection } from "./config/db.js";
import templateRoutes from "./routes/templateRoutes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8002;
const HOST = process.env.HOST || "127.0.0.1";
const allowedOrigins = process.env.FRONTEND_URL.split(",");
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true
}));

app.use(express.json());
app.use(cookieParser());

// Templates routes
app.use("/api/templates", templateRoutes);

dbConnection();
app.listen(PORT, HOST, () => console.log(`Template Service running on port ${PORT}`));


