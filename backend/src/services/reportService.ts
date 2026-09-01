import mongoose from "mongoose";
import User from "../models/user.ts";
import Class from "../models/class.ts";
import Exam from "../models/exam.ts";
import Submission from "../models/submission.ts";
import Subject from "../models/subject.ts";
import { getStudentAttendanceSummary, getCampusAttendanceOverview } from "./attendanceService.ts";

export const calculateGrade = (percentage: number): { grade: string; gpa: number; cgpa: number; status: string } => {
  const gpa = Number((Math.min(4.0, Math.max(0, (percentage / 100) * 4.0))).toFixed(2));
  const cgpa = Number((Math.min(10.0, Math.max(0, (percentage / 100) * 10.0))).toFixed(2));

  if (percentage >= 90) return { grade: "A+", gpa, cgpa, status: "Distinction" };
  if (percentage >= 80) return { grade: "A", gpa, cgpa, status: "Excellent" };
  if (percentage >= 70) return { grade: "B", gpa, cgpa, status: "Good" };
  if (percentage >= 60) return { grade: "C", gpa, cgpa, status: "Satisfactory" };
  if (percentage >= 50) return { grade: "D", gpa, cgpa, status: "Pass" };
  return { grade: "F", gpa, cgpa, status: "Needs Improvement" };
};

export const getStudentReportCard = async (studentId: string) => {
  const student = await User.findById(studentId).populate("studentClass");
  if (!student) {
    throw new Error("Student not found");
  }

  // Get student's class
  const studentClass = await Class.findById(student.studentClass).populate("subjects");
  const subjects = (studentClass?.subjects as any[]) || [];

  // Get all submissions by this student
  const submissions = await Submission.find({ student: studentId })
    .populate({
      path: "exam",
      populate: [{ path: "subject", select: "name code" }, { path: "class", select: "name" }],
    })
    .sort({ submittedAt: -1 });

  // Map submissions by subject (excluding non-academic subjects like Study Hour)
  const subjectMap: { [subjectId: string]: { name: string; code: string; exams: any[]; totalScored: number; totalPossible: number } } = {};

  // Initialize with all class subjects except STD101
  subjects.forEach((subj: any) => {
    if (subj.code === "STD101" || subj.name?.toLowerCase().includes("study hour")) return;
    const sId = subj._id.toString();
    subjectMap[sId] = {
      name: subj.name,
      code: subj.code,
      exams: [],
      totalScored: 0,
      totalPossible: 0,
    };
  });

  let cumulativeScored = 0;
  let cumulativePossible = 0;

  submissions.forEach((sub: any) => {
    const exam = sub.exam;
    if (!exam) return;

    const subjectObj = exam.subject;
    if (subjectObj?.code === "STD101" || subjectObj?.name?.toLowerCase().includes("study hour")) return;
    const sId = subjectObj?._id ? subjectObj._id.toString() : "other";

    if (!subjectMap[sId]) {
      subjectMap[sId] = {
        name: subjectObj?.name || "General Subject",
        code: subjectObj?.code || "GEN",
        exams: [],
        totalScored: 0,
        totalPossible: 0,
      };
    }

    const totalExamPoints = exam.questions?.reduce((acc: number, q: any) => acc + (q.points || 1), 0) || 10;
    const scoredPoints = sub.score || 0;

    subjectMap[sId].exams.push({
      examId: exam._id,
      title: exam.title,
      score: scoredPoints,
      totalPoints: totalExamPoints,
      percentage: Math.round((scoredPoints / totalExamPoints) * 100),
      submittedAt: sub.submittedAt,
    });

    subjectMap[sId].totalScored += scoredPoints;
    subjectMap[sId].totalPossible += totalExamPoints;

    cumulativeScored += scoredPoints;
    cumulativePossible += totalExamPoints;
  });

  const subjectReports = Object.values(subjectMap).map((item) => {
    const percentage = item.totalPossible > 0 ? Math.round((item.totalScored / item.totalPossible) * 100) : 0;
    const gradeInfo = calculateGrade(percentage);

    return {
      subjectName: item.name,
      subjectCode: item.code,
      examsTaken: item.exams.length,
      totalScored: item.totalScored,
      totalPossible: item.totalPossible,
      percentage,
      grade: gradeInfo.grade,
      gpa: gradeInfo.gpa,
      status: gradeInfo.status,
      exams: item.exams,
    };
  });

  const overallPercentage =
    cumulativePossible > 0 ? Math.round((cumulativeScored / cumulativePossible) * 100) : 0;
  const overallGrade = calculateGrade(overallPercentage);

  // Real attendance summary
  const attendance = await getStudentAttendanceSummary(studentId);

  return {
    student: {
      _id: student._id,
      name: student.name,
      email: student.email,
      className: (studentClass as any)?.name || "Unassigned",
    },
    academicPerformance: {
      overallPercentage,
      overallGrade: overallGrade.grade,
      overallGPA: overallGrade.gpa,
      overallCGPA: overallGrade.cgpa,
      overallStatus: overallGrade.status,
      totalExamsTaken: submissions.length,
      cumulativeScored,
      cumulativePossible,
    },
    attendance: {
      percentage: attendance.percentage,
      totalDays: attendance.totalDays,
      presentCount: attendance.presentCount,
      absentCount: attendance.absentCount,
      lateCount: attendance.lateCount,
    },
    subjects: subjectReports,
  };
};

