import { type Response } from "express";
import User from "../models/user.ts";
import Class from "../models/class.ts";
import Exam from "../models/exam.ts";
import Submission from "../models/submission.ts";
import ActivityLog from "../models/activitieslog.ts";
import Timetable from "../models/timetable.ts";
import { getStudentAttendanceSummary, getCampusAttendanceOverview } from "../services/attendanceService.ts";
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
      const [totalStudents, totalTeachers, activeExams, totalClasses, attendanceOverview] =
        await Promise.all([
          User.countDocuments({ role: "student" }),
          User.countDocuments({ role: "teacher" }),
          Exam.countDocuments({ isActive: true }),
          Class.countDocuments(),
          getCampusAttendanceOverview(),
        ]);

      stats = {
        totalStudents,
        totalTeachers,
        activeExams,
        totalClasses,
        avgAttendance: attendanceOverview.todayRate,
        recentActivity: formattedActivity,
      };
    } else if (user.role === "teacher") {
      const myClassesCount = await Class.countDocuments({
        classTeacher: user._id,
      });

      const myExams = await Exam.find({ teacher: user._id }).select("_id");
      const myExamIds = myExams.map((exam) => exam._id);

      const [submissionsCount, activeExamsCount] = await Promise.all([
        Submission.countDocuments({
          exam: { $in: myExamIds },
        }),
        Exam.countDocuments({
          teacher: user._id,
          isActive: true,
        }),
      ]);

      // Check teacher's today schedule
      const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const currentDay = days[new Date().getDay()];
      const teacherTimetables = await Timetable.find({
        "schedule.periods.teacher": user._id,
        "schedule.day": currentDay,
      }).populate("class", "name");

      let nextClass = "No lectures today";
      let nextClassTime = "Completed";
      if (teacherTimetables.length > 0) {
        const first = teacherTimetables[0];
        const period = first.schedule
          ?.find((s) => s.day === currentDay)
          ?.periods?.find((p: any) => p.teacher?.toString() === user._id.toString());
        if (period) {
          nextClass = `${(first.class as any)?.name || "Class"} (${period.startTime} - ${period.endTime})`;
          nextClassTime = `${period.startTime} Period`;
        }
      }

      stats = {
        myClassesCount,
        pendingGrading: submissionsCount,
        activeExamsCount,
        gradedCount: `${submissionsCount} Graded`,
        nextClass,
        nextClassTime,
        recentActivity: formattedActivity,
      };
    } else if (user.role === "student") {
      const now = new Date();
      const nextExam = await Exam.findOne({
        class: user.studentClass,
        isActive: true,
        dueDate: { $gte: now },
      })
        .populate("subject", "name")
        .sort({ dueDate: 1 });

      // Student's completed submissions
      const mySubmissions = await Submission.find({ student: user._id }).select("exam");
      const submittedExamIds = mySubmissions.map((s) => s.exam.toString());

      // Count active exams that the student has NOT submitted yet
      const pendingAssignments = await Exam.countDocuments({
        class: user.studentClass,
        isActive: true,
        _id: { $nin: submittedExamIds },
      });

      // Calculate real attendance for this student
      const studentAttendance = await getStudentAttendanceSummary(user._id.toString());

      stats = {
        myAttendance: `${studentAttendance.percentage}%`,
        pendingAssignments,
        nextExam: nextExam?.title || "No upcoming exams",
        nextExamDate: nextExam
          ? new Date(nextExam.dueDate).toLocaleDateString()
          : "All caught up!",
        recentActivity: formattedActivity,
      };
    } else if (user.role === "parent") {
      stats = {
        myAttendance: "98.5%",
        pendingAssignments: 0,
        nextExam: "Term Final Examinations",
        nextExamDate: "Check Student Portal",
        recentActivity: formattedActivity,
      };
    }

    res.json(stats);
  } catch (error) {
    console.error("Dashboard stats error:", error);
    res.status(500).json({ message: "Server error while loading dashboard statistics" });
  }
};

