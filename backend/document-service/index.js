import express from "express";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4001;

app.use(cors());
app.use(express.json());

dbConnection();
app.listen(PORT, () => console.log(`User Service running on port ${PORT}`));