export const getClassPerformanceAnalytics = async (classId: string) => {
  const classDoc = await Class.findById(classId)
    .populate("students", "name email")
    .populate("subjects", "name code")
    .populate("classTeacher", "name email");

  if (!classDoc) {
    throw new Error("Class not found");
  }

  // Find all exams for this class
  const exams = await Exam.find({ class: classId }).populate("subject", "name code");
  const examIds = exams.map((e) => e._id);

  // Find all submissions
  const submissions = await Submission.find({ exam: { $in: examIds } }).populate("student", "name email");

  let totalScorePercentage = 0;
  let passedCount = 0;
  let highestPercentage = 0;
  let lowestPercentage = 100;

  const scoreDist = {
    distinction: 0, // >= 85%
    proficient: 0,  // 70-84%
    basic: 0,       // 50-69%
    belowBasic: 0,  // < 50%
  };

  // Student ranking map
  const studentScores: { [studentId: string]: { name: string; email: string; scored: number; possible: number; examCount: number } } = {};

  // Initialize students
  (classDoc.students as any[]).forEach((st: any) => {
    studentScores[st._id.toString()] = {
      name: st.name,
      email: st.email,
      scored: 0,
      possible: 0,
      examCount: 0,
    };
  });

  submissions.forEach((sub: any) => {
    const exam = exams.find((e) => e._id.toString() === sub.exam.toString());
    const totalPoints = exam?.questions?.reduce((acc: number, q: any) => acc + (q.points || 1), 0) || 10;
    const scored = sub.score || 0;
    const pct = Math.round((scored / totalPoints) * 100);

    totalScorePercentage += pct;
    if (pct >= 50) passedCount++;
    if (pct > highestPercentage) highestPercentage = pct;
    if (pct < lowestPercentage) lowestPercentage = pct;

    if (pct >= 85) scoreDist.distinction++;
    else if (pct >= 70) scoreDist.proficient++;
    else if (pct >= 50) scoreDist.basic++;
    else scoreDist.belowBasic++;

    const sId = sub.student?._id ? sub.student._id.toString() : sub.student?.toString();
    if (sId && studentScores[sId]) {
      studentScores[sId].scored += scored;
      studentScores[sId].possible += totalPoints;
      studentScores[sId].examCount += 1;
    }
  });

  const totalSubs = submissions.length;
  const averageScore = totalSubs > 0 ? Math.round(totalScorePercentage / totalSubs) : 0;
  const passRate = totalSubs > 0 ? Math.round((passedCount / totalSubs) * 100) : 100;

  // Student Leaderboard / Rankings
  const rankings = Object.values(studentScores)
    .map((st) => {
      const avg = st.possible > 0 ? Math.round((st.scored / st.possible) * 100) : 0;
      return {
        name: st.name,
        email: st.email,
        examsCompleted: st.examCount,
        averagePercentage: avg,
        grade: calculateGrade(avg).grade,
      };
    })
    .sort((a, b) => b.averagePercentage - a.averagePercentage);

  // Subject-wise performance
  const subjectPerformance: { [subId: string]: { name: string; code: string; totalScore: number; count: number } } = {};
  exams.forEach((exam: any) => {
    const sId = exam.subject?._id?.toString() || "other";
    if (!subjectPerformance[sId]) {
      subjectPerformance[sId] = {
        name: exam.subject?.name || "Subject",
        code: exam.subject?.code || "SUB",
        totalScore: 0,
        count: 0,
      };
    }
  });

  submissions.forEach((sub: any) => {
    const exam = exams.find((e) => e._id.toString() === sub.exam.toString());
    if (exam && exam.subject) {
      const sId = (exam.subject as any)._id?.toString();
      const totalPoints = exam.questions?.reduce((acc: number, q: any) => acc + (q.points || 1), 0) || 10;
      const pct = Math.round(((sub.score || 0) / totalPoints) * 100);

      if (subjectPerformance[sId]) {
        subjectPerformance[sId].totalScore += pct;
        subjectPerformance[sId].count++;
      }
    }
  });

  const subjectChart = Object.values(subjectPerformance).map((sp) => ({
    name: sp.name,
    code: sp.code,
    average: sp.count > 0 ? Math.round(sp.totalScore / sp.count) : 0,
    submissions: sp.count,
  }));

  return {
    class: {
      _id: classDoc._id,
      name: classDoc.name,
      teacherName: (classDoc.classTeacher as any)?.name || "Unassigned",
      totalStudents: (classDoc.students as any[]).length,
    },
    metrics: {
      averageScore,
      passRate,
      highestScore: totalSubs > 0 ? highestPercentage : 0,
      lowestScore: totalSubs > 0 ? lowestPercentage : 0,
      totalExams: exams.length,
      totalSubmissions: totalSubs,
    },
    scoreDistribution: [
      { name: "Distinction (85-100%)", count: scoreDist.distinction },
      { name: "Proficient (70-84%)", count: scoreDist.proficient },
      { name: "Basic (50-69%)", count: scoreDist.basic },
      { name: "Below Basic (<50%)", count: scoreDist.belowBasic },
    ],
    subjectPerformance: subjectChart,
    rankings,
  };
};

