import express from 'express';
import dotenv from 'dotenv';
import mailRoutes from './routes/mailRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3005;
const HOST = process.env.HOST || "127.0.0.1";

app.use(express.json());

// Routes
app.use('/api/email', mailRoutes);


app.listen(PORT, HOST, () => {
  console.log(`Email Service running on port ${PORT}`);
});