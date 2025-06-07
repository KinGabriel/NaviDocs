import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());


mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("Connected to User DB");
    app.listen(process.env.PORT, () => {
      console.log(`User service running on port ${process.env.PORT}`);
    });
  })
  .catch(err => console.error(err));