export const getSchoolAnalyticsOverview = async () => {
  const [totalStudents, totalTeachers, totalClasses, totalExams, totalSubmissions, attendanceOverview] =
    await Promise.all([
      User.countDocuments({ role: "student" }),
      User.countDocuments({ role: "teacher" }),
      Class.countDocuments(),
      Exam.countDocuments(),
      Submission.countDocuments(),
      getCampusAttendanceOverview(),
    ]);

  const classes = await Class.find().populate("students", "_id").select("name capacity students");
  const classEnrollments = classes.map((c) => ({
    name: c.name,
    enrolled: (c.students as any[]).length,
    capacity: c.capacity || 40,
  }));

  return {
    totalStudents,
    totalTeachers,
    totalClasses,
    totalExams,
    totalSubmissions,
    attendanceRate: attendanceOverview.todayRate,
    attendanceTrend: attendanceOverview.trend,
    classEnrollments,
  };
};

export interface StudentMarkEntry {
  studentId: string;
  score: number;
  remarks?: string;
}

export interface BatchMarksInput {
  classId: string;
  subjectId: string;
  title: string;
  maxMarks: number;
  examDate?: string;
  marksData: StudentMarkEntry[];
}

export const saveBatchMarks = async (
  teacherUser: { _id: string | mongoose.Types.ObjectId; role: string },
  input: BatchMarksInput
) => {
  const { classId, subjectId, title, maxMarks, marksData, examDate } = input;

  if (!classId || !subjectId || !title || !maxMarks || !marksData) {
    throw new Error("Missing required marks entry parameters");
  }

  // 1. Check Class & Subject exist
  const [classDoc, subjectDoc] = await Promise.all([
    Class.findById(classId).populate("students", "name email"),
    Subject.findById(subjectId),
  ]);

  if (!classDoc) throw new Error("Class not found");
  if (!subjectDoc) throw new Error("Subject not found");

  // 2. Find or create Exam document for this Assessment title, class, and subject
  let exam = await Exam.findOne({
    class: classId,
    subject: subjectId,
    title: title.trim(),
  });

  const parsedDueDate = examDate ? new Date(examDate) : new Date();

  if (exam) {
    exam.questions = [
      {
        _id: exam.questions?.[0]?._id || new mongoose.Types.ObjectId(),
        questionText: `${subjectDoc.name} Assessment - ${title}`,
        type: "SHORT_ANSWER",
        correctAnswer: "N/A",
        points: Number(maxMarks) || 100,
      } as any,
    ];
    exam.duration = 60;
    exam.dueDate = parsedDueDate;
    exam.teacher = new mongoose.Types.ObjectId(teacherUser._id);
    exam.isActive = true;
    await exam.save();
  } else {
    exam = await Exam.create({
      title: title.trim(),
      class: classId,
      subject: subjectId,
      teacher: teacherUser._id,
      duration: 60,
      dueDate: parsedDueDate,
      isActive: true,
      questions: [
        {
          questionText: `${subjectDoc.name} Assessment - ${title}`,
          type: "SHORT_ANSWER",
          correctAnswer: "N/A",
          points: Number(maxMarks) || 100,
        },
      ],
    });
  }

  const questionId = exam.questions[0]._id.toString();

  // 3. Upsert submissions for each student
  const savedSubmissions = [];
  for (const item of marksData) {
    if (!item.studentId) continue;
    const scoreVal = Math.max(0, Math.min(Number(maxMarks) || 100, Number(item.score) || 0));

    const submission = await Submission.findOneAndUpdate(
      { exam: exam._id, student: item.studentId },
      {
        exam: exam._id,
        student: item.studentId,
        score: scoreVal,
        submittedAt: new Date(),
        answers: [
          {
            questionId,
            answer: item.remarks || "Graded by faculty",
          },
        ],
      },
      { upsert: true, new: true }
    );
    savedSubmissions.push(submission);
  }

  return {
    success: true,
    message: `Successfully saved marks for ${savedSubmissions.length} students in ${classDoc.name} (${subjectDoc.name})`,
    exam: {
      _id: exam._id,
      title: exam.title,
      maxMarks: Number(maxMarks) || 100,
      dueDate: exam.dueDate,
    },
    savedCount: savedSubmissions.length,
  };
};

