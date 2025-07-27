import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fileRoutes from './routes/fileRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3004;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Routes
app.use('/api/files', fileRoutes);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ 
    message: 'File Service is healthy',
    port: PORT,
    uptime: process.uptime(),
    uploadsPath: path.join(process.cwd(), 'uploads')
  });
});

app.listen(PORT, () => {
  console.log(`File Service running on port ${PORT}`);
});