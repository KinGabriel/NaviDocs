import express from "express";
import dotenv from "dotenv";
// cors handled centrally by the gateway
import cookieParser from 'cookie-parser';
import { dbConnection } from "./config/db.js";
import documentRoutes from "./routes/documentRoutes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8003;
const HOST = process.env.HOST || "127.0.0.1";

// CORS is handled by the gateway; backend services assume requests come through the gateway
app.use(express.json());
app.use(cookieParser());
//  document routes
app.use('/api/documents', documentRoutes);

dbConnection();
app.listen(PORT, HOST, () => console.log(`User Service running on port ${PORT}`));


