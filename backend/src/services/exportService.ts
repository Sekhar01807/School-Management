import User from "../models/user.ts";
import Class from "../models/class.ts";
import Attendance from "../models/attendance.ts";
import ExamSubmission from "../models/submission.ts";
import { calculateGrade } from "./reportService.ts";

/**
 * Escapes a field for standard RFC-4180 CSV compliance
 */
export function escapeCsv(field: any): string {
  if (field === null || field === undefined) return '""';
  const stringified = String(field);
  if (
    stringified.includes(",") ||
    stringified.includes('"') ||
    stringified.includes("\n") ||
    stringified.includes("\r")
  ) {
    return `"${stringified.replace(/"/g, '""')}"`;
  }
  return `"${stringified}"`;
}

export class ExportService {
  /**
   * 1. Export Monthly Class Attendance Register to CSV
   */
  static async exportAttendanceRegisterCsv(
    classId: string,
    month?: number,
    year?: number
  ): Promise<{ filename: string; csv: string } | null> {
    const classDoc = await Class.findById(classId).populate("students", "name email");
    if (!classDoc) return null;

    const targetDate = new Date();
    const targetMonth = month !== undefined ? month : targetDate.getMonth();
    const targetYear = year !== undefined ? year : targetDate.getFullYear();

    const startDate = new Date(targetYear, targetMonth, 1);
    const endDate = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59);

    const attendanceRecords = await Attendance.find({
      class: classId,
      date: { $gte: startDate, $lte: endDate },
    }).sort({ date: 1 });

    const daysInMonth = endDate.getDate();
    const daysHeader: string[] = [];
    for (let day = 1; day <= daysInMonth; day++) {
      daysHeader.push(`Day ${day}`);
    }

    const headers = [
      "Student Name",
      "Email Address",
      ...daysHeader,
      "Total Present",
      "Total Absent",
      "Total Late",
      "Total Excused",
      "Attendance Rate (%)",
    ];

    const rows: string[][] = [];
    const students = (classDoc.students as any[]) || [];

    for (const student of students) {
      let presentCount = 0;
      let absentCount = 0;
      let lateCount = 0;
      let excusedCount = 0;
      let totalRecordedDays = 0;

      const dailyStatuses: string[] = [];

      for (let day = 1; day <= daysInMonth; day++) {
        const recordForDay = attendanceRecords.find((rec) => {
          const recDate = new Date(rec.date);
          return recDate.getDate() === day;
        });

        if (!recordForDay) {
          dailyStatuses.push("-");
          continue;
        }

        const studentEntry = recordForDay.records.find(
          (r: any) => r.student.toString() === student._id.toString()
        );

        if (!studentEntry) {
          dailyStatuses.push("-");
        } else {
          totalRecordedDays++;
          switch (studentEntry.status) {
            case "present":
              presentCount++;
              dailyStatuses.push("P");
              break;
            case "absent":
              absentCount++;
              dailyStatuses.push("A");
              break;
            case "late":
              lateCount++;
              dailyStatuses.push("L");
              break;
            case "excused":
              excusedCount++;
              dailyStatuses.push("E");
              break;
            default:
              dailyStatuses.push("-");
          }
        }
      }

      const rate =
        totalRecordedDays > 0
          ? (((presentCount + lateCount) / totalRecordedDays) * 100).toFixed(1)
          : "N/A";

      rows.push([
        student.name,
        student.email,
        ...dailyStatuses,
        String(presentCount),
        String(absentCount),
        String(lateCount),
        String(excusedCount),
        rate !== "N/A" ? `${rate}%` : "N/A",
      ]);
    }

    const monthName = startDate.toLocaleString("en-US", { month: "long" });
    const csvContent =
      "\uFEFF" + // UTF-8 BOM for Microsoft Excel compatibility
      [headers.map(escapeCsv).join(","), ...rows.map((row) => row.map(escapeCsv).join(","))].join(
        "\r\n"
      );

