import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { dbConnection } from "./config/db.js";
import userRoutes from "./routes/userRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
dotenv.config();

const app = express();
const PORT = process.env.PORT || 4001;

app.use(cors());
app.use(express.json());

// all user functionality
app.use("/api/users", userRoutes);

// admin functionality
app.use("/api/admin", adminRoutes);

dbConnection();
app.listen(PORT, () => console.log(`User Service running on port ${PORT}`));


