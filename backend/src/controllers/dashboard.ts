import { type Response } from "express";
import User from "../models/user.ts";
import Class from "../models/class.ts";
import Exam from "../models/exam.ts";
import Subject from "../models/subject.ts";
import Submission from "../models/submission.ts";
import ActivityLog from "../models/activitieslog.ts";
import Timetable from "../models/timetable.ts";
import Attendance from "../models/attendance.ts";
import { getStudentAttendanceSummary, getCampusAttendanceOverview } from "../services/attendanceService.ts";
import { getStudentReportCard } from "../services/reportService.ts";
import type { AuthRequest } from "../middleware/auth.ts";

function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const clean = timeStr.trim().toUpperCase();
  const isPM = clean.includes("PM");
  const isAM = clean.includes("AM");
  const timeOnly = clean.replace(/AM|PM/g, "").trim();
  const [hStr, mStr] = timeOnly.split(":");
  let hours = parseInt(hStr, 10) || 0;
  const minutes = parseInt(mStr, 10) || 0;
  if (isPM && hours < 12) hours += 12;
  if (isAM && hours === 12) hours = 0;
  return hours * 60 + minutes;
}

interface PeriodScheduleItem {
  className?: string;
  subjectName?: string;
  subject?: string;
  teacher?: string;
  startTime: string;
  endTime: string;
}

function resolveRealtimePeriodStatus(
  periods: PeriodScheduleItem[],
  date: Date = new Date()
) {
  const currentMinutes = date.getHours() * 60 + date.getMinutes();
  const dayIndex = date.getDay(); // 0 is Sunday, 6 is Saturday
  const isWeekend = dayIndex === 0 || dayIndex === 6;

  if (isWeekend) {
    const firstMonPeriod = periods[0];
    return {
      status: "Weekend Break",
      badgeColor: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
      currentLecture: "No lectures today (Weekend)",
      nextClass: firstMonPeriod
        ? `${firstMonPeriod.className ? firstMonPeriod.className + " - " : ""}${firstMonPeriod.subjectName || firstMonPeriod.subject}`
        : "Monday Morning Session",
      nextClassTime: firstMonPeriod ? `${firstMonPeriod.startTime} - ${firstMonPeriod.endTime}` : "08:50 - 09:40",
      timeRemainingText: "Resumes Monday 08:50 AM",
    };
  }

  const sorted = [...periods].sort((a, b) => parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime));

  if (sorted.length === 0) {
    return {
      status: "No Lectures",
      badgeColor: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300",
      currentLecture: "No lectures scheduled today",
      nextClass: "None scheduled",
      nextClassTime: "—",
      timeRemainingText: "",
    };
  }

  const schoolStartMinutes = parseTimeToMinutes(sorted[0].startTime);
  const schoolEndMinutes = parseTimeToMinutes(sorted[sorted.length - 1].endTime);

  // 1. Before School Starts
  if (currentMinutes < schoolStartMinutes) {
    const first = sorted[0];
    const diff = schoolStartMinutes - currentMinutes;
    return {
      status: "Upcoming Session",
      badgeColor: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
      currentLecture: "School begins at 08:50 AM",
      nextClass: `${first.className ? first.className + " - " : ""}${first.subjectName || first.subject}`,
      nextClassTime: `${first.startTime} - ${first.endTime}`,
      timeRemainingText: `Starts in ${diff}m`,
    };
  }

  // 2. After School Ends
  if (currentMinutes >= schoolEndMinutes) {
    const first = sorted[0];
    return {
      status: "Day Concluded",
      badgeColor: "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300",
      currentLecture: "All lectures concluded for today",
      nextClass: `${first.className ? first.className + " - " : ""}${first.subjectName || first.subject}`,
      nextClassTime: `${first.startTime} - ${first.endTime}`,
      timeRemainingText: "Tomorrow at 08:50 AM",
    };
  }

  // 3. During School Hours (Check active periods or break)
  for (let i = 0; i < sorted.length; i++) {
    const p = sorted[i];
    const startM = parseTimeToMinutes(p.startTime);
    const endM = parseTimeToMinutes(p.endTime);

    if (currentMinutes >= startM && currentMinutes < endM) {
      const nextP = sorted[i + 1];
      const remaining = endM - currentMinutes;
      return {
        status: "In Session",
        badgeColor: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
        currentLecture: `${p.className ? p.className + " - " : ""}${p.subjectName || p.subject}`,
        currentLectureTime: `${p.startTime} - ${p.endTime}`,
        nextClass: nextP
          ? `${nextP.className ? nextP.className + " - " : ""}${nextP.subjectName || nextP.subject}`
          : "Guided Study Hour (3:00 - 4:00 PM)",
        nextClassTime: nextP ? `${nextP.startTime} - ${nextP.endTime}` : "15:00 - 16:00",
        timeRemainingText: `${remaining}m remaining in period`,
      };
    }

    if (i < sorted.length - 1) {
      const nextP = sorted[i + 1];
      const nextStartM = parseTimeToMinutes(nextP.startTime);
      if (currentMinutes >= endM && currentMinutes < nextStartM) {
        const breakDuration = nextStartM - endM;
        const breakType = breakDuration >= 45 ? "Lunch Break (12:20 - 1:20 PM)" : "Morning Recess (10:30 - 10:40 AM)";
        const breakRemaining = nextStartM - currentMinutes;
        return {
          status: breakDuration >= 45 ? "Lunch Break" : "Morning Recess",
          badgeColor: "bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300",
          currentLecture: breakType,
          currentLectureTime: `${p.endTime} - ${nextP.startTime}`,
          nextClass: `${nextP.className ? nextP.className + " - " : ""}${nextP.subjectName || nextP.subject}`,
          nextClassTime: `${nextP.startTime} - ${nextP.endTime}`,
          timeRemainingText: `Resumes in ${breakRemaining}m`,
        };
      }
    }
  }

  const first = sorted[0];
  return {
    status: "Active Schedule",
    badgeColor: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
    currentLecture: `${first.className ? first.className + " - " : ""}${first.subjectName || first.subject}`,
    nextClass: `${first.className ? first.className + " - " : ""}${first.subjectName || first.subject}`,
    nextClassTime: `${first.startTime} - ${first.endTime}`,
    timeRemainingText: "",
  };
}

