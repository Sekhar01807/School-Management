import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/hooks/AuthProvider";
import { api } from "@/lib/api";
import { toast } from "sonner";
import type { Class, AttendanceStatus, StudentAttendanceSummary } from "@/types";

// UI Imports
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CalendarCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Users,
  Save,
  TrendingUp,
  Download,
  School,
  Eye,
} from "lucide-react";

export default function AttendancePage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const isTeacher = user?.role === "teacher";
  const isTeacherOrAdmin = isAdmin || isTeacher;

  // Teacher / Admin State
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [students, setStudents] = useState<any[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<{
    [studentId: string]: { status: AttendanceStatus; remarks: string };
  }>({});
  const [loadingClass, setLoadingClass] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [campusOverview, setCampusOverview] = useState<any>(null);

  // Student State
  const [studentSummary, setStudentSummary] = useState<StudentAttendanceSummary | null>(null);
  const [loadingStudent, setLoadingStudent] = useState(false);

  // 1. Fetch Initial Data
  useEffect(() => {
    if (isTeacherOrAdmin) {
      const fetchClassesAndOverview = async () => {
        try {
          const [classRes, overviewRes] = await Promise.all([
            api.get("/classes?limit=100"),
            api.get("/attendance/overview").catch(() => ({ data: null })),
          ]);
          const classList: Class[] = classRes.data.classes || classRes.data || [];
          setClasses(classList);
          if (overviewRes.data) setCampusOverview(overviewRes.data);

          // If Teacher, prioritize their assigned class
          let defaultClassId = "";
          if (isTeacher && user) {
            const myClass = classList.find(
              (c: any) =>
                (c.classTeacher?._id || c.classTeacher) === user._id ||
                c.classTeacher?.email === user.email
            );
            if (myClass) defaultClassId = myClass._id;
          }

          if (!defaultClassId && classList.length > 0) {
            defaultClassId = classList[0]._id;
          }

          if (defaultClassId) {
            setSelectedClassId(defaultClassId);
          }
        } catch (error) {
          console.error("Failed to load attendance classes:", error);
          toast.error("Failed to load classes");
        }
      };
      fetchClassesAndOverview();
    } else {
      // Student / Parent view
      const fetchStudentAttendance = async () => {
        try {
          setLoadingStudent(true);
          const res = await api.get("/attendance/student/me");
          setStudentSummary(res.data);
        } catch (error) {
          console.error("Failed to fetch student attendance:", error);
        } finally {
          setLoadingStudent(false);
        }
      };
      fetchStudentAttendance();
    }
  }, [isTeacherOrAdmin, isTeacher, user]);

  // 2. Fetch Class Attendance for selected class & date
  useEffect(() => {
    if (!isTeacherOrAdmin || !selectedClassId) return;

    const fetchClassAttendance = async () => {
      try {
        setLoadingClass(true);
        // Fetch class details with students
        const classDetailsRes = await api.get(`/classes/${selectedClassId}`);
        const classObj: Class = classDetailsRes.data.class || classDetailsRes.data;
        let studentList = classObj.students || [];

        // Fallback: If students array is empty, fetch by classId query
        if (studentList.length === 0) {
          const userRes = await api.get(`/users?role=student&classId=${selectedClassId}&limit=100`);
          studentList = userRes.data.users || [];
        }
        setStudents(studentList);

        // Fetch existing attendance record for this date
        const attendanceRes = await api.get(
          `/attendance/class/${selectedClassId}?date=${selectedDate}`
        ).catch(() => ({ data: null }));
        const existingData = attendanceRes.data;

        const newRecordsMap: { [studentId: string]: { status: AttendanceStatus; remarks: string } } =
          {};

        studentList.forEach((st: any) => {
          const stId = st._id || st;
          const found = existingData?.records?.find(
            (r: any) => (r.student?._id || r.student) === stId
          );
          if (found) {
            newRecordsMap[stId] = {
              status: found.status || "present",
              remarks: found.remarks || "",
            };
          } else {
            newRecordsMap[stId] = {
              status: "present",
              remarks: "",
            };
          }
        });

        setAttendanceRecords(newRecordsMap);
      } catch (error) {
        console.error("Failed to load class attendance data:", error);
      } finally {
        setLoadingClass(false);
      }
    };

    fetchClassAttendance();
  }, [selectedClassId, selectedDate, isTeacherOrAdmin]);

  // Handle single student status change (Teacher only)
  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    if (!isTeacher) return;
    setAttendanceRecords((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        status,
      },
    }));
  };

  // Handle remarks change (Teacher only)
  const handleRemarksChange = (studentId: string, remarks: string) => {
    if (!isTeacher) return;
    setAttendanceRecords((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        remarks,
      },
    }));
  };

  // Bulk status update (Teacher only)
  const handleBulkStatus = (status: AttendanceStatus) => {
    if (!isTeacher) return;
    const updated: typeof attendanceRecords = {};
    students.forEach((st) => {
      const stId = st._id || st;
      updated[stId] = {
        status,
        remarks: attendanceRecords[stId]?.remarks || "",
      };
    });
    setAttendanceRecords(updated);
    toast.info(`Marked all students as ${status}`);
  };

  // Save Attendance to Backend (Teacher only)
  const handleSaveAttendance = async () => {
    if (!selectedClassId || !isTeacher) return;

    try {
      setSaving(true);
      const recordsArray = Object.entries(attendanceRecords).map(([studentId, data]) => ({
        student: studentId,
        status: data.status,
        remarks: data.remarks,
      }));

      await api.post("/attendance", {
        classId: selectedClassId,
        date: selectedDate,
        records: recordsArray,
      });

      toast.success("Daily roll call saved and broadcasted successfully!");
      // Refresh overview
      const overviewRes = await api.get("/attendance/overview").catch(() => ({ data: null }));
      if (overviewRes.data) setCampusOverview(overviewRes.data);
    } catch (error: any) {
      console.error("Save attendance error:", error);
      toast.error(error?.response?.data?.message || "Failed to save attendance");
    } finally {
      setSaving(false);
    }
  };

  // Export Monthly Class Attendance Register to CSV
  const handleExportCsv = async () => {
    if (!selectedClassId) {
      toast.error("Please select a class first to export attendance.");
      return;
    }

    try {
      setExporting(true);
      const dateObj = new Date(selectedDate);
      const month = dateObj.getMonth();
      const year = dateObj.getFullYear();

      const response = await api.get(
        `/export/attendance/${selectedClassId}?month=${month}&year=${year}`,
        {
          responseType: "blob",
        }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      const contentDisposition = response.headers["content-disposition"];
      let fileName = `Attendance_Register.csv`;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^"]+)"?/);
        if (match && match[1]) fileName = match[1];
      }
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Attendance register exported successfully!");
    } catch (err: any) {
      console.error("Export error:", err);
      toast.error("Failed to export attendance register.");
    } finally {
      setExporting(false);
    }
  };

  // Calculate live stats for current class sheet
  const classLiveStats = useMemo(() => {
    const total = students.length;
    if (total === 0) return { present: 0, absent: 0, late: 0, rate: 0 };

    let present = 0;
    let absent = 0;
    let late = 0;

    Object.values(attendanceRecords).forEach((rec) => {
      if (rec.status === "present") present++;
      else if (rec.status === "absent") absent++;
      else if (rec.status === "late") late++;
    });

    const rate = Math.round(((present + late * 0.75) / total) * 100);
    return { present, absent, late, rate };
  }, [students, attendanceRecords]);

  // --- RENDER FOR STUDENT / PARENT ---
  if (!isTeacherOrAdmin) {
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
      <div className="flex-1 space-y-6 p-8 pt-6 bg-[#F8FAFC] dark:bg-[#0B1120] min-h-screen">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[#0F172A] dark:text-white">
            My Attendance Record
          </h1>
          <p className="text-sm text-[#64748B] dark:text-gray-400 mt-0.5">
            Verified daily classroom attendance and participation metrics.
          </p>
        </div>

        {/* Top Metric Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="bg-white dark:bg-[#111827] border-[#E2E8F0] dark:border-gray-800 shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold text-[#64748B] dark:text-gray-400">Attendance Rate</CardTitle>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
                <TrendingUp className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-extrabold text-[#0F172A] dark:text-white">
                {studentSummary?.percentage ?? 100}%
              </div>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-1">
                {studentSummary && studentSummary.percentage >= 75
                  ? "Meets eligibility requirements"
                  : "Attention needed"}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-[#111827] border-[#E2E8F0] dark:border-gray-800 shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold text-[#64748B] dark:text-gray-400">Days Present</CardTitle>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-extrabold text-[#0F172A] dark:text-white">
                {studentSummary?.presentCount ?? 0}
              </div>
              <p className="text-xs text-[#64748B] dark:text-gray-400 mt-1">
                Out of {studentSummary?.totalDays ?? 0} recorded days
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-[#111827] border-[#E2E8F0] dark:border-gray-800 shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold text-[#64748B] dark:text-gray-400">Days Absent</CardTitle>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400">
                <XCircle className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-extrabold text-[#0F172A] dark:text-white">
                {studentSummary?.absentCount ?? 0}
              </div>
              <p className="text-xs text-[#64748B] dark:text-gray-400 mt-1">Total recorded absences</p>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-[#111827] border-[#E2E8F0] dark:border-gray-800 shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold text-[#64748B] dark:text-gray-400">Enrollment Class</CardTitle>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400">
                <School className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-extrabold text-[#0F172A] dark:text-white">
                {studentSummary?.className || "Grade 10-A"}
              </div>
              <p className="text-xs text-[#64748B] dark:text-gray-400 mt-1">Academic Year 2025-2026</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // --- RENDER FOR TEACHER / ADMIN ---
  return (
    <div className="flex-1 space-y-6 p-6 md:p-8 bg-[#F8FAFC] dark:bg-[#0B1120] min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[#E2E8F0] dark:border-gray-800">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[#0F172A] dark:text-white">
            {isAdmin ? "Campus Attendance Viewer" : "Class Roll Call Register"}
          </h1>
          <p className="text-sm text-[#64748B] dark:text-gray-400 mt-1">
            {isAdmin
              ? "Inspect school-wide attendance records, filter by grade section and date, or export monthly CSV reports."
              : "Mark and submit daily classroom roll call attendance for your assigned students."}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            type="button"
            variant="outline"
            onClick={handleExportCsv}
            disabled={exporting || !selectedClassId}
            className="border-[#CBD5E1] dark:border-gray-700 text-[#334155] dark:text-gray-300 hover:bg-[#F1F5F9] dark:hover:bg-gray-800 shadow-xs text-xs font-semibold"
          >
            <Download className="mr-2 h-4 w-4 text-[#1E40AF]" />
            {exporting ? "Exporting..." : "Export Monthly CSV"}
          </Button>

          {/* Save Attendance Button (Teacher Only) */}
          {isTeacher && (
            <Button
              onClick={handleSaveAttendance}
              disabled={saving || students.length === 0}
              className="bg-[#1E40AF] hover:bg-[#1E3A8A] text-white shadow-xs text-xs font-semibold"
            >
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Saving..." : "Save Daily Roll Call"}
            </Button>
          )}
        </div>
      </div>

      {/* Campus Summary Banner for Admins/Teachers */}
      {campusOverview && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="bg-white dark:bg-[#111827] border-[#E2E8F0] dark:border-gray-800 shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold text-[#64748B] dark:text-gray-400">Campus Rate Today</CardTitle>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
                <TrendingUp className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[#0F172A] dark:text-white">{campusOverview.todayRate}</div>
              <p className="text-xs text-[#64748B] dark:text-gray-400 mt-0.5">
                {campusOverview.todayPresent} present / {campusOverview.todayTotal} roll count
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-[#111827] border-[#E2E8F0] dark:border-gray-800 shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold text-[#64748B] dark:text-gray-400">Selected Section Rate</CardTitle>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
                <Users className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[#0F172A] dark:text-white">{classLiveStats.rate}%</div>
              <p className="text-xs text-[#64748B] dark:text-gray-400 mt-0.5">
                {classLiveStats.present} present, {classLiveStats.absent} absent, {classLiveStats.late} late
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-[#111827] border-[#E2E8F0] dark:border-gray-800 shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold text-[#64748B] dark:text-gray-400">Section Students</CardTitle>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
                <CalendarCheck className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[#0F172A] dark:text-white">{students.length} Students</div>
              <p className="text-xs text-[#64748B] dark:text-gray-400 mt-0.5">Assigned to this section</p>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-[#111827] border-[#E2E8F0] dark:border-gray-800 shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold text-[#64748B] dark:text-gray-400">Sections Completed</CardTitle>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
                <Clock className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[#0F172A] dark:text-white">
                {campusOverview.classesRecordedToday} Sections
              </div>
              <p className="text-xs text-[#64748B] dark:text-gray-400 mt-0.5">Submitted today's register</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filter and Control Bar */}
      <Card className="bg-white dark:bg-[#111827] border-[#E2E8F0] dark:border-gray-800 shadow-xs">
        <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Class Selector */}
            <div className="w-64">
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

            {/* Date Picker */}
            <div className="flex items-center space-x-2">
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-44 bg-white dark:bg-gray-900 border-[#CBD5E1] dark:border-gray-700 text-xs font-mono"
              />
            </div>
          </div>

          {/* Quick Bulk Actions (Teacher Only) */}
          {isTeacher && (
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkStatus("present")}
                className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 text-xs font-semibold"
              >
                <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> All Present
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkStatus("absent")}
                className="border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-semibold"
              >
                <XCircle className="mr-1.5 h-3.5 w-3.5" /> All Absent
              </Button>
            </div>
          )}
          {isAdmin && (
            <div className="flex items-center gap-2 text-xs font-semibold text-[#64748B] dark:text-gray-400">
              <Eye className="h-4 w-4 text-[#1E40AF]" /> Viewing Records Only
            </div>
          )}
        </CardContent>
      </Card>

      {/* Attendance Roster Table */}
      <Card className="bg-white dark:bg-[#111827] border-[#E2E8F0] dark:border-gray-800 shadow-xs">
        <CardHeader className="pb-3 border-b border-[#F1F5F9] dark:border-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold text-[#0F172A] dark:text-white">
                {isAdmin ? "Section Attendance Register" : "Class Roster Roll Call"}
              </CardTitle>
              <CardDescription className="text-xs text-[#64748B] dark:text-gray-400">
                {isAdmin
                  ? `Viewing verified attendance records for ${selectedDate}`
                  : `Mark presence or absence for ${selectedDate}`}
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-xs font-mono border-[#E2E8F0] dark:border-gray-700">
              {students.length} Enrolled Students
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          {loadingClass ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          ) : students.length === 0 ? (
            <div className="py-12 text-center text-[#64748B] dark:text-gray-400">
              <Users className="mx-auto h-12 w-12 text-[#94A3B8] mb-3" />
              <p className="font-semibold text-[#0F172A] dark:text-white">No Students Enrolled in This Section</p>
              <p className="text-xs text-[#64748B] dark:text-gray-400 mt-1">
                Assign students to this section in the People directory to view attendance.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8FAFC] dark:bg-gray-800/80 text-[#64748B] dark:text-gray-300 font-semibold uppercase border-b border-[#E2E8F0] dark:border-gray-800">
                  <tr>
                    <th className="py-3 px-4 w-12">#</th>
                    <th className="py-3 px-4">Student Name</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9] dark:divide-gray-800">
                  {students.map((student, idx) => {
                    const stId = student._id || student;
                    const record = attendanceRecords[stId] || {
                      status: "present",
                      remarks: "",
                    };

                    return (
                      <tr key={stId} className="hover:bg-[#F8FAFC]/70 dark:hover:bg-gray-800/40 transition-colors">
                        <td className="py-3 px-4 text-xs font-mono text-[#94A3B8]">{idx + 1}</td>
                        <td className="py-3 px-4 font-bold text-[#0F172A] dark:text-white">
                          {student.name || "Student"}
                        </td>
                        <td className="py-3 px-4 text-[#64748B] dark:text-gray-400">{student.email || "—"}</td>
                        <td className="py-3 px-4">
                          {isTeacher ? (
                            <div className="flex items-center justify-center space-x-1.5">
                              <button
                                type="button"
                                onClick={() => handleStatusChange(stId, "present")}
                                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                                  record.status === "present"
                                    ? "bg-emerald-600 text-white shadow-xs"
                                    : "bg-[#F1F5F9] dark:bg-gray-800 text-[#64748B] hover:bg-emerald-50 hover:text-emerald-700"
                                }`}
                              >
                                Present
                              </button>
                              <button
                                type="button"
                                onClick={() => handleStatusChange(stId, "late")}
                                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                                  record.status === "late"
                                    ? "bg-amber-500 text-white shadow-xs"
                                    : "bg-[#F1F5F9] dark:bg-gray-800 text-[#64748B] hover:bg-amber-50 hover:text-amber-700"
                                }`}
                              >
                                Late
                              </button>
                              <button
                                type="button"
                                onClick={() => handleStatusChange(stId, "absent")}
                                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                                  record.status === "absent"
                                    ? "bg-rose-600 text-white shadow-xs"
                                    : "bg-[#F1F5F9] dark:bg-gray-800 text-[#64748B] hover:bg-rose-50 hover:text-rose-700"
                                }`}
                              >
                                Absent
                              </button>
                              <button
                                type="button"
                                onClick={() => handleStatusChange(stId, "excused")}
                                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                                  record.status === "excused"
                                    ? "bg-blue-600 text-white shadow-xs"
                                    : "bg-[#F1F5F9] dark:bg-gray-800 text-[#64748B] hover:bg-blue-50 hover:text-blue-700"
                                }`}
                              >
                                Excused
                              </button>
                            </div>
                          ) : (
                            <div className="flex justify-center">
                              {record.status === "present" && (
                                <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-xs">
                                  Present
                                </Badge>
                              )}
                              {record.status === "absent" && (
                                <Badge className="bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 text-xs">
                                  Absent
                                </Badge>
                              )}
                              {record.status === "late" && (
                                <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 text-xs">
                                  Late
                                </Badge>
                              )}
                              {record.status === "excused" && (
                                <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 text-xs">
                                  Excused
                                </Badge>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {isTeacher ? (
                            <Input
                              placeholder="Optional remark..."
                              value={record.remarks}
                              onChange={(e) => handleRemarksChange(stId, e.target.value)}
                              className="h-8 text-xs bg-white dark:bg-gray-900 border-[#E2E8F0] dark:border-gray-700"
                            />
                          ) : (
                            <span className="text-[#64748B] dark:text-gray-400 italic text-xs">
                              {record.remarks || "—"}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
