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
import { sanitizeMiddleware } from "./middleware/sanitize.ts";
import path from "path";
import fs from "fs";

const app: Application = express();
const PORT = process.env.PORT || 5000;

// Trust reverse proxies (Render, Railway, Heroku, Nginx, AWS ALB, Cloudflare)
app.set("trust proxy", 1);

// Disable ETags to prevent 304 Not Modified responses and always return fresh 200 OK
app.set("etag", false);

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

// Cross-origin resource sharing (CORS) with cookie & authorization header support
const rawOrigins = process.env.CLIENT_URL || "http://localhost:5173,http://localhost:3000";
const allowedOrigins = rawOrigins
  .split(",")
  .map((origin) => origin.trim().replace(/\/$/, ""))
  .filter(Boolean);

export const isOriginAllowed = (origin?: string): boolean => {
  // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
  if (!origin) return true;
  const normalized = origin.replace(/\/$/, "");
  if (allowedOrigins.includes(normalized)) {
    return true;
  }
  // In development/test mode, allow loopback addresses
  if (
    process.env.NODE_ENV !== "production" &&
    /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(normalized)
  ) {
    return true;
  }
  return false;
};

app.use(
  cors({
    origin: (origin, callback) => {
      if (isOriginAllowed(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

// Standard & orchestrator health check endpoints
const healthHandler = (req: Request, res: Response) => {
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

import { seedDefaultData } from "./config/seedDefaultData.ts";
import { EmailService } from "./services/emailService.ts";

// Connect to MongoDB and start HTTP server
connectDB().then(async () => {
  // 1. Immediately bind HTTP port so cloud orchestrators (Render, AWS, Railway) detect healthy port instantly
  const server = app.listen(PORT, () => {
    logger.success(`SchoolSync server listening on port ${PORT}`, "SERVER");
  });

  // Graceful Process Termination Handlers
  const gracefulShutdown = async (signal: string) => {
    logger.info(`[${signal}] Initiating graceful shutdown...`, "SERVER");
    server.close(async () => {
      logger.info("HTTP server closed.", "SERVER");
      try {
        const mongoose = await import("mongoose");
        await mongoose.default.disconnect();
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

  // 2. Non-blocking initialization tasks
  if (process.env.RESET_DB === "true") {
    const { cleanAndSeedDatabase } = await import("./scripts/cleanDb.ts");
    await cleanAndSeedDatabase();
  } else {
    // Seeding is enabled in development by default (unless explicitly disabled with SEED_ON_STARTUP=false)
    // In production, seeding only runs if explicitly requested via SEED_DEFAULT_DATA=true
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

  // 3. Non-blocking email service health check
  EmailService.verifyConnection().catch((err: any) => {
    logger.warn(`Email service verification error: ${err.message}`, "EMAIL");
  });
});
