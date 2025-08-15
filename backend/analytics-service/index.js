import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import analyticsRoutes from './routes/analyticsRoutes.js';

dotenv.config();
const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true
}));
app.use(express.json());

app.use('/api/analytics', analyticsRoutes);

const PORT = process.env.PORT || 4007;
app.listen(PORT, () => console.log(`Analytics service running on port ${PORT}`));
