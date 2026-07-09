import express from "express";
import cors from "cors";
import { clerkMiddleware } from "@clerk/express";
import connectDB from './lib/db.js';
import {errorHandler} from './middlewares/errorHandler.middleware.js'


import dotenv from "dotenv";
dotenv.config();


const PORT = process.env.PORT;
const FRONTEND_URL = process.env.FRONTEND_URL;

const app = express();

app.use(express.json());
app.use(cors({
    origin: FRONTEND_URL,
    credentials: true,
}));
app.use(clerkMiddleware());



// Routes






app.use(errorHandler); // Use the error handler middleware

const startServer = async () => {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

startServer();

