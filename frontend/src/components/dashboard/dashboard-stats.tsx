import {
  Users,
  Clock,
  GraduationCap,
  CalendarCheck,
  Layers,
  BookOpen,
  CalendarDays,
  Award,
  ClipboardCheck,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface StatsProps {
  role: string;
  data: any;
}

export function DashboardStats({ role, data }: StatsProps) {
  // --- 1. ADMIN VIEW (School-wide overview) ---
  if (role === "admin") {
    return (
      <>
        {/* Total Students */}
        <Card className="bg-white dark:bg-[#111827] border-[#E2E8F0] dark:border-gray-800 shadow-xs hover:shadow-sm transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-[#64748B] dark:text-gray-400">
              Total Students
            </CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950/50 text-[#1E40AF] dark:text-blue-400">
              <Users className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-[#0F172A] dark:text-white">
              {data.totalStudents || 60}
            </div>
            <p className="text-xs font-medium text-[#64748B] dark:text-gray-400 mt-1">
              Enrolled across 4 sections
            </p>
          </CardContent>
        </Card>

        {/* Total Teachers */}
        <Card className="bg-white dark:bg-[#111827] border-[#E2E8F0] dark:border-gray-800 shadow-xs hover:shadow-sm transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-[#64748B] dark:text-gray-400">
              Faculty Directory
            </CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-50 dark:bg-teal-950/50 text-[#0F766E] dark:text-teal-400">
              <GraduationCap className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-[#0F172A] dark:text-white">
              {data.totalTeachers || 12}
            </div>
            <p className="text-xs font-medium text-[#64748B] dark:text-gray-400 mt-1">
              12 faculty specialists (2 per subject)
            </p>
          </CardContent>
        </Card>

        {/* Total Classes */}
        <Card className="bg-white dark:bg-[#111827] border-[#E2E8F0] dark:border-gray-800 shadow-xs hover:shadow-sm transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-[#64748B] dark:text-gray-400">
              Academic Sections
            </CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400">
              <Layers className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-[#0F172A] dark:text-white">
              {data.totalClasses || 4}
            </div>
            <p className="text-xs font-medium text-[#64748B] dark:text-gray-400 mt-1">
              Grades 9 & 10 (A/B Sections)
            </p>
          </CardContent>
        </Card>

        {/* Overall Attendance */}
        <Card className="bg-white dark:bg-[#111827] border-[#E2E8F0] dark:border-gray-800 shadow-xs hover:shadow-sm transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-[#64748B] dark:text-gray-400">
              Overall Attendance
            </CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-[#16A34A] dark:text-emerald-400">
              <Clock className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
              {data.avgAttendance || "96.4%"}
            </div>
            <p className="text-xs font-medium text-[#64748B] dark:text-gray-400 mt-1">
              Campus-wide daily roll call
            </p>
          </CardContent>
        </Card>
      </>
    );
  }

  // --- 2. TEACHER VIEW (Classes, Schedule, Roll Call, Scope) ---
  if (role === "teacher") {
    return (
      <>
        {/* My Classes */}
        <Card className="bg-white dark:bg-[#111827] border-[#E2E8F0] dark:border-gray-800 shadow-xs hover:shadow-sm transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-[#64748B] dark:text-gray-400">
              Primary Section
            </CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-50 dark:bg-teal-950/50 text-[#0F766E] dark:text-teal-400">
              <Users className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-extrabold text-[#0F172A] dark:text-white">
              {data.myClasses?.[0]?.name || "Grade 10-A"}
            </div>
            <p className="text-xs font-medium text-[#64748B] dark:text-gray-400 mt-1">
              {data.myClasses?.[0]?.studentCount ? `${data.myClasses[0].studentCount} Students Enrolled` : "15 Students Enrolled"}
            </p>
          </CardContent>
        </Card>

        {/* Live Dynamic Schedule / Next Lecture */}
        <Card className="bg-white dark:bg-[#111827] border-[#E2E8F0] dark:border-gray-800 shadow-xs hover:shadow-sm transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="flex items-center gap-1.5">
              <CardTitle className="text-xs font-semibold text-[#64748B] dark:text-gray-400">
                Lecture Status
              </CardTitle>
              {data.scheduleStatus && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${data.scheduleBadgeColor || "bg-blue-100 text-blue-800"}`}>
                  {data.scheduleStatus}
                </span>
              )}
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950/50 text-[#1E40AF] dark:text-blue-400">
              <Clock className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-sm font-bold text-[#0F172A] dark:text-white truncate" title={data.nextClass}>
              {data.nextClass || "Mathematics"}
            </div>
            <p className="text-xs font-medium text-[#64748B] dark:text-gray-400 mt-1 truncate">
              {data.nextClassTime ? `Slot: ${data.nextClassTime}` : "08:50 – 04:00 PM"} {data.timeRemainingText ? `• ${data.timeRemainingText}` : ""}
            </p>
          </CardContent>
        </Card>

        {/* Today's Attendance Status */}
        <Card className="bg-white dark:bg-[#111827] border-[#E2E8F0] dark:border-gray-800 shadow-xs hover:shadow-sm transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-[#64748B] dark:text-gray-400">
              Today's Roll Call
            </CardTitle>
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                data.todayAttendanceMarked
                  ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400"
                  : "bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400"
              }`}
            >
              <CalendarCheck className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div
              className={`text-lg font-bold ${
                data.todayAttendanceMarked
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-amber-600 dark:text-amber-400"
              }`}
            >
              {data.todayAttendanceMarked ? "Marked ✓" : "Pending Roll Call"}
            </div>
            <p className="text-xs font-medium text-[#64748B] dark:text-gray-400 mt-1">
              {data.todayAttendanceMarked ? "Daily register submitted" : "Class roll call required"}
            </p>
          </CardContent>
        </Card>

        {/* Gradebook Status */}
        <Card className="bg-white dark:bg-[#111827] border-[#E2E8F0] dark:border-gray-800 shadow-xs hover:shadow-sm transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-[#64748B] dark:text-gray-400">
              Gradebook Status
            </CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400">
              <ClipboardCheck className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-[#0F172A] dark:text-white">
              Gradebook Active
            </div>
            <p className="text-xs font-medium text-[#64748B] dark:text-gray-400 mt-1">
              Marks entry & report updates
            </p>
          </CardContent>
        </Card>
      </>
    );
  }

  // --- 3. STUDENT VIEW (Attendance, GPA, Realtime Period, Enrolled Section) ---
  if (role === "student") {
    return (
      <>
        {/* Cumulative Attendance */}
        <Card className="bg-white dark:bg-[#111827] border-[#E2E8F0] dark:border-gray-800 shadow-xs hover:shadow-sm transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-[#64748B] dark:text-gray-400">
              My Attendance
            </CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-[#16A34A] dark:text-emerald-400">
              <Clock className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
              {data.myAttendance || "96.5%"}
            </div>
            <p className="text-xs font-medium text-[#64748B] dark:text-gray-400 mt-1">
              {data.attendanceDetails?.presentCount && data.attendanceDetails?.totalDays
                ? `${data.attendanceDetails.presentCount} / ${data.attendanceDetails.totalDays} Days Present`
                : "Active semester attendance"}
            </p>
          </CardContent>
        </Card>

        {/* Cumulative CGPA / Academic Standing */}
        <Card className="bg-white dark:bg-[#111827] border-[#E2E8F0] dark:border-gray-800 shadow-xs hover:shadow-sm transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-[#64748B] dark:text-gray-400">
              Cumulative CGPA
            </CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-950/50 text-[#D97706] dark:text-amber-400">
              <Award className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-[#0F172A] dark:text-white">
              {data.cgpa || (data.gpa ? Number((data.gpa * 2.5).toFixed(1)) : 9.6)} <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">/ 10.0 ({data.overallGrade || "A+"})</span>
            </div>
            <p className="text-xs font-medium text-[#64748B] dark:text-gray-400 mt-1">
              GPA: {data.gpa || "3.85"} / 4.0 • {data.academicStanding || "Distinction Standing"}
            </p>
          </CardContent>
        </Card>

        {/* Real-time Schedule / Next Period */}
        <Card className="bg-white dark:bg-[#111827] border-[#E2E8F0] dark:border-gray-800 shadow-xs hover:shadow-sm transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="flex items-center gap-1.5">
              <CardTitle className="text-xs font-semibold text-[#64748B] dark:text-gray-400">
                Period Schedule
              </CardTitle>
              {data.scheduleStatus && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${data.scheduleBadgeColor || "bg-blue-100 text-blue-800"}`}>
                  {data.scheduleStatus}
                </span>
              )}
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400">
              <CalendarDays className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-sm font-bold text-[#0F172A] dark:text-white truncate" title={data.nextClass}>
              {data.nextClass || "Mathematics"}
            </div>
            <p className="text-xs font-medium text-[#64748B] dark:text-gray-400 mt-1 truncate">
              {data.nextClassTime ? `Slot: ${data.nextClassTime}` : "08:50 – 04:00 PM"} {data.timeRemainingText ? `• ${data.timeRemainingText}` : ""}
            </p>
          </CardContent>
        </Card>

        {/* Enrolled Section */}
        <Card className="bg-white dark:bg-[#111827] border-[#E2E8F0] dark:border-gray-800 shadow-xs hover:shadow-sm transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-[#64748B] dark:text-gray-400">
              Enrolled Class
            </CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950/50 text-[#1E40AF] dark:text-blue-400">
              <GraduationCap className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-[#0F172A] dark:text-white">
              {data.className || "Grade 10-A"}
            </div>
            <p className="text-xs font-medium text-[#64748B] dark:text-gray-400 mt-1">
              Academic Year 2025-2026
            </p>
          </CardContent>
        </Card>
      </>
    );
  }

  return null;
}
