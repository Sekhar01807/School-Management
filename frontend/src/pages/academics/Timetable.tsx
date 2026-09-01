import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/AuthProvider";
import {
  Calendar,
  Clock,
  User as UserIcon,
  Layers,
  Edit3,
  Plus,
  Trash2,
  Save,
  CheckCircle2,
  School,
  Sparkles,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Class, subject, user } from "@/types";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

export default function Timetable() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const isTeacher = user?.role === "teacher";
  const isStudent = user?.role === "student";

  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedClassName, setSelectedClassName] = useState<string>("");
  const [scheduleData, setScheduleData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Manual Timetable Editor State (Admin only)
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [editorSchedule, setEditorSchedule] = useState<any[]>([]);
  const [availableSubjects, setAvailableSubjects] = useState<subject[]>([]);
  const [availableTeachers, setAvailableTeachers] = useState<user[]>([]);
  const [activeEditorDay, setActiveEditorDay] = useState<string>("Monday");

  // Active main tab (for teachers: default to 'personal', others 'class')
  const [activeMainTab, setActiveMainTab] = useState<string>(isTeacher ? "personal" : "class");
  const [teacherWeeklySchedule, setTeacherWeeklySchedule] = useState<{ [day: string]: any[] }>({
    Monday: [],
    Tuesday: [],
    Wednesday: [],
    Thursday: [],
    Friday: [],
  });
  const [teacherTotalPeriods, setTeacherTotalPeriods] = useState(0);

  // Fetch all class timetables to aggregate teacher's personal teaching schedule
  const loadTeacherSchedule = async (allClasses: Class[]) => {
    if (!user?._id) return;
    try {
      const scheduleMap: { [day: string]: any[] } = {
        Monday: [],
        Tuesday: [],
        Wednesday: [],
        Thursday: [],
        Friday: [],
      };
      let totalCount = 0;

      await Promise.all(
        allClasses.map(async (cls) => {
          try {
            const res = await api.get(`/timetables/${cls._id}`);
            const sch = res.data.schedule || [];
            sch.forEach((dayItem: any) => {
              const dayName = dayItem.day;
              if (scheduleMap[dayName]) {
                dayItem.periods?.forEach((p: any) => {
                  const teacherId = p.teacher?._id?.toString() || p.teacher?.toString();
                  if (teacherId === user._id.toString()) {
                    totalCount++;
                    scheduleMap[dayName].push({
                      className: cls.name,
                      classId: cls._id,
                      subjectName: p.subject?.name || p.subject || "Subject",
                      subjectCode: p.subject?.code || "",
                      startTime: p.startTime,
                      endTime: p.endTime,
                    });
                  }
                });
              }
            });
          } catch (e) {
            // Ignore 404s for classes without timetables
          }
        })
      );

      // Sort periods for each day chronologically
      DAYS.forEach((d) => {
        scheduleMap[d].sort((a, b) => {
          const aMin = parseInt(a.startTime.split(":")[0], 10) * 60 + parseInt(a.startTime.split(":")[1], 10);
          const bMin = parseInt(b.startTime.split(":")[0], 10) * 60 + parseInt(b.startTime.split(":")[1], 10);
          return aMin - bMin;
        });
      });

      setTeacherWeeklySchedule(scheduleMap);
      setTeacherTotalPeriods(totalCount);
    } catch (err) {
      console.error("Error aggregating teacher schedule:", err);
    }
  };

  // 1. Fetch All Classes & Reference Data
  useEffect(() => {
    const initData = async () => {
      try {
        setLoading(true);
        const [clsRes, subRes, teaRes] = await Promise.all([
          api.get("/classes?limit=100"),
          api.get("/subjects?limit=100").catch(() => ({ data: { subjects: [] } })),
          api.get("/users?role=teacher&limit=100").catch(() => ({ data: { users: [] } })),
        ]);

        const clsList: Class[] = clsRes.data.classes || clsRes.data || [];
        setClasses(clsList);
        setAvailableSubjects(subRes.data.subjects || subRes.data || []);
        setAvailableTeachers(teaRes.data.users || teaRes.data || []);

        if (isTeacher) {
          loadTeacherSchedule(clsList);
        }

        // Determine default selected class
        let defaultClassId = "";
        if (isStudent && user?.studentClass) {
          defaultClassId =
            typeof user.studentClass === "object"
              ? (user.studentClass as any)._id
              : user.studentClass;
        }

        if (!defaultClassId && clsList.length > 0) {
          defaultClassId = clsList[0]._id;
        }

        if (defaultClassId) {
          setSelectedClassId(defaultClassId);
          const found = clsList.find((c) => c._id === defaultClassId);
          if (found) setSelectedClassName(found.name);
          await loadTimetable(defaultClassId);
        }
      } catch (error) {
        console.error("Failed to load classes for timetable:", error);
        toast.error("Failed to initialize timetable view");
      } finally {
        setLoading(false);
      }
    };

    initData();
  }, [user]);

  // 2. Fetch Timetable for a Class
  const loadTimetable = async (classId: string) => {
    if (!classId) return;
    try {
      setLoading(true);
      const res = await api.get(`/timetables/${classId}`);
      setScheduleData(res.data.schedule || []);
    } catch (error: any) {
      if (error.response?.status === 404) {
        setScheduleData([]);
      } else {
        console.error("Error loading timetable:", error);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClassChange = (classId: string) => {
    setSelectedClassId(classId);
    const found = classes.find((c) => c._id === classId);
    if (found) setSelectedClassName(found.name);
    loadTimetable(classId);
  };

  // 3. Open Manual Editor with current or default structure
  const handleOpenEditor = () => {
    if (!selectedClassId) {
      toast.error("Please select a class section first");
      return;
    }

    // Clone existing schedule or generate default 6 periods per day template
    let initialSchedule: any[] = [];
    if (scheduleData && scheduleData.length > 0) {
      initialSchedule = JSON.parse(JSON.stringify(scheduleData)).map((d: any) => ({
        day: d.day,
        periods: d.periods.map((p: any) => ({
          subject: typeof p.subject === "object" ? p.subject?._id : p.subject || "",
          teacher: typeof p.teacher === "object" ? p.teacher?._id : p.teacher || "",
          startTime: p.startTime || "08:50",
          endTime: p.endTime || "09:40",
        })),
      }));
    } else {
      const defaultTimes = [
        { startTime: "08:50", endTime: "09:40" },
        { startTime: "09:40", endTime: "10:30" },
        { startTime: "10:40", endTime: "11:30" },
        { startTime: "11:30", endTime: "12:20" },
        { startTime: "13:20", endTime: "14:10" },
        { startTime: "14:10", endTime: "15:00" },
      ];

      initialSchedule = DAYS.map((day) => ({
        day,
        periods: defaultTimes.map((t) => ({
          subject: availableSubjects[0]?._id || "",
          teacher: availableTeachers[0]?._id || "",
          startTime: t.startTime,
          endTime: t.endTime,
        })),
      }));
    }

    setEditorSchedule(initialSchedule);
    setActiveEditorDay("Monday");
    setIsEditorOpen(true);
  };

  // 4. Period Modifications in Editor
  const handlePeriodChange = (day: string, index: number, field: "subject" | "teacher" | "startTime" | "endTime", value: string) => {
    setEditorSchedule((prev) =>
      prev.map((d) => {
        if (d.day !== day) return d;
        const updated = [...d.periods];
        updated[index] = { ...updated[index], [field]: value };
        return { ...d, periods: updated };
      })
    );
  };

  const handleAddPeriod = (day: string) => {
    setEditorSchedule((prev) =>
      prev.map((d) => {
        if (d.day !== day) return d;
        const currentCount = d.periods.length;
        return {
          ...d,
          periods: [
            ...d.periods,
            {
              subject: availableSubjects[0]?._id || "",
              teacher: availableTeachers[0]?._id || "",
              startTime: currentCount === 0 ? "08:50" : "15:00",
              endTime: currentCount === 0 ? "09:40" : "16:00",
            },
          ],
        };
      })
    );
  };

  const handleRemovePeriod = (day: string, index: number) => {
    setEditorSchedule((prev) =>
      prev.map((d) => {
        if (d.day !== day) return d;
        const updated = [...d.periods];
        updated.splice(index, 1);
        return { ...d, periods: updated };
      })
    );
  };

  // 5. Save & Post Manual Timetable to MongoDB
  const handleSaveManualTimetable = async () => {
    if (!selectedClassId) return;

    try {
      setSavingSchedule(true);
      const res = await api.post("/timetables/manual", {
        classId: selectedClassId,
        schedule: editorSchedule,
      });

      toast.success(res.data.message || "Timetable posted and saved successfully!");
      setIsEditorOpen(false);
      await loadTimetable(selectedClassId);
      if (isTeacher) loadTeacherSchedule(classes);
    } catch (error: any) {
      console.error("Save timetable error:", error);
      toast.error(error.response?.data?.message || "Failed to save timetable");
    } finally {
      setSavingSchedule(false);
    }
  };

  // Time slots for grid
  const timeSlots = Array.from(
    new Set(
      scheduleData.flatMap((d) => d.periods?.map((p: any) => `${p.startTime} - ${p.endTime}`) || [])
    )
  ).sort();

  return (
    <div className="p-6 md:p-8 space-y-6 bg-[#F8FAFC] dark:bg-[#0B1120] min-h-screen">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2 border-b border-[#E2E8F0] dark:border-gray-800">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[#0F172A] dark:text-white">
            Academic Timetable
          </h1>
          <p className="text-sm text-[#64748B] dark:text-gray-400 mt-1">
            {isStudent && "Your assigned weekly academic schedule and daily periods."}
            {isTeacher && "Your teaching schedule and classroom timetables."}
            {isAdmin && "Manage and manually post unique schedules for each grade section."}
          </p>
        </div>

        {/* Admin Action: Manual Edit / Post Timetable */}
        {isAdmin && (
          <Button
            onClick={handleOpenEditor}
            className="bg-[#1E40AF] hover:bg-[#1E3A8A] text-white shadow-xs font-semibold text-xs"
          >
            <Edit3 className="mr-2 h-4 w-4" /> Edit / Post Timetable
          </Button>
        )}
      </div>

      {/* Main Tabs Switcher for Teachers */}
      {isTeacher && (
        <div className="flex items-center space-x-2 border-b border-slate-200 dark:border-gray-800 pb-2">
          <Button
            variant={activeMainTab === "personal" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveMainTab("personal")}
            className={`text-xs font-bold ${
              activeMainTab === "personal"
                ? "bg-[#1E40AF] text-white"
                : "text-[#64748B] hover:text-[#0F172A] dark:text-gray-400"
            }`}
          >
            <UserIcon className="mr-1.5 h-4 w-4" /> My Teaching Schedule ({teacherTotalPeriods} Periods/Week)
          </Button>
          <Button
            variant={activeMainTab === "class" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveMainTab("class")}
            className={`text-xs font-bold ${
              activeMainTab === "class"
                ? "bg-[#1E40AF] text-white"
                : "text-[#64748B] hover:text-[#0F172A] dark:text-gray-400"
            }`}
          >
            <School className="mr-1.5 h-4 w-4" /> Class-wise Grid Viewer
          </Button>
        </div>
      )}

      {/* TEACHER PERSONAL TEACHING SCHEDULE VIEW */}
      {isTeacher && activeMainTab === "personal" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-white dark:bg-[#111827] border-[#E2E8F0] dark:border-gray-800 shadow-xs">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-[#64748B]">Weekly Teaching Load</p>
                  <p className="text-2xl font-extrabold text-[#0F172A] dark:text-white mt-0.5">{teacherTotalPeriods} Periods</p>
                </div>
                <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950 text-[#1E40AF]">
                  <Clock className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white dark:bg-[#111827] border-[#E2E8F0] dark:border-gray-800 shadow-xs">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-[#64748B]">Assigned Classes</p>
                  <p className="text-2xl font-extrabold text-[#0F172A] dark:text-white mt-0.5">{classes.length} Sections</p>
                </div>
                <div className="p-2.5 rounded-xl bg-teal-50 dark:bg-teal-950 text-[#0F766E]">
                  <School className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white dark:bg-[#111827] border-[#E2E8F0] dark:border-gray-800 shadow-xs">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-[#64748B]">Working Days</p>
                  <p className="text-2xl font-extrabold text-[#0F172A] dark:text-white mt-0.5">Mon – Fri</p>
                </div>
                <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950 text-purple-600">
                  <Calendar className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            {DAYS.map((day) => {
              const daySlots = teacherWeeklySchedule[day] || [];

              return (
                <Card key={day} className="bg-white dark:bg-[#111827] border-[#E2E8F0] dark:border-gray-800 shadow-xs">
                  <CardHeader className="pb-3 border-b border-[#F1F5F9] dark:border-gray-800/80 bg-[#F8FAFC] dark:bg-gray-800/40">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-bold text-[#0F172A] dark:text-white">{day}</CardTitle>
                      <Badge variant="outline" className="text-[10px] font-semibold">
                        {daySlots.length} {daySlots.length === 1 ? "Slot" : "Slots"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-3 space-y-2.5">
                    {daySlots.length === 0 ? (
                      <div className="py-8 text-center text-xs text-[#94A3B8] dark:text-gray-500">
                        No lectures scheduled
                      </div>
                    ) : (
                      daySlots.map((slot, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-xl border border-[#E2E8F0] dark:border-gray-700 bg-white dark:bg-gray-800/70 space-y-1 shadow-2xs hover:border-[#1E40AF] transition-all"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-extrabold text-[#0F172A] dark:text-white">{slot.subjectName}</span>
                            <Badge className="bg-blue-50 dark:bg-blue-950/60 text-[#1E40AF] dark:text-blue-300 text-[10px] font-bold">
                              {slot.className}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-[#64748B] dark:text-gray-400 font-mono">
                            <span>{slot.startTime} – {slot.endTime}</span>
                            {slot.subjectCode && <span className="text-[10px] uppercase">{slot.subjectCode}</span>}
                          </div>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* CLASS-WISE TIMETABLE GRID (Visible to Admin, Students, or Teacher when class tab is active) */}
      {(!isTeacher || activeMainTab === "class") && (
        <div className="space-y-6">
          {/* Class Section Selector (Visible to Admin & Teacher) */}
          {!isStudent && (
            <Card className="bg-white dark:bg-[#111827] border-[#E2E8F0] dark:border-gray-800 shadow-xs">
              <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center space-x-3">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/50 text-[#1E40AF] dark:text-blue-400">
                    <School className="h-5 w-5" />
                  </div>
                  <div>
                    <Label className="text-xs font-bold text-[#0F172A] dark:text-white">
                      Select Grade Section
                    </Label>
                    <p className="text-xs text-[#64748B] dark:text-gray-400">
                      Switch between classes to view or customize their unique schedules
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Select value={selectedClassId} onValueChange={handleClassChange}>
                    <SelectTrigger className="w-[220px] bg-white dark:bg-gray-900 border-[#CBD5E1] dark:border-gray-700 font-semibold text-xs">
                      <SelectValue placeholder="Choose a class..." />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map((cls) => (
                        <SelectItem key={cls._id} value={cls._id} className="text-xs font-medium">
                          {cls.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Class Name Badge & Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Layers className="h-4 w-4 text-[#1E40AF] dark:text-blue-400" />
              <h2 className="text-lg font-bold text-[#0F172A] dark:text-white">
                Active Timetable: <span className="text-[#1E40AF] dark:text-blue-400">{selectedClassName || "Class Section"}</span>
              </h2>
            </div>
            <Badge variant="outline" className="text-xs font-mono border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800">
              6 Periods + 1 Study Hour • 08:50 AM – 04:00 PM
            </Badge>
          </div>

          {/* Timetable Weekly Grid */}
          <Card className="bg-white dark:bg-[#111827] border-[#E2E8F0] dark:border-gray-800 shadow-xs overflow-hidden">
            <CardContent className="p-0 overflow-x-auto">
              {loading ? (
                <div className="p-16 flex flex-col items-center justify-center gap-3">
                  <div className="size-8 animate-spin rounded-full border-4 border-[#1E40AF] border-t-transparent" />
                  <p className="text-xs text-[#64748B]">Loading class timetable...</p>
                </div>
              ) : scheduleData.length === 0 ? (
                <div className="p-16 text-center space-y-3">
                  <Clock className="mx-auto h-12 w-12 text-[#94A3B8]" />
                  <h3 className="text-base font-bold text-[#0F172A] dark:text-white">
                    No Timetable Posted for {selectedClassName || "this class"}
                  </h3>
                  <p className="text-xs text-[#64748B] dark:text-gray-400 max-w-sm mx-auto">
                    {isAdmin
                      ? "Click the 'Edit / Post Timetable' button above to create and post a schedule for this section."
                      : "The administration has not published the timetable for this section yet."}
                  </p>
                </div>
              ) : (
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="bg-[#F8FAFC] dark:bg-gray-800/80 border-b border-[#E2E8F0] dark:border-gray-800 text-xs font-bold text-[#64748B] dark:text-gray-300">
                      <th className="p-4 w-44 border-r border-[#E2E8F0] dark:border-gray-800 text-center">Period / Time Slot</th>
                      {DAYS.map((day) => (
                        <th key={day} className="p-4 border-r last:border-r-0 border-[#E2E8F0] dark:border-gray-800 text-center">
                          {day}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0] dark:divide-gray-800 text-xs">
                    {timeSlots.map((slot, idx) => {
                      const [start] = slot.split(" - ");
                      const isBreakAfterP2 = start === "10:40";
                      const isLunchAfterP4 = start === "13:20" || start === "01:20";

                      const slotInfo = (() => {
                        if (start === "08:50") return { label: "Period 1", time: "08:50 AM – 09:40 AM" };
                        if (start === "09:40") return { label: "Period 2", time: "09:40 AM – 10:30 AM" };
                        if (start === "10:40") return { label: "Period 3", time: "10:40 AM – 11:30 AM" };
                        if (start === "11:30") return { label: "Period 4", time: "11:30 AM – 12:20 PM" };
                        if (start === "13:20" || start === "01:20") return { label: "Period 5", time: "01:20 PM – 02:10 PM" };
                        if (start === "14:10" || start === "02:10") return { label: "Period 6", time: "02:10 PM – 03:00 PM" };
                        if (start === "15:00" || start === "03:00") return { label: "Study Hour", time: "03:00 PM – 04:00 PM" };
                        return { label: `Slot ${idx + 1}`, time: slot };
                      })();

                      return (
                        <React.Fragment key={idx}>
                          {/* Morning Break Row (10:30 AM - 10:40 AM) */}
                          {isBreakAfterP2 && (
                            <tr className="bg-amber-50/70 dark:bg-amber-950/20 border-y border-amber-200/60 dark:border-amber-900/40">
                              <td className="p-2.5 font-bold text-center text-amber-800 dark:text-amber-300 font-mono text-[11px] border-r border-amber-200/60 dark:border-amber-900/40">
                                10:30 – 10:40 AM
                              </td>
                              <td colSpan={5} className="p-2.5 text-center text-xs font-semibold text-amber-800 dark:text-amber-300 tracking-wide">
                                ☕ Morning Recess Break (10 Minutes)
                              </td>
                            </tr>
                          )}

                          {/* Lunch Break Row (12:20 PM - 01:20 PM) */}
                          {isLunchAfterP4 && (
                            <tr className="bg-emerald-50/70 dark:bg-emerald-950/20 border-y border-emerald-200/60 dark:border-emerald-900/40">
                              <td className="p-2.5 font-bold text-center text-emerald-800 dark:text-emerald-300 font-mono text-[11px] border-r border-emerald-200/60 dark:border-emerald-900/40">
                                12:20 – 01:20 PM
                              </td>
                              <td colSpan={5} className="p-2.5 text-center text-xs font-semibold text-emerald-800 dark:text-emerald-300 tracking-wide">
                                🍱 Lunch & Refreshment Break (1 Hour)
                              </td>
                            </tr>
                          )}

                          <tr className="hover:bg-slate-50/50 dark:hover:bg-gray-800/30 transition-colors">
                            <td className="p-3.5 text-center bg-[#F8FAFC]/50 dark:bg-gray-900/40 border-r border-[#E2E8F0] dark:border-gray-800">
                              <div className="font-bold text-[#0F172A] dark:text-white text-xs">{slotInfo.label}</div>
                              <div className="font-mono text-[10px] text-[#64748B] dark:text-gray-400 mt-0.5">{slotInfo.time}</div>
                            </td>
                            {DAYS.map((day) => {
                              const dayObj = scheduleData.find((d) => d.day === day);
                              const period = dayObj?.periods?.find((p: any) => p.startTime === start);

                              return (
                                <td key={`${day}-${slot}`} className="p-3 border-r last:border-r-0 border-[#E2E8F0] dark:border-gray-800">
                                  {period ? (
                                    <div className="p-3 rounded-xl bg-white dark:bg-gray-800/90 border border-[#E2E8F0] dark:border-gray-700 shadow-2xs space-y-1 hover:border-[#1E40AF] transition-all">
                                      <div className="flex items-center justify-between">
                                        <span className="font-bold text-[#0F172A] dark:text-white text-xs">
                                          {typeof period.subject === "object" ? period.subject?.name : period.subject || "Subject"}
                                        </span>
                                        {typeof period.subject === "object" && period.subject?.code && (
                                          <Badge variant="outline" className="text-[10px] px-1 py-0 border-slate-200 dark:border-gray-700">
                                            {period.subject.code}
                                          </Badge>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-1.5 text-[11px] text-[#64748B] dark:text-gray-400">
                                        <UserIcon className="size-3 text-[#0F766E]" />
                                        <span className="truncate">
                                          {typeof period.teacher === "object" ? period.teacher?.name : period.teacher || "Faculty"}
                                        </span>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="h-14 rounded-lg border border-dashed border-[#E2E8F0] dark:border-gray-800 flex items-center justify-center text-[11px] text-[#94A3B8]">
                                      Free Period
                                    </div>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* MANUAL TIMETABLE EDITOR MODAL (Admin Only) */}
      <Dialog open={isEditorOpen} onOpenChange={setIsEditorOpen}>
        <DialogContent className="w-full sm:max-w-5xl md:max-w-6xl max-h-[92vh] overflow-y-auto bg-white dark:bg-[#111827] border-[#E2E8F0] dark:border-gray-800 p-6 md:p-8 shadow-2xl">
          <DialogHeader className="pb-4 border-b border-[#F1F5F9] dark:border-gray-800">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <DialogTitle className="text-xl md:text-2xl font-black text-[#0F172A] dark:text-white">
                  Manual Timetable Builder: {selectedClassName}
                </DialogTitle>
                <DialogDescription className="text-xs text-[#64748B] dark:text-gray-400 mt-1">
                  Configure daily subject allocations, faculty assignments, and period slots across all 5 school days.
                </DialogDescription>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => handleAddPeriod(activeEditorDay)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold h-8"
                >
                  <Plus className="mr-1.5 h-4 w-4" /> Add Period to {activeEditorDay}
                </Button>
              </div>
            </div>

            {/* Standard Timetable Reference Ribbon */}
            <div className="mt-3 p-2.5 rounded-lg bg-blue-50/70 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/50 text-[11px] text-[#1E40AF] dark:text-blue-300 flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="font-bold uppercase tracking-wider text-[10px] text-blue-900 dark:text-blue-200">
                School Schedule Slots:
              </span>
              <span>P1: <strong>08:50–09:40</strong></span>
              <span>•</span>
              <span>P2: <strong>09:40–10:30</strong></span>
              <span>•</span>
              <span className="text-amber-700 dark:text-amber-400">Recess: <strong>10:30–10:40</strong></span>
              <span>•</span>
              <span>P3: <strong>10:40–11:30</strong></span>
              <span>•</span>
              <span>P4: <strong>11:30–12:20</strong></span>
              <span>•</span>
              <span className="text-amber-700 dark:text-amber-400">Lunch: <strong>12:20–13:20</strong></span>
              <span>•</span>
              <span>P5: <strong>13:20–14:10</strong></span>
              <span>•</span>
              <span>P6: <strong>14:10–15:00</strong></span>
              <span>•</span>
              <span className="text-purple-700 dark:text-purple-300">Study Hour: <strong>15:00–16:00</strong></span>
            </div>
          </DialogHeader>

          <div className="py-4 space-y-4">
            {/* Day Selector Tabs */}
            <Tabs value={activeEditorDay} onValueChange={setActiveEditorDay}>
              <TabsList className="grid grid-cols-5 w-full bg-[#F1F5F9] dark:bg-gray-800 p-1 rounded-xl">
                {DAYS.map((day) => {
                  const dayItem = editorSchedule.find((d) => d.day === day);
                  const pCount = dayItem?.periods?.length || 0;

                  return (
                    <TabsTrigger
                      key={day}
                      value={day}
                      className="text-xs font-bold data-[state=active]:bg-white dark:data-[state=active]:bg-gray-900 data-[state=active]:shadow-xs py-2 rounded-lg gap-1.5"
                    >
                      {day}
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-gray-700 font-mono">
                        {pCount}
                      </span>
                    </TabsTrigger>
                  );
                })}
              </TabsList>

              {DAYS.map((day) => {
                const daySchedule = editorSchedule.find((d) => d.day === day);
                const periods = daySchedule?.periods || [];

                return (
                  <TabsContent key={day} value={day} className="space-y-4 pt-3">
                    <div className="flex items-center justify-between pb-1">
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-[#1E40AF] dark:text-blue-400" />
                        <h4 className="text-sm font-extrabold text-[#0F172A] dark:text-white uppercase tracking-wider">
                          {day} Schedule ({periods.length} Scheduled Periods)
                        </h4>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAddPeriod(day)}
                        className="text-xs h-8 border-[#CBD5E1] dark:border-gray-700 font-semibold"
                      >
                        <Plus className="mr-1 h-3.5 w-3.5 text-emerald-600" /> Add Period
                      </Button>
                    </div>

                    {periods.length === 0 ? (
                      <div className="p-12 text-center border-2 border-dashed border-[#E2E8F0] dark:border-gray-800 rounded-xl space-y-2">
                        <Clock className="size-8 mx-auto text-[#94A3B8]" />
                        <p className="text-sm font-semibold text-[#0F172A] dark:text-white">
                          No periods scheduled for {day} yet.
                        </p>
                        <Button
                          size="sm"
                          onClick={() => handleAddPeriod(day)}
                          className="bg-[#1E40AF] hover:bg-[#1E3A8A] text-white text-xs mt-2"
                        >
                          <Plus className="mr-1.5 h-3.5 w-3.5" /> Add First Period
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3.5">
                        {periods.map((p: any, pIdx: number) => (
                          <div
                            key={pIdx}
                            className="p-4 rounded-xl border border-[#E2E8F0] dark:border-gray-800 bg-[#F8FAFC]/90 dark:bg-gray-800/60 shadow-xs space-y-3"
                          >
                            {/* Period Header Row with Preset Timing Chips and Delete */}
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#F1F5F9] dark:border-gray-700/60 pb-2.5">
                              <div className="flex items-center space-x-2">
                                <span className="h-6 px-2.5 rounded-md bg-[#1E40AF] text-white font-black text-xs flex items-center justify-center shadow-xs">
                                  Period {pIdx + 1}
                                </span>
                                <span className="text-xs font-semibold text-[#64748B] dark:text-gray-400">
                                  Slot: {p.startTime} - {p.endTime}
                                </span>
                              </div>

                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-[10px] uppercase font-bold text-[#94A3B8] mr-1">
                                  Quick Timings:
                                </span>
                                {[
                                  { label: "P1 (08:50–09:40)", s: "08:50", e: "09:40" },
                                  { label: "P2 (09:40–10:30)", s: "09:40", e: "10:30" },
                                  { label: "P3 (10:40–11:30)", s: "10:40", e: "11:30" },
                                  { label: "P4 (11:30–12:20)", s: "11:30", e: "12:20" },
                                  { label: "P5 (13:20–14:10)", s: "13:20", e: "14:10" },
                                  { label: "P6 (14:10–15:00)", s: "14:10", e: "15:00" },
                                  { label: "Study (15:00–16:00)", s: "15:00", e: "16:00" },
                                ].map((slot, sIdx) => (
                                  <button
                                    key={sIdx}
                                    type="button"
                                    onClick={() => {
                                      handlePeriodChange(day, pIdx, "startTime", slot.s);
                                      handlePeriodChange(day, pIdx, "endTime", slot.e);
                                    }}
                                    className={`text-[10px] px-2 py-0.5 rounded-md font-mono border transition-all ${
                                      p.startTime === slot.s && p.endTime === slot.e
                                        ? "bg-blue-100 border-blue-300 text-[#1E40AF] font-bold dark:bg-blue-950 dark:border-blue-800 dark:text-blue-300"
                                        : "bg-white dark:bg-gray-900 border-[#E2E8F0] dark:border-gray-700 text-[#64748B] hover:border-blue-300"
                                    }`}
                                  >
                                    {slot.label}
                                  </button>
                                ))}

                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleRemovePeriod(day, pIdx)}
                                  className="h-7 w-7 p-0 ml-1 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-md"
                                  title="Delete Period"
                                >
                                  <Trash2 className="size-4" />
                                </Button>
                              </div>
                            </div>

                            {/* Main Input Grid (Subject, Teacher, Start, End) */}
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-end">
                              {/* Subject Select */}
                              <div className="md:col-span-4 space-y-1.5">
                                <Label className="text-xs font-bold text-[#0F172A] dark:text-white">
                                  Curriculum Subject
                                </Label>
                                <Select
                                  value={p.subject}
                                  onValueChange={(val) => handlePeriodChange(day, pIdx, "subject", val)}
                                >
                                  <SelectTrigger className="h-9 text-xs bg-white dark:bg-gray-900 border-[#CBD5E1] dark:border-gray-700 font-semibold">
                                    <SelectValue placeholder="Choose subject..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {availableSubjects.map((sub) => (
                                      <SelectItem key={sub._id} value={sub._id} className="text-xs">
                                        {sub.name} ({sub.code})
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              {/* Teacher Select */}
                              <div className="md:col-span-4 space-y-1.5">
                                <Label className="text-xs font-bold text-[#0F172A] dark:text-white">
                                  Assigned Faculty Member
                                </Label>
                                <Select
                                  value={p.teacher}
                                  onValueChange={(val) => handlePeriodChange(day, pIdx, "teacher", val)}
                                >
                                  <SelectTrigger className="h-9 text-xs bg-white dark:bg-gray-900 border-[#CBD5E1] dark:border-gray-700 font-semibold">
                                    <SelectValue placeholder="Choose teacher..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {availableTeachers.map((tea) => (
                                      <SelectItem key={tea._id} value={tea._id} className="text-xs">
                                        {tea.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              {/* Timings */}
                              <div className="md:col-span-2 space-y-1.5">
                                <Label className="text-xs font-bold text-[#0F172A] dark:text-white">
                                  Start Time
                                </Label>
                                <Input
                                  value={p.startTime}
                                  onChange={(e) => handlePeriodChange(day, pIdx, "startTime", e.target.value)}
                                  className="h-9 text-xs font-mono font-bold bg-white dark:bg-gray-900 border-[#CBD5E1] dark:border-gray-700"
                                />
                              </div>

                              <div className="md:col-span-2 space-y-1.5">
                                <Label className="text-xs font-bold text-[#0F172A] dark:text-white">
                                  End Time
                                </Label>
                                <Input
                                  value={p.endTime}
                                  onChange={(e) => handlePeriodChange(day, pIdx, "endTime", e.target.value)}
                                  className="h-9 text-xs font-mono font-bold bg-white dark:bg-gray-900 border-[#CBD5E1] dark:border-gray-700"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                );
              })}
            </Tabs>
          </div>

          <DialogFooter className="pt-4 border-t border-[#F1F5F9] dark:border-gray-800 flex items-center justify-between">
            <Button
              variant="outline"
              onClick={() => setIsEditorOpen(false)}
              className="text-xs font-semibold border-[#CBD5E1] dark:border-gray-700"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveManualTimetable}
              disabled={savingSchedule}
              className="bg-[#1E40AF] hover:bg-[#1E3A8A] text-white text-xs font-bold px-5 h-9 shadow-xs"
            >
              {savingSchedule ? (
                "Saving & Posting Timetable..."
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" /> Save & Post Complete Timetable
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
