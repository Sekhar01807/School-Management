import express from "express";
import {
  getMyReportCard,
  getStudentReportCard,
  getClassAnalytics,
  getSchoolAnalytics,
} from "../controllers/report.ts";
import { protect, authorize } from "../middleware/auth.ts";

const router = express.Router();

// Student self-report card
router.get("/student/me", protect, getMyReportCard);

// Admin / Teacher / Parent access to student report card
router.get(
  "/student/:studentId",
  protect,
  authorize(["admin", "teacher", "parent"]),
  getStudentReportCard
);

// Class performance analytics (Admin, Teacher)
router.get("/class/:classId", protect, authorize(["admin", "teacher"]), getClassAnalytics);

// School-wide analytics overview (Admin, Teacher)
router.get("/school", protect, authorize(["admin", "teacher"]), getSchoolAnalytics);

export default router;
