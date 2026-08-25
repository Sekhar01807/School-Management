import { type Response } from "express";
import { ExamService } from "../services/examService.ts";
import type { AuthRequest } from "../middleware/auth.ts";

// @desc    Trigger AI Exam Generation
// @route   POST /api/exams/generate
// @access  Private (Teacher & Admin)
export const triggerExamGeneration = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Not authorized" });
      return;
    }
    const result = await ExamService.triggerGeneration(req.body, req.user);
    res.status(result.status).json(result.data);
  } catch (error) {
    res.status(500).json({ message: "Server error while starting exam generation" });
  }
};

// @desc    Get Exams (Student sees available for their class, Teacher sees authored, Admin sees all)
// @route   GET /api/exams
// @access  Private (Student, Teacher, Admin)
export const getExams = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Not authorized" });
      return;
    }
    const result = await ExamService.getExams(req.user);
    res.status(result.status).json(result.data);
  } catch (error) {
    res.status(500).json({ message: "Server error while fetching exams" });
  }
};

// @desc    Get exam by id (Strict authorization & answer protection)
// @route   GET /api/exams/:id
// @access  Private (Teacher owner, Student in class, Admin)
export const getExamById = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Not authorized" });
      return;
    }
    const result = await ExamService.getExamById(req.params.id as string, req.user);
    res.status(result.status).json(result.data);
  } catch (error: any) {
    if (error.name === "CastError") {
      res.status(400).json({ message: "Invalid exam ID format" });
      return;
    }
    res.status(500).json({ message: "Server error while fetching exam" });
  }
};

// @desc    Toggle Exam Status (Active/Inactive with question & deadline checks)
// @route   PATCH /api/exams/:id/status
// @access  Private (Teacher owner / Admin)
export const toggleExamStatus = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Not authorized" });
      return;
    }
    const result = await ExamService.toggleExamStatus(req.params.id as string, req.user);
    res.status(result.status).json(result.data);
  } catch (error) {
    res.status(500).json({ message: "Server error while updating exam status" });
  }
};

// @desc    Submit Exam (Pre-validated server-side before queueing to Inngest)
// @route   POST /api/exams/:id/submit
// @access  Private (Student)
export const submitExam = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Not authorized" });
      return;
    }
    const result = await ExamService.submitExam(
      req.params.id as string,
      req.user,
      req.body.answers
    );
    res.status(result.status).json(result.data);
  } catch (error) {
    res.status(500).json({ message: "Server error while submitting exam" });
  }
};

// @desc    Get Exam Results
// @route   GET /api/exams/:id/result
// @access  Private (Student, Teacher, Admin)
export const getExamResult = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Not authorized" });
      return;
    }
    const result = await ExamService.getExamResult(
      req.params.id as string,
      req.user,
      req.query.studentId as string
    );
    res.status(result.status).json(result.data);
  } catch (error) {
    res.status(500).json({ message: "Server error while fetching results" });
  }
};

// @desc    Delete Exam
// @route   DELETE /api/exams/:id
// @access  Private (Teacher owner / Admin)
export const deleteExam = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Not authorized" });
      return;
    }
    const result = await ExamService.deleteExam(req.params.id as string, req.user);
    res.status(result.status).json(result.data);
  } catch (error) {
    res.status(500).json({ message: "Server error while deleting exam" });
  }
};
