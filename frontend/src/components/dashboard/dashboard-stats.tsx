import {
  Users,
  BookOpen,
  Clock,
  GraduationCap,
  CalendarDays,
  AlertCircle,
  FileCheck2,
  DollarSign,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface StatsProps {
  role: string;
  data: any;
}

export function DashboardStats({ role, data }: StatsProps) {
  // --- ADMIN VIEW ---
  if (role === "admin") {
    return (
      <>
        {/* Students -> Blue */}
        <Card className="bg-white border-[#E2E8F0] shadow-xs hover:shadow-sm transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-[#64748B]">
              Total Students
            </CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-[#1E40AF]">
              <Users className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#0F172A]">
              {data.totalStudents || 0}
            </div>
            <p className="text-xs font-medium text-[#64748B] mt-1">
              <span className="text-emerald-600 font-semibold">+12%</span> from last year
            </p>
          </CardContent>
        </Card>

        {/* Teachers -> Teal */}
        <Card className="bg-white border-[#E2E8F0] shadow-xs hover:shadow-sm transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-[#64748B]">
              Total Teachers
            </CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-50 text-[#0F766E]">
              <GraduationCap className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#0F172A]">
              {data.totalTeachers || 0}
            </div>
            <p className="text-xs font-medium text-[#64748B] mt-1">
              Active Faculty Members
            </p>
          </CardContent>
        </Card>

        {/* Attendance -> Emerald */}
        <Card className="bg-white border-[#E2E8F0] shadow-xs hover:shadow-sm transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-[#64748B]">
              Avg Attendance
            </CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-[#16A34A]">
              <Clock className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#0F172A]">
              {data.avgAttendance || "94.2%"}
            </div>
            <p className="text-xs font-medium text-[#64748B] mt-1">
              Campus-wide today
            </p>
          </CardContent>
        </Card>

        {/* Exams / Fees -> Amber */}
        <Card className="bg-white border-[#E2E8F0] shadow-xs hover:shadow-sm transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-[#64748B]">
              Active Exams
            </CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-[#D97706]">
              <BookOpen className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#0F172A]">
              {data.activeExams || 0}
            </div>
            <p className="text-xs font-medium text-[#64748B] mt-1">
              Scheduled & Live
            </p>
          </CardContent>
        </Card>
      </>
    );
  }

  // --- TEACHER VIEW ---
  if (role === "teacher") {
    return (
      <>
        {/* Classes -> Teal */}
        <Card className="bg-white border-[#E2E8F0] shadow-xs hover:shadow-sm transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-[#64748B]">
              Assigned Classes
            </CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-50 text-[#0F766E]">
              <Users className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#0F172A]">
              {data.myClassesCount || 0}
            </div>
            <p className="text-xs font-medium text-[#64748B] mt-1">
              Active student sections
            </p>
          </CardContent>
        </Card>

        {/* Pending Grading -> Red Alert */}
        <Card className="bg-white border-[#E2E8F0] shadow-xs hover:shadow-sm transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-[#64748B]">
              Pending Grading
            </CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50 text-[#DC2626]">
              <AlertCircle className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#0F172A]">
              {data.pendingGrading || 0}
            </div>
            <p className="text-xs font-medium text-[#DC2626] mt-1">
              Requires assessment review
            </p>
          </CardContent>
        </Card>

        {/* Next Class -> Blue */}
        <Card className="bg-white border-[#E2E8F0] shadow-xs hover:shadow-sm transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-[#64748B]">
              Next Lecture
            </CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-[#1E40AF]">
              <Clock className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-[#0F172A] truncate">
              {data.nextClass || "No classes today"}
            </div>
            <p className="text-xs font-medium text-[#64748B] mt-1">
              {data.nextClassTime || "All periods completed"}
            </p>
          </CardContent>
        </Card>

        {/* Active LMS Quizzes -> Amber */}
        <Card className="bg-white border-[#E2E8F0] shadow-xs hover:shadow-sm transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-[#64748B]">
              Active Quizzes
            </CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-[#D97706]">
              <BookOpen className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#0F172A]">
              {data.activeExamsCount || 0}
            </div>
            <p className="text-xs font-medium text-[#64748B] mt-1">
              Live & scheduled exams
            </p>
          </CardContent>
        </Card>
      </>
    );
  }

  // --- PARENT VIEW ---
  if (role === "parent") {
    return (
      <>
        {/* Child Attendance -> Emerald */}
        <Card className="bg-white border-[#E2E8F0] shadow-xs hover:shadow-sm transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-[#64748B]">
              Child's Attendance
            </CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-[#16A34A]">
              <Clock className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#0F172A]">
              {data.childAttendance || "96%"}
            </div>
            <p className="text-xs font-medium text-emerald-600 mt-1">
              {data.childPresentDays || "19/20 Days Present"}
            </p>
          </CardContent>
        </Card>

        {/* Linked Child -> Blue */}
        <Card className="bg-white border-[#E2E8F0] shadow-xs hover:shadow-sm transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-[#64748B]">
              Linked Student
            </CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-[#1E40AF]">
              <GraduationCap className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-[#0F172A] truncate">
              {data.childName || "Alex Johnson"}
            </div>
            <p className="text-xs font-medium text-[#64748B] mt-1">
              Enrolled: {data.childClass || "Grade 10-A"}
            </p>
          </CardContent>
        </Card>

        {/* Exams Completed -> Teal */}
        <Card className="bg-white border-[#E2E8F0] shadow-xs hover:shadow-sm transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-[#64748B]">
              Exams Completed
            </CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-50 text-[#0F766E]">
              <FileCheck2 className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#0F172A]">
              {data.childExamsCompleted || 0}
            </div>
            <p className="text-xs font-medium text-emerald-600 mt-1">
              {data.childStatus || "Good Standing"}
            </p>
          </CardContent>
        </Card>

        {/* School Notices -> Amber */}
        <Card className="bg-white border-[#E2E8F0] shadow-xs hover:shadow-sm transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-[#64748B]">
              Guardian Status
            </CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-[#D97706]">
              <Users className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-[#0F172A]">
              Active Guardian
            </div>
            <p className="text-xs font-medium text-[#64748B] mt-1">
              Direct notifications enabled
            </p>
          </CardContent>
        </Card>
      </>
    );
  }

  // --- STUDENT VIEW ---
  return (
    <>
      {/* Attendance -> Emerald */}
      <Card className="bg-white border-[#E2E8F0] shadow-xs hover:shadow-sm transition-all duration-200">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-semibold text-[#64748B]">
            My Attendance
          </CardTitle>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-[#16A34A]">
            <Clock className="h-5 w-5" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-[#0F172A]">
            {data.myAttendance || "96%"}
          </div>
          <p className="text-xs font-medium text-emerald-600 mt-1">
            Excellent attendance record
          </p>
        </CardContent>
      </Card>

      {/* Enrolled Section -> Teal */}
      <Card className="bg-white border-[#E2E8F0] shadow-xs hover:shadow-sm transition-all duration-200">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-semibold text-[#64748B]">
            Enrolled Class
          </CardTitle>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-50 text-[#0F766E]">
            <GraduationCap className="h-5 w-5" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-[#0F172A]">
            {data.className || "Grade 10-A"}
          </div>
          <p className="text-xs font-medium text-[#64748B] mt-1">
            Academic Year 2025-2026
          </p>
        </CardContent>
      </Card>

      {/* Quizzes / Assignments -> Blue */}
      <Card className="bg-white border-[#E2E8F0] shadow-xs hover:shadow-sm transition-all duration-200">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-semibold text-[#64748B]">
            Pending Quizzes
          </CardTitle>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-[#1E40AF]">
            <BookOpen className="h-5 w-5" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-[#0F172A]">
            {data.pendingAssignments || 0}
          </div>
          <p className="text-xs font-medium text-[#64748B] mt-1">
            Available in testing portal
          </p>
        </CardContent>
      </Card>

      {/* Next Exam -> Amber */}
      <Card className="bg-white border-[#E2E8F0] shadow-xs hover:shadow-sm transition-all duration-200">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-semibold text-[#64748B]">
            Upcoming Exam
          </CardTitle>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-[#D97706]">
            <CalendarDays className="h-5 w-5" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-xl font-bold text-[#0F172A] truncate">
            {data.nextExam || "Midterms"}
          </div>
          <p className="text-xs font-medium text-[#64748B] mt-1">
            {data.nextExamDate || "In 4 days"}
          </p>
        </CardContent>
      </Card>
    </>
  );
}
