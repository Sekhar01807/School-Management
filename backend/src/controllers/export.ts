import type { Response } from "express";
import { ExportService } from "../services/exportService.ts";
import type { AuthRequest } from "../middleware/auth.ts";
import { canAccessClassData, canAccessStudentData } from "../utils/authorization.ts";

/**
 * 1. Export Class Attendance Register (CSV)
 * Access: Admin or Assigned Class Teacher
 */
export const exportAttendance = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const classId = req.params.classId as string;
    if (!classId) {
      res.status(400).json({ message: "Class ID is required." });
      return;
    }

    if (!req.user) {
      res.status(401).json({ message: "Not authorized" });
      return;
    }

    // Enforce class teacher or subject teacher assignment check
    const classAuth = await canAccessClassData(req.user, classId);
    if (!classAuth.authorized) {
      res.status(classAuth.statusCode || 403).json({
        message: classAuth.reason || "You are not authorized to export attendance for this class.",
      });
      return;
    }

    const month = req.query.month !== undefined ? parseInt(req.query.month as string, 10) : undefined;
    const year = req.query.year !== undefined ? parseInt(req.query.year as string, 10) : undefined;

    const result = await ExportService.exportAttendanceRegisterCsv(classId, month, year);
    if (!result) {
      res.status(404).json({ message: "Class not found or no attendance data available." });
      return;
    }

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${result.filename}"`);
    res.status(200).send(result.csv);
  } catch (err: any) {
    console.error("Error exporting attendance CSV:", err.message);
    res.status(500).json({ message: "Failed to generate attendance export." });
  }
};

/**
 * 2. Export Student GPA & Report Card (CSV)
 * Access: Admin, Teacher, Student (Self), or Parent (Linked Child)
 */
export const exportReportCard = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const studentId = req.params.studentId as string;
    const requester = req.user;

    if (!studentId) {
      res.status(400).json({ message: "Student ID is required." });
      return;
    }

    if (!requester) {
      res.status(401).json({ message: "Not authorized" });
      return;
    }

    // Enforce strict multi-tenant boundary checks (IDOR defense)
    const authCheck = await canAccessStudentData(requester, studentId);
    if (!authCheck.authorized) {
      res.status(authCheck.statusCode || 403).json({
        message: authCheck.reason || "You are not authorized to export this student's report card.",
      });
      return;
    }

    const result = await ExportService.exportStudentReportCardCsv(studentId);
    if (!result) {
      res.status(404).json({ message: "Student not found or report card unavailable." });
      return;
    }

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${result.filename}"`);
    res.status(200).send(result.csv);
  } catch (err: any) {
    console.error("Error exporting student report card CSV:", err.message);
    res.status(500).json({ message: "Failed to generate report card export." });
  }
};

/**
 * 3. Export Students Directory Roster (CSV)
 * Access: Admin or Teacher
 */
export const exportStudentsDirectory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Not authorized" });
      return;
    }

    const classId = req.query.classId as string | undefined;

    // Restrict teachers to exporting students in classes they teach
    if (req.user.role === "teacher") {
      if (!classId) {
        res.status(403).json({
          message: "Teachers must specify a classId to export a student directory roster.",
        });
        return;
      }

      const classAuth = await canAccessClassData(req.user, classId);
      if (!classAuth.authorized) {
        res.status(classAuth.statusCode || 403).json({
          message: classAuth.reason || "You are not authorized to export directory for this class.",
        });
        return;
      }
    }

    const result = await ExportService.exportStudentsDirectoryCsv(classId);

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${result.filename}"`);
    res.status(200).send(result.csv);
  } catch (err: any) {
    console.error("Error exporting students directory CSV:", err.message);
    res.status(500).json({ message: "Failed to generate directory export." });
  }
};
