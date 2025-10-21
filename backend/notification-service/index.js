// backend/notification-service/index.js

import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import { dbConnection } from "./config/db.js"; 
import notificationRoutes from "./routes/notificationRoutes.js"; 

dotenv.config();

const app = express();
// Using a specific environment variable for the port
const PORT = process.env.NOTIFICATION_PORT || 8008; 
const HOST = process.env.HOST || "127.0.0.1";

// Middleware
app.use(express.json());
app.use(cookieParser());

// Routes
// Note: The /api/notifications prefix should ideally be handled by the Gateway, 
// but is added here for testing/development.
app.use("/api/notifications", notificationRoutes); 

// Connect to DB and start server
dbConnection(); 
// Diagnostic: log whether INTERNAL_TOKEN is present in env (do not print the token value)
console.log('INTERNAL_TOKEN present in env:', !!process.env.INTERNAL_TOKEN);

app.listen(PORT, HOST, () => 
    console.log(`Notification Service running on port ${PORT}`)
);