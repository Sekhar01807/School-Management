import express from "express";
import {
  markAttendance,
  getClassAttendance,
  getMyAttendance,
  getStudentAttendance,
  getAttendanceOverview,
} from "../controllers/attendance.ts";
import { protect, authorize } from "../middleware/auth.ts";

const router = express.Router();

// Record attendance (Admin, Teacher)
router.post("/", protect, authorize(["admin", "teacher"]), markAttendance);

// Campus overview stats (Admin, Teacher)
router.get("/overview", protect, authorize(["admin", "teacher"]), getAttendanceOverview);

// Student self-attendance
router.get("/student/me", protect, getMyAttendance);

// Specific student attendance (Admin, Teacher, Parent)
router.get(
  "/student/:studentId",
  protect,
  authorize(["admin", "teacher"]),
  getStudentAttendance
);

// Class attendance by date or range (Admin, Teacher)
router.get("/class/:classId", protect, authorize(["admin", "teacher"]), getClassAttendance);

export default router;
