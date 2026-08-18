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

// Load environment variables from .env file
dotenv.config();

// Fail-closed startup validation for required environment variables
const requiredEnvVars = ["JWT_SECRET", "MONGO_URL"];
const missingEnvVars = requiredEnvVars.filter((key) => !process.env[key]);

if (missingEnvVars.length > 0) {
  console.error(
    `❌ FATAL CONFIGURATION ERROR: Missing required environment variable(s): ${missingEnvVars.join(
      ", "
    )}`
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
  generateTimeTable,
  generateExam,
  handleExamSubmission,
} from "./inngest/functions.ts";
import timeRouter from "./routes/timetable.ts";
import examRouter from "./routes/exam.ts";
import dashboardRouter from "./routes/dashboard.ts";

const app: Application = express();
const PORT = process.env.PORT || 5000;

// Security & Parsing Middlewares
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Request logging in development
if (process.env.NODE_ENV !== "production" && process.env.STAGE === "development") {
  app.use(morgan("dev"));
}

// Cross-origin resource sharing (CORS) with cookie credentials
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  })
);

// Health check endpoint
app.get("/", (req: Request, res: Response) => {
  res.status(200).json({ status: "OK", service: "SchoolSync API", timestamp: new Date() });
});

// Mount Routes
app.use("/api/users", userRoutes);
app.use("/api/activities", LogsRouter);
app.use("/api/academic-years", academicYearRouter);
app.use("/api/classes", classRouter);
app.use("/api/subjects", subjectRouter);
app.use("/api/timetables", timeRouter);
app.use("/api/exams", examRouter);
app.use("/api/dashboard", dashboardRouter);

// Inngest background event endpoint
app.use(
  "/api/inngest",
  serve({
    client: inngest,
    functions: [generateTimeTable, generateExam, handleExamSubmission],
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

// Connect to MongoDB and start HTTP server
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 SchoolSync server listening on port ${PORT}`);
  });
});
