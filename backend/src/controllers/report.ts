import { type Response } from "express";
import { type AuthRequest } from "../middleware/auth.ts";
import * as reportService from "../services/reportService.ts";

// @desc    Get student's own academic report card
// @route   GET /api/reports/student/me
// @access  Private (Student, Parent)
export const getMyReportCard = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const studentId = req.user!._id.toString();
    const reportCard = await reportService.getStudentReportCard(studentId);
    res.json(reportCard);
  } catch (error: any) {
    console.error("Get my report card error:", error);
    res.status(500).json({ message: error.message || "Failed to generate report card" });
  }
};

// @desc    Get specific student's report card
// @route   GET /api/reports/student/:studentId
// @access  Private (Admin, Teacher, Parent)
export const getStudentReportCard = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { studentId } = req.params;
    const reportCard = await reportService.getStudentReportCard(studentId);
    res.json(reportCard);
  } catch (error: any) {
    console.error("Get student report card error:", error);
    res.status(500).json({ message: error.message || "Failed to generate report card" });
  }
};

// @desc    Get class performance analytics
// @route   GET /api/reports/class/:classId
// @access  Private (Admin, Teacher)
export const getClassAnalytics = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { classId } = req.params;
    const analytics = await reportService.getClassPerformanceAnalytics(classId);
    res.json(analytics);
  } catch (error: any) {
    console.error("Get class analytics error:", error);
    res.status(500).json({ message: error.message || "Failed to fetch class analytics" });
  }
};

// @desc    Get campus-wide analytics overview
// @route   GET /api/reports/school
// @access  Private (Admin, Teacher)
export const getSchoolAnalytics = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const analytics = await reportService.getSchoolAnalyticsOverview();
    res.json(analytics);
  } catch (error: any) {
    console.error("Get school analytics error:", error);
    res.status(500).json({ message: error.message || "Failed to fetch school analytics" });
  }
};
