import cookieParser from "cookie-parser";
import express, {
  type Application,
  type Request,
  type Response,
} from "express";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import cors from "cors";
import { logger } from "./utils/logger.ts";

// Load environment variables from .env file
dotenv.config();

// Fail-closed startup validation for required environment variables
const requiredEnvVars = ["JWT_SECRET", "MONGO_URL"];
const missingEnvVars = requiredEnvVars.filter((key) => !process.env[key]);

if (missingEnvVars.length > 0) {
  logger.error(
    `FATAL CONFIGURATION ERROR: Missing required environment variable(s): ${missingEnvVars.join(
      ", "
    )}`,
    "SERVER_BOOT"
  );
  process.exit(1);
}

import { connectDB } from "./config/db.ts";
import userRoutes from "./routes/user.ts";
import LogsRouter from "./routes/activitieslog.ts";
import academicYearRouter from "./routes/academicYear.ts";
import classRouter from "./routes/class.ts";
import subjectRouter from "./routes/subject.ts";
import { serve } from "inngest/express";
import { inngest } from "./inngest/index.ts";
import {
  generateExam,
  handleExamSubmission,
} from "./inngest/functions.ts";
import timeRouter from "./routes/timetable.ts";
import examRouter from "./routes/exam.ts";
import dashboardRouter from "./routes/dashboard.ts";
import attendanceRouter from "./routes/attendance.ts";
import announcementRouter from "./routes/announcement.ts";
import reportRouter from "./routes/report.ts";
import exportRouter from "./routes/export.ts";
import uploadRouter from "./routes/upload.ts";
import emailRouter from "./routes/email.ts";
import { initCronJobs, stopCronJobs } from "./utils/cronJobs.ts";
import { sanitizeMiddleware } from "./middleware/sanitize.ts";
import path from "path";
import fs from "fs";

const app: Application = express();
const PORT = Number(process.env.PORT) || 5000;
const HOST = "0.0.0.0";

// Trust reverse proxies (Render, Railway, Heroku, Nginx, AWS ALB, Cloudflare)
app.set("trust proxy", 1);

// Disable ETags to prevent 304 Not Modified responses and always return fresh 200 OK
app.set("etag", false);

// 1. Instant Orchestrator Healthcheck Routes (Mounted FIRST for 0ms response time on Render/AWS/Docker)
const healthHandler = (_req: Request, res: Response) => {
  res.status(200).json({
    status: "healthy",
    service: "SchoolSync API",
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
  });
};

app.get("/", healthHandler);
app.get("/health", healthHandler);
app.get("/api/health", healthHandler);

// Ensure static upload directories exist on server startup
const uploadsDir = path.join(process.cwd(), "uploads");
const avatarsDir = path.join(uploadsDir, "avatars");
if (!fs.existsSync(avatarsDir)) {
  fs.mkdirSync(avatarsDir, { recursive: true });
}

// Security & Parsing Middlewares
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }, // Allow frontend to fetch avatar images
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(sanitizeMiddleware); // NoSQL injection protection

// Serve static uploaded assets
app.use("/uploads", express.static(uploadsDir));

// Disable caching on all API responses
app.use((req, res, next) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
  next();
});

// Request logging in development
if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
}

import { getAllowedOrigins, isOriginAllowed } from "./utils/cors.ts";
export { getAllowedOrigins, isOriginAllowed };

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    if (isOriginAllowed(origin)) {
      callback(null, true);
    } else {
      logger.warn(`CORS blocked origin: ${origin}`, "CORS");
      callback(null, false);
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"],
  exposedHeaders: ["Set-Cookie"],
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));

// Mount Routes
app.use("/api/users", userRoutes);
app.use("/api/activities", LogsRouter);
app.use("/api/academic-years", academicYearRouter);
app.use("/api/classes", classRouter);
app.use("/api/subjects", subjectRouter);
app.use("/api/timetables", timeRouter);
app.use("/api/exams", examRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/attendance", attendanceRouter);
app.use("/api/announcements", announcementRouter);
app.use("/api/reports", reportRouter);
app.use("/api/export", exportRouter);
app.use("/api/upload", uploadRouter);
app.use("/api/email", emailRouter);

// Inngest background event endpoint
app.use(
  "/api/inngest",
  serve({
    client: inngest,
    functions: [generateExam, handleExamSubmission],
  })
);

// Global Error Handler Middleware (Sanitized in production)
app.use((err: Error, req: Request, res: Response, next: Function) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode);
  res.json({
    message: process.env.NODE_ENV === "production" ? "An internal server error occurred." : err.message,
    stack: process.env.NODE_ENV === "production" ? null : err.stack,
  });
});

import mongoose from "mongoose";
import { seedDefaultData } from "./config/seedDefaultData.ts";
import { EmailService } from "./services/emailService.ts";

// 1. Immediately bind HTTP port to 0.0.0.0 so cloud orchestrators (Render, AWS, Railway) detect healthy port in <100ms
const server = app.listen(PORT, HOST, () => {
  logger.success(`SchoolSync server listening on http://${HOST}:${PORT}`, "SERVER");
});

// Graceful Process Termination Handlers
const gracefulShutdown = async (signal: string) => {
  logger.info(`[${signal}] Initiating graceful shutdown...`, "SERVER");
  stopCronJobs();
  server.close(async () => {
    logger.info("HTTP server closed.", "SERVER");
    try {
      await mongoose.disconnect();
      logger.success("MongoDB connection safely closed.", "DATABASE");
      process.exit(0);
    } catch (err: any) {
      logger.error(`Error while closing MongoDB connection: ${err.message}`, "DATABASE", err);
      process.exit(1);
    }
  });

  // Force exit if shutdown hangs beyond 10 seconds
  setTimeout(() => {
    logger.error("Graceful shutdown timed out. Forcing process exit.", "SERVER");
    process.exit(1);
  }, 10000).unref();
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// 2. Connect to MongoDB and perform initialization tasks
connectDB()
  .then(async () => {
    if (process.env.RESET_DB === "true") {
      const { cleanAndSeedDatabase } = await import("./scripts/cleanDb.ts");
      await cleanAndSeedDatabase();
    } else {
      const isProduction = process.env.NODE_ENV === "production";
      const shouldSeed =
        process.env.SEED_DEFAULT_DATA === "true" ||
        (!isProduction && process.env.SEED_ON_STARTUP !== "false");

      if (shouldSeed) {
        try {
          await seedDefaultData();
        } catch (error: any) {
          logger.error(`Database seeding error: ${error.message}`, "SEEDING", error);
        }
      }
    }

    // 3. Non-blocking email service health check & cron scheduler initialization
    EmailService.verifyConnection().catch((err: any) => {
      logger.warn(`Email service verification error: ${err.message}`, "EMAIL");
    });
    initCronJobs();
  })
  .catch((err) => {
    logger.error(`Database initialization error: ${err.message}`, "SERVER", err);
  });
