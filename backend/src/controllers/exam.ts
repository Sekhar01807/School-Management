import { type Response } from "express";
import { logActivity } from "../utils/activitieslog.ts";
import Exam from "../models/exam.ts";
import Subject from "../models/subject.ts";
import Submission from "../models/submission.ts";
import { inngest } from "../inngest/index.ts";
import type { AuthRequest } from "../middleware/auth.ts";

// @desc    Trigger AI Exam Generation
// @route   POST /api/exams/generate
// @access  Private (Teacher & Admin)
export const triggerExamGeneration = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const {
      title,
      subject,
      class: classId,
      duration,
      dueDate,
      topic,
      difficulty,
      count,
    } = req.body;

    const subjectDoc = await Subject.findById(subject);
    if (!subjectDoc) {
      res.status(404).json({ message: "Subject not found" });
      return;
    }

    const teacherId = req.user?._id;

    const draftExam = await Exam.create({
      title: title || `Auto-Generated: ${topic}`,
      subject,
      class: classId,
      teacher: teacherId,
      duration: duration || 60,
      dueDate: dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Default 1 week
      isActive: false, // Draft mode until generated
      questions: [],
    });

    if (req.user) {
      await logActivity({
        userId: req.user._id.toString(),
        action: `User triggered exam generation: ${draftExam._id}`,
      });
    }

    await inngest.send({
      name: "exam/generate",
      data: {
        examId: draftExam._id,
        topic,
        subjectName: subjectDoc.name,
        difficulty: difficulty || "Medium",
        count: count || 10,
      },
    });

    res.status(202).json({
      message: "Exam generation started. It will be ready in a few moments.",
      examId: draftExam._id,
    });
  } catch (error) {
    console.error("Trigger exam generation error:", error);
    res.status(500).json({ message: "Server error while starting exam generation" });
  }
};

