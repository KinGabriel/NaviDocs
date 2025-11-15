import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import { dbConnection } from "./config/db.js";
import templateRoutes from "./routes/templateRoutes.js";
import fieldGroupDefinitionRoutes from "./routes/fieldGroupDefinitionRoutes.js";
import tagRoutes from "./routes/tagRoutes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8002;
const HOST = process.env.HOST || "0.0.0.0";
// CORS is handled by the gateway; backend services should not set CORS headers.

const bodyLimit = process.env.TEMPLATE_SERVICE_BODY_LIMIT || '10mb';
app.use(express.json({ limit: bodyLimit }));
app.use(express.urlencoded({ limit: bodyLimit, extended: true }));
app.use(cookieParser());

// Mount specific routes BEFORE generic /api/templates to avoid :id capturing 'field-groups'
app.use("/api/templates/field-groups", fieldGroupDefinitionRoutes);
app.use("/api/templates/tags", tagRoutes);
// Templates routes (generic)
app.use("/api/templates", templateRoutes);

dbConnection();
app.listen(PORT, HOST, () => console.log(`Template Service running on port ${PORT}`));


