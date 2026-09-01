export type UserRole = "admin" | "teacher" | "student";

export interface pagination {
  total: number;
  page: number;
  pages: number;
  limit: number;
}

export interface EmergencyContact {
  name?: string;
  phone?: string;
  relationship?: string;
}

export interface user {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive?: boolean;
  phoneNumber?: string;
  address?: string;
  emergencyContact?: EmergencyContact;
  avatar?: string;
  studentClass?: Class;
  teacherSubjects?: subject[];
}

export interface academicYear {
  _id: string;
  name: string; // "2024-2025"
  fromYear: Date; // "2024-09-01"
  toYear: Date; // "2025-06-30"
  isCurrent: boolean; // true/false
}

export interface Class {
  _id: string;
  name: string; // e.g., "Grade 10"
  academicYear: academicYear; // Link to "2024-2025"
  classTeacher: user; // The main teacher in charge
  subjects: subject[]; // List of subjects taught in this class
  students: user[]; // List of students enrolled
  capacity: number; // Max students allowed (optional)
}

export interface subject {
  _id: string;
  name: string; // "Mathematics"
  code: string; // "MATH101"
  teacher?: user[]; // Default teacher for this subject
  isActive: boolean; // Indicates if the subject is currently active
}

export interface question {
  _id: string;
  questionText: string;
  type: string;
  options: string[]; // Array of strings e.g. ["A", "B", "C", "D"]
  correctAnswer: string; // Hidden from students in default queries
  points: number;
}

export interface exam {
  _id: string;
  title: string;
  subject: subject;
  class: Class;
  teacher: user;
  duration: number; // in minutes
  questions: question[];
  dueDate: Date;
  isActive: boolean;
}

export interface Submission {
  _id: string;
  score: number;
  exam: exam; // The populated exam with answers
  answers: { questionId: string; answer: string }[];
}

export interface period {
  _id: string;
  subject: { _id: string; name: string; code: string };
  teacher: { _id: string; name: string };
  startTime: string; // e.g., "08:00"
  endTime: string; // e.g., "08:45"
}

export interface schedule {
  day: string; // "Monday", "Tuesday", etc.
  periods: period[];
}

export type AttendanceStatus = "present" | "absent" | "late" | "excused";

export interface AttendanceRecord {
  student: user | string;
  status: AttendanceStatus;
  remarks?: string;
}

export interface Attendance {
  _id: string;
  class: Class | string;
  academicYear: academicYear | string;
  date: string;
  recordedBy: user | string;
  records: AttendanceRecord[];
  createdAt: string;
  updatedAt: string;
}

export interface StudentAttendanceSummary {
  className?: string;
  totalDays: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  excusedCount: number;
  percentage: number;
  history: {
    _id: string;
    date: string;
    className: string;
    recordedBy: string;
    status: AttendanceStatus;
    remarks?: string;
  }[];
}

export interface CampusAttendanceOverview {
  todayRate: string;
  todayTotal: number;
  todayPresent: number;
  todayAbsent: number;
  todayLate: number;
  classesRecordedToday: number;
  trend: {
    date: string;
    rate: number;
    totalStudents: number;
  }[];
}

export type AnnouncementAudience = "all" | "teacher" | "student" | "class";
export type AnnouncementPriority = "low" | "medium" | "high" | "urgent";

export interface Announcement {
  _id: string;
  title: string;
  content: string;
  audience: AnnouncementAudience[];
  targetClass?: { _id: string; name: string } | null;
  priority: AnnouncementPriority;
  createdBy: { _id: string; name: string; role: string };
  isActive: boolean;
  expiryDate?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SubjectReport {
  subjectName: string;
  subjectCode: string;
  examsTaken: number;
  totalExams?: number;
  totalScored: number;
  totalPossible: number;
  percentage: number;
  grade: string;
  gpa: number;
  status: string;
  exams: {
    examId: string;
    title: string;
    score: number;
    totalPoints: number;
    percentage: number;
    submittedAt: string;
  }[];
}

export interface StudentReportCard {
  student: {
    _id: string;
    name: string;
    email: string;
    className: string;
  };
  academicPerformance: {
    overallPercentage: number;
    overallGrade: string;
    overallGPA: number;
    overallCGPA?: number;
    overallStatus: string;
    totalExamsTaken: number;
    cumulativeScored: number;
    cumulativePossible: number;
  };
  attendance: {
    percentage: number;
    totalDays: number;
    presentCount: number;
    absentCount: number;
    lateCount: number;
  };
  subjects: SubjectReport[];
}

export interface ClassAnalytics {
  class: {
    _id: string;
    name: string;
    teacherName: string;
    totalStudents: number;
  };
  metrics: {
    averageScore: number;
    passRate: number;
    highestScore: number;
    lowestScore: number;
    totalExams: number;
    totalSubmissions: number;
  };
  scoreDistribution: { name: string; count: number }[];
  subjectPerformance: {
    name: string;
    code: string;
    average: number;
    submissions: number;
  }[];
  rankings: {
    name: string;
    email: string;
    examsCompleted: number;
    averagePercentage: number;
    grade: string;
  }[];
}

