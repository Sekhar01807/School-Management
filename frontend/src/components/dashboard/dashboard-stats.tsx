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

        {/* Submissions -> Emerald */}
        <Card className="bg-white border-[#E2E8F0] shadow-xs hover:shadow-sm transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-[#64748B]">
              Auto-Graded
            </CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-[#16A34A]">
              <FileCheck2 className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#0F172A]">
              {data.gradedCount || "100%"}
            </div>
            <p className="text-xs font-medium text-[#64748B] mt-1">
              Processed by SchoolSync
            </p>
          </CardContent>
        </Card>
      </>
    );
  }

  // --- STUDENT / PARENT VIEW ---
  return (
    <>
      {/* Attendance -> Emerald */}
      <Card className="bg-white border-[#E2E8F0] shadow-xs hover:shadow-sm transition-all duration-200">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-semibold text-[#64748B]">
            Attendance Rate
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

      {/* Fees / Status -> Teal */}
      <Card className="bg-white border-[#E2E8F0] shadow-xs hover:shadow-sm transition-all duration-200">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-semibold text-[#64748B]">
            Academic Status
          </CardTitle>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-50 text-[#0F766E]">
            <DollarSign className="h-5 w-5" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-[#0F172A]">
            Enrolled
          </div>
          <p className="text-xs font-medium text-emerald-600 mt-1">
            All clearances verified
          </p>
        </CardContent>
      </Card>
    </>
  );
}
