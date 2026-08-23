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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CalendarCheck,
  CheckCircle2,
  XCircle,
  Clock,
  HelpCircle,
  Users,
  Save,
  Calendar as CalendarIcon,
  TrendingUp,
  AlertCircle,
} from "lucide-react";

export default function AttendancePage() {
  const { user } = useAuth();
  const isTeacherOrAdmin = user?.role === "teacher" || user?.role === "admin";

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
  const [campusOverview, setCampusOverview] = useState<any>(null);

  // Student State
  const [studentSummary, setStudentSummary] = useState<StudentAttendanceSummary | null>(null);
  const [loadingStudent, setLoadingStudent] = useState(false);

  // 1. Fetch Teacher/Admin Initial Data (Classes & Campus Overview)
  useEffect(() => {
    if (isTeacherOrAdmin) {
      const fetchClassesAndOverview = async () => {
        try {
          const [classRes, overviewRes] = await Promise.all([
            api.get("/classes"),
            api.get("/attendance/overview"),
          ]);
          const classList: Class[] = classRes.data.classes || classRes.data || [];
          setClasses(classList);
          setCampusOverview(overviewRes.data);

          if (classList.length > 0) {
            setSelectedClassId(classList[0]._id);
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
  }, [isTeacherOrAdmin]);

  // 2. Fetch Class Attendance for selected class & date
  useEffect(() => {
    if (!isTeacherOrAdmin || !selectedClassId) return;

    const fetchClassAttendance = async () => {
      try {
        setLoadingClass(true);
        // Find selected class from list or fetch class details with students
        const classDetailsRes = await api.get(`/classes/${selectedClassId}`);
        const classObj: Class = classDetailsRes.data.class || classDetailsRes.data;
        const studentList = classObj.students || [];
        setStudents(studentList);

        // Fetch existing attendance record for this date
        const attendanceRes = await api.get(
          `/attendance/class/${selectedClassId}?date=${selectedDate}`
        );
        const existingData = attendanceRes.data;

        const newRecordsMap: { [studentId: string]: { status: AttendanceStatus; remarks: string } } =
          {};

        studentList.forEach((st: any) => {
          const stId = st._id || st;
          // Check if student has saved record
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

  // Handle single student status change
  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setAttendanceRecords((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        status,
      },
    }));
  };

  // Handle remarks change
  const handleRemarksChange = (studentId: string, remarks: string) => {
    setAttendanceRecords((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        remarks,
      },
    }));
  };

  // Bulk status update
  const handleBulkStatus = (status: AttendanceStatus) => {
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

  // Save Attendance to Backend
  const handleSaveAttendance = async () => {
    if (!selectedClassId) return;

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

      toast.success("Attendance saved successfully!");
      // Refresh overview
      const overviewRes = await api.get("/attendance/overview");
      setCampusOverview(overviewRes.data);
    } catch (error: any) {
      console.error("Save attendance error:", error);
      toast.error(error?.response?.data?.message || "Failed to save attendance");
    } finally {
      setSaving(false);
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
      <div className="flex-1 space-y-6 p-8 pt-6 bg-[#F8FAFC] min-h-screen">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[#0F172A]">
            My Attendance Record
          </h1>
          <p className="text-sm text-[#64748B] mt-0.5">
            Track your verified daily classroom attendance and participation metrics.
          </p>
        </div>

        {/* Top Metric Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="bg-white border-[#E2E8F0] shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-semibold text-[#64748B]">Attendance Rate</CardTitle>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                <TrendingUp className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-[#0F172A]">
                {studentSummary?.percentage ?? 100}%
              </div>
              <p className="text-xs text-emerald-600 font-medium mt-1">
                {studentSummary && studentSummary.percentage >= 75
                  ? "Meets eligibility requirements"
                  : "Attention needed"}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white border-[#E2E8F0] shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-semibold text-[#64748B]">Days Present</CardTitle>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-[#0F172A]">
                {studentSummary?.presentCount ?? 0}
              </div>
              <p className="text-xs text-[#64748B] mt-1">
                Out of {studentSummary?.totalDays ?? 0} recorded days
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white border-[#E2E8F0] shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-semibold text-[#64748B]">Days Absent</CardTitle>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
                <XCircle className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-[#0F172A]">
                {studentSummary?.absentCount ?? 0}
              </div>
              <p className="text-xs text-[#64748B] mt-1">Unexcused absences</p>
            </CardContent>
          </Card>

          <Card className="bg-white border-[#E2E8F0] shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-semibold text-[#64748B]">Days Late</CardTitle>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                <Clock className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-[#0F172A]">
                {studentSummary?.lateCount ?? 0}
              </div>
              <p className="text-xs text-[#64748B] mt-1">Tardiness records</p>
            </CardContent>
          </Card>
        </div>

        {/* History Table */}
        <Card className="bg-white border-[#E2E8F0] shadow-xs">
          <CardHeader>
            <CardTitle className="text-base font-bold text-[#0F172A]">Daily Attendance Log</CardTitle>
            <CardDescription className="text-xs text-[#64748B]">
              Detailed record of recorded class sessions and remarks.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {studentSummary?.history && studentSummary.history.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[#F8FAFC] text-[#64748B] text-xs font-semibold uppercase border-b border-[#E2E8F0]">
                    <tr>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Class</th>
                      <th className="py-3 px-4">Teacher</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1F5F9]">
                    {studentSummary.history.map((item) => (
                      <tr key={item._id} className="hover:bg-[#F8FAFC]/60 transition-colors">
                        <td className="py-3 px-4 font-medium text-[#0F172A]">
                          {new Date(item.date).toLocaleDateString(undefined, {
                            weekday: "short",
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </td>
                        <td className="py-3 px-4 text-[#64748B]">{item.className}</td>
                        <td className="py-3 px-4 text-[#64748B]">{item.recordedBy}</td>
                        <td className="py-3 px-4">
                          {item.status === "present" && (
                            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">
                              Present
                            </Badge>
                          )}
                          {item.status === "absent" && (
                            <Badge className="bg-rose-100 text-rose-800 border-rose-200">
                              Absent
                            </Badge>
                          )}
                          {item.status === "late" && (
                            <Badge className="bg-amber-100 text-amber-800 border-amber-200">
                              Late
                            </Badge>
                          )}
                          {item.status === "excused" && (
                            <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                              Excused
                            </Badge>
                          )}
                        </td>
                        <td className="py-3 px-4 text-[#64748B]">{item.remarks || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-12 text-center text-[#64748B]">
                <CalendarCheck className="mx-auto h-12 w-12 text-[#94A3B8] mb-3" />
                <p className="font-semibold text-[#0F172A]">No Attendance Records Found</p>
                <p className="text-xs text-[#64748B] mt-1">
                  Your teachers have not recorded sessions for this period yet.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // --- RENDER FOR TEACHER / ADMIN ---
  return (
    <div className="flex-1 space-y-6 p-8 pt-6 bg-[#F8FAFC] min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[#0F172A]">
            Attendance Management
          </h1>
          <p className="text-sm text-[#64748B] mt-0.5">
            Mark daily classroom roll call, verify attendance records, and inspect campus trends.
          </p>
        </div>

        <Button
          onClick={handleSaveAttendance}
          disabled={saving || students.length === 0}
          className="bg-[#1E40AF] hover:bg-[#1E3A8A] text-white shadow-xs"
        >
          <Save className="mr-2 h-4 w-4" />
          {saving ? "Saving..." : "Save Attendance"}
        </Button>
      </div>

      {/* Campus Summary Banner for Admins/Teachers */}
      {campusOverview && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="bg-white border-[#E2E8F0] shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-semibold text-[#64748B]">Campus Rate Today</CardTitle>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                <TrendingUp className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[#0F172A]">{campusOverview.todayRate}</div>
              <p className="text-xs text-[#64748B] mt-0.5">
                {campusOverview.todayPresent} present / {campusOverview.todayTotal} roll count
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white border-[#E2E8F0] shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-semibold text-[#64748B]">Selected Class Rate</CardTitle>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <Users className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[#0F172A]">{classLiveStats.rate}%</div>
              <p className="text-xs text-[#64748B] mt-0.5">
                {classLiveStats.present} present, {classLiveStats.absent} absent, {classLiveStats.late} late
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white border-[#E2E8F0] shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-semibold text-[#64748B]">Total Enrolled</CardTitle>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                <CalendarCheck className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[#0F172A]">{students.length} Students</div>
              <p className="text-xs text-[#64748B] mt-0.5">In current selected section</p>
            </CardContent>
          </Card>

          <Card className="bg-white border-[#E2E8F0] shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-semibold text-[#64748B]">Classes Logged Today</CardTitle>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                <Clock className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[#0F172A]">
                {campusOverview.classesRecordedToday} Sections
              </div>
              <p className="text-xs text-[#64748B] mt-0.5">Completed daily roll call</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filter and Control Bar */}
      <Card className="bg-white border-[#E2E8F0] shadow-xs">
        <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Class Selector */}
            <div className="w-64">
              <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                <SelectTrigger className="bg-white border-[#E2E8F0]">
                  <SelectValue placeholder="Select Class" />
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

            {/* Date Picker */}
            <div className="flex items-center space-x-2">
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-44 bg-white border-[#E2E8F0]"
              />
            </div>
          </div>

          {/* Quick Bulk Actions */}
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBulkStatus("present")}
              className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 text-xs"
            >
              <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> All Present
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBulkStatus("absent")}
              className="border-rose-200 text-rose-700 hover:bg-rose-50 text-xs"
            >
              <XCircle className="mr-1.5 h-3.5 w-3.5" /> All Absent
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Attendance Roster Table */}
      <Card className="bg-white border-[#E2E8F0] shadow-xs">
        <CardHeader className="pb-3 border-b border-[#F1F5F9]">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold text-[#0F172A]">Class Roster Roll Call</CardTitle>
              <CardDescription className="text-xs text-[#64748B]">
                Mark presence or absence for {selectedDate}
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-xs font-normal border-[#E2E8F0]">
              {students.length} Total Enrolled
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
            <div className="py-12 text-center text-[#64748B]">
              <Users className="mx-auto h-12 w-12 text-[#94A3B8] mb-3" />
              <p className="font-semibold text-[#0F172A]">No Students Enrolled in This Class</p>
              <p className="text-xs text-[#64748B] mt-1">
                Assign students to this class in the People & Classes tab to record attendance.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#F8FAFC] text-[#64748B] text-xs font-semibold uppercase border-b border-[#E2E8F0]">
                  <tr>
                    <th className="py-3 px-4">#</th>
                    <th className="py-3 px-4">Student Name</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {students.map((student, idx) => {
                    const stId = student._id || student;
                    const record = attendanceRecords[stId] || {
                      status: "present",
                      remarks: "",
                    };

                    return (
                      <tr key={stId} className="hover:bg-[#F8FAFC]/70 transition-colors">
                        <td className="py-3 px-4 text-xs font-medium text-[#94A3B8]">{idx + 1}</td>
                        <td className="py-3 px-4 font-semibold text-[#0F172A]">
                          {student.name || "Student"}
                        </td>
                        <td className="py-3 px-4 text-xs text-[#64748B]">{student.email || "—"}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-center space-x-1.5">
                            <button
                              type="button"
                              onClick={() => handleStatusChange(stId, "present")}
                              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                                record.status === "present"
                                  ? "bg-emerald-600 text-white shadow-xs"
                                  : "bg-[#F1F5F9] text-[#64748B] hover:bg-emerald-50 hover:text-emerald-700"
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
                                  : "bg-[#F1F5F9] text-[#64748B] hover:bg-amber-50 hover:text-amber-700"
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
                                  : "bg-[#F1F5F9] text-[#64748B] hover:bg-rose-50 hover:text-rose-700"
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
                                  : "bg-[#F1F5F9] text-[#64748B] hover:bg-blue-50 hover:text-blue-700"
                              }`}
                            >
                              Excused
                            </button>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <Input
                            placeholder="Optional remark..."
                            value={record.remarks}
                            onChange={(e) => handleRemarksChange(stId, e.target.value)}
                            className="h-8 text-xs bg-white border-[#E2E8F0]"
                          />
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
