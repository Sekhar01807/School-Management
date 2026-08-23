import { type Response } from "express";
import { type AuthRequest } from "../middleware/auth.ts";
import * as attendanceService from "../services/attendanceService.ts";
import Class from "../models/class.ts";

// @desc    Mark / Update class attendance for a specific date
// @route   POST /api/attendance
// @access  Private (Teacher, Admin)
export const markAttendance = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { classId, academicYearId, date, records } = req.body;

    if (!classId || !date || !records) {
      res.status(400).json({ message: "classId, date, and records are required" });
      return;
    }

    const recordedById = req.user!._id.toString();

    // If teacher, check if assigned as class teacher or subject teacher for the class
    if (req.user!.role === "teacher") {
      const assignedClass = await Class.findOne({
        _id: classId,
        $or: [{ classTeacher: req.user!._id }, { subjects: { $in: req.user!.teacherSubject || [] } }],
      });
      // We allow teachers to record attendance
    }

    const attendance = await attendanceService.recordOrUpdateAttendance(
      classId,
      academicYearId,
      date,
      records,
      recordedById
    );

    res.status(200).json({
      message: "Attendance recorded successfully",
      attendance,
    });
  } catch (error: any) {
    console.error("Mark attendance error:", error);
    res.status(400).json({ message: error.message || "Failed to record attendance" });
  }
};

// @desc    Get attendance for a class on a date or date range
// @route   GET /api/attendance/class/:classId
// @access  Private (Teacher, Admin)
export const getClassAttendance = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { classId } = req.params;
    const { date, startDate, endDate } = req.query;

    if (date) {
      const attendance = await attendanceService.getClassAttendanceByDate(
        classId,
        date as string
      );
      res.json(attendance || { class: classId, date, records: [] });
      return;
    }

    const records = await attendanceService.getClassAttendanceRange(
      classId,
      startDate as string,
      endDate as string
    );
    res.json(records);
  } catch (error: any) {
    console.error("Get class attendance error:", error);
    res.status(500).json({ message: error.message || "Failed to fetch class attendance" });
  }
};

// @desc    Get logged in student's attendance summary & history
// @route   GET /api/attendance/student/me
// @access  Private (Student, Parent)
export const getMyAttendance = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const studentId = req.user!._id.toString();
    const summary = await attendanceService.getStudentAttendanceSummary(studentId);
    res.json(summary);
  } catch (error: any) {
    console.error("Get my attendance error:", error);
    res.status(500).json({ message: error.message || "Failed to fetch attendance history" });
  }
};

// @desc    Get specific student's attendance summary & history
// @route   GET /api/attendance/student/:studentId
// @access  Private (Admin, Teacher, Parent)
export const getStudentAttendance = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { studentId } = req.params;
    const summary = await attendanceService.getStudentAttendanceSummary(studentId);
    res.json(summary);
  } catch (error: any) {
    console.error("Get student attendance error:", error);
    res.status(500).json({ message: error.message || "Failed to fetch student attendance" });
  }
};

// @desc    Get campus wide attendance overview & trend
// @route   GET /api/attendance/overview
// @access  Private (Admin, Teacher)
export const getAttendanceOverview = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const overview = await attendanceService.getCampusAttendanceOverview();
    res.json(overview);
  } catch (error: any) {
    console.error("Get attendance overview error:", error);
    res.status(500).json({ message: error.message || "Failed to fetch attendance overview" });
  }
};
