import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import cookieParser from 'cookie-parser';
import { dbConnection } from "./config/db.js";
import fileRoutes from './routes/fileRoutes.js';
import storageRoutes from './routes/storageRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3004;
const HOST = process.env.HOST || "0.0.0.0";

// CORS middleware for static files
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Middleware
app.use(express.json());
app.use(cookieParser());

// Serve static files from uploads directory with proper headers
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads'), {
  setHeaders: (res, filePath) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    res.set('Cache-Control', 'public, max-age=31536000');
  }
}));

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