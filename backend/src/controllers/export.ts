import type { Request, Response } from "express";
import { ExportService } from "../services/exportService.ts";
import User from "../models/user.ts";

/**
 * 1. Export Class Attendance Register (CSV)
 * Access: Admin or Assigned Class Teacher
 */
export const exportAttendance = async (req: Request, res: Response): Promise<void> => {
  try {
    const { classId } = req.params;
    if (!classId) {
      res.status(400).json({ message: "Class ID is required." });
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
export const exportReportCard = async (req: Request, res: Response): Promise<void> => {
  try {
    const { studentId } = req.params;
    const requester = req.user;

    if (!studentId) {
      res.status(400).json({ message: "Student ID is required." });
      return;
    }

    // IDOR Authorization Verification
    if (requester?.role === "student" && requester.id !== studentId) {
      res.status(403).json({ message: "Access denied. You can only export your own report card." });
      return;
    }

    if (requester?.role === "parent") {
      const student = await User.findById(studentId);
      if (!student || student.parentId?.toString() !== requester.id) {
        res.status(403).json({ message: "Access denied. You can only export your linked child's report card." });
        return;
      }
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
export const exportStudentsDirectory = async (req: Request, res: Response): Promise<void> => {
  try {
    const classId = req.query.classId as string | undefined;
    const result = await ExportService.exportStudentsDirectoryCsv(classId);

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${result.filename}"`);
    res.status(200).send(result.csv);
  } catch (err: any) {
    console.error("Error exporting students directory CSV:", err.message);
    res.status(500).json({ message: "Failed to generate directory export." });
  }
};