export const getBatchMarks = async (classId: string, subjectId: string) => {
  const [classDoc, subjectDoc] = await Promise.all([
    Class.findById(classId).populate("students", "name email").select("name capacity students"),
    Subject.findById(subjectId).select("name code"),
  ]);

  if (!classDoc) throw new Error("Class not found");
  if (!subjectDoc) throw new Error("Subject not found");

  const exams = await Exam.find({ class: classId, subject: subjectId }).sort({ createdAt: -1 });
  const examIds = exams.map((e) => e._id);

  const submissions = await Submission.find({ exam: { $in: examIds } }).populate("student", "name email");

  const formattedExams = exams.map((e) => {
    const totalPts = e.questions?.reduce((acc: number, q: any) => acc + (q.points || 0), 0) || e.questions?.[0]?.points || 25;
    return {
      _id: e._id,
      title: e.title,
      maxMarks: totalPts,
      dueDate: e.dueDate,
      createdAt: (e as any).createdAt,
    };
  });

  let studentEntities = ((classDoc.students as any[]) || []).filter((s) => s && s.name);
  if (studentEntities.length === 0) {
    studentEntities = await User.find({ studentClass: classId, role: "student" }).select("name email");
  }

  const students = studentEntities.map((st: any) => {
    const studentSubs = submissions.filter((s) => s.student?._id?.toString() === st._id?.toString());
    const marksRecord: { [examId: string]: { score: number; percentage: number; remarks: string } } = {};

    studentSubs.forEach((sub) => {
      const exId = sub.exam.toString();
      const matchedExam = exams.find((e) => e._id.toString() === exId);
      const maxPts = matchedExam?.questions?.reduce((acc: number, q: any) => acc + (q.points || 0), 0) || matchedExam?.questions?.[0]?.points || 25;
      marksRecord[exId] = {
        score: sub.score,
        percentage: Math.round((sub.score / maxPts) * 100),
        remarks: sub.answers?.[0]?.answer || "",
      };
    });

    return {
      _id: st._id,
      name: st.name,
      email: st.email,
      marks: marksRecord,
    };
  });

  return {
    class: { _id: classDoc._id, name: classDoc.name },
    subject: { _id: subjectDoc._id, name: subjectDoc.name, code: subjectDoc.code },
    exams: formattedExams,
    students,
  };
};

