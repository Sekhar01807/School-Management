import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/AuthProvider";
import { api } from "@/lib/api";
import { toast } from "sonner";
import type { StudentReportCard, ClassAnalytics, Class } from "@/types";

// UI Imports
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  GraduationCap,
  Award,
  BookOpen,
  CheckCircle2,
  TrendingUp,
  Printer,
  BarChart3,
  Users,
  Percent,
  FileSpreadsheet,
  Download,
} from "lucide-react";

// Recharts for Teacher / Admin Analytics
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from "recharts";

export default function ReportsPage() {
  const { user } = useAuth();
  const isTeacherOrAdmin = user?.role === "teacher" || user?.role === "admin";

  // Student Report Card State
  const [reportCard, setReportCard] = useState<StudentReportCard | null>(null);
  const [loadingStudent, setLoadingStudent] = useState(false);
  const [exportingReport, setExportingReport] = useState(false);

  // Teacher / Admin Analytics State
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [classAnalytics, setClassAnalytics] = useState<ClassAnalytics | null>(null);
  const [loadingClass, setLoadingClass] = useState(false);

  // 1. Initial Data Fetch
  useEffect(() => {
    if (!isTeacherOrAdmin) {
      // Student / Parent View
      const fetchStudentReport = async () => {
        try {
          setLoadingStudent(true);
          const res = await api.get("/reports/student/me");
          setReportCard(res.data);
        } catch (error) {
          console.error("Failed to load report card:", error);
          toast.error("Failed to generate student report card");
        } finally {
          setLoadingStudent(false);
        }
      };
      fetchStudentReport();
    } else {
      // Teacher / Admin View
      const fetchClasses = async () => {
        try {
          const res = await api.get("/classes");
          const classList: Class[] = res.data.classes || res.data || [];
          setClasses(classList);
          if (classList.length > 0) {
            setSelectedClassId(classList[0]._id);
          }
        } catch (error) {
          console.error("Failed to load classes for reports:", error);
        }
      };
      fetchClasses();
    }
  }, [isTeacherOrAdmin]);

  // 2. Fetch Class Analytics for Selected Class
  useEffect(() => {
    if (!isTeacherOrAdmin || !selectedClassId) return;

    const fetchAnalytics = async () => {
      try {
        setLoadingClass(true);
        const res = await api.get(`/reports/class/${selectedClassId}`);
        setClassAnalytics(res.data);
      } catch (error) {
        console.error("Failed to load class analytics:", error);
        toast.error("Failed to load class performance data");
      } finally {
        setLoadingClass(false);
      }
    };
    fetchAnalytics();
  }, [selectedClassId, isTeacherOrAdmin]);

  const handlePrint = () => {
    window.print();
  };

  // Export Student GPA Report Card to CSV
  const handleExportReportCardCsv = async () => {
    const studentId = reportCard?.student?._id || user?._id;
    if (!studentId) {
      toast.error("Student profile identifier not found.");
      return;
    }

    try {
      setExportingReport(true);
      const response = await api.get(`/export/report-card/${studentId}`, {
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      const contentDisposition = response.headers["content-disposition"];
      let fileName = `Report_Card_${studentId}.csv`;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^"]+)"?/);
        if (match && match[1]) fileName = match[1];
      }
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Student report card exported successfully!");
    } catch (err: any) {
      console.error("Export error:", err);
      toast.error("Failed to export student report card.");
    } finally {
      setExportingReport(false);
    }
  };

  const getGradeColor = (grade: string) => {
    if (grade.startsWith("A")) return "bg-emerald-100 text-emerald-800 border-emerald-200";
    if (grade.startsWith("B")) return "bg-blue-100 text-blue-800 border-blue-200";
    if (grade.startsWith("C")) return "bg-amber-100 text-amber-800 border-amber-200";
    if (grade.startsWith("D")) return "bg-orange-100 text-orange-800 border-orange-200";
    return "bg-rose-100 text-rose-800 border-rose-200";
  };

  const COLORS = ["#10B981", "#3B82F6", "#F59E0B", "#EF4444"];

  // --- RENDER FOR STUDENT / PARENT: OFFICIAL REPORT CARD ---
  if (!isTeacherOrAdmin) {
    if (loadingStudent) {
      return (
        <div className="p-8 space-y-6 bg-[#F8FAFC] min-h-screen">
          <Skeleton className="h-10 w-48" />
          <div className="grid gap-4 md:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-96 rounded-xl" />
        </div>
      );
    }

    return (
      <div className="flex-1 space-y-6 p-8 pt-6 bg-[#F8FAFC] min-h-screen print:bg-white print:p-0">
        {/* Header with Print */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[#0F172A]">
              Academic Report Card
            </h1>
            <p className="text-sm text-[#64748B] mt-0.5">
              Verified term transcript, cumulative GPA, subject marks, and attendance.
            </p>
          </div>

        <div className="flex items-center gap-2.5">
          <Button
            onClick={handleExportReportCardCsv}
            disabled={exportingReport}
            variant="outline"
            className="bg-white border-[#E2E8F0] hover:bg-[#F8FAFC] text-[#0F172A] shadow-xs"
          >
            <Download className="mr-2 h-4 w-4 text-[#1E40AF]" />
            {exportingReport ? "Exporting CSV..." : "Export CSV"}
          </Button>

          <Button
            onClick={handlePrint}
            variant="outline"
            className="bg-white border-[#E2E8F0] hover:bg-[#F8FAFC] text-[#0F172A] shadow-xs"
          >
            <Printer className="mr-2 h-4 w-4 text-[#1E40AF]" /> Print / Export PDF
          </Button>
        </div>
        </div>

        {/* Printable Official Banner */}
        <Card className="bg-white border-[#E2E8F0] shadow-xs overflow-hidden">
          <div className="bg-gradient-to-r from-[#1E40AF] to-[#1E3A8A] p-6 text-white">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs uppercase font-bold tracking-wider text-blue-200">
                  SchoolSync Official Academic Record
                </span>
                <h2 className="text-2xl font-bold mt-1">
                  {reportCard?.student?.name || user?.name}
                </h2>
                <p className="text-xs text-blue-100 mt-0.5">
                  Class: <strong className="text-white">{reportCard?.student?.className}</strong> | Student ID: {reportCard?.student?._id?.slice(-6).toUpperCase()}
                </p>
              </div>

              <div className="flex items-center space-x-3">
                <div className="bg-white/10 backdrop-blur-xs rounded-xl p-3 text-center border border-white/20">
                  <div className="text-xs text-blue-200 uppercase font-semibold">Cumulative GPA</div>
                  <div className="text-2xl font-black">{reportCard?.academicPerformance?.overallGPA ?? "4.0"}</div>
                </div>
                <div className="bg-white/10 backdrop-blur-xs rounded-xl p-3 text-center border border-white/20">
                  <div className="text-xs text-blue-200 uppercase font-semibold">Final Grade</div>
                  <div className="text-2xl font-black">{reportCard?.academicPerformance?.overallGrade ?? "A"}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Metrics Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-[#F1F5F9] border-b border-[#E2E8F0]">
            <div className="p-4 text-center">
              <div className="text-xs font-semibold text-[#64748B] uppercase">Overall Score</div>
              <div className="text-2xl font-bold text-[#0F172A] mt-0.5">
                {reportCard?.academicPerformance?.overallPercentage ?? 0}%
              </div>
              <p className="text-xs text-emerald-600 font-medium">
                {reportCard?.academicPerformance?.overallStatus}
              </p>
            </div>

            <div className="p-4 text-center">
              <div className="text-xs font-semibold text-[#64748B] uppercase">Assessments Taken</div>
              <div className="text-2xl font-bold text-[#0F172A] mt-0.5">
                {reportCard?.academicPerformance?.totalExamsTaken ?? 0}
              </div>
              <p className="text-xs text-[#64748B]">
                {reportCard?.academicPerformance?.cumulativeScored} / {reportCard?.academicPerformance?.cumulativePossible} Points
              </p>
            </div>

            <div className="p-4 text-center">
              <div className="text-xs font-semibold text-[#64748B] uppercase">Attendance Rate</div>
              <div className="text-2xl font-bold text-[#0F172A] mt-0.5">
                {reportCard?.attendance?.percentage ?? 100}%
              </div>
              <p className="text-xs text-[#64748B]">
                {reportCard?.attendance?.presentCount} Present / {reportCard?.attendance?.totalDays} Days
              </p>
            </div>

            <div className="p-4 text-center">
              <div className="text-xs font-semibold text-[#64748B] uppercase">Standing</div>
              <div className="text-2xl font-bold text-emerald-600 mt-0.5">
                Good Standing
              </div>
              <p className="text-xs text-[#64748B]">Cleared for progression</p>
            </div>
          </div>

          {/* Subject Performance Table */}
          <CardContent className="pt-6 pb-6">
            <h3 className="text-base font-bold text-[#0F172A] mb-4">Subject Performance & Marks</h3>
            {reportCard?.subjects && reportCard.subjects.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[#F8FAFC] text-[#64748B] text-xs font-semibold uppercase border-b border-[#E2E8F0]">
                    <tr>
                      <th className="py-3 px-4">Subject</th>
                      <th className="py-3 px-4">Code</th>
                      <th className="py-3 px-4 text-center">Exams Completed</th>
                      <th className="py-3 px-4 text-center">Points Earned</th>
                      <th className="py-3 px-4">Score (%)</th>
                      <th className="py-3 px-4 text-center">Grade</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1F5F9]">
                    {reportCard.subjects.map((sub, idx) => (
                      <tr key={idx} className="hover:bg-[#F8FAFC]/60 transition-colors">
                        <td className="py-3 px-4 font-semibold text-[#0F172A]">
                          {sub.subjectName}
                        </td>
                        <td className="py-3 px-4 text-xs font-mono text-[#64748B]">{sub.subjectCode}</td>
                        <td className="py-3 px-4 text-center text-[#0F172A]">{sub.examsTaken}</td>
                        <td className="py-3 px-4 text-center text-[#64748B]">
                          <span className="font-semibold text-[#0F172A]">{sub.totalScored}</span> / {sub.totalPossible}
                        </td>
                        <td className="py-3 px-4 w-44">
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs font-medium">
                              <span>{sub.percentage}%</span>
                            </div>
                            <Progress value={sub.percentage} className="h-2" />
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Badge className={getGradeColor(sub.grade)}>{sub.grade}</Badge>
                        </td>
                        <td className="py-3 px-4 text-xs font-medium text-[#64748B]">
                          {sub.status}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-12 text-center text-[#64748B]">
                <FileSpreadsheet className="mx-auto h-12 w-12 text-[#94A3B8] mb-3" />
                <p className="font-semibold text-[#0F172A]">No Exam Submissions Recorded</p>
                <p className="text-xs text-[#64748B] mt-1">
                  Complete online quizzes and tests in the Exams portal to see grades populated here.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // --- RENDER FOR TEACHER / ADMIN: CLASS ANALYTICS ---
  return (
    <div className="flex-1 space-y-6 p-8 pt-6 bg-[#F8FAFC] min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[#0F172A]">
            Academic Analytics & Class Performance
          </h1>
          <p className="text-sm text-[#64748B] mt-0.5">
            Institutional performance metrics, exam completion rates, and student achievement tracking.
          </p>
        </div>

        <div className="w-64">
          <Select value={selectedClassId} onValueChange={setSelectedClassId}>
            <SelectTrigger className="bg-white border-[#E2E8F0]">
              <SelectValue placeholder="Select Class Section" />
            </SelectTrigger>
            <SelectContent>
              {classes.map((cls) => (
                <SelectItem key={cls._id} value={cls._id}>
                  {cls.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {loadingClass ? (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <Skeleton className="h-80 rounded-xl" />
            <Skeleton className="h-80 rounded-xl" />
          </div>
        </div>
      ) : !classAnalytics ? (
        <Card className="bg-white border-[#E2E8F0] shadow-xs">
          <CardContent className="py-16 text-center text-[#64748B]">
            <BarChart3 className="mx-auto h-12 w-12 text-[#94A3B8] mb-3" />
            <p className="font-semibold text-[#0F172A]">No Class Selected</p>
            <p className="text-xs text-[#64748B] mt-1">
              Select a class section from the dropdown above to view analytics.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Top Metric Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card className="bg-white border-[#E2E8F0] shadow-xs">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-semibold text-[#64748B]">Class Average</CardTitle>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <Percent className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-[#0F172A]">
                  {classAnalytics.metrics.averageScore}%
                </div>
                <p className="text-xs text-emerald-600 font-medium mt-1">
                  Across all subjects & tests
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white border-[#E2E8F0] shadow-xs">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-semibold text-[#64748B]">Pass Rate</CardTitle>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-[#0F172A]">
                  {classAnalytics.metrics.passRate}%
                </div>
                <p className="text-xs text-[#64748B] mt-1">Scores &gt;= 50% threshold</p>
              </CardContent>
            </Card>

            <Card className="bg-white border-[#E2E8F0] shadow-xs">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-semibold text-[#64748B]">Highest Score</CardTitle>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                  <Award className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-[#0F172A]">
                  {classAnalytics.metrics.highestScore}%
                </div>
                <p className="text-xs text-[#64748B] mt-1">Lowest: {classAnalytics.metrics.lowestScore}%</p>
              </CardContent>
            </Card>

            <Card className="bg-white border-[#E2E8F0] shadow-xs">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-semibold text-[#64748B]">Evaluations</CardTitle>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                  <BookOpen className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-[#0F172A]">
                  {classAnalytics.metrics.totalSubmissions} Submissions
                </div>
                <p className="text-xs text-[#64748B] mt-1">
                  {classAnalytics.metrics.totalExams} Active Assessments
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Visual Charts Grid */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Score Distribution Chart */}
            <Card className="bg-white border-[#E2E8F0] shadow-xs">
              <CardHeader>
                <CardTitle className="text-base font-bold text-[#0F172A]">
                  Score Distribution
                </CardTitle>
                <CardDescription className="text-xs text-[#64748B]">
                  Number of student assessments across performance brackets
                </CardDescription>
              </CardHeader>
              <CardContent className="h-72 pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={classAnalytics.scoreDistribution}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11, fill: "#64748B" }}
                      axisLine={{ stroke: "#E2E8F0" }}
                      tickLine={false}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 11, fill: "#64748B" }}
                      axisLine={{ stroke: "#E2E8F0" }}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: "8px",
                        border: "1px solid #E2E8F0",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                      }}
                    />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                      {classAnalytics.scoreDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Subject Performance Breakdown */}
            <Card className="bg-white border-[#E2E8F0] shadow-xs">
              <CardHeader>
                <CardTitle className="text-base font-bold text-[#0F172A]">
                  Subject Averages
                </CardTitle>
                <CardDescription className="text-xs text-[#64748B]">
                  Classwide mean percentage scored per academic discipline
                </CardDescription>
              </CardHeader>
              <CardContent className="h-72 pt-2">
                {classAnalytics.subjectPerformance.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={classAnalytics.subjectPerformance}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 11, fill: "#64748B" }}
                        axisLine={{ stroke: "#E2E8F0" }}
                        tickLine={false}
                      />
                      <YAxis
                        unit="%"
                        domain={[0, 100]}
                        tick={{ fontSize: 11, fill: "#64748B" }}
                        axisLine={{ stroke: "#E2E8F0" }}
                        tickLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          borderRadius: "8px",
                          border: "1px solid #E2E8F0",
                          boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                        }}
                      />
                      <Bar dataKey="average" fill="#1E40AF" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-[#64748B]">
                    No subject exam data recorded for this class yet.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Student Rankings Leaderboard */}
          <Card className="bg-white border-[#E2E8F0] shadow-xs">
            <CardHeader>
              <CardTitle className="text-base font-bold text-[#0F172A]">
                Class Roster & Achievement Leaderboard
              </CardTitle>
              <CardDescription className="text-xs text-[#64748B]">
                Student averages based on completed quizzes and term assessments
              </CardDescription>
            </CardHeader>
            <CardContent>
              {classAnalytics.rankings.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-[#F8FAFC] text-[#64748B] text-xs font-semibold uppercase border-b border-[#E2E8F0]">
                      <tr>
                        <th className="py-3 px-4">Rank</th>
                        <th className="py-3 px-4">Student Name</th>
                        <th className="py-3 px-4">Email</th>
                        <th className="py-3 px-4 text-center">Exams Completed</th>
                        <th className="py-3 px-4">Average Score</th>
                        <th className="py-3 px-4 text-center">Grade</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F1F5F9]">
                      {classAnalytics.rankings.map((st, idx) => (
                        <tr key={idx} className="hover:bg-[#F8FAFC]/60 transition-colors">
                          <td className="py-3 px-4 font-bold text-[#0F172A]">
                            {idx === 0 ? "🥇 1" : idx === 1 ? "🥈 2" : idx === 2 ? "🥉 3" : idx + 1}
                          </td>
                          <td className="py-3 px-4 font-semibold text-[#0F172A]">{st.name}</td>
                          <td className="py-3 px-4 text-xs text-[#64748B]">{st.email}</td>
                          <td className="py-3 px-4 text-center text-[#0F172A]">{st.examsCompleted}</td>
                          <td className="py-3 px-4 w-44">
                            <div className="space-y-1">
                              <span className="text-xs font-bold text-[#0F172A]">{st.averagePercentage}%</span>
                              <Progress value={st.averagePercentage} className="h-1.5" />
                            </div>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <Badge className={getGradeColor(st.grade)}>{st.grade}</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-[#64748B]">
                  No student submissions found for this class.
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