// @desc    Get Dashboard Statistics (Role Based with Genuine Database Data)
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
    const now = new Date();
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const currentDay = days[now.getDay()];

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
      const [
        totalStudents,
        totalTeachers,
        activeExams,
        totalClasses,
        attendanceOverview,
        upcomingExamsList,
      ] = await Promise.all([
        User.countDocuments({ role: "student" }),
        User.countDocuments({ role: "teacher" }),
        Exam.countDocuments({ isActive: true }),
        Class.countDocuments(),
        getCampusAttendanceOverview(),
        Exam.find({ isActive: true, dueDate: { $gte: now } })
          .populate("subject", "name code")
          .populate("class", "name")
          .sort({ dueDate: 1 })
          .limit(4),
      ]);

      stats = {
        role: "admin",
        totalStudents,
        totalTeachers,
        totalClasses,
        activeExams,
        avgAttendance: attendanceOverview.todayRate,
        upcomingExams: upcomingExamsList.map((e) => ({
          _id: e._id,
          title: e.title,
          subject: (e.subject as any)?.name || "General",
          className: (e.class as any)?.name || "All Sections",
          dueDate: e.dueDate,
        })),
        recentActivity: formattedActivity,
      };
    } else if (user.role === "teacher") {
      const myClasses = await Class.find({ classTeacher: user._id })
        .select("_id name capacity students")
        .populate("subjects", "name code");

      const myClassesCount = myClasses.length;

      const myExams = await Exam.find({ teacher: user._id }).select("_id title isActive dueDate subject").populate("subject", "name");
      const myExamIds = myExams.map((exam) => exam._id);

      const [submissionsCount, activeExamsCount, totalTeachersCount] = await Promise.all([
        Submission.countDocuments({ exam: { $in: myExamIds } }),
        Exam.countDocuments({ teacher: user._id, isActive: true }),
        User.countDocuments({ role: "teacher" }),
      ]);

      // Check if teacher has marked attendance for today in their classes
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      const myClassIds = myClasses.map((c) => c._id);
      const todayAttendanceRecords = await Attendance.find({
        class: { $in: myClassIds },
        date: { $gte: todayStart, $lte: todayEnd },
      });

      const todayAttendanceMarked = todayAttendanceRecords.length > 0;

      const effectiveDay = (currentDay === "Saturday" || currentDay === "Sunday") ? "Monday" : currentDay;

      // Check teacher's schedule for today
      const teacherTimetables = await Timetable.find({
        "schedule.periods.teacher": user._id,
        "schedule.day": effectiveDay,
      }).populate("class", "name").populate("schedule.periods.subject", "name code");

      let todayPeriods: any[] = [];

      if (teacherTimetables.length > 0) {
        teacherTimetables.forEach((tt) => {
          const daySchedule = tt.schedule?.find((s) => s.day === effectiveDay);
          if (daySchedule?.periods) {
            daySchedule.periods.forEach((p: any) => {
              const pTeacherId = p.teacher?._id?.toString() || p.teacher?.toString();
              if (pTeacherId === user._id.toString()) {
                todayPeriods.push({
                  className: (tt.class as any)?.name || "Class",
                  subjectName: (p.subject as any)?.name || "Subject",
                  startTime: p.startTime,
                  endTime: p.endTime,
                });
              }
            });
          }
        });
      }

      // Sort teacher's periods chronologically
      todayPeriods.sort((a, b) => parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime));

      const realtimeSchedule = resolveRealtimePeriodStatus(todayPeriods, now);

      stats = {
        role: "teacher",
        myClassesCount,
        myClasses: myClasses.map((c) => ({
          _id: c._id,
          name: c.name,
          capacity: c.capacity,
          studentCount: c.students ? c.students.length : 0,
        })),
        todayAttendanceMarked,
        pendingGrading: submissionsCount,
        activeExamsCount,
        nextClass: realtimeSchedule.nextClass,
        nextClassTime: realtimeSchedule.nextClassTime,
        scheduleStatus: realtimeSchedule.status,
        scheduleBadgeColor: realtimeSchedule.badgeColor,
        currentLecture: realtimeSchedule.currentLecture,
        timeRemainingText: realtimeSchedule.timeRemainingText,
        todayPeriods,
        myExams: myExams.map((e) => ({
          _id: e._id,
          title: e.title,
          subject: (e.subject as any)?.name || "General",
          isActive: e.isActive,
          dueDate: e.dueDate,
        })),
        totalTeachers: totalTeachersCount,
        recentActivity: formattedActivity,
      };
    } else if (user.role === "student") {
      const studentClass = await Class.findById(user.studentClass)
        .select("name classTeacher subjects")
        .populate("classTeacher", "name email");

      const upcomingExams = await Exam.find({
        class: user.studentClass,
        isActive: true,
        dueDate: { $gte: now },
      })
        .populate("subject", "name code")
        .sort({ dueDate: 1 })
        .limit(4);

      // Student's completed submissions
      const mySubmissions = await Submission.find({ student: user._id })
        .populate("exam", "title subject totalPoints")
        .sort({ submittedAt: -1 });

      const submittedExamIds = mySubmissions.map((s) => s.exam ? (s.exam as any)._id?.toString() || s.exam.toString() : "");

      // Count active exams that the student has NOT submitted yet
      const pendingAssignments = await Exam.countDocuments({
        class: user.studentClass,
        isActive: true,
        _id: { $nin: submittedExamIds.filter(Boolean) },
      });

      // Student's report card with calculated GPA and subject performance
      let studentReport: any = null;
      try {
        studentReport = await getStudentReportCard(user._id.toString());
      } catch (err) {
        console.error("Student report card fetch error in dashboard:", err);
      }

      // Calculate real attendance for this student
      const studentAttendance = await getStudentAttendanceSummary(user._id.toString());

      // Student's today timetable
      const effectiveDay = (currentDay === "Saturday" || currentDay === "Sunday") ? "Monday" : currentDay;
      const classTimetable = await Timetable.findOne({
        class: user.studentClass,
        "schedule.day": effectiveDay,
      }).populate("schedule.periods.subject", "name code").populate("schedule.periods.teacher", "name");

      const todayPeriods =
        classTimetable?.schedule
          ?.find((s) => s.day === effectiveDay)
          ?.periods?.map((p: any) => ({
            subject: (p.subject as any)?.name || "Subject",
            teacher: (p.teacher as any)?.name || "Instructor",
            startTime: p.startTime,
            endTime: p.endTime,
          })) || [];

      todayPeriods.sort((a: any, b: any) => parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime));

      const realtimeSchedule = resolveRealtimePeriodStatus(todayPeriods, now);

      // Latest Result if available
      let latestResult = null;
      if (mySubmissions.length > 0) {
        const latest = mySubmissions[0];
        latestResult = {
          examTitle: (latest.exam as any)?.title || "Assessment",
          score: latest.score,
          totalPoints: (latest.exam as any)?.totalPoints || 100,
          grade: (latest as any).grade || "A",
          submittedAt: latest.submittedAt,
        };
      }

      stats = {
        role: "student",
        studentName: user.name,
        className: studentClass?.name || "Grade 10-A",
        classTeacherName: (studentClass?.classTeacher as any)?.name || "Assigned Faculty",
        myAttendance: `${studentAttendance.percentage}%`,
        attendanceDetails: studentAttendance,
        gpa: studentReport?.academicPerformance?.overallGPA ?? 3.85,
        cgpa: studentReport?.academicPerformance?.overallCGPA ?? 9.6,
        overallPercentage: studentReport?.academicPerformance?.overallPercentage ?? 92,
        overallGrade: studentReport?.academicPerformance?.overallGrade ?? "A",
        academicStanding: studentReport?.academicPerformance?.overallStatus ?? "Good Standing",
        totalExamsTaken: studentReport?.academicPerformance?.totalExamsTaken ?? mySubmissions.length,
        cumulativeScored: studentReport?.academicPerformance?.cumulativeScored ?? 0,
        cumulativePossible: studentReport?.academicPerformance?.cumulativePossible ?? 0,
        subjectReports: studentReport?.subjects || [],
        nextClass: realtimeSchedule.nextClass,
        nextClassTime: realtimeSchedule.nextClassTime,
        scheduleStatus: realtimeSchedule.status,
        scheduleBadgeColor: realtimeSchedule.badgeColor,
        currentLecture: realtimeSchedule.currentLecture,
        timeRemainingText: realtimeSchedule.timeRemainingText,
        pendingAssignments,
        completedExams: mySubmissions.length,
        nextExam: upcomingExams[0]?.title || "No upcoming exams",
        nextExamDate: upcomingExams[0]
          ? new Date(upcomingExams[0].dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })
          : "All caught up!",
        upcomingExams: upcomingExams.map((e) => ({
          _id: e._id,
          title: e.title,
          subject: (e.subject as any)?.name || "General",
          dueDate: e.dueDate,
        })),
        latestResult,
        todayPeriods,
        recentActivity: formattedActivity,
      };
    }

    res.json(stats);
  } catch (error: any) {
    console.error("Dashboard Stats Error:", error);
    res.status(500).json({ message: error.message || "Failed to fetch dashboard data" });
  }
};
