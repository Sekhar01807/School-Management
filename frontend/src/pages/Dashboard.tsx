import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/AuthProvider";
import { api } from "@/lib/api";
import { useNavigate } from "react-router";
import { toast } from "sonner";

// UI Imports
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Users,
  ArrowRight,
  CalendarCheck,
  Megaphone,
  Clock,
  GraduationCap,
  BookOpen,
  Layers,
  Award,
  UserCheck,
  Save,
  ClipboardCheck,
  FileSpreadsheet,
  Search,
} from "lucide-react";

// Custom Components
import { DashboardStats } from "@/components/dashboard/dashboard-stats";
import type { Announcement } from "@/types";

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [statsData, setStatsData] = useState<any>({});
  const [recentAnnouncements, setRecentAnnouncements] = useState<Announcement[]>([]);
  const [classesList, setClassesList] = useState<any[]>([]);

  // Teacher Quick Marks Entry State
  const [teacherSelectedClassId, setTeacherSelectedClassId] = useState<string>("");
  const [teacherSelectedSubjectId, setTeacherSelectedSubjectId] = useState<string>("");
  const [teacherSubjects, setTeacherSubjects] = useState<any[]>([]);
  const [teacherStudents, setTeacherStudents] = useState<any[]>([]);
  const [teacherStudentSearch, setTeacherStudentSearch] = useState<string>("");
  const [teacherExistingExams, setTeacherExistingExams] = useState<any[]>([]);
  const [teacherSelectedExamId, setTeacherSelectedExamId] = useState<string>("");
  const [teacherAssessmentTitle, setTeacherAssessmentTitle] = useState<string>("Unit Assessment 1");
  const [teacherAssessmentMaxMarks, setTeacherAssessmentMaxMarks] = useState<number>(25);
  const [teacherScores, setTeacherScores] = useState<{ [studentId: string]: number }>({});
  const [savingTeacherMarks, setSavingTeacherMarks] = useState(false);
  const [loadingTeacherStudents, setLoadingTeacherStudents] = useState(false);

  // 1. Fetch Dashboard Stats, Announcements, Classes, and Subjects
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const [statsRes, annRes, classesRes, subjectsRes] = await Promise.all([
          api.get("/dashboard/stats"),
          api.get("/announcements"),
          api.get("/classes?limit=100").catch(() => ({ data: [] })),
          api.get("/subjects?limit=100").catch(() => ({ data: [] })),
        ]);
        setStatsData(statsRes.data || {});
        setRecentAnnouncements(annRes.data?.slice(0, 3) || []);

        const cls = classesRes.data.classes || classesRes.data || [];
        const subs = (subjectsRes.data.subjects || subjectsRes.data || []).filter(
          (s: any) => s.code !== "STD101"
        );
        setClassesList(cls);
        setTeacherSubjects(subs);

        if (cls.length > 0) {
          setTeacherSelectedClassId(cls[0]._id);
        }
        if (subs.length > 0) {
          setTeacherSelectedSubjectId(subs[0]._id);
        }
      } catch (error) {
        console.error("Failed to load dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  // Load teacher specific dashboard data
  useEffect(() => {
    if (user?.role !== "teacher") return;

    api.get("/subjects").then((res) => {
      const allSub = res.data || [];
      const nonStudy = allSub.filter((s: any) => s.code !== "STD101");
      setTeacherSubjects(nonStudy);
      if (nonStudy.length > 0) {
        setTeacherSelectedSubjectId(nonStudy[0]._id);
      }
    });

    api.get("/classes?limit=100").then((res) => {
      const cls = res.data.classes || [];
      setClassesList(cls);
      if (cls.length > 0) {
        setTeacherSelectedClassId(cls[0]._id);
      }
    });
  }, [user]);

  // Fetch students when teacher changes selected class or subject in dashboard widget
  useEffect(() => {
    if (user?.role !== "teacher" || !teacherSelectedClassId) return;

    const loadStudentsForGrading = async () => {
      try {
        setLoadingTeacherStudents(true);
        const [classRes, marksRes] = await Promise.all([
          api.get(`/classes/${teacherSelectedClassId}`),
          teacherSelectedSubjectId
            ? api
                .get(`/reports/marks/class/${teacherSelectedClassId}/subject/${teacherSelectedSubjectId}`)
                .catch(() => ({ data: { exams: [], students: [] } }))
            : Promise.resolve({ data: { exams: [], students: [] } }),
        ]);

        const rawRoster: any[] =
          (marksRes.data.students && marksRes.data.students.length > 0)
            ? marksRes.data.students
            : (classRes.data.class?.students && classRes.data.class.students.length > 0)
            ? classRes.data.class.students
            : classRes.data.students || [];

        const normalizedRoster = rawRoster.map((st: any) => ({
          _id: st._id?.toString() || st.toString(),
          name: st.name || "Student",
          email: st.email || "",
        }));

        setTeacherStudents(normalizedRoster);

        const exams = marksRes.data.exams || [];
        setTeacherExistingExams(exams);

        let activeExam = exams.length > 0 ? exams[0] : null;
        let determinedMax = 25;
        if (activeExam) {
          setTeacherSelectedExamId(activeExam._id);
          setTeacherAssessmentTitle(activeExam.title);
          determinedMax = activeExam.maxMarks || (activeExam.title.includes("Mid-Term") ? 50 : activeExam.title.includes("Quarterly") ? 100 : 25);
          setTeacherAssessmentMaxMarks(determinedMax);
        } else {
          setTeacherSelectedExamId("new");
          setTeacherAssessmentTitle("Unit Assessment 1");
          setTeacherAssessmentMaxMarks(25);
        }

        const scoresMap: { [id: string]: number } = {};
        normalizedRoster.forEach((st: any) => {
          const stId = st._id?.toString();
          const existingEntry = marksRes.data.students?.find(
            (s: any) => (s._id?.toString() || s.toString()) === stId
          );
          if (activeExam && existingEntry?.marks?.[activeExam._id]) {
            scoresMap[stId] = existingEntry.marks[activeExam._id].score;
          } else {
            scoresMap[stId] = Math.round(determinedMax * 0.84);
          }
        });
        setTeacherScores(scoresMap);
      } catch (err) {
        console.error("Failed to load students for dashboard grading:", err);
      } finally {
        setLoadingTeacherStudents(false);
      }
    };

    loadStudentsForGrading();
  }, [teacherSelectedClassId, teacherSelectedSubjectId, user?.role]);

  const handleTeacherExamSelect = (examId: string) => {
    setTeacherSelectedExamId(examId);
    if (examId === "new") {
      setTeacherAssessmentTitle("New Assessment");
      setTeacherAssessmentMaxMarks(25);
      const cleared: { [id: string]: number } = {};
      teacherStudents.forEach((st: any) => {
        cleared[st._id] = 0;
      });
      setTeacherScores(cleared);
      return;
    }

    const matched = teacherExistingExams.find((e) => e._id === examId);
    if (matched) {
      setTeacherAssessmentTitle(matched.title);
      const maxPts = matched.maxMarks || (matched.title.includes("Mid-Term") ? 50 : matched.title.includes("Quarterly") ? 100 : 25);
      setTeacherAssessmentMaxMarks(maxPts);
      api
        .get(`/reports/marks/class/${teacherSelectedClassId}/subject/${teacherSelectedSubjectId}`)
        .then((res) => {
          const scoresMap: { [id: string]: number } = {};
          teacherStudents.forEach((st: any) => {
            const stId = st._id?.toString() || st.toString();
            const existingEntry = res.data.students?.find(
              (s: any) => s._id === stId || s._id?.toString() === stId
            );
            scoresMap[stId] = existingEntry?.marks?.[examId]?.score ?? 0;
          });
          setTeacherScores(scoresMap);
        });
    }
  };

  const handleSaveTeacherDashboardMarks = async () => {
    if (!teacherSelectedClassId || !teacherSelectedSubjectId) {
      toast.error("Please select a Class Section and Subject first.");
      return;
    }

    try {
      setSavingTeacherMarks(true);
      const payload = {
        classId: teacherSelectedClassId,
        subjectId: teacherSelectedSubjectId,
        title: teacherAssessmentTitle.trim() || "Unit Assessment",
        maxMarks: teacherAssessmentMaxMarks || 25,
        marksData: teacherStudents.map((st) => ({
          studentId: st._id,
          score: teacherScores[st._id] ?? Math.round(teacherAssessmentMaxMarks * 0.8),
          remarks: "Graded via Faculty Portal Dashboard",
        })),
      };

      const res = await api.post("/reports/marks/batch", payload);
      toast.success(res.data.message || "Student marks saved successfully!");
    } catch (err: any) {
      console.error("Save marks error:", err);
      toast.error(err.response?.data?.message || "Failed to save marks.");
    } finally {
      setSavingTeacherMarks(false);
    }
  };

  // 2. Loading State Skeleton
  if (loading) {
    return (
      <div className="p-6 md:p-8 space-y-6 bg-[#F8FAFC] dark:bg-[#0B1120] min-h-screen">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
        <div className="grid gap-6 md:grid-cols-7">
          <Skeleton className="col-span-4 h-96 rounded-xl" />
          <Skeleton className="col-span-3 h-96 rounded-xl" />
        </div>
      </div>
    );
  }

  const role = user?.role || "student";

  return (
    <div className="flex-1 space-y-6 p-6 md:p-8 bg-[#F8FAFC] dark:bg-[#0B1120] min-h-screen">
      {/* --- 1. HEADER BANNER --- */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[#E2E8F0] dark:border-gray-800">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[#0F172A] dark:text-white">
            {role === "admin" && "Administrative Dashboard"}
            {role === "teacher" && "Faculty Portal"}
            {role === "student" && "Student Academic Hub"}
          </h1>
          <p className="text-sm text-[#64748B] dark:text-gray-400 mt-1">
            Welcome back, <span className="font-semibold text-[#0F172A] dark:text-white">{user?.name}</span>!
            {role === "admin" && " School-wide overview, grade sections, and faculty directory."}
            {role === "teacher" && " Manage your daily teaching timetable, gradebook, and class roll call."}
            {role === "student" && ` Enrolled in ${statsData.className || "Grade 10-A"} for Academic Year 2025-2026.`}
          </p>
        </div>

        {/* Action Shortcuts */}
        <div className="flex items-center gap-2">
          {role === "admin" && (
            <>
              <Button
                onClick={() => navigate("/reports")}
                className="bg-[#1E40AF] hover:bg-[#1E3A8A] text-white shadow-xs text-xs font-semibold"
              >
                <Award className="mr-2 h-4 w-4" /> Academic Reports
              </Button>
              <Button
                onClick={() => navigate("/attendance")}
                variant="outline"
                className="border-[#E2E8F0] dark:border-gray-800 text-xs font-semibold"
              >
                <CalendarCheck className="mr-2 h-4 w-4 text-[#1E40AF]" /> Roll Call Register
              </Button>
            </>
          )}
          {role === "teacher" && (
            <>
              <Button
                onClick={() => navigate("/reports")}
                className="bg-[#1E40AF] hover:bg-[#1E3A8A] text-white shadow-xs text-xs font-semibold"
              >
                <ClipboardCheck className="mr-2 h-4 w-4" /> Gradebook & Reports
              </Button>
              <Button
                onClick={() => navigate("/attendance")}
                variant="outline"
                className="border-[#E2E8F0] dark:border-gray-800 text-xs font-semibold"
              >
                <CalendarCheck className="mr-2 h-4 w-4 text-[#16A34A]" /> Mark Attendance
              </Button>
            </>
          )}
          {role === "student" && (
            <>
              <Button
                onClick={() => navigate("/reports")}
                className="bg-[#1E40AF] hover:bg-[#1E3A8A] text-white shadow-xs text-xs font-semibold"
              >
                <Award className="mr-2 h-4 w-4" /> My Report Card
              </Button>
              <Button
                onClick={() => navigate("/timetable")}
                variant="outline"
                className="border-[#E2E8F0] dark:border-gray-800 text-xs font-semibold"
              >
                <Clock className="mr-2 h-4 w-4 text-[#0F766E]" /> My Timetable
              </Button>
            </>
          )}
        </div>
      </div>

      {/* --- 2. TOP ROW: ROLE-SPECIFIC FOCUSED STATS (4 Cards) --- */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <DashboardStats role={role} data={statsData} />
      </div>

      {/* --- 3. MAIN CONTENT GRID (2 Columns) --- */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        {/* ========================================================================= */}
        {/* LEFT COLUMN: CORE ACADEMIC & SCHEDULE WORKFLOWS (4 Cols) */}
        {/* ========================================================================= */}
        <div className="col-span-4 space-y-6">
          {/* A. ADMIN: CLASS SECTIONS OVERVIEW (4 SECTIONS) */}
          {role === "admin" && (
            <Card className="bg-white dark:bg-[#111827] border-[#E2E8F0] dark:border-gray-800 shadow-xs">
              <CardHeader className="pb-3 border-b border-[#F1F5F9] dark:border-gray-800/80">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Layers className="h-4 w-4 text-[#1E40AF] dark:text-blue-400" />
                    <CardTitle className="text-base font-bold text-[#0F172A] dark:text-white">
                      Academic Class Sections (4 Active Sections)
                    </CardTitle>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate("/classes")}
                    className="text-xs text-[#1E40AF] dark:text-blue-400 hover:text-[#1E3A8A]"
                  >
                    Manage Classes <ArrowRight className="ml-1 h-3 w-3" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                {classesList.length > 0 ? (
                  classesList.map((c: any) => (
                    <div
                      key={c._id}
                      className="flex items-center justify-between p-3.5 rounded-xl border border-[#F1F5F9] dark:border-gray-800 bg-[#F8FAFC]/70 dark:bg-gray-800/40"
                    >
                      <div className="space-y-0.5">
                        <p className="text-sm font-bold text-[#0F172A] dark:text-white">{c.name}</p>
                        <p className="text-xs text-[#64748B] dark:text-gray-400">
                          Class Teacher: <span className="font-semibold text-[#0F172A] dark:text-white">{c.classTeacher?.name || "Assigned Faculty"}</span> • Capacity: {c.capacity || 30}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs font-semibold border-[#E2E8F0] dark:border-gray-700 bg-white dark:bg-gray-900">
                        {c.students?.length || 15} Enrolled Students
                      </Badge>
                    </div>
                  ))
                ) : (
                  <div className="py-6 text-center text-xs text-[#64748B] dark:text-gray-400">
                    Grade 9-A, Grade 9-B, Grade 10-A, Grade 10-B active.
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* B. TEACHER: TODAY'S TEACHING SCHEDULE & MY CLASSES */}
          {role === "teacher" && (
            <>
              {/* Today's Teaching Schedule */}
              <Card className="bg-white dark:bg-[#111827] border-[#E2E8F0] dark:border-gray-800 shadow-xs">
                <CardHeader className="pb-3 border-b border-[#F1F5F9] dark:border-gray-800/80">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-[#1E40AF] dark:text-blue-400" />
                      <CardTitle className="text-base font-bold text-[#0F172A] dark:text-white">
                        Today's Teaching Schedule
                      </CardTitle>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate("/timetable")}
                      className="text-xs text-[#1E40AF] dark:text-blue-400 hover:text-[#1E3A8A]"
                    >
                      Full Timetable <ArrowRight className="ml-1 h-3 w-3" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-4 space-y-2.5">
                  {statsData.todayPeriods && statsData.todayPeriods.length > 0 ? (
                    statsData.todayPeriods.map((p: any, idx: number) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 rounded-xl border border-[#F1F5F9] dark:border-gray-800 bg-[#F8FAFC]/70 dark:bg-gray-800/40"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="flex size-8 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-950/60 text-[#1E40AF] dark:text-blue-400 font-bold text-xs">
                            P{idx + 1}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-[#0F172A] dark:text-white">{p.subjectName}</p>
                            <p className="text-xs text-[#64748B] dark:text-gray-400">{p.className}</p>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs font-mono border-[#E2E8F0] dark:border-gray-700">
                          {p.startTime} - {p.endTime}
                        </Badge>
                      </div>
                    ))
                  ) : (
                    <div className="py-6 text-center text-xs text-[#64748B] dark:text-gray-400">
                      No teaching periods assigned for today.
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Quick Marks Entry & Student Grading Widget */}
              <Card className="bg-white dark:bg-[#111827] border-[#E2E8F0] dark:border-gray-800 shadow-xs">
                <CardHeader className="pb-3 border-b border-[#F1F5F9] dark:border-gray-800/80">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <ClipboardCheck className="h-4 w-4 text-[#1E40AF] dark:text-blue-400" />
                      <CardTitle className="text-base font-bold text-[#0F172A] dark:text-white">
                        Student Marks Entry & Quick Grading
                      </CardTitle>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate("/reports")}
                      className="text-xs text-[#1E40AF] dark:text-blue-400 hover:text-[#1E3A8A]"
                    >
                      Open Full Gradebook <ArrowRight className="ml-1 h-3 w-3" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                  {/* Assessment Setup - Spacious 2-Row Layout */}
                  <div className="space-y-4 p-4 rounded-xl bg-[#F8FAFC]/80 dark:bg-gray-800/40 border border-[#E2E8F0] dark:border-gray-800">
                    {/* Row 1: Class Section & Curriculum Subject */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-[#0F172A] dark:text-white">Class Section</Label>
                        <Select value={teacherSelectedClassId} onValueChange={setTeacherSelectedClassId}>
                          <SelectTrigger className="h-10 bg-white dark:bg-gray-900 border-[#CBD5E1] dark:border-gray-700 text-xs font-semibold">
                            <SelectValue placeholder="Select Class" />
                          </SelectTrigger>
                          <SelectContent>
                            {classesList.map((cls: any) => (
                              <SelectItem key={cls._id} value={cls._id} className="text-xs font-medium">
                                {cls.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-[#0F172A] dark:text-white">Curriculum Subject</Label>
                        <Select value={teacherSelectedSubjectId} onValueChange={setTeacherSelectedSubjectId}>
                          <SelectTrigger className="h-10 bg-white dark:bg-gray-900 border-[#CBD5E1] dark:border-gray-700 text-xs font-semibold">
                            <SelectValue placeholder="Select Subject" />
                          </SelectTrigger>
                          <SelectContent>
                            {teacherSubjects.map((sub: any) => (
                              <SelectItem key={sub._id} value={sub._id} className="text-xs font-medium">
                                {sub.name} ({sub.code})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Row 2: Select Assessment */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-bold text-[#0F172A] dark:text-white">Select Assessment</Label>
                        <Badge variant="outline" className="text-[10px] font-bold text-[#1E40AF] bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900">
                          Max Marks: {teacherAssessmentMaxMarks}
                        </Badge>
                      </div>
                      <Select value={teacherSelectedExamId} onValueChange={handleTeacherExamSelect}>
                        <SelectTrigger className="h-10 bg-white dark:bg-gray-900 border-[#CBD5E1] dark:border-gray-700 text-xs font-semibold">
                          <SelectValue placeholder="Select Assessment" />
                        </SelectTrigger>
                        <SelectContent>
                          {teacherExistingExams.map((e: any) => (
                            <SelectItem key={e._id} value={e._id} className="text-xs font-medium">
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

                  {/* Student List & Scores Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-[#0F172A] dark:text-white">
                        Enrolled Students ({teacherStudents.length})
                      </span>
                      <Badge className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 text-[10px]">
                        All Sections Roster
                      </Badge>
                    </div>

                    <div className="relative w-full sm:w-64">
                      <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[#64748B] dark:text-gray-400" />
                      <Input
                        type="text"
                        placeholder="Search student by name..."
                        value={teacherStudentSearch}
                        onChange={(e) => setTeacherStudentSearch(e.target.value)}
                        className="pl-8 h-8 text-xs bg-white dark:bg-gray-900 border-[#CBD5E1] dark:border-gray-700"
                      />
                    </div>
                  </div>

                  {/* Student List & Scores */}
                  {loadingTeacherStudents ? (
                    <div className="p-8 text-center text-xs text-[#64748B]">Loading all enrolled students...</div>
                  ) : teacherStudents.length === 0 ? (
                    <div className="p-6 text-center text-xs text-[#64748B]">
                      No students found for this class section.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
                      {teacherStudents
                        .filter(
                          (st) =>
                            st.name.toLowerCase().includes(teacherStudentSearch.toLowerCase()) ||
                            st.email.toLowerCase().includes(teacherStudentSearch.toLowerCase())
                        )
                        .map((st: any, idx: number) => {
                          const currentScore = teacherScores[st._id] ?? 0;
                          const maxVal = teacherAssessmentMaxMarks || 25;
                          const scorePct = maxVal > 0 ? (currentScore / maxVal) * 100 : 0;
                          const gradeBadge =
                            scorePct >= 90
                              ? { label: "A+", color: "bg-emerald-100 text-emerald-800" }
                              : scorePct >= 75
                              ? { label: "A", color: "bg-blue-100 text-blue-800" }
                              : scorePct >= 50
                              ? { label: "B", color: "bg-amber-100 text-amber-800" }
                              : scorePct > 0
                              ? { label: "F", color: "bg-rose-100 text-rose-800" }
                              : { label: "—", color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" };

                          return (
                            <div
                              key={st._id}
                              className="flex items-center justify-between p-3 rounded-lg border border-[#F1F5F9] dark:border-gray-800 bg-[#F8FAFC]/50 dark:bg-gray-800/40 hover:bg-white dark:hover:bg-gray-800 transition-colors text-xs gap-3"
                            >
                              <div className="flex items-center space-x-3 min-w-0">
                                <span className="font-bold text-[#94A3B8] w-5 text-center text-xs">{idx + 1}</span>
                                <div className="truncate">
                                  <p className="font-bold text-[#0F172A] dark:text-white truncate text-xs">{st.name}</p>
                                  <p className="text-[10px] text-[#64748B] dark:text-gray-400 truncate font-mono">{st.email}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <Input
                                  type="number"
                                  min="0"
                                  max={maxVal}
                                  value={currentScore === 0 ? "" : currentScore}
                                  placeholder="0"
                                  onChange={(e) =>
                                    setTeacherScores((prev) => ({
                                      ...prev,
                                      [st._id]: Math.max(0, Math.min(maxVal, Number(e.target.value) || 0)),
                                    }))
                                  }
                                  className="w-16 h-8 text-center font-bold text-xs bg-white dark:bg-gray-900 border-[#CBD5E1] dark:border-gray-700"
                                />
                                <span className="text-[11px] text-[#64748B] dark:text-gray-400 font-mono font-bold">/ {maxVal}</span>
                                <Badge className={`${gradeBadge.color} text-[10px] font-bold px-2 py-0.5`}>
                                  {gradeBadge.label}
                                </Badge>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}

                  {teacherStudents.length > 0 && (
                    <div className="flex items-center justify-between pt-3 border-t border-[#F1F5F9] dark:border-gray-800">
                      <span className="text-xs text-[#64748B] dark:text-gray-400">
                        Grading <strong>{teacherStudents.length}</strong> students for <strong>{teacherAssessmentTitle}</strong>
                      </span>
                      <Button
                        size="sm"
                        onClick={handleSaveTeacherDashboardMarks}
                        disabled={savingTeacherMarks}
                        className="bg-[#1E40AF] hover:bg-[#1E3A8A] text-white text-xs h-9 px-4 font-semibold shadow-xs"
                      >
                        {savingTeacherMarks ? "Saving Marks..." : (
                          <>
                            <Save className="mr-1.5 h-3.5 w-3.5" /> Save All Marks
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}

          {/* C. STUDENT: TODAY'S TIMETABLE & CORE CURRICULUM */}
          {role === "student" && (
            <>
              {/* Today's Timetable */}
              <Card className="bg-white dark:bg-[#111827] border-[#E2E8F0] dark:border-gray-800 shadow-xs">
                <CardHeader className="pb-3 border-b border-[#F1F5F9] dark:border-gray-800/80">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-[#1E40AF] dark:text-blue-400" />
                      <CardTitle className="text-base font-bold text-[#0F172A] dark:text-white">
                        Today's Class Timetable
                      </CardTitle>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate("/timetable")}
                      className="text-xs text-[#1E40AF] dark:text-blue-400 hover:text-[#1E3A8A]"
                    >
                      Weekly Grid <ArrowRight className="ml-1 h-3 w-3" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-4 space-y-2.5">
                  {statsData.todayPeriods && statsData.todayPeriods.length > 0 ? (
                    statsData.todayPeriods.map((p: any, idx: number) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 rounded-xl border border-[#F1F5F9] dark:border-gray-800 bg-[#F8FAFC]/70 dark:bg-gray-800/40"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="flex size-8 items-center justify-center rounded-lg bg-teal-100 dark:bg-teal-950/60 text-[#0F766E] dark:text-teal-400 font-bold text-xs">
                            P{idx + 1}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-[#0F172A] dark:text-white">{p.subject}</p>
                            <p className="text-xs text-[#64748B] dark:text-gray-400">Faculty: {p.teacher}</p>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs font-mono border-[#E2E8F0] dark:border-gray-700">
                          {p.startTime} - {p.endTime}
                        </Badge>
                      </div>
                    ))
                  ) : (
                    <div className="py-6 text-center text-xs text-[#64748B] dark:text-gray-400">
                      No class periods scheduled for today.
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Core Academic Curriculum & Performance */}
              <Card className="bg-white dark:bg-[#111827] border-[#E2E8F0] dark:border-gray-800 shadow-xs">
                <CardHeader className="pb-3 border-b border-[#F1F5F9] dark:border-gray-800/80">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <BookOpen className="h-4 w-4 text-[#D97706] dark:text-amber-400" />
                      <CardTitle className="text-base font-bold text-[#0F172A] dark:text-white">
                        Enrolled Curriculum & Subject Performance
                      </CardTitle>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate("/reports")}
                      className="text-xs text-[#1E40AF] dark:text-blue-400 hover:text-[#1E3A8A]"
                    >
                      Report Card <ArrowRight className="ml-1 h-3 w-3" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {statsData.subjectReports && statsData.subjectReports.length > 0 ? (
                    statsData.subjectReports.map((sub: any, i: number) => (
                      <div
                        key={i}
                        className="p-3 rounded-xl border border-[#F1F5F9] dark:border-gray-800 bg-[#F8FAFC]/70 dark:bg-gray-800/40 space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-bold text-[#0F172A] dark:text-white">{sub.subjectName}</p>
                          <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] font-bold">
                            {sub.grade || "A"} • {sub.percentage}%
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-[#64748B] dark:text-gray-400">
                          <span>{sub.subjectCode}</span>
                          <span>{sub.totalScored} / {sub.totalPossible} pts</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    [
                      { name: "Telugu", code: "TEL101", teacher: "Ramakrishna Sastry" },
                      { name: "English", code: "ENG101", teacher: "Suhasini Maniratnam" },
                      { name: "Mathematics", code: "MATH101", teacher: "Ravi Teja Bhupathi" },
                      { name: "Physics", code: "PHY101", teacher: "Nagarjuna Akkineni" },
                      { name: "Chemistry", code: "CHEM101", teacher: "Venkatesh Daggubati" },
                      { name: "Social Studies", code: "SOC101", teacher: "Anasuya Bharadwaj" },
                    ].map((sub, i) => (
                      <div
                        key={i}
                        className="p-3 rounded-xl border border-[#F1F5F9] dark:border-gray-800 bg-[#F8FAFC]/70 dark:bg-gray-800/40 space-y-0.5"
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-bold text-[#0F172A] dark:text-white">{sub.name}</p>
                          <Badge variant="outline" className="text-[10px] py-0 border-slate-200 dark:border-gray-700">
                            {sub.code}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-[#64748B] dark:text-gray-400 truncate">
                          {sub.teacher}
                        </p>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </>
          )}

          {/* ANNOUNCEMENTS (Relevant for All Roles) */}
          <Card className="bg-white dark:bg-[#111827] border-[#E2E8F0] dark:border-gray-800 shadow-xs">
            <CardHeader className="pb-3 border-b border-[#F1F5F9] dark:border-gray-800/80">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Megaphone className="h-4 w-4 text-[#1E40AF] dark:text-blue-400" />
                  <CardTitle className="text-base font-bold text-[#0F172A] dark:text-white">
                    Campus Circulars & Notices
                  </CardTitle>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate("/announcements")}
                  className="text-xs text-[#1E40AF] dark:text-blue-400 hover:text-[#1E3A8A]"
                >
                  View All <ArrowRight className="ml-1 h-3 w-3" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              {recentAnnouncements.length > 0 ? (
                recentAnnouncements.map((ann) => (
                  <div
                    key={ann._id}
                    className="p-3 rounded-xl border border-[#F1F5F9] dark:border-gray-800 bg-[#F8FAFC]/70 dark:bg-gray-800/40 hover:bg-[#F1F5F9] dark:hover:bg-gray-800/70 transition-colors space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {ann.priority === "urgent" && (
                          <Badge className="bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 text-[10px] px-1.5 py-0.5">
                            Urgent
                          </Badge>
                        )}
                        {ann.priority === "high" && (
                          <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 text-[10px] px-1.5 py-0.5">
                            High
                          </Badge>
                        )}
                        <h4 className="text-sm font-semibold text-[#0F172A] dark:text-white">{ann.title}</h4>
                      </div>
                      <span className="text-[11px] text-[#94A3B8] dark:text-gray-400">
                        {new Date(ann.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      </span>
                    </div>
                    <p className="text-xs text-[#64748B] dark:text-gray-400 line-clamp-2">{ann.content}</p>
                  </div>
                ))
              ) : (
                <div className="py-6 text-center text-xs text-[#64748B] dark:text-gray-400">
                  No active circulars at this moment.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ========================================================================= */}
        {/* RIGHT COLUMN: ROLE-SPECIFIC CONTEXT & ACTION PANELS (3 Cols) */}
        {/* ========================================================================= */}
        <div className="col-span-3 space-y-6">
          {/* 1. ADMIN: ADMINISTRATIVE CONTROLS & MANAGEMENT */}
          {role === "admin" && (
            <Card className="bg-white dark:bg-[#111827] border-[#E2E8F0] dark:border-gray-800 shadow-xs">
              <CardHeader className="pb-3 border-b border-[#F1F5F9] dark:border-gray-800/80">
                <CardTitle className="text-base font-bold text-[#0F172A] dark:text-white">
                  Administrative Hub
                </CardTitle>
                <CardDescription className="text-xs text-[#64748B] dark:text-gray-400">
                  Institutional management, academic oversight, and directory shortcuts
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-2.5 pt-4">
                <Button
                  variant="outline"
                  className="justify-start h-11 border-[#E2E8F0] dark:border-gray-800 text-xs font-semibold hover:bg-blue-50 dark:hover:bg-gray-800"
                  onClick={() => navigate("/reports")}
                >
                  <Award className="mr-2.5 h-4 w-4 text-[#1E40AF] dark:text-blue-400" /> Academic Reports & Marks Matrix
                </Button>
                <Button
                  variant="outline"
                  className="justify-start h-11 border-[#E2E8F0] dark:border-gray-800 text-xs font-semibold hover:bg-teal-50 dark:hover:bg-gray-800"
                  onClick={() => navigate("/classes")}
                >
                  <GraduationCap className="mr-2.5 h-4 w-4 text-[#0F766E] dark:text-teal-400" /> Manage Grade Sections (4 Classes)
                </Button>
                <Button
                  variant="outline"
                  className="justify-start h-11 border-[#E2E8F0] dark:border-gray-800 text-xs font-semibold hover:bg-amber-50 dark:hover:bg-gray-800"
                  onClick={() => navigate("/subjects")}
                >
                  <BookOpen className="mr-2.5 h-4 w-4 text-[#D97706] dark:text-amber-400" /> Curriculum & Core Subjects (6 Subjects)
                </Button>
                <Button
                  variant="outline"
                  className="justify-start h-11 border-[#E2E8F0] dark:border-gray-800 text-xs font-semibold hover:bg-emerald-50 dark:hover:bg-gray-800"
                  onClick={() => navigate("/users/students")}
                >
                  <Users className="mr-2.5 h-4 w-4 text-[#16A34A] dark:text-emerald-400" /> Student Directory (60 Students)
                </Button>
                <Button
                  variant="outline"
                  className="justify-start h-11 border-[#E2E8F0] dark:border-gray-800 text-xs font-semibold hover:bg-purple-50 dark:hover:bg-gray-800"
                  onClick={() => navigate("/users/teachers")}
                >
                  <Users className="mr-2.5 h-4 w-4 text-[#7C3AED] dark:text-purple-400" /> Faculty Directory ({statsData.totalTeachers || 12} Members)
                </Button>
                <Button
                  variant="outline"
                  className="justify-start h-11 border-[#E2E8F0] dark:border-gray-800 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-gray-800"
                  onClick={() => navigate("/attendance")}
                >
                  <CalendarCheck className="mr-2.5 h-4 w-4 text-[#0F766E] dark:text-teal-400" /> Roll Call Registers
                </Button>
              </CardContent>
            </Card>
          )}

          {/* 2. TEACHER: QUICK CLASS ROLL CALL & ACTIONS */}
          {role === "teacher" && (
            <Card className="bg-white dark:bg-[#111827] border-[#E2E8F0] dark:border-gray-800 shadow-xs">
              <CardHeader className="pb-3 border-b border-[#F1F5F9] dark:border-gray-800/80">
                <CardTitle className="text-base font-bold text-[#0F172A] dark:text-white">
                  Daily Roll Call Register
                </CardTitle>
                <CardDescription className="text-xs text-[#64748B] dark:text-gray-400">
                  Mark daily student attendance for your assigned sections
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                <div className="p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#1E40AF] dark:text-blue-400">
                      Primary Section: {statsData.myClasses?.[0]?.name || "Grade 10-A"}
                    </span>
                    <Badge className="bg-[#1E40AF] text-white text-[10px] py-0.5 px-2 font-bold">
                      {statsData.myClasses?.[0]?.studentCount || 15} Students
                    </Badge>
                  </div>
                  <p className="text-xs text-[#64748B] dark:text-gray-400">
                    Faculty in Charge: {user?.name || "Assigned Teacher"}
                  </p>
                </div>
                <Button
                  onClick={() => navigate("/attendance")}
                  className="w-full bg-[#1E40AF] hover:bg-[#1E3A8A] text-white text-xs font-semibold"
                >
                  <CalendarCheck className="mr-2 h-4 w-4" /> Open Attendance Register
                </Button>
                <Button
                  onClick={() => navigate("/reports")}
                  variant="outline"
                  className="w-full border-[#E2E8F0] dark:border-gray-800 text-xs font-semibold"
                >
                  <FileSpreadsheet className="mr-2 h-4 w-4 text-[#1E40AF]" /> Open Full Gradebook
                </Button>
              </CardContent>
            </Card>
          )}

          {/* 3. STUDENT: ACADEMIC STANDING & ATTENDANCE SUMMARY */}
          {role === "student" && (
            <Card className="bg-white dark:bg-[#111827] border-[#E2E8F0] dark:border-gray-800 shadow-xs">
              <CardHeader className="pb-3 border-b border-[#F1F5F9] dark:border-gray-800/80">
                <div className="flex items-center space-x-2">
                  <UserCheck className="h-4 w-4 text-[#16A34A] dark:text-emerald-400" />
                  <CardTitle className="text-base font-bold text-[#0F172A] dark:text-white">
                    Academic Standing
                  </CardTitle>
                </div>
                <CardDescription className="text-xs text-[#64748B] dark:text-gray-400">
                  Active enrollment in {statsData.className || "Grade 10-A"}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-400">
                      Attendance Standing
                    </span>
                    <Badge className="bg-emerald-600 text-white text-xs font-bold px-2 py-0.5">
                      {statsData.myAttendance || "96.5%"}
                    </Badge>
                  </div>
                  <div className="text-xl font-extrabold text-[#0F172A] dark:text-white">
                    {statsData.studentName || user?.name}
                  </div>
                  <p className="text-xs text-[#64748B] dark:text-gray-400">
                    Class Teacher: {statsData.classTeacherName || "Ravi Teja Bhupathi (Mathematics)"}
                  </p>
                </div>
                <Button
                  onClick={() => navigate("/reports")}
                  className="w-full bg-[#1E40AF] hover:bg-[#1E3A8A] text-white text-xs font-semibold"
                >
                  <Award className="mr-2 h-4 w-4" /> View Full Report Card
                </Button>
              </CardContent>
            </Card>
          )}

        </div>
      </div>
    </div>
  );
}
