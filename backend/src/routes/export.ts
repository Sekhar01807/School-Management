import express from "express";
import {
  exportAttendance,
  exportReportCard,
  exportStudentsDirectory,
} from "../controllers/export.ts";
import { protect, authorize } from "../middleware/auth.ts";
import { exportRateLimiter } from "../middleware/rateLimiter.ts";

const exportRouter = express.Router();

// Apply global rate limiting on all export operations
exportRouter.use(exportRateLimiter);

// 1. Export Class Attendance Register (Admin & Teacher)
exportRouter.get(
  "/attendance/:classId",
  protect,
  authorize(["admin", "teacher"]),
  exportAttendance
);

// 2. Export Student GPA & Report Card (Admin, Teacher, Student [Self], Parent [Child])
exportRouter.get(
  "/report-card/:studentId",
  protect,
  authorize(["admin", "teacher", "student"]),
  exportReportCard
);

// 3. Export Students Directory Roster (Admin & Teacher)
exportRouter.get(
  "/students",
  protect,
  authorize(["admin", "teacher"]),
  exportStudentsDirectory
);

export default exportRouter;
