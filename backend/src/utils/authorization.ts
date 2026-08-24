import mongoose from "mongoose";
import User, { type IUser } from "../models/user.ts";
import Class from "../models/class.ts";

export interface AuthorizationResult {
  authorized: boolean;
  statusCode?: number;
  reason?: string;
  student?: IUser | null;
}

/**
 * Determines whether a requesting user has authorization to access student-specific data
 * (Attendance, Academic Report Cards, Exam Submissions, etc.).
 *
 * Enforces strict multi-tenant boundaries (IDOR defense):
 * - Admin: Full institution-wide read/write permissions.
 * - Student: Self-access only.
 * - Parent: Restricted to registered children only.
 * - Teacher: Restricted to students enrolled in classes assigned to the teacher
 *            (either as class teacher or as assigned subject teacher).
 */
export async function canAccessStudentData(
  requester: IUser,
  targetStudentId: string
): Promise<AuthorizationResult> {
  if (!requester) {
    return { authorized: false, statusCode: 401, reason: "Not authenticated" };
  }

  // 1. Admin has global visibility
  if (requester.role === "admin") {
    return { authorized: true };
  }

  // 2. Student can only access their own records
  if (requester.role === "student") {
    const isSelf = requester._id.toString() === targetStudentId.toString();
    if (!isSelf) {
      return {
        authorized: false,
        statusCode: 403,
        reason: "Access forbidden: Students may only access their own academic records.",
      };
    }
    return { authorized: true };
  }

  // Fetch the target student record
  let student: IUser | null = null;
  try {
    if (mongoose.Types.ObjectId.isValid(targetStudentId)) {
      student = await User.findById(targetStudentId);
    }
  } catch (err) {
    return { authorized: false, statusCode: 400, reason: "Invalid student identifier." };
  }

  if (!student || student.role !== "student") {
    return { authorized: false, statusCode: 404, reason: "Student record not found." };
  }

  // 3. Parent can only access their registered children
  if (requester.role === "parent") {
    const isLinkedParent =
      (student.parentId && student.parentId.toString() === requester._id.toString()) ||
      (requester.children &&
        requester.children.some(
          (c) => (c.toString ? c.toString() : String(c)) === targetStudentId.toString()
        ));

    if (!isLinkedParent) {
      return {
        authorized: false,
        statusCode: 403,
        reason: "Access forbidden: Parents are only authorized to access records for their registered children.",
        student,
      };
    }
    return { authorized: true, student };
  }

  // 4. Teacher can only access students enrolled in classes they teach
  if (requester.role === "teacher") {
    if (!student.studentClass) {
      return {
        authorized: false,
        statusCode: 403,
        reason: "Access forbidden: Student is not enrolled in an assigned class.",
        student,
      };
    }

    const assignedClass = await Class.findOne({
      _id: student.studentClass,
      $or: [
        { classTeacher: requester._id },
        { subjects: { $in: requester.teacherSubject || [] } },
      ],
    });

    if (!assignedClass) {
      return {
        authorized: false,
        statusCode: 403,
        reason: "Access forbidden: You are not assigned to teach this student's class.",
        student,
      };
    }

    return { authorized: true, student };
  }

  return { authorized: false, statusCode: 403, reason: "Unauthorized role." };
}

/**
 * Determines whether a requesting user has authorization to access class-specific data
 * (Class Attendance, Timetable, Analytics, etc.).
 */
export async function canAccessClassData(
  requester: IUser,
  classId: string
): Promise<AuthorizationResult> {
  if (!requester) {
    return { authorized: false, statusCode: 401, reason: "Not authenticated" };
  }

  if (requester.role === "admin") {
    return { authorized: true };
  }

  if (requester.role === "teacher") {
    const assignedClass = await Class.findOne({
      _id: classId,
      $or: [
        { classTeacher: requester._id },
        { subjects: { $in: requester.teacherSubject || [] } },
      ],
    });

    if (!assignedClass) {
      return {
        authorized: false,
        statusCode: 403,
        reason: "Access forbidden: You are not assigned as class teacher or subject teacher for this class.",
      };
    }

    return { authorized: true };
  }

  if (requester.role === "student") {
    const isEnrolled =
      requester.studentClass && requester.studentClass.toString() === classId.toString();
    if (!isEnrolled) {
      return {
        authorized: false,
        statusCode: 403,
        reason: "Access forbidden: You are not enrolled in this class.",
      };
    }
    return { authorized: true };
  }

  return { authorized: false, statusCode: 403, reason: "Unauthorized role." };
}
