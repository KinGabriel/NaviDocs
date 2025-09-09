import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import cookieParser from 'cookie-parser';
import { dbConnection } from "./config/db.js";
import fileRoutes from './routes/fileRoutes.js';
import storageRoutes from './routes/storageRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3004;
const HOST = process.env.HOST || "127.0.0.1";
// Middleware
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

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Routes
app.use('/api/files', fileRoutes);
app.use('/api/storage', storageRoutes);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ 
    message: 'File Service is healthy',
    port: PORT,
    uptime: process.uptime(),
    uploadsPath: path.join(process.cwd(), 'uploads')
  });
});
dbConnection();
app.listen(PORT, HOST, () => {
  console.log(`File Service running on port ${PORT}`);
});