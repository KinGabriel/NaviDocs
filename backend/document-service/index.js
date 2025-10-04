import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { dbConnection } from "./config/db.js";
import documentRoutes from "./routes/documentRoutes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8003;
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
//  document routes
app.use('/api/documents', documentRoutes);

dbConnection();
app.listen(PORT, HOST, () => console.log(`User Service running on port ${PORT}`));


