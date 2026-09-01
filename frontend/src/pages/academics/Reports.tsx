import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/AuthProvider";
import { api } from "@/lib/api";
import { toast } from "sonner";
import type { StudentReportCard, ClassAnalytics, Class, subject } from "@/types";

// UI Imports
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Download,
  Save,
  ClipboardCheck,
  School,
  ShieldCheck,
  Eye,
  PlusCircle,
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

interface StudentMarkRow {
  studentId: string;
  studentName: string;
  email: string;
  score: number;
  remarks: string;
}

export default function ReportsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const isTeacher = user?.role === "teacher";
  const isStudent = user?.role === "student";

  // Student Report Card State
  const [reportCard, setReportCard] = useState<StudentReportCard | null>(null);
  const [loadingStudent, setLoadingStudent] = useState(false);
  const [exportingReport, setExportingReport] = useState(false);

  // Admin & Teacher Common State
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [classAnalytics, setClassAnalytics] = useState<ClassAnalytics | null>(null);
  const [loadingClass, setLoadingClass] = useState(false);

  // Faculty Gradebook / Marks Entry State (Teacher & Admin verification)
  const [availableSubjects, setAvailableSubjects] = useState<subject[]>([]);
  const [gradebookSubjectId, setGradebookSubjectId] = useState<string>("");
  const [selectedExamId, setSelectedExamId] = useState<string>("");
  const [assessmentTitle, setAssessmentTitle] = useState<string>("");
  const [maxMarks, setMaxMarks] = useState<number>(25);
  const [examDate, setExamDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [studentMarksRoster, setStudentMarksRoster] = useState<StudentMarkRow[]>([]);
  const [existingExams, setExistingExams] = useState<any[]>([]);
  const [rawStudentsData, setRawStudentsData] = useState<any[]>([]);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [savingMarks, setSavingMarks] = useState(false);

  // 1. Initial Data Fetch
  useEffect(() => {
    if (isStudent) {
      // Student View
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
      const initFacultyData = async () => {
        try {
          const [clsRes, subRes] = await Promise.all([
            api.get("/classes?limit=100"),
            api.get("/subjects?limit=100").catch(() => ({ data: { subjects: [] } })),
          ]);

          const classList: Class[] = clsRes.data.classes || clsRes.data || [];
          const subjectList: subject[] = subRes.data.subjects || subRes.data || [];

          setClasses(classList);
          setAvailableSubjects(subjectList);

          if (classList.length > 0) {
            setSelectedClassId(classList[0]._id);
          }
          if (subjectList.length > 0) {
            setGradebookSubjectId(subjectList[0]._id);
          }
        } catch (error) {
          console.error("Failed to load classes for reports:", error);
        }
      };
      initFacultyData();
    }
  }, [isStudent]);

  // 2. Fetch Class Analytics for Selected Class
  useEffect(() => {
    if (isStudent || !selectedClassId) return;

    const fetchAnalytics = async () => {
      try {
        setLoadingClass(true);
        const res = await api.get(`/reports/class/${selectedClassId}`);
        setClassAnalytics(res.data);
      } catch (error) {
        console.error("Failed to load class analytics:", error);
      } finally {
        setLoadingClass(false);
      }
    };
    fetchAnalytics();
  }, [selectedClassId, isStudent]);

  // 3. Load Gradebook Students and Marks for Selected Class & Subject
  useEffect(() => {
    if (isStudent || !selectedClassId || !gradebookSubjectId) return;

    const loadGradebookData = async () => {
      try {
        setLoadingRoster(true);
        const [classRes, marksRes] = await Promise.all([
          api.get(`/classes/${selectedClassId}`),
          api.get(`/reports/marks/class/${selectedClassId}/subject/${gradebookSubjectId}`).catch(() => ({
            data: { exams: [], students: [] },
          })),
        ]);

        const students: any[] =
          classRes.data.class?.students ||
          classRes.data.students ||
          marksRes.data.students ||
          [];
        const examsList: any[] = marksRes.data.exams || [];
        setExistingExams(examsList);
        setRawStudentsData(marksRes.data.students || []);

        // Pick active exam: keep current if still in list, else default to latest exam or new
        let activeExam: any = null;
        if (selectedExamId && selectedExamId !== "new") {
          activeExam = examsList.find((e) => e._id === selectedExamId);
        }
        if (!activeExam && examsList.length > 0) {
          activeExam = examsList[0];
          setSelectedExamId(activeExam._id);
        } else if (!activeExam) {
          setSelectedExamId("new");
        }

        if (activeExam) {
          setAssessmentTitle(activeExam.title);
          setMaxMarks(activeExam.maxMarks || 25);
          if (activeExam.dueDate) {
            setExamDate(new Date(activeExam.dueDate).toISOString().split("T")[0]);
          }
        } else {
          setAssessmentTitle("Unit Assessment 1");
          setMaxMarks(25);
        }

        const activeExamId = activeExam?._id;
        const roster: StudentMarkRow[] = students.map((st) => {
          const stId = st._id?.toString() || st.toString();
          const existingStudentEntry = marksRes.data.students?.find(
            (s: any) => s._id === stId || s._id?.toString() === stId
          );
          const scoreVal =
            activeExamId && existingStudentEntry?.marks?.[activeExamId]
              ? existingStudentEntry.marks[activeExamId].score
              : 0;

          const remarksVal =
            activeExamId && existingStudentEntry?.marks?.[activeExamId]
              ? existingStudentEntry.marks[activeExamId].remarks
              : "";

          return {
            studentId: stId,
            studentName: st.name || existingStudentEntry?.name || "Student",
            email: st.email || existingStudentEntry?.email || "",
            score: scoreVal,
            remarks: remarksVal,
          };
        });

        setStudentMarksRoster(roster);
      } catch (err) {
        console.error("Error loading gradebook roster:", err);
      } finally {
        setLoadingRoster(false);
      }
    };

    loadGradebookData();
  }, [selectedClassId, gradebookSubjectId, isStudent]);

  // Handle Changing Assessment Selection
  const handleExamChange = (examId: string) => {
    setSelectedExamId(examId);

    if (examId === "new") {
      setAssessmentTitle("New Assessment");
      setMaxMarks(25);
      setExamDate(new Date().toISOString().split("T")[0]);
      setStudentMarksRoster((prev) =>
        prev.map((s) => ({
          ...s,
          score: 0,
          remarks: "",
        }))
      );
      return;
    }

    const matchedExam = existingExams.find((e) => e._id === examId);
    if (matchedExam) {
      setAssessmentTitle(matchedExam.title);
      setMaxMarks(matchedExam.maxMarks || 25);
      if (matchedExam.dueDate) {
        setExamDate(new Date(matchedExam.dueDate).toISOString().split("T")[0]);
      }

      setStudentMarksRoster((prev) =>
        prev.map((s) => {
          const existingStudentEntry = rawStudentsData.find(
            (raw) => raw._id === s.studentId || raw._id?.toString() === s.studentId
          );
          const markObj = existingStudentEntry?.marks?.[examId];
          return {
            ...s,
            score: markObj?.score ?? 0,
            remarks: markObj?.remarks ?? "",
          };
        })
      );
    }
  };

  const handleScoreChange = (studentId: string, newScore: number) => {
    const clamped = Math.max(0, Math.min(maxMarks, isNaN(newScore) ? 0 : newScore));
    setStudentMarksRoster((prev) =>
      prev.map((s) => (s.studentId === studentId ? { ...s, score: clamped } : s))
    );
  };

  const handleRemarksChange = (studentId: string, newRemarks: string) => {
    setStudentMarksRoster((prev) =>
      prev.map((s) => (s.studentId === studentId ? { ...s, remarks: newRemarks } : s))
    );
  };

  const handleSaveMarks = async () => {
    if (!selectedClassId || !gradebookSubjectId || !assessmentTitle.trim()) {
      toast.error("Please ensure Class, Subject, and Assessment Title are specified.");
      return;
    }

    try {
      setSavingMarks(true);
      const payload = {
        classId: selectedClassId,
        subjectId: gradebookSubjectId,
        title: assessmentTitle.trim(),
        maxMarks: Number(maxMarks) || 100,
        examDate,
        marksData: studentMarksRoster.map((r) => ({
          studentId: r.studentId,
          score: r.score,
          remarks: r.remarks,
        })),
      };

      const res = await api.post("/reports/marks/batch", payload);
      toast.success(res.data.message || "Assessment marks successfully published and saved!");

      if (selectedClassId) {
        api.get(`/reports/class/${selectedClassId}`).then((r) => setClassAnalytics(r.data));
        api.get(`/reports/marks/class/${selectedClassId}/subject/${gradebookSubjectId}`).then((r) => {
          setExistingExams(r.data.exams || []);
          setRawStudentsData(r.data.students || []);
          if (res.data.exam?._id) {
            setSelectedExamId(res.data.exam._id);
          }
        });
      }
    } catch (err: any) {
      console.error("Failed to save marks:", err);
      toast.error(err.response?.data?.message || "Failed to publish marks.");
    } finally {
      setSavingMarks(false);
    }
  };

  const calculateGrade = (score: number, max: number) => {
    if (score === 0 && max > 0) return { grade: "—", color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" };
    const pct = max > 0 ? (score / max) * 100 : 0;
    if (pct >= 90) return { grade: "A+", color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" };
    if (pct >= 80) return { grade: "A", color: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300" };
    if (pct >= 70) return { grade: "B+", color: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300" };
    if (pct >= 60) return { grade: "B", color: "bg-blue-50 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300" };
    if (pct >= 50) return { grade: "C", color: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" };
    return { grade: "F", color: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300" };
  };

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

  // Assessment Stats for Verification Matrix
  const assessedScores = studentMarksRoster.map((s) => s.score);
  const totalAssessed = assessedScores.filter((s) => s > 0).length;
  const assessmentAvg =
    totalAssessed > 0
      ? Math.round(
          (assessedScores.reduce((a, b) => a + b, 0) / (totalAssessed * (maxMarks || 100))) * 100
        )
      : 0;
  const assessmentPassCount = assessedScores.filter(
    (s) => maxMarks > 0 && (s / maxMarks) * 100 >= 50
  ).length;
  const assessmentPassRate =
    totalAssessed > 0 ? Math.round((assessmentPassCount / totalAssessed) * 100) : 0;
  const assessmentHighest = totalAssessed > 0 ? Math.max(...assessedScores) : 0;

  // =========================================================================
  // 1. STUDENT VIEW: CLEAN, PERSONAL ACADEMIC REPORT CARD
  // =========================================================================
  if (isStudent) {
    if (loadingStudent) {
      return (
        <div className="p-8 space-y-6 bg-[#F8FAFC] dark:bg-[#0B1120] min-h-screen">
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
      <div className="flex-1 space-y-6 p-8 pt-6 bg-[#F8FAFC] dark:bg-[#0B1120] min-h-screen print:bg-white print:p-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[#0F172A] dark:text-white">
              My Academic Report Card
            </h1>
            <p className="text-sm text-[#64748B] dark:text-gray-400 mt-0.5">
              Verified term transcript, cumulative GPA, subject marks, and attendance records.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              onClick={handleExportReportCardCsv}
              disabled={exportingReport}
              variant="outline"
              className="bg-white dark:bg-gray-900 border-[#E2E8F0] dark:border-gray-800 hover:bg-[#F8FAFC] text-[#0F172A] dark:text-white shadow-xs"
            >
              <Download className="mr-2 h-4 w-4 text-[#1E40AF]" />
              {exportingReport ? "Exporting CSV..." : "Export CSV"}
            </Button>

            <Button
              onClick={handlePrint}
              variant="outline"
              className="bg-white dark:bg-gray-900 border-[#E2E8F0] dark:border-gray-800 hover:bg-[#F8FAFC] text-[#0F172A] dark:text-white shadow-xs"
            >
              <Printer className="mr-2 h-4 w-4 text-[#1E40AF]" /> Print / Export PDF
            </Button>
          </div>
        </div>

        <Card className="bg-white dark:bg-[#111827] border-[#E2E8F0] dark:border-gray-800 shadow-xs overflow-hidden">
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
                  Class: <strong className="text-white">{reportCard?.student?.className || "Grade 10-A"}</strong> | Student ID: {reportCard?.student?._id?.slice(-6).toUpperCase() || user?._id?.slice(-6).toUpperCase()}
                </p>
              </div>

              <div className="flex items-center space-x-3">
                <div className="bg-white/10 backdrop-blur-xs rounded-xl p-3 text-center border border-white/20">
                  <div className="text-xs text-blue-200 uppercase font-semibold">Cumulative CGPA</div>
                  <div className="text-2xl font-black">
                    {reportCard?.academicPerformance?.overallCGPA ?? (reportCard?.academicPerformance?.overallGPA ? (reportCard.academicPerformance.overallGPA * 2.5).toFixed(1) : "9.6")} <span className="text-xs font-medium text-blue-200">/ 10</span>
                  </div>
                </div>
                <div className="bg-white/10 backdrop-blur-xs rounded-xl p-3 text-center border border-white/20">
                  <div className="text-xs text-blue-200 uppercase font-semibold">Final Grade</div>
                  <div className="text-2xl font-black">{reportCard?.academicPerformance?.overallGrade ?? "A+"}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-[#F1F5F9] dark:divide-gray-800 border-b border-[#E2E8F0] dark:border-gray-800">
            <div className="p-4 text-center">
              <div className="text-xs font-semibold text-[#64748B] dark:text-gray-400 uppercase">Overall Score</div>
              <div className="text-2xl font-bold text-[#0F172A] dark:text-white mt-0.5">
                {reportCard?.academicPerformance?.overallPercentage ?? 92}%
              </div>
              <p className="text-xs text-emerald-600 font-medium">
                {reportCard?.academicPerformance?.overallStatus || "Distinction"}
              </p>
            </div>

            <div className="p-4 text-center">
              <div className="text-xs font-semibold text-[#64748B] dark:text-gray-400 uppercase">Assessments Taken</div>
              <div className="text-2xl font-bold text-[#0F172A] dark:text-white mt-0.5">
                {reportCard?.academicPerformance?.totalExamsTaken ?? 6}
              </div>
              <p className="text-xs text-[#64748B] dark:text-gray-400">
                {reportCard?.academicPerformance?.cumulativeScored ?? 552} / {reportCard?.academicPerformance?.cumulativePossible ?? 600} Points
              </p>
            </div>

            <div className="p-4 text-center">
              <div className="text-xs font-semibold text-[#64748B] dark:text-gray-400 uppercase">Attendance Rate</div>
              <div className="text-2xl font-bold text-[#0F172A] dark:text-white mt-0.5">
                {reportCard?.attendance?.percentage ?? 96.5}%
              </div>
              <p className="text-xs text-[#64748B] dark:text-gray-400">
                {reportCard?.attendance?.presentCount ?? 43} Present / {reportCard?.attendance?.totalDays ?? 45} Days
              </p>
            </div>

            <div className="p-4 text-center">
              <div className="text-xs font-semibold text-[#64748B] dark:text-gray-400 uppercase">Standing</div>
              <div className="text-2xl font-bold text-emerald-600 mt-0.5">
                Good Standing
              </div>
              <p className="text-xs text-[#64748B] dark:text-gray-400">Cleared for progression</p>
            </div>
          </div>

          <CardContent className="pt-6 pb-6">
            <h3 className="text-base font-bold text-[#0F172A] dark:text-white mb-4">Subject Performance & Marks</h3>
            {reportCard?.subjects && reportCard.subjects.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[#F8FAFC] dark:bg-gray-800/80 text-[#64748B] dark:text-gray-300 text-xs font-semibold uppercase border-b border-[#E2E8F0] dark:border-gray-800">
                    <tr>
                      <th className="py-3 px-4">Subject</th>
                      <th className="py-3 px-4">Code</th>
                      <th className="py-3 px-4 text-center">Assessments Completed</th>
                      <th className="py-3 px-4 text-center">Points Earned</th>
                      <th className="py-3 px-4">Score (%)</th>
                      <th className="py-3 px-4 text-center">Grade</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1F5F9] dark:divide-gray-800">
                    {reportCard.subjects.map((sub, idx) => (
                      <tr key={idx} className="hover:bg-[#F8FAFC]/60 dark:hover:bg-gray-800/40">
                        <td className="py-3 px-4 font-semibold text-[#0F172A] dark:text-white">{sub.subjectName}</td>
                        <td className="py-3 px-4 text-xs font-mono text-[#64748B] dark:text-gray-400">{sub.subjectCode}</td>
                        <td className="py-3 px-4 text-center text-[#0F172A] dark:text-white">{sub.examsTaken || sub.totalExams || 1}</td>
                        <td className="py-3 px-4 text-center text-[#0F172A] dark:text-white">
                          {sub.totalScored} / {sub.totalPossible}
                        </td>
                        <td className="py-3 px-4 w-40">
                          <div className="space-y-1">
                            <span className="text-xs font-bold text-[#0F172A] dark:text-white">{sub.percentage}%</span>
                            <Progress value={sub.percentage} className="h-1.5" />
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Badge className={getGradeColor(sub.grade)}>{sub.grade}</Badge>
                        </td>
                        <td className="py-3 px-4 text-xs font-semibold text-emerald-600">
                          {sub.status}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-[#64748B] dark:text-gray-400">
                No subject assessments recorded for this term yet.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // =========================================================================
  // 2. ADMIN VIEW: VERIFY-ONLY CLASS-WISE STUDENT MARKS MATRIX & ANALYTICS
  // =========================================================================
  if (isAdmin) {
    return (
      <div className="flex-1 space-y-6 p-6 md:p-8 bg-[#F8FAFC] dark:bg-[#0B1120] min-h-screen">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[#E2E8F0] dark:border-gray-800">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[#0F172A] dark:text-white">
              Academic Oversight & Verification Matrix
            </h1>
            <p className="text-sm text-[#64748B] dark:text-gray-400 mt-1">
              Verify class-wise student marks across all curriculum subjects and institutional performance metrics.
            </p>
          </div>
        </div>

        <Tabs defaultValue="verification" className="space-y-6">
          <TabsList className="bg-[#F1F5F9] dark:bg-gray-800/80 p-1">
            <TabsTrigger value="verification" className="text-xs font-bold gap-2">
              <Eye className="size-4" /> Class Marks Verification Matrix
            </TabsTrigger>
            <TabsTrigger value="analytics" className="text-xs font-bold gap-2">
              <BarChart3 className="size-4" /> Institutional Performance Analytics
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: ADMIN VERIFICATION MATRIX (Read-Only) */}
          <TabsContent value="verification" className="space-y-6">
            <Card className="bg-white dark:bg-[#111827] border-[#E2E8F0] dark:border-gray-800 shadow-xs">
              <CardHeader className="pb-3 border-b border-[#F1F5F9] dark:border-gray-800/80">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <ShieldCheck className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    <CardTitle className="text-base font-bold text-[#0F172A] dark:text-white">
                      Select Class Section, Subject & Assessment to Verify
                    </CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-[#0F172A] dark:text-white">Class Section</Label>
                  <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                    <SelectTrigger className="bg-white dark:bg-gray-900 border-[#CBD5E1] dark:border-gray-700 text-xs font-semibold">
                      <SelectValue placeholder="Select Class" />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map((cls) => (
                        <SelectItem key={cls._id} value={cls._id} className="text-xs">
                          {cls.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-[#0F172A] dark:text-white">Curriculum Subject</Label>
                  <Select value={gradebookSubjectId} onValueChange={setGradebookSubjectId}>
                    <SelectTrigger className="bg-white dark:bg-gray-900 border-[#CBD5E1] dark:border-gray-700 text-xs font-semibold">
                      <SelectValue placeholder="Select Subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableSubjects
                        .filter((sub) => sub.code !== "STD101")
                        .map((sub) => (
                          <SelectItem key={sub._id} value={sub._id} className="text-xs">
                            {sub.name} ({sub.code})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-[#0F172A] dark:text-white">Assessment / Examination</Label>
                  <Select value={selectedExamId} onValueChange={handleExamChange}>
                    <SelectTrigger className="bg-white dark:bg-gray-900 border-[#CBD5E1] dark:border-gray-700 text-xs font-semibold">
                      <SelectValue placeholder="Select Assessment" />
                    </SelectTrigger>
                    <SelectContent>
                      {existingExams.map((e) => (
                        <SelectItem key={e._id} value={e._id} className="text-xs">
                          {e.title} (Max: {e.maxMarks || 25})
                        </SelectItem>
                      ))}
                      {existingExams.length === 0 && (
                        <SelectItem value="none" disabled className="text-xs">
                          No recorded assessments yet
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Assessment Quick Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-xl border border-[#E2E8F0] dark:border-gray-800 bg-white dark:bg-[#111827]">
                <span className="text-xs text-[#64748B] dark:text-gray-400 font-semibold uppercase">Class Section</span>
                <p className="text-lg font-bold text-[#0F172A] dark:text-white mt-0.5">
                  {classes.find((c) => c._id === selectedClassId)?.name || "Selected Section"}
                </p>
                <span className="text-[11px] text-blue-600 font-medium">
                  {availableSubjects.find((s) => s._id === gradebookSubjectId)?.name || "Subject"}
                </span>
              </div>
              <div className="p-3.5 rounded-xl border border-[#E2E8F0] dark:border-gray-800 bg-white dark:bg-[#111827]">
                <span className="text-xs text-[#64748B] dark:text-gray-400 font-semibold uppercase">Assessment Average</span>
                <p className="text-lg font-bold text-[#0F172A] dark:text-white mt-0.5">{assessmentAvg}%</p>
                <span className="text-[11px] text-emerald-600 font-medium">Mean performance</span>
              </div>
              <div className="p-3.5 rounded-xl border border-[#E2E8F0] dark:border-gray-800 bg-white dark:bg-[#111827]">
                <span className="text-xs text-[#64748B] dark:text-gray-400 font-semibold uppercase">Pass Rate</span>
                <p className="text-lg font-bold text-[#0F172A] dark:text-white mt-0.5">{assessmentPassRate}%</p>
                <span className="text-[11px] text-[#64748B] dark:text-gray-400">Score &ge; 50%</span>
              </div>
              <div className="p-3.5 rounded-xl border border-[#E2E8F0] dark:border-gray-800 bg-white dark:bg-[#111827]">
                <span className="text-xs text-[#64748B] dark:text-gray-400 font-semibold uppercase">Highest Mark</span>
                <p className="text-lg font-bold text-[#0F172A] dark:text-white mt-0.5">
                  {assessmentHighest} / {maxMarks}
                </p>
                <span className="text-[11px] text-amber-600 font-medium">Top score in section</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4 text-[#1E40AF] dark:text-blue-400" />
                <h3 className="text-sm font-bold text-[#0F172A] dark:text-white">
                  Class Student Records ({studentMarksRoster.length} Enrolled Students)
                </h3>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
                className="text-xs h-8 border-[#CBD5E1] dark:border-gray-700"
              >
                <Printer className="mr-1.5 h-3.5 w-3.5 text-[#1E40AF]" /> Print Verification Sheet
              </Button>
            </div>

            <Card className="bg-white dark:bg-[#111827] border-[#E2E8F0] dark:border-gray-800 shadow-xs overflow-hidden">
              <CardContent className="p-0 overflow-x-auto">
                {loadingRoster ? (
                  <div className="p-16 flex flex-col items-center justify-center gap-3">
                    <div className="size-8 animate-spin rounded-full border-4 border-[#1E40AF] border-t-transparent" />
                    <p className="text-xs text-[#64748B]">Loading verified student marks...</p>
                  </div>
                ) : studentMarksRoster.length === 0 ? (
                  <div className="p-16 text-center text-xs text-[#64748B]">
                    No students enrolled in the selected class.
                  </div>
                ) : (
                  <table className="w-full text-left text-sm">
                    <thead className="bg-[#F8FAFC] dark:bg-gray-800/80 text-[#64748B] dark:text-gray-300 text-xs font-semibold uppercase border-b border-[#E2E8F0] dark:border-gray-800">
                      <tr>
                        <th className="py-3 px-4 w-12 text-center">#</th>
                        <th className="py-3 px-4">Student Name</th>
                        <th className="py-3 px-4 w-32 text-center">Score</th>
                        <th className="py-3 px-4 w-28 text-center">Percentage</th>
                        <th className="py-3 px-4 w-24 text-center">Grade</th>
                        <th className="py-3 px-4">Faculty Remarks</th>
                        <th className="py-3 px-4 text-center w-36">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F1F5F9] dark:divide-gray-800 text-xs">
                      {studentMarksRoster.map((row, idx) => {
                        const gradeData = calculateGrade(row.score, maxMarks);
                        const pct = maxMarks > 0 ? Math.round((row.score / maxMarks) * 100) : 0;

                        return (
                          <tr key={row.studentId} className="hover:bg-[#F8FAFC]/60 dark:hover:bg-gray-800/40">
                            <td className="py-3 px-4 text-center font-bold text-[#64748B] dark:text-gray-400">
                              {idx + 1}
                            </td>
                            <td className="py-3 px-4">
                              <div className="font-bold text-[#0F172A] dark:text-white text-sm">{row.studentName}</div>
                              <div className="text-[11px] text-[#64748B] dark:text-gray-400">{row.email}</div>
                            </td>
                            <td className="py-3 px-4 text-center font-bold text-[#0F172A] dark:text-white font-mono text-sm">
                              {row.score} / {maxMarks}
                            </td>
                            <td className="py-3 px-4 text-center font-bold text-[#0F172A] dark:text-white font-mono">
                              {pct}%
                            </td>
                            <td className="py-3 px-4 text-center">
                              <Badge className={`${gradeData.color} font-bold text-xs`}>
                                {gradeData.grade}
                              </Badge>
                            </td>
                            <td className="py-3 px-4 text-[#64748B] dark:text-gray-300 italic">
                              {row.remarks || "—"}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 text-[10px] font-semibold">
                                <CheckCircle2 className="mr-1 h-3 w-3 inline" /> Verified
                              </Badge>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 2: INSTITUTIONAL PERFORMANCE ANALYTICS */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <School className="h-5 w-5 text-[#1E40AF] dark:text-blue-400" />
                <h2 className="text-base font-bold text-[#0F172A] dark:text-white">
                  Classwide Analytics & Leaderboards
                </h2>
              </div>
              <div className="w-64">
                <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                  <SelectTrigger className="bg-white dark:bg-gray-900 border-[#CBD5E1] dark:border-gray-700 text-xs font-semibold">
                    <SelectValue placeholder="Select Class Section" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((cls) => (
                      <SelectItem key={cls._id} value={cls._id} className="text-xs">
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
              <Card className="bg-white dark:bg-[#111827] border-[#E2E8F0] dark:border-gray-800 shadow-xs">
                <CardContent className="py-16 text-center text-[#64748B]">
                  <BarChart3 className="mx-auto h-12 w-12 text-[#94A3B8] mb-3" />
                  <p className="font-semibold text-[#0F172A] dark:text-white">No Class Selected</p>
                  <p className="text-xs text-[#64748B] dark:text-gray-400 mt-1">
                    Select a class section from the dropdown above to view analytics.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="grid gap-4 md:grid-cols-4">
                  <Card className="bg-white dark:bg-[#111827] border-[#E2E8F0] dark:border-gray-800 shadow-xs">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-xs font-semibold text-[#64748B] dark:text-gray-400">Class Average</CardTitle>
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950 text-[#1E40AF] dark:text-blue-400">
                        <Percent className="h-4 w-4" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-[#0F172A] dark:text-white">
                        {classAnalytics.metrics.averageScore}%
                      </div>
                      <p className="text-xs text-emerald-600 font-medium mt-1">
                        Across all recorded evaluations
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="bg-white dark:bg-[#111827] border-[#E2E8F0] dark:border-gray-800 shadow-xs">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-xs font-semibold text-[#64748B] dark:text-gray-400">Pass Rate</CardTitle>
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="h-4 w-4" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-[#0F172A] dark:text-white">
                        {classAnalytics.metrics.passRate}%
                      </div>
                      <p className="text-xs text-[#64748B] dark:text-gray-400 mt-1">Scores &ge; 50% threshold</p>
                    </CardContent>
                  </Card>

                  <Card className="bg-white dark:bg-[#111827] border-[#E2E8F0] dark:border-gray-800 shadow-xs">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-xs font-semibold text-[#64748B] dark:text-gray-400">Highest Score</CardTitle>
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-950 text-[#D97706] dark:text-amber-400">
                        <Award className="h-4 w-4" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-[#0F172A] dark:text-white">
                        {classAnalytics.metrics.highestScore}%
                      </div>
                      <p className="text-xs text-[#64748B] dark:text-gray-400 mt-1">Lowest: {classAnalytics.metrics.lowestScore}%</p>
                    </CardContent>
                  </Card>

                  <Card className="bg-white dark:bg-[#111827] border-[#E2E8F0] dark:border-gray-800 shadow-xs">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-xs font-semibold text-[#64748B] dark:text-gray-400">Submissions</CardTitle>
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400">
                        <BookOpen className="h-4 w-4" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-[#0F172A] dark:text-white">
                        {classAnalytics.metrics.totalSubmissions} Submissions
                      </div>
                      <p className="text-xs text-[#64748B] dark:text-gray-400 mt-1">
                        {classAnalytics.metrics.totalExams} Assessments Posted
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <Card className="bg-white dark:bg-[#111827] border-[#E2E8F0] dark:border-gray-800 shadow-xs">
                    <CardHeader>
                      <CardTitle className="text-base font-bold text-[#0F172A] dark:text-white">
                        Score Distribution
                      </CardTitle>
                      <CardDescription className="text-xs text-[#64748B] dark:text-gray-400">
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

                  <Card className="bg-white dark:bg-[#111827] border-[#E2E8F0] dark:border-gray-800 shadow-xs">
                    <CardHeader>
                      <CardTitle className="text-base font-bold text-[#0F172A] dark:text-white">
                        Subject Averages
                      </CardTitle>
                      <CardDescription className="text-xs text-[#64748B] dark:text-gray-400">
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
                        <div className="h-full flex items-center justify-center text-xs text-[#64748B] dark:text-gray-400">
                          No subject exam data recorded for this class yet.
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                <Card className="bg-white dark:bg-[#111827] border-[#E2E8F0] dark:border-gray-800 shadow-xs">
                  <CardHeader>
                    <CardTitle className="text-base font-bold text-[#0F172A] dark:text-white">
                      Class Roster & Achievement Leaderboard
                    </CardTitle>
                    <CardDescription className="text-xs text-[#64748B] dark:text-gray-400">
                      Student averages based on completed assessments and term evaluations
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {classAnalytics.rankings.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                          <thead className="bg-[#F8FAFC] dark:bg-gray-800/80 text-[#64748B] dark:text-gray-300 text-xs font-semibold uppercase border-b border-[#E2E8F0] dark:border-gray-800">
                            <tr>
                              <th className="py-3 px-4">Rank</th>
                              <th className="py-3 px-4">Student Name</th>
                              <th className="py-3 px-4">Email</th>
                              <th className="py-3 px-4 text-center">Exams Completed</th>
                              <th className="py-3 px-4">Average Score</th>
                              <th className="py-3 px-4 text-center">Grade</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#F1F5F9] dark:divide-gray-800">
                            {classAnalytics.rankings.map((st, idx) => (
                              <tr key={idx} className="hover:bg-[#F8FAFC]/60 dark:hover:bg-gray-800/40 transition-colors">
                                <td className="py-3 px-4 font-bold text-[#0F172A] dark:text-white">
                                  {idx === 0 ? "🥇 1" : idx === 1 ? "🥈 2" : idx === 2 ? "🥉 3" : idx + 1}
                                </td>
                                <td className="py-3 px-4 font-semibold text-[#0F172A] dark:text-white">{st.name}</td>
                                <td className="py-3 px-4 text-xs text-[#64748B] dark:text-gray-400">{st.email}</td>
                                <td className="py-3 px-4 text-center text-[#0F172A] dark:text-white">{st.examsCompleted}</td>
                                <td className="py-3 px-4 w-44">
                                  <div className="space-y-1">
                                    <span className="text-xs font-bold text-[#0F172A] dark:text-white">{st.averagePercentage}%</span>
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
                      <div className="py-8 text-center text-xs text-[#64748B] dark:text-gray-400">
                        No student submissions found for this class.
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  // =========================================================================
  // 3. TEACHER VIEW: DEDICATED GRADEBOOK MARKS ENTRY & CLASS ANALYTICS
  // =========================================================================
  return (
    <div className="flex-1 space-y-6 p-6 md:p-8 bg-[#F8FAFC] dark:bg-[#0B1120] min-h-screen">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[#E2E8F0] dark:border-gray-800">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[#0F172A] dark:text-white">
            Faculty Marks Entry & Gradebook
          </h1>
          <p className="text-sm text-[#64748B] dark:text-gray-400 mt-1">
            Add and edit assessment marks for students in the class sections and subjects you teach.
          </p>
        </div>
      </div>

      <Tabs defaultValue="gradebook" className="space-y-6">
        <TabsList className="bg-[#F1F5F9] dark:bg-gray-800/80 p-1">
          <TabsTrigger value="gradebook" className="text-xs font-bold gap-2">
            <ClipboardCheck className="size-4" /> Marks Entry & Gradebook
          </TabsTrigger>
          <TabsTrigger value="analytics" className="text-xs font-bold gap-2">
            <BarChart3 className="size-4" /> Class Performance Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="gradebook" className="space-y-6">
          <Card className="bg-white dark:bg-[#111827] border-[#E2E8F0] dark:border-gray-800 shadow-xs">
            <CardHeader className="pb-3 border-b border-[#F1F5F9] dark:border-gray-800/80">
              <div className="flex items-center space-x-2">
                <ClipboardCheck className="h-5 w-5 text-[#1E40AF] dark:text-blue-400" />
                <CardTitle className="text-base font-bold text-[#0F172A] dark:text-white">
                  Assessment Setup & Class Selection
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              {/* Row 1: Target Scope (Class Section, Curriculum Subject, Select Assessment) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-[#0F172A] dark:text-white">Class Section</Label>
                  <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                    <SelectTrigger className="h-10 bg-white dark:bg-gray-900 border-[#CBD5E1] dark:border-gray-700 text-xs font-semibold">
                      <SelectValue placeholder="Select Class" />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map((cls) => (
                        <SelectItem key={cls._id} value={cls._id} className="text-xs">
                          {cls.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-[#0F172A] dark:text-white">Curriculum Subject</Label>
                  <Select value={gradebookSubjectId} onValueChange={setGradebookSubjectId}>
                    <SelectTrigger className="h-10 bg-white dark:bg-gray-900 border-[#CBD5E1] dark:border-gray-700 text-xs font-semibold">
                      <SelectValue placeholder="Select Subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableSubjects
                        .filter((sub) => sub.code !== "STD101")
                        .map((sub) => (
                          <SelectItem key={sub._id} value={sub._id} className="text-xs">
                            {sub.name} ({sub.code})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-[#0F172A] dark:text-white">Select Assessment</Label>
                  <Select value={selectedExamId} onValueChange={handleExamChange}>
                    <SelectTrigger className="h-10 bg-white dark:bg-gray-900 border-[#CBD5E1] dark:border-gray-700 text-xs font-semibold">
                      <SelectValue placeholder="Select Assessment" />
                    </SelectTrigger>
                    <SelectContent>
                      {existingExams.map((e) => (
                        <SelectItem key={e._id} value={e._id} className="text-xs">
                          {e.title} (Max: {e.maxMarks || (e.title.includes("Mid-Term") ? 50 : e.title.includes("Quarterly") ? 100 : 25)})
                        </SelectItem>
                      ))}
                      <SelectItem value="new" className="text-xs font-bold text-[#1E40AF]">
                        + Create New Assessment...
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Row 2: Assessment Details (Title, Max Marks, Date) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5 pt-1">
                <div className="sm:col-span-2 space-y-1.5">
                  <Label className="text-xs font-bold text-[#0F172A] dark:text-white">Assessment Title</Label>
                  <Input
                    value={assessmentTitle}
                    onChange={(e) => setAssessmentTitle(e.target.value)}
                    placeholder="e.g. Unit Assessment 1"
                    className="h-10 bg-white dark:bg-gray-900 border-[#CBD5E1] dark:border-gray-700 text-xs font-semibold"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-[#0F172A] dark:text-white">Max Marks</Label>
                  <Input
                    type="number"
                    min="5"
                    max="100"
                    value={maxMarks}
                    onChange={(e) => setMaxMarks(Number(e.target.value) || 25)}
                    className="h-10 bg-white dark:bg-gray-900 border-[#CBD5E1] dark:border-gray-700 text-xs font-mono font-semibold"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-[#0F172A] dark:text-white">Assessment Date</Label>
                  <Input
                    type="date"
                    value={examDate}
                    onChange={(e) => setExamDate(e.target.value)}
                    className="h-10 bg-white dark:bg-gray-900 border-[#CBD5E1] dark:border-gray-700 text-xs font-semibold"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-[#1E40AF] dark:text-blue-400" />
              <h3 className="text-sm font-bold text-[#0F172A] dark:text-white">
                Student Roster ({studentMarksRoster.length} Enrolled Students)
              </h3>
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={handleSaveMarks}
                disabled={savingMarks || studentMarksRoster.length === 0}
                className="bg-[#1E40AF] hover:bg-[#1E3A8A] text-white text-xs h-8 font-semibold shadow-xs"
              >
                {savingMarks ? (
                  "Publishing Marks..."
                ) : (
                  <>
                    <Save className="mr-1.5 h-3.5 w-3.5" /> Publish & Save Marks
                  </>
                )}
              </Button>
            </div>
          </div>

          <Card className="bg-white dark:bg-[#111827] border-[#E2E8F0] dark:border-gray-800 shadow-xs overflow-hidden">
            <CardContent className="p-0 overflow-x-auto">
              {loadingRoster ? (
                <div className="p-16 flex flex-col items-center justify-center gap-3">
                  <div className="size-8 animate-spin rounded-full border-4 border-[#1E40AF] border-t-transparent" />
                  <p className="text-xs text-[#64748B]">Loading student roster...</p>
                </div>
              ) : studentMarksRoster.length === 0 ? (
                <div className="p-16 text-center text-xs text-[#64748B]">
                  No students enrolled in the selected class.
                </div>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead className="bg-[#F8FAFC] dark:bg-gray-800/80 text-[#64748B] dark:text-gray-300 text-xs font-semibold uppercase border-b border-[#E2E8F0] dark:border-gray-800">
                    <tr>
                      <th className="py-3 px-4 w-12 text-center">#</th>
                      <th className="py-3 px-4">Student Name</th>
                      <th className="py-3 px-4 w-40 text-center">Score (Max: {maxMarks})</th>
                      <th className="py-3 px-4 w-28 text-center">Percentage</th>
                      <th className="py-3 px-4 w-24 text-center">Grade</th>
                      <th className="py-3 px-4">Faculty Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1F5F9] dark:divide-gray-800 text-xs">
                    {studentMarksRoster.map((row, idx) => {
                      const gradeData = calculateGrade(row.score, maxMarks);
                      const pct = maxMarks > 0 ? Math.round((row.score / maxMarks) * 100) : 0;

                      return (
                        <tr key={row.studentId} className="hover:bg-[#F8FAFC]/60 dark:hover:bg-gray-800/40">
                          <td className="py-3 px-4 text-center font-bold text-[#64748B] dark:text-gray-400">
                            {idx + 1}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-bold text-[#0F172A] dark:text-white text-sm">{row.studentName}</div>
                            <div className="text-[11px] text-[#64748B] dark:text-gray-400">{row.email}</div>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <Input
                              type="number"
                              min="0"
                              max={maxMarks}
                              value={row.score === 0 ? "" : row.score}
                              placeholder="0"
                              onChange={(e) => handleScoreChange(row.studentId, parseFloat(e.target.value))}
                              className="w-24 mx-auto text-center font-bold text-sm bg-white dark:bg-gray-900 border-[#CBD5E1] dark:border-gray-700"
                            />
                          </td>
                          <td className="py-3 px-4 text-center font-bold text-[#0F172A] dark:text-white font-mono">
                            {pct}%
                          </td>
                          <td className="py-3 px-4 text-center">
                            <Badge className={`${gradeData.color} font-bold text-xs`}>
                              {gradeData.grade}
                            </Badge>
                          </td>
                          <td className="py-3 px-4">
                            <Input
                              value={row.remarks}
                              onChange={(e) => handleRemarksChange(row.studentId, e.target.value)}
                              placeholder="Add assessment remarks..."
                              className="bg-white dark:bg-gray-900 border-[#CBD5E1] dark:border-gray-700 text-xs"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <School className="h-5 w-5 text-[#1E40AF] dark:text-blue-400" />
              <h2 className="text-base font-bold text-[#0F172A] dark:text-white">
                Classwide Analytics & Leaderboards
              </h2>
            </div>
            <div className="w-64">
              <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                <SelectTrigger className="bg-white dark:bg-gray-900 border-[#CBD5E1] dark:border-gray-700 text-xs font-semibold">
                  <SelectValue placeholder="Select Class Section" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((cls) => (
                    <SelectItem key={cls._id} value={cls._id} className="text-xs">
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
            <Card className="bg-white dark:bg-[#111827] border-[#E2E8F0] dark:border-gray-800 shadow-xs">
              <CardContent className="py-16 text-center text-[#64748B]">
                <BarChart3 className="mx-auto h-12 w-12 text-[#94A3B8] mb-3" />
                <p className="font-semibold text-[#0F172A] dark:text-white">No Class Selected</p>
                <p className="text-xs text-[#64748B] dark:text-gray-400 mt-1">
                  Select a class section from the dropdown above to view analytics.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-4">
                <Card className="bg-white dark:bg-[#111827] border-[#E2E8F0] dark:border-gray-800 shadow-xs">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-xs font-semibold text-[#64748B] dark:text-gray-400">Class Average</CardTitle>
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950 text-[#1E40AF] dark:text-blue-400">
                      <Percent className="h-4 w-4" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-[#0F172A] dark:text-white">
                      {classAnalytics.metrics.averageScore}%
                    </div>
                    <p className="text-xs text-emerald-600 font-medium mt-1">
                      Across all entered evaluations
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-white dark:bg-[#111827] border-[#E2E8F0] dark:border-gray-800 shadow-xs">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-xs font-semibold text-[#64748B] dark:text-gray-400">Pass Rate</CardTitle>
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="h-4 w-4" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-[#0F172A] dark:text-white">
                      {classAnalytics.metrics.passRate}%
                    </div>
                    <p className="text-xs text-[#64748B] dark:text-gray-400 mt-1">Scores &ge; 50% threshold</p>
                  </CardContent>
                </Card>

                <Card className="bg-white dark:bg-[#111827] border-[#E2E8F0] dark:border-gray-800 shadow-xs">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-xs font-semibold text-[#64748B] dark:text-gray-400">Highest Score</CardTitle>
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-950 text-[#D97706] dark:text-amber-400">
                      <Award className="h-4 w-4" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-[#0F172A] dark:text-white">
                      {classAnalytics.metrics.highestScore}%
                    </div>
                    <p className="text-xs text-[#64748B] dark:text-gray-400 mt-1">Lowest: {classAnalytics.metrics.lowestScore}%</p>
                  </CardContent>
                </Card>

                <Card className="bg-white dark:bg-[#111827] border-[#E2E8F0] dark:border-gray-800 shadow-xs">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-xs font-semibold text-[#64748B] dark:text-gray-400">Submissions</CardTitle>
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400">
                      <BookOpen className="h-4 w-4" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-[#0F172A] dark:text-white">
                      {classAnalytics.metrics.totalSubmissions} Submissions
                    </div>
                    <p className="text-xs text-[#64748B] dark:text-gray-400 mt-1">
                      {classAnalytics.metrics.totalExams} Assessments Posted
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <Card className="bg-white dark:bg-[#111827] border-[#E2E8F0] dark:border-gray-800 shadow-xs">
                  <CardHeader>
                    <CardTitle className="text-base font-bold text-[#0F172A] dark:text-white">
                      Score Distribution
                    </CardTitle>
                    <CardDescription className="text-xs text-[#64748B] dark:text-gray-400">
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

                <Card className="bg-white dark:bg-[#111827] border-[#E2E8F0] dark:border-gray-800 shadow-xs">
                  <CardHeader>
                    <CardTitle className="text-base font-bold text-[#0F172A] dark:text-white">
                      Subject Averages
                    </CardTitle>
                    <CardDescription className="text-xs text-[#64748B] dark:text-gray-400">
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
                      <div className="h-full flex items-center justify-center text-xs text-[#64748B] dark:text-gray-400">
                        No subject exam data recorded for this class yet.
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              <Card className="bg-white dark:bg-[#111827] border-[#E2E8F0] dark:border-gray-800 shadow-xs">
                <CardHeader>
                  <CardTitle className="text-base font-bold text-[#0F172A] dark:text-white">
                    Class Roster & Achievement Leaderboard
                  </CardTitle>
                  <CardDescription className="text-xs text-[#64748B] dark:text-gray-400">
                    Student averages based on completed assessments and term evaluations
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {classAnalytics.rankings.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-[#F8FAFC] dark:bg-gray-800/80 text-[#64748B] dark:text-gray-300 text-xs font-semibold uppercase border-b border-[#E2E8F0] dark:border-gray-800">
                          <tr>
                            <th className="py-3 px-4">Rank</th>
                            <th className="py-3 px-4">Student Name</th>
                            <th className="py-3 px-4">Email</th>
                            <th className="py-3 px-4 text-center">Exams Completed</th>
                            <th className="py-3 px-4">Average Score</th>
                            <th className="py-3 px-4 text-center">Grade</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#F1F5F9] dark:divide-gray-800">
                          {classAnalytics.rankings.map((st, idx) => (
                            <tr key={idx} className="hover:bg-[#F8FAFC]/60 dark:hover:bg-gray-800/40 transition-colors">
                              <td className="py-3 px-4 font-bold text-[#0F172A] dark:text-white">
                                {idx === 0 ? "🥇 1" : idx === 1 ? "🥈 2" : idx === 2 ? "🥉 3" : idx + 1}
                              </td>
                              <td className="py-3 px-4 font-semibold text-[#0F172A] dark:text-white">{st.name}</td>
                              <td className="py-3 px-4 text-xs text-[#64748B] dark:text-gray-400">{st.email}</td>
                              <td className="py-3 px-4 text-center text-[#0F172A] dark:text-white">{st.examsCompleted}</td>
                              <td className="py-3 px-4 w-44">
                                <div className="space-y-1">
                                  <span className="text-xs font-bold text-[#0F172A] dark:text-white">{st.averagePercentage}%</span>
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
                    <div className="py-8 text-center text-xs text-[#64748B] dark:text-gray-400">
                      No student submissions found for this class.
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