    const safeClassName = classDoc.name.replace(/[^a-zA-Z0-9-_]/g, "_");
    return {
      filename: `Attendance_${safeClassName}_${monthName}_${targetYear}.csv`,
      csv: csvContent,
    };
  }

  /**
   * 2. Export Student GPA & Academic Performance Report Card to CSV
   */
  static async exportStudentReportCardCsv(
    studentId: string
  ): Promise<{ filename: string; csv: string } | null> {
    const student = await User.findById(studentId).populate("studentClass", "name");
    if (!student || student.role !== "student") return null;

    const submissions = await ExamSubmission.find({ student: studentId })
      .populate({
        path: "exam",
        populate: { path: "subject", select: "name code" },
      })
      .sort({ submittedAt: -1 });

    const totalSubmissions = submissions.length;
    let totalScoreSum = 0;
    let totalMaxScoreSum = 0;

    const examRows: string[][] = [];

    for (const sub of submissions) {
      const exam: any = sub.exam;
      if (!exam) continue;

      totalScoreSum += sub.score || 0;
      totalMaxScoreSum += exam.totalMarks || 100;

      const percentageVal = exam.totalMarks
        ? ((sub.score || 0) / exam.totalMarks) * 100
        : 0;
      const percentage = exam.totalMarks
        ? percentageVal.toFixed(1) + "%"
        : "N/A";
      const letterGrade = exam.totalMarks ? calculateGrade(percentageVal).grade : "N/A";

      const submittedDate = sub.submittedAt
        ? new Date(sub.submittedAt).toLocaleDateString("en-US")
        : "N/A";

      examRows.push([
        exam.title,
        exam.subject?.name || "General Subject",
        exam.subject?.code || "-",
        String(sub.score || 0),
        String(exam.totalMarks || 100),
        percentage,
        letterGrade,
        submittedDate,
      ]);
    }

    const overallPercentage =
      totalMaxScoreSum > 0 ? ((totalScoreSum / totalMaxScoreSum) * 100).toFixed(1) + "%" : "N/A";

    const summaryHeaders = ["Metric", "Value"];
    const summaryRows = [
      ["Student Name", student.name],
      ["Email Address", student.email],
      ["Class Section", (student.studentClass as any)?.name || "Unassigned"],
      ["Total Assessments Taken", String(totalSubmissions)],
      ["Cumulative Average Score", overallPercentage],
      ["Report Generated At", new Date().toLocaleString("en-US")],
    ];

    const assessmentHeaders = [
      "Assessment Title",
      "Subject",
      "Subject Code",
      "Earned Score",
      "Total Marks",
      "Percentage",
      "Letter Grade",
      "Completion Date",
    ];

    const csvContent =
      "\uFEFF" +
      [
        "=== STUDENT PROFILE SUMMARY ===",
        summaryHeaders.map(escapeCsv).join(","),
        ...summaryRows.map((r) => r.map(escapeCsv).join(",")),
        "",
        "=== ASSESSMENT RESULTS ===",
        assessmentHeaders.map(escapeCsv).join(","),
        ...examRows.map((r) => r.map(escapeCsv).join(",")),
      ].join("\r\n");

    const safeStudentName = student.name.replace(/[^a-zA-Z0-9-_]/g, "_");
    return {
      filename: `ReportCard_${safeStudentName}_${Date.now()}.csv`,
      csv: csvContent,
    };
  }

  /**
   * 3. Export Students Directory Roster to CSV
   */
  static async exportStudentsDirectoryCsv(
    classId?: string
  ): Promise<{ filename: string; csv: string }> {
    const filter: any = { role: "student" };
    if (classId) {
      filter.studentClass = classId;
    }

    const students = await User.find(filter)
      .populate("studentClass", "name")
      .populate("parentId", "name email phoneNumber")
      .sort({ name: 1 });

    const headers = [
      "Student ID",
      "Full Name",
      "Email Address",
      "Class Section",
      "Phone Number",
      "Home Address",
      "Account Status",
      "Emergency Contact Name",
      "Emergency Contact Phone",
      "Emergency Contact Relationship",
      "Parent Guardian Name",
      "Parent Guardian Phone",
      "Registration Date",
    ];

    const rows = students.map((st: any) => [
      st._id.toString(),
      st.name,
      st.email,
      st.studentClass?.name || "Unassigned",
      st.phoneNumber || "N/A",
      st.address || "N/A",
      st.isActive ? "Active" : "Inactive",
      st.emergencyContact?.name || "N/A",
      st.emergencyContact?.phone || "N/A",
      st.emergencyContact?.relationship || "N/A",
      st.parentId?.name || "N/A",
      st.parentId?.phoneNumber || "N/A",
      st.createdAt ? new Date(st.createdAt).toLocaleDateString("en-US") : "N/A",
    ]);

    const csvContent =
      "\uFEFF" +
      [headers.map(escapeCsv).join(","), ...rows.map((row) => row.map(escapeCsv).join(","))].join(
        "\r\n"
      );

    return {
      filename: `Student_Directory_${classId ? "Class_" + classId : "All"}_${Date.now()}.csv`,
      csv: csvContent,
    };
  }
}
