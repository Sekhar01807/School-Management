import express from "express";
import {
  getMyReportCard,
  getStudentReportCard,
  getClassAnalytics,
  getSchoolAnalytics,
  saveBatchMarks,
  getBatchMarks,
} from "../controllers/report.ts";
import { protect, authorize } from "../middleware/auth.ts";

const router = express.Router();

// Student self-report card
router.get("/student/me", protect, getMyReportCard);

// Admin / Teacher access to student report card
router.get(
  "/student/:studentId",
  protect,
  authorize(["admin", "teacher"]),
  getStudentReportCard
);

// Class performance analytics (Admin, Teacher)
router.get("/class/:classId", protect, authorize(["admin", "teacher"]), getClassAnalytics);

// School-wide analytics overview (Admin, Teacher)
router.get("/school", protect, authorize(["admin", "teacher"]), getSchoolAnalytics);

// Gradebook: Batch Marks Entry & Retrieval (Admin, Teacher)
router.post("/marks/batch", protect, authorize(["admin", "teacher"]), saveBatchMarks);
router.get(
  "/marks/class/:classId/subject/:subjectId",
  protect,
  authorize(["admin", "teacher"]),
  getBatchMarks
);

export default router;
