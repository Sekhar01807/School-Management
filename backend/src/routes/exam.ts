import express from "express";
import {
  triggerExamGeneration,
  getExams,
  submitExam,
  getExamById,
  toggleExamStatus,
  getExamResult,
  deleteExam,
} from "../controllers/exam.ts";
import { protect, authorize } from "../middleware/auth.ts";

const examRouter = express.Router();

// Generate Exam (Teachers & Admins)
examRouter.post(
  "/generate",
  protect,
  authorize(["teacher", "admin"]),
  triggerExamGeneration
);

// List Exams (Filtered by role in controller)
examRouter.get(
  "/",
  protect,
  authorize(["teacher", "student", "admin"]),
  getExams
);

// Submit Exam (Student only)
examRouter.post(
  "/:id/submit",
  protect,
  authorize(["student"]),
  submitExam
);

// Toggle Exam Active/Draft Status (Teacher owner & Admin)
examRouter.patch(
  "/:id/status",
  protect,
  authorize(["teacher", "admin"]),
  toggleExamStatus
);

// Get Exam Result (Student/Teacher/Admin)
examRouter.get(
  "/:id/result",
  protect,
  authorize(["student", "teacher", "admin"]),
  getExamResult
);

// Delete Exam (Teacher owner & Admin)
examRouter.delete(
  "/:id",
  protect,
  authorize(["teacher", "admin"]),
  deleteExam
);

// Get Exam by ID (With answer protection)
examRouter.get(
  "/:id",
  protect,
  authorize(["teacher", "student", "admin"]),
  getExamById
);

export default examRouter;