// @desc    Get Exams (Student sees available for their class, Teacher sees authored, Admin sees all)
// @route   GET /api/exams
// @access  Private (Student, Teacher, Admin)
export const getExams = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ message: "Not authorized" });
      return;
    }

    let query: any = {};

    if (user.role === "student") {
      // Students only see active exams for their assigned class
      query = { class: user.studentClass, isActive: true };
    } else if (user.role === "teacher") {
      // Teachers only see exams they authored
      query = { teacher: user._id };
    }

    const exams = await Exam.find(query)
      .populate("subject", "name code")
      .populate("class", "name section")
      .populate("teacher", "name email")
      .select("-questions.correctAnswer") // Never expose answer key in list view
      .sort({ createdAt: -1 });

    res.json(exams);
  } catch (error: any) {
    console.error("Get exams error:", error);
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
    const examId = req.params.id;
    const user = req.user;

    if (!user) {
      res.status(401).json({ message: "Not authorized" });
      return;
    }

    // Always fetch teacher populated to verify ownership
    let query = Exam.findById(examId)
      .populate("subject", "name code")
      .populate("class", "name section")
      .populate("teacher", "name email");

    // Reveal answer keys only if Admin or Authoring Teacher
    if (user.role === "admin" || user.role === "teacher") {
      // @ts-ignore
      query = query.select("+questions.correctAnswer");
    }

    const exam = await query;

    if (!exam) {
      res.status(404).json({ message: "Exam not found" });
      return;
    }

    // Teacher authorization: only the authoring teacher (or admin) can access this exam
    if (user.role === "teacher") {
      const examTeacherId = (exam.teacher as any)?._id?.toString() || exam.teacher?.toString();
      if (examTeacherId !== user._id.toString()) {
        res.status(403).json({
          message: "You are not authorized to view examinations created by other teachers.",
        });
        return;
      }
    }

    // Student authorization: student must belong to the assigned class
    if (user.role === "student") {
      const examClassId = (exam.class as any)?._id?.toString() || exam.class?.toString();
      const userClassId = user.studentClass ? user.studentClass.toString() : "";

      if (!userClassId || examClassId !== userClassId) {
        res.status(403).json({
          message: "You are not authorized to view this exam as you are not enrolled in this class.",
        });
        return;
      }

      if (!exam.isActive) {
        res.status(403).json({
          message: "This exam is currently in draft mode and not available.",
        });
        return;
      }
    }

    res.json(exam);
  } catch (error: any) {
    console.error("Get exam by id error:", error);
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
    const examId = req.params.id;
    const user = req.user;

    if (!user) {
      res.status(401).json({ message: "Not authorized" });
      return;
    }

    const exam = await Exam.findById(examId);
    if (!exam) {
      res.status(404).json({ message: "Exam not found" });
      return;
    }

    // Ownership check for teachers
    if (user.role !== "admin" && exam.teacher.toString() !== user._id.toString()) {
      res.status(403).json({ message: "Not authorized to modify this exam" });
      return;
    }

    // If attempting to publish, validate questions exist and dueDate is in future
    if (!exam.isActive) {
      if (!exam.questions || exam.questions.length === 0) {
        res.status(400).json({
          message: "Cannot publish an empty exam. Please wait for question generation to complete.",
        });
        return;
      }

      if (new Date(exam.dueDate) <= new Date()) {
        res.status(400).json({
          message: "Cannot publish an exam with an expired due date. Please extend the deadline first.",
        });
        return;
      }
    }

    // Toggle status
    exam.isActive = !exam.isActive;
    await exam.save();

    await logActivity({
      userId: user._id.toString(),
      action: `Toggled exam status: ${exam.title} is now ${exam.isActive ? "Active" : "Draft"}`,
    });

    res.json({
      message: `Exam is now ${exam.isActive ? "Published & Active" : "Draft / Inactive"}`,
      _id: exam._id,
      isActive: exam.isActive,
    });
  } catch (error: any) {
    console.error("Toggle exam status error:", error);
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
    const { answers } = req.body;
    const user = req.user;
    const examId = req.params.id;

    if (!user) {
      res.status(401).json({ message: "Not authorized" });
      return;
    }

    if (!Array.isArray(answers) || answers.length === 0) {
      res.status(400).json({ message: "Please provide answers to submit." });
      return;
    }

    // 1. Fetch exam to validate eligibility
    const exam = await Exam.findById(examId);
    if (!exam) {
      res.status(404).json({ message: "Exam not found" });
      return;
    }

    // 2. Validate active status
    if (!exam.isActive) {
      res.status(400).json({ message: "This exam is currently closed and not accepting submissions." });
      return;
    }

    // 3. Validate deadline
    if (new Date() > new Date(exam.dueDate)) {
      res.status(400).json({ message: "The deadline for this exam has already passed." });
      return;
    }

    // 4. Validate student class membership
    if (user.role === "student") {
      const studentClassId = user.studentClass ? user.studentClass.toString() : "";
      if (!studentClassId || studentClassId !== exam.class.toString()) {
        res.status(403).json({ message: "You are not enrolled in the class for this examination." });
        return;
      }
    }

    // 5. Validate not already submitted
    const existingSubmission = await Submission.findOne({
      exam: examId,
      student: user._id,
    });

    if (existingSubmission) {
      res.status(400).json({ message: "You have already submitted this exam." });
      return;
    }

    // Trigger Inngest async grading
    await inngest.send({
      name: "exam/submit",
      data: {
        examId,
        studentId: user._id.toString(),
        answers,
      },
    });

    await logActivity({
      userId: user._id.toString(),
      action: `Submitted answers for exam: ${exam.title}`,
    });

    res.status(201).json({
      message: "Exam submitted successfully! Results are being graded.",
    });
  } catch (error: any) {
    console.error("Submit exam error:", error);
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
    const user = req.user;
    const examId = req.params.id;

    if (!user) {
      res.status(401).json({ message: "Not authorized" });
      return;
    }

    let submissionQuery: any = { exam: examId };

    if (user.role === "student") {
      submissionQuery.student = user._id;
    } else if (user.role === "teacher") {
      // If teacher, ensure they own the exam
      const exam = await Exam.findById(examId);
      if (!exam || exam.teacher.toString() !== user._id.toString()) {
        res.status(403).json({ message: "Not authorized to view these results." });
        return;
      }
      // If student query param provided, filter by that student
      if (req.query.studentId) {
        submissionQuery.student = req.query.studentId;
      }
    }

    const submission = await Submission.findOne(submissionQuery).populate({
      path: "exam",
      select: "title questions._id questions.questionText questions.options questions.points questions.correctAnswer",
    });

    if (!submission) {
      res.status(404).json({ message: "No submission found for this exam." });
      return;
    }

    res.json(submission);
  } catch (error: any) {
    console.error("Get exam result error:", error);
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
    const examId = req.params.id;
    const user = req.user;

    if (!user) {
      res.status(401).json({ message: "Not authorized" });
      return;
    }

    const exam = await Exam.findById(examId);
    if (!exam) {
      res.status(404).json({ message: "Exam not found" });
      return;
    }

    // Ownership check
    if (user.role !== "admin" && exam.teacher.toString() !== user._id.toString()) {
      res.status(403).json({ message: "You are not authorized to delete this exam." });
      return;
    }

    // Cascade delete submissions for this exam
    await Submission.deleteMany({ exam: examId });
    await exam.deleteOne();

    await logActivity({
      userId: user._id.toString(),
      action: `Deleted exam: ${exam.title}`,
    });

    res.json({ message: "Exam and associated submissions deleted successfully." });
  } catch (error: any) {
    console.error("Delete exam error:", error);
    res.status(500).json({ message: "Server error while deleting exam" });
  }
};
