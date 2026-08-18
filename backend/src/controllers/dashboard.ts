import { type Response } from "express";
import User from "../models/user.ts";
import Class from "../models/class.ts";
import Exam from "../models/exam.ts";
import Submission from "../models/submission.ts";
import ActivityLog from "../models/activitieslog.ts";
import type { AuthRequest } from "../middleware/auth.ts";

// @desc    Get Dashboard Statistics (Role Based)
// @route   GET /api/dashboard/stats
// @access  Private
export const getDashboardStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ message: "Not authorized" });
      return;
    }

    let stats: any = {};

    // Get recent activities: system-wide for Admin, personal for others
    const activityQuery = user.role === "admin" ? {} : { user: user._id };
    const recentActivities = await ActivityLog.find(activityQuery)
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("user", "name role");

    const formattedActivity = recentActivities.map((log: any) => {
      const authorName = log.user?.name || "System";
      const timeStr = new Date(log.createdAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      return `${authorName}: ${log.action} (${timeStr})`;
    });

    if (user.role === "admin") {
      const [totalStudents, totalTeachers, activeExams, totalClasses] = await Promise.all([
        User.countDocuments({ role: "student" }),
        User.countDocuments({ role: "teacher" }),
        Exam.countDocuments({ isActive: true }),
        Class.countDocuments(),
      ]);

      stats = {
        totalStudents,
        totalTeachers,
        activeExams,
        totalClasses,
        avgAttendance: "95.2%", // Demo benchmark metric
        recentActivity: formattedActivity,
      };
    } else if (user.role === "teacher") {
      const myClassesCount = await Class.countDocuments({
        classTeacher: user._id,
      });

      const myExams = await Exam.find({ teacher: user._id }).select("_id");
      const myExamIds = myExams.map((exam) => exam._id);

      const [pendingGrading, activeExamsCount] = await Promise.all([
        Submission.countDocuments({
          exam: { $in: myExamIds },
        }),
        Exam.countDocuments({
          teacher: user._id,
          isActive: true,
        }),
      ]);

      stats = {
        myClassesCount,
        pendingGrading,
        activeExamsCount,
        nextClass: "Schedule Active",
        nextClassTime: "See Timetable",
        recentActivity: formattedActivity,
      };
    } else if (user.role === "student") {
      const now = new Date();
      const nextExam = await Exam.findOne({
        class: user.studentClass,
        isActive: true,
        dueDate: { $gte: now },
      }).sort({ dueDate: 1 });

      const pendingAssignments = await Exam.countDocuments({
        class: user.studentClass,
        isActive: true,
        dueDate: { $gte: now },
      });

      stats = {
        myAttendance: "98.5%", // Demo attendance benchmark
        pendingAssignments,
        nextExam: nextExam?.title || "No upcoming exams",
        nextExamDate: nextExam
          ? new Date(nextExam.dueDate).toLocaleDateString()
          : "All caught up!",
        recentActivity: formattedActivity,
      };
    }

    res.json(stats);
  } catch (error) {
    console.error("Dashboard stats error:", error);
    res.status(500).json({ message: "Server error while loading dashboard statistics" });
  }
};
