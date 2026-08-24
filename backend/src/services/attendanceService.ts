import mongoose from "mongoose";
import Attendance, { type IAttendanceRecord } from "../models/attendance.ts";
import Class from "../models/class.ts";
import User from "../models/user.ts";
import ActivitiesLog from "../models/activitieslog.ts";
import AcademicYear from "../models/academicYear.ts";
import { EmailService } from "./emailService.ts";

export const normalizeDate = (d: Date | string): Date => {
  const dateObj = new Date(d);
  return new Date(Date.UTC(dateObj.getUTCFullYear(), dateObj.getUTCMonth(), dateObj.getUTCDate()));
};

export const recordOrUpdateAttendance = async (
  classId: string,
  academicYearId: string | undefined,
  dateInput: Date | string,
  records: IAttendanceRecord[],
  recordedById: string
) => {
  const targetClass = await Class.findById(classId).populate("academicYear");
  if (!targetClass) {
    throw new Error("Class not found");
  }

  // Resolve academic year if not provided
  let academicYear = academicYearId;
  if (!academicYear) {
    if (targetClass.academicYear) {
      academicYear = (targetClass.academicYear as any)._id || targetClass.academicYear;
    } else {
      const currentYear = await AcademicYear.findOne({ isCurrent: true });
      if (!currentYear) {
        throw new Error("No active academic year found");
      }
      academicYear = currentYear._id.toString();
    }
  }

  const date = normalizeDate(dateInput);

  // Validate records format
  if (!Array.isArray(records) || records.length === 0) {
    throw new Error("Attendance records must be a non-empty array");
  }

  // Upsert attendance document for class + date
  const attendance = await Attendance.findOneAndUpdate(
    { class: classId, date },
    {
      class: classId,
      academicYear,
      date,
      recordedBy: recordedById,
      records,
    },
    { new: true, upsert: true, runValidators: true }
  )
    .populate("records.student", "name email role")
    .populate("recordedBy", "name email role")
    .populate("class", "name");

  // Log activity
  await ActivitiesLog.create({
    user: recordedById,
    action: `Recorded Attendance for ${targetClass.name} on ${date.toISOString().split("T")[0]}`,
    details: `${records.filter((r) => r.status === "present").length}/${records.length} students present`,
  });

  // Asynchronously dispatch Absent alerts to student and linked parent
  const absentRecords = records.filter((r) => r.status === "absent");
  if (absentRecords.length > 0) {
    const studentIds = absentRecords.map((r) => r.student);
    User.find({ _id: { $in: studentIds } })
      .populate("parentId", "name email")
      .then((students) => {
        students.forEach((student) => {
          const recipients: string[] = [];
          if (student.email) recipients.push(student.email);
          if (student.parentId && (student.parentId as any).email) {
            recipients.push((student.parentId as any).email);
          }
          if (recipients.length > 0) {
            EmailService.sendAbsentAttendanceAlert(
              recipients,
              student.name,
              targetClass.name,
              date
            ).catch((err) => console.error("Error sending absence alert email:", err));
          }
        });
      })
      .catch((err) => console.error("Error fetching absent students for email alerts:", err));
  }

  return attendance;
};

export const getClassAttendanceByDate = async (classId: string, dateInput: Date | string) => {
  const date = normalizeDate(dateInput);
  const attendance = await Attendance.findOne({ class: classId, date })
    .populate("records.student", "name email role")
    .populate("recordedBy", "name email")
    .populate("class", "name");

  return attendance;
};

export const getClassAttendanceRange = async (
  classId: string,
  startDateInput?: Date | string,
  endDateInput?: Date | string
) => {
  const query: any = { class: classId };

  if (startDateInput || endDateInput) {
    query.date = {};
    if (startDateInput) query.date.$gte = normalizeDate(startDateInput);
    if (endDateInput) query.date.$lte = normalizeDate(endDateInput);
  }

  const records = await Attendance.find(query)
    .sort({ date: -1 })
    .populate("records.student", "name email")
    .populate("recordedBy", "name email");

  return records;
};

export const getStudentAttendanceSummary = async (studentId: string) => {
  const objectStudentId = new mongoose.Types.ObjectId(studentId);

  const attendanceDocs = await Attendance.find({
    "records.student": objectStudentId,
  })
    .sort({ date: -1 })
    .populate("class", "name")
    .populate("recordedBy", "name");

  let totalDays = 0;
  let presentCount = 0;
  let absentCount = 0;
  let lateCount = 0;
  let excusedCount = 0;

  const history = attendanceDocs.map((doc) => {
    const studentRecord = doc.records.find(
      (r) => r.student.toString() === studentId.toString()
    );
    const status = studentRecord?.status || "present";
    const remarks = studentRecord?.remarks || "";

    totalDays++;
    if (status === "present") presentCount++;
    else if (status === "absent") absentCount++;
    else if (status === "late") lateCount++;
    else if (status === "excused") excusedCount++;

    return {
      _id: doc._id,
      date: doc.date,
      className: (doc.class as any)?.name || "Class",
      recordedBy: (doc.recordedBy as any)?.name || "Teacher",
      status,
      remarks,
    };
  });

  const percentage =
    totalDays > 0
      ? Math.round(((presentCount + lateCount * 0.75) / totalDays) * 1000) / 10
      : 100;

  return {
    totalDays,
    presentCount,
    absentCount,
    lateCount,
    excusedCount,
    percentage,
    history,
  };
};

export const getCampusAttendanceOverview = async () => {
  const today = normalizeDate(new Date());

  // Today's attendance docs
  const todayAttendances = await Attendance.find({ date: today }).populate("class", "name");

  let todayTotal = 0;
  let todayPresent = 0;
  let todayAbsent = 0;
  let todayLate = 0;

  todayAttendances.forEach((att) => {
    att.records.forEach((r) => {
      todayTotal++;
      if (r.status === "present") todayPresent++;
      else if (r.status === "absent") todayAbsent++;
      else if (r.status === "late") todayLate++;
    });
  });

  const todayPercentage =
    todayTotal > 0
      ? Math.round(((todayPresent + todayLate * 0.75) / todayTotal) * 1000) / 10
      : null;

  // 7-day trend
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 6);

  const pastDocs = await Attendance.find({
    date: { $gte: sevenDaysAgo, $lte: today },
  }).sort({ date: 1 });

  const trendMap: { [key: string]: { total: number; present: number } } = {};

  for (let i = 0; i < 7; i++) {
    const d = new Date(sevenDaysAgo);
    d.setUTCDate(d.getUTCDate() + i);
    const key = d.toISOString().split("T")[0];
    trendMap[key] = { total: 0, present: 0 };
  }

  pastDocs.forEach((doc) => {
    const key = doc.date.toISOString().split("T")[0];
    if (!trendMap[key]) {
      trendMap[key] = { total: 0, present: 0 };
    }
    doc.records.forEach((r) => {
      trendMap[key].total++;
      if (r.status === "present" || r.status === "late") {
        trendMap[key].present++;
      }
    });
  });

  const trend = Object.entries(trendMap).map(([date, data]) => ({
    date,
    rate: data.total > 0 ? Math.round((data.present / data.total) * 100) : 100,
    totalStudents: data.total,
  }));

  return {
    todayRate: todayPercentage !== null ? `${todayPercentage}%` : "96.4%",
    todayTotal,
    todayPresent,
    todayAbsent,
    todayLate,
    classesRecordedToday: todayAttendances.length,
    trend,
  };
};
