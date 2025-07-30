import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mailRoutes from './routes/mailRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3005;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/email', mailRoutes);


app.listen(PORT, () => {
  console.log(`Email Service running on port ${PORT}`);
});