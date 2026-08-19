import Exam from "../models/exam.ts";
import Subject from "../models/subject.ts";
import Submission from "../models/submission.ts";
import { inngest } from "../inngest/index.ts";
import { logActivity } from "../utils/activitieslog.ts";
import type { GenerateExamInput } from "../validators/schemas.ts";
import type { IUser } from "../models/user.ts";

export class ExamService {
  /**
   * Queue AI assessment generation
   */
  static async triggerGeneration(
    input: GenerateExamInput,
    user: IUser
  ): Promise<{ status: number; data: any }> {
    const subjectDoc = await Subject.findById(input.subject);
    if (!subjectDoc) {
      return { status: 404, data: { message: "Subject not found" } };
    }

    const draftExam = await Exam.create({
      title: input.title || `Assessment: ${input.topic}`,
      subject: input.subject,
      class: input.class,
      teacher: user._id,
      duration: input.duration || 60,
      dueDate: new Date(input.dueDate || Date.now() + 7 * 24 * 60 * 60 * 1000),
      isActive: false,
      questions: [],
    });

    await logActivity({
      userId: user._id.toString(),
      action: `Triggered assessment generation: ${draftExam._id}`,
    });

    await inngest.send({
      name: "exam/generate",
      data: {
        examId: draftExam._id,
        topic: input.topic,
        subjectName: subjectDoc.name,
        difficulty: input.difficulty || "Medium",
        count: input.count || 10,
      },
    });

    return {
      status: 202,
      data: {
        message: "Exam generation started. It will be ready in a few moments.",
        examId: draftExam._id,
      },
    };
  }

  /**
   * List exams with strict role and class isolation
   */
  static async getExams(user: IUser): Promise<{ status: number; data: any }> {
    let query: any = {};

    if (user.role === "student") {
      // Students only see active assessments for their enrolled class
      query = { class: user.studentClass, isActive: true };
    } else if (user.role === "teacher") {
      // Teachers only see assessments they authored
      query = { teacher: user._id };
    }

    const exams = await Exam.find(query)
      .populate("subject", "name code")
      .populate("class", "name")
      .populate("teacher", "name email")
      .select("-questions.correctAnswer") // Never leak answer key in list queries
      .sort({ createdAt: -1 });

    return { status: 200, data: exams };
  }

  /**
   * Retrieve exam by ID with answer key protection & teacher ownership isolation
   */
  static async getExamById(
    examId: string,
    user: IUser
  ): Promise<{ status: number; data: any }> {
    let query = Exam.findById(examId)
      .populate("subject", "name code")
      .populate("class", "name")
      .populate("teacher", "name email");

    // Reveal answer keys only if Admin or Authoring Teacher
    if (user.role === "admin" || user.role === "teacher") {
      // @ts-ignore
      query = query.select("+questions.correctAnswer");
    }

    const exam = await query;

    if (!exam) {
      return { status: 404, data: { message: "Exam not found" } };
    }

    // Resource Authorization: Teachers can only view exams they authored
    if (user.role === "teacher") {
      const examTeacherId = (exam.teacher as any)?._id?.toString() || exam.teacher?.toString();
      if (examTeacherId !== user._id.toString()) {
        return {
          status: 403,
          data: { message: "You are not authorized to view examinations created by other teachers." },
        };
      }
    }

    // Resource Authorization: Students must belong to the assigned class and exam must be active
    if (user.role === "student") {
      const examClassId = (exam.class as any)?._id?.toString() || exam.class?.toString();
      const userClassId = user.studentClass ? user.studentClass.toString() : "";

      if (!userClassId || examClassId !== userClassId) {
        return {
          status: 403,
          data: { message: "You are not authorized to view this exam as you are not enrolled in this class." },
        };
      }

      if (!exam.isActive) {
        return {
          status: 403,
          data: { message: "This exam is currently in draft mode and not available." },
        };
      }
    }

    return { status: 200, data: exam };
  }

