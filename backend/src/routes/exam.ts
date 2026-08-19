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
import { validateBody } from "../middleware/validate.ts";
import {
  validateGenerateExam,
  validateSubmitExam,
} from "../validators/schemas.ts";

const examRouter = express.Router();

// Generate Exam (Teachers & Admins)
examRouter.post(
  "/generate",
  protect,
  authorize(["teacher", "admin"]),
  validateBody(validateGenerateExam),
  triggerExamGeneration
);

// List Exams (Filtered by role in service)
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
  validateBody(validateSubmitExam),
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
