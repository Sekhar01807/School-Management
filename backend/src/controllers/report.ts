import { type Response } from "express";
import { type AuthRequest } from "../middleware/auth.ts";
import * as reportService from "../services/reportService.ts";
import { canAccessStudentData, canAccessClassData } from "../utils/authorization.ts";

// @desc    Get student's own academic report card
// @route   GET /api/reports/student/me
// @access  Private (Student, Parent)
export const getMyReportCard = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Not authorized" });
      return;
    }
    const studentId = req.user._id.toString();
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
    const studentId = req.params.studentId as string;

    if (!req.user) {
      res.status(401).json({ message: "Not authorized" });
      return;
    }

    // Enforce multi-tenant resource boundaries (IDOR prevention)
    const authCheck = await canAccessStudentData(req.user, studentId);
    if (!authCheck.authorized) {
      res.status(authCheck.statusCode || 403).json({
        message: authCheck.reason || "You are not authorized to access this student's report card.",
      });
      return;
    }

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
    const classId = req.params.classId as string;

    if (!req.user) {
      res.status(401).json({ message: "Not authorized" });
      return;
    }

    // Enforce class teacher / subject teacher assignment check
    const classAuth = await canAccessClassData(req.user, classId);
    if (!classAuth.authorized) {
      res.status(classAuth.statusCode || 403).json({
        message: classAuth.reason || "You are not authorized to view analytics for this class.",
      });
      return;
    }

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
    if (!req.user) {
      res.status(401).json({ message: "Not authorized" });
      return;
    }
    const analytics = await reportService.getSchoolAnalyticsOverview();
    res.json(analytics);
  } catch (error: any) {
    console.error("Get school analytics error:", error);
    res.status(500).json({ message: error.message || "Failed to fetch school analytics" });
  }
};

// @desc    Save/Publish student assessment marks in batch (Gradebook)
// @route   POST /api/reports/marks/batch
// @access  Private (Admin, Teacher)
export const saveBatchMarks = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Not authorized" });
      return;
    }

    const { classId } = req.body;
    if (req.user.role === "teacher") {
      const classAuth = await canAccessClassData(req.user, classId);
      if (!classAuth.authorized) {
        res.status(classAuth.statusCode || 403).json({
          message: classAuth.reason || "You are not authorized to enter marks for this class.",
        });
        return;
      }
    }

    const result = await reportService.saveBatchMarks(req.user, req.body);
    res.status(200).json(result);
  } catch (error: any) {
    console.error("Save batch marks error:", error);
    res.status(500).json({ message: error.message || "Failed to save marks" });
  }
};

// @desc    Get entered assessment marks for class and subject
// @route   GET /api/reports/marks/class/:classId/subject/:subjectId
// @access  Private (Admin, Teacher)
export const getBatchMarks = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Not authorized" });
      return;
    }

    const { classId, subjectId } = req.params;
    if (req.user.role === "teacher") {
      const classAuth = await canAccessClassData(req.user, classId as string);
      if (!classAuth.authorized) {
        res.status(classAuth.statusCode || 403).json({
          message: classAuth.reason || "You are not authorized to view marks for this class.",
        });
        return;
      }
    }

    const result = await reportService.getBatchMarks(classId as string, subjectId as string);
    res.status(200).json(result);
  } catch (error: any) {
    console.error("Get batch marks error:", error);
    res.status(500).json({ message: error.message || "Failed to fetch marks" });
  }
};

