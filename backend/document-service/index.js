import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import { dbConnection } from './config/db.js';
import documentRoutes from './routes/documentRoutes.js';
import submissionBinRoutes from './routes/submissionBinRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8003;
const HOST = process.env.HOST || "0.0.0.0";

// CORS is handled by the gateway; backend services assume requests come through the gateway
// Increase JSON/body size limits to allow large HTML payloads when the frontend sends full document HTML for PDF rendering.
// Default express.json limit is small; set to 10mb here. Adjust via env PDF_BODY_LIMIT if needed.
const jsonLimit = process.env.PDF_BODY_LIMIT || '10mb';
app.use(express.json({ limit: jsonLimit }));
app.use(express.urlencoded({ extended: true, limit: jsonLimit }));
app.use(cookieParser());


app.use('/api/documents/submission-bins', submissionBinRoutes); 

// document routes
app.use('/api/documents', documentRoutes);
app.use('/api/documents/submission-bins', submissionBinRoutes); 
dbConnection();
app.listen(PORT, HOST, () => console.log(`Document Service running on port ${PORT}`));