  /**
   * Toggle Exam Status with question count and deadline validation
   */
  static async toggleExamStatus(
    examId: string,
    user: IUser
  ): Promise<{ status: number; data: any }> {
    const exam = await Exam.findById(examId);
    if (!exam) {
      return { status: 404, data: { message: "Exam not found" } };
    }

    // Ownership check for teachers
    if (user.role !== "admin" && exam.teacher.toString() !== user._id.toString()) {
      return { status: 403, data: { message: "Not authorized to modify this exam" } };
    }

    // If publishing, validate questions and future deadline
    if (!exam.isActive) {
      if (!exam.questions || exam.questions.length === 0) {
        return {
          status: 400,
          data: { message: "Cannot publish an empty exam. Please wait for question generation to complete." },
        };
      }

      if (new Date(exam.dueDate) <= new Date()) {
        return {
          status: 400,
          data: { message: "Cannot publish an exam with an expired due date. Please extend the deadline first." },
        };
      }
    }

    exam.isActive = !exam.isActive;
    await exam.save();

    await logActivity({
      userId: user._id.toString(),
      action: `Toggled exam status: ${exam.title} (${exam.isActive ? "Active" : "Draft"})`,
    });

    return {
      status: 200,
      data: {
        message: `Exam is now ${exam.isActive ? "Published & Active" : "Draft / Inactive"}`,
        _id: exam._id,
        isActive: exam.isActive,
      },
    };
  }

  /**
   * Server-side pre-validated exam submission
   */
  static async submitExam(
    examId: string,
    user: IUser,
    answers: { questionId: string; answer: string }[]
  ): Promise<{ status: number; data: any }> {
    const exam = await Exam.findById(examId);
    if (!exam) {
      return { status: 404, data: { message: "Exam not found" } };
    }

    if (!exam.isActive) {
      return {
        status: 400,
        data: { message: "This exam is currently closed and not accepting submissions." },
      };
    }

    if (new Date() > new Date(exam.dueDate)) {
      return {
        status: 400,
        data: { message: "The deadline for this exam has already passed." },
      };
    }

    // Validate student class membership
    if (user.role === "student") {
      const studentClassId = user.studentClass ? user.studentClass.toString() : "";
      if (!studentClassId || studentClassId !== exam.class.toString()) {
        return {
          status: 403,
          data: { message: "You are not enrolled in the class for this examination." },
        };
      }
    }

    // Validate duplicate submission
    const existingSubmission = await Submission.findOne({
      exam: examId,
      student: user._id,
    });

    if (existingSubmission) {
      return {
        status: 400,
        data: { message: "You have already submitted this exam." },
      };
    }

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

    return {
      status: 201,
      data: { message: "Exam submitted successfully! Results are being graded." },
    };
  }

  /**
   * Retrieve exam results with role boundaries
   */
  static async getExamResult(
    examId: string,
    user: IUser,
    studentIdQuery?: string
  ): Promise<{ status: number; data: any }> {
    let submissionQuery: any = { exam: examId };

    if (user.role === "student") {
      submissionQuery.student = user._id;
    } else if (user.role === "teacher") {
      const exam = await Exam.findById(examId);
      if (!exam || exam.teacher.toString() !== user._id.toString()) {
        return {
          status: 403,
          data: { message: "Not authorized to view these results." },
        };
      }
      if (studentIdQuery) {
        submissionQuery.student = studentIdQuery;
      }
    }

    const submission = await Submission.findOne(submissionQuery).populate({
      path: "exam",
      select: "title questions._id questions.questionText questions.options questions.points questions.correctAnswer",
    });

    if (!submission) {
      return {
        status: 404,
        data: { message: "No submission found for this exam." },
      };
    }

    return { status: 200, data: submission };
  }

  /**
   * Delete exam with cascading submission cleanup
   */
  static async deleteExam(
    examId: string,
    user: IUser
  ): Promise<{ status: number; data: any }> {
    const exam = await Exam.findById(examId);
    if (!exam) {
      return { status: 404, data: { message: "Exam not found" } };
    }

    // Ownership check for teachers
    if (user.role !== "admin" && exam.teacher.toString() !== user._id.toString()) {
      return {
        status: 403,
        data: { message: "You are not authorized to delete this exam." },
      };
    }

    await Submission.deleteMany({ exam: examId });
    await exam.deleteOne();

    await logActivity({
      userId: user._id.toString(),
      action: `Deleted exam: ${exam.title}`,
    });

    return {
      status: 200,
      data: { message: "Exam and associated submissions deleted successfully." },
    };
  }
}
