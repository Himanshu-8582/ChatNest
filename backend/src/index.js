import express from "express";
import cors from "cors";
import { clerkMiddleware } from "@clerk/express";
import connectDB from './lib/db.js';
import { errorHandler } from './middlewares/errorHandler.middleware.js';
import clerkWebhook from './webhooks/clerk.webhook.js';
import path from "path";
import fs from "fs";


import dotenv from "dotenv";
import job from "./lib/cron.js";
dotenv.config();


const PORT = process.env.PORT;
const FRONTEND_URL = process.env.FRONTEND_URL;
const publicDir = path.join(process.cwd(), 'public');

const app = express();

// it's important that you don't parse the webhook event data, it should be in the raw format
app.use('/api/webhooks/clerk', express.raw({ type: "application/json" }), clerkWebhook);

app.use(express.json());
app.use(cors({
    origin: FRONTEND_URL,
    credentials: true,
}));
app.use(clerkMiddleware());

app.get("/health", (req, res) => {
  res.status(200).json({ ok: true });
});



// Routes


// if the public directory exists, serve the static files
// this is for the production build
if (fs.existsSync(publicDir)) {
  app.use(express.static(publicDir));

  app.get("/{*any}", (req, res, next) => {
    res.sendFile(path.join(publicDir, "index.html"), (err) => next(err));
  });
}

app.use(errorHandler); // Use the error handler middleware

const startServer = async () => {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      if (process.env.NODE_ENV === 'production') job.start();
    });
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

startServer();

