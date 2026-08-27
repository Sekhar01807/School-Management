/**
 * Automated Scheduled Reminders & Background Jobs
 * 
 * Runs periodic background tasks for:
 * 1. Upcoming Exam Reminders (dispatched 3 days, 1 day, and on due date)
 * 2. Low Attendance Health Monitoring (< 75% warning alerts to students & parents)
 */

import Exam from "../models/exam.ts";
import Class from "../models/class.ts";
import Subject from "../models/subject.ts";
import Submission from "../models/submission.ts";
import Attendance from "../models/attendance.ts";
import User from "../models/user.ts";
import { EmailService } from "./emailService.ts";
import { logger } from "./logger.ts";

/**
 * 1. Scans for upcoming exams and dispatches reminders to students who haven't submitted
 */
export async function processUpcomingExamReminders(): Promise<{
  examsChecked: number;
  remindersSent: number;
}> {
  let remindersSent = 0;
  let examsChecked = 0;

  try {
    const now = new Date();
    const futureLimit = new Date();
    futureLimit.setDate(futureLimit.getDate() + 4); // look ahead up to 4 days

    const activeExams = await Exam.find({
      isActive: true,
      dueDate: { $gte: now, $lte: futureLimit },
    })
      .populate("class", "name students")
      .populate("subject", "name");

    examsChecked = activeExams.length;

    for (const exam of activeExams) {
      const due = new Date(exam.dueDate);
      const diffMs = due.getTime() - now.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      // Trigger reminder if due in 3 days, 1 day, or due today (0 days)
      if (diffDays <= 3 && diffDays >= 0) {
        const classDoc = exam.class as any;
        if (!classDoc || !classDoc.students || classDoc.students.length === 0) continue;

        // Query existing submissions for this exam to only notify students who haven't completed it
        const submissions = await Submission.find({ exam: exam._id }).select("student");
        const submittedStudentIds = new Set(submissions.map((s) => s.student.toString()));

        // Filter for students without a submission
        const pendingStudents = await User.find({
          _id: { $in: classDoc.students, $nin: Array.from(submittedStudentIds) },
          isActive: true,
        }).select("email name");

        const studentEmails = pendingStudents.map((s) => s.email).filter(Boolean);

        if (studentEmails.length > 0) {
          const subjectName = (exam.subject as any)?.name || "Subject";
          const className = classDoc.name || "Class";

          await EmailService.sendUpcomingExamReminderEmail(
            studentEmails,
            exam.title,
            subjectName,
            className,
            exam.dueDate,
            diffDays
          );
          remindersSent += studentEmails.length;
          logger.info(
            `Dispatched exam reminder for "${exam.title}" to ${studentEmails.length} pending students`,
            "CRON_EXAM"
          );
        }
      }
    }
  } catch (err: any) {
    logger.error(`Error processing upcoming exam reminders: ${err.message}`, "CRON_EXAM", err);
  }

  return { examsChecked, remindersSent };
}

/**
 * 2. Scans student attendance rates and notifies students & parents if attendance < 75%
 */
export async function processLowAttendanceHealthCheck(threshold: number = 75): Promise<{
  studentsScanned: number;
  warningsDispatched: number;
}> {
  let studentsScanned = 0;
  let warningsDispatched = 0;

  try {
    // Only analyze active students
    const students = await User.find({ role: "student", isActive: true })
      .populate("studentClass", "name")
      .populate("parentId", "name email");

    studentsScanned = students.length;

    // Scan last 30 days of attendance
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    for (const student of students) {
      const attendanceDocs = await Attendance.find({
        "records.student": student._id,
        date: { $gte: thirtyDaysAgo },
      });

      if (attendanceDocs.length >= 5) { // Minimum 5 recorded days for statistical validity
        let total = 0;
        let present = 0;

        attendanceDocs.forEach((doc) => {
          const rec = doc.records.find((r) => r.student.toString() === student._id.toString());
          if (rec) {
            total++;
            if (rec.status === "present" || rec.status === "late") {
              present += rec.status === "late" ? 0.75 : 1;
            }
          }
        });

        const rate = total > 0 ? Math.round((present / total) * 100) : 100;

        if (rate < threshold) {
          const recipients: string[] = [];
          if (student.email) recipients.push(student.email);
          if (student.parentId && (student.parentId as any).email) {
            recipients.push((student.parentId as any).email);
          }

          if (recipients.length > 0) {
            const className = (student.studentClass as any)?.name || "Class";
            await EmailService.sendLowAttendanceWarningEmail(
              recipients,
              student.name,
              className,
              rate,
              threshold
            );
            warningsDispatched++;
            logger.warn(
              `Low attendance alert sent for student ${student.name} (${rate}% < ${threshold}%) to ${recipients.join(", ")}`,
              "CRON_ATTENDANCE"
            );
          }
        }
      }
    }
  } catch (err: any) {
    logger.error(`Error processing low attendance check: ${err.message}`, "CRON_ATTENDANCE", err);
  }

  return { studentsScanned, warningsDispatched };
}

let cronIntervalHandle: ReturnType<typeof setInterval> | null = null;

/**
 * Initializes background scheduled cron triggers on server boot.
 * Runs every 24 hours by default (or customizable via CRON_INTERVAL_HOURS).
 */
export function initCronJobs(): void {
  if (cronIntervalHandle) {
    return; // Already initialized
  }

  const intervalHours = parseInt(process.env.CRON_INTERVAL_HOURS || "24", 10);
  const intervalMs = Math.max(1, intervalHours) * 60 * 60 * 1000;

  logger.info(`Initializing automated background email cron jobs (Interval: ${intervalHours}h)...`, "CRON");

  // Initial delayed execution (runs 30 seconds after server boot to prevent startup lag)
  setTimeout(() => {
    logger.info("Executing initial background cron cycle...", "CRON");
    processUpcomingExamReminders().catch((err) =>
      logger.error(`Initial exam reminder cron error: ${err.message}`, "CRON", err)
    );
    processLowAttendanceHealthCheck().catch((err) =>
      logger.error(`Initial attendance check cron error: ${err.message}`, "CRON", err)
    );
  }, 30000).unref();

  // Scheduled recurring cycle
  cronIntervalHandle = setInterval(() => {
    logger.info("Running scheduled 24-hour background email cron cycle...", "CRON");
    processUpcomingExamReminders().catch((err) =>
      logger.error(`Scheduled exam reminder cron error: ${err.message}`, "CRON", err)
    );
    processLowAttendanceHealthCheck().catch((err) =>
      logger.error(`Scheduled attendance check cron error: ${err.message}`, "CRON", err)
    );
  }, intervalMs);

  cronIntervalHandle.unref();
}

/**
 * Stops cron timers gracefully during server shutdown
 */
export function stopCronJobs(): void {
  if (cronIntervalHandle) {
    clearInterval(cronIntervalHandle);
    cronIntervalHandle = null;
  }
}
