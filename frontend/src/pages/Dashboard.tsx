import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/AuthProvider";
import { api } from "@/lib/api";
import { useNavigate } from "react-router";

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
import {
  Calendar,
  FileText,
  CheckCircle2,
  Users,
  ArrowRight,
  CalendarCheck,
  Megaphone,
  BarChart3,
  Clock,
  GraduationCap,
  BookOpen,
  Settings2,
  AlertCircle,
  Sparkles,
} from "lucide-react";

// Custom Components
import { AiInsightWidget } from "@/components/dashboard/ai-insight-widget";
import { DashboardStats } from "@/components/dashboard/dashboard-stats";
import type { Announcement } from "@/types";

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [statsData, setStatsData] = useState<any>({});
  const [recentAnnouncements, setRecentAnnouncements] = useState<Announcement[]>([]);

  // 1. Fetch Dashboard Stats & Announcements
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const [statsRes, annRes] = await Promise.all([
          api.get("/dashboard/stats"),
          api.get("/announcements"),
        ]);
        setStatsData(statsRes.data || {});
        setRecentAnnouncements(annRes.data?.slice(0, 3) || []);
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

  // 2. Loading State Skeleton
  if (loading) {
    return (
      <div className="p-8 space-y-6 bg-[#F8FAFC] min-h-screen">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-7">
          <Skeleton className="col-span-4 h-96 rounded-xl" />
          <Skeleton className="col-span-3 h-96 rounded-xl" />
        </div>
      </div>
    );
  }

  const role = user?.role || "student";

  return (
    <div className="flex-1 space-y-6 p-8 pt-6 bg-[#F8FAFC] min-h-screen">
      {/* --- HEADER --- */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[#0F172A]">
              {role === "admin" && "Administrative Dashboard"}
              {role === "teacher" && "Faculty Portal"}
              {role === "student" && "Student Hub"}
              {role === "parent" && "Guardian Portal"}
            </h1>
            <Badge className="bg-blue-100 text-[#1E40AF] hover:bg-blue-100 text-xs uppercase tracking-wider font-bold">
              {role}
            </Badge>
          </div>
          <p className="text-sm text-[#64748B] mt-0.5">
            Welcome back, <span className="font-semibold text-[#0F172A]">{user?.name}</span>!
            {role === "admin" && " Here is your campus operations and institutional overview."}
            {role === "teacher" && " Manage your lectures, student grading, and attendance."}
            {role === "student" && ` Enrolled in ${statsData.className || "Grade 10-A"} for 2025-2026.`}
            {role === "parent" && ` Monitoring academic performance for ${statsData.childName || "Alex Johnson"}.`}
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {role === "admin" && (
            <Button onClick={() => navigate("/attendance")} className="bg-[#1E40AF] hover:bg-[#1E3A8A] text-white shadow-xs">
              <CalendarCheck className="mr-2 h-4 w-4" /> Roll Call Attendance
            </Button>
          )}
          {role === "teacher" && (
            <>
              <Button onClick={() => navigate("/attendance")} className="bg-[#1E40AF] hover:bg-[#1E3A8A] text-white shadow-xs">
                <CalendarCheck className="mr-2 h-4 w-4" /> Mark Attendance
              </Button>
              <Button onClick={() => navigate("/lms/exams")} variant="outline" className="border-[#E2E8F0] shadow-xs">
                <BookOpen className="mr-2 h-4 w-4 text-[#D97706]" /> Manage Quizzes
              </Button>
            </>
          )}
          {role === "student" && (
            <Button onClick={() => navigate("/reports")} className="bg-[#1E40AF] hover:bg-[#1E3A8A] text-white shadow-xs">
              <BarChart3 className="mr-2 h-4 w-4" /> View Report Card
            </Button>
          )}
          {role === "parent" && (
            <Button onClick={() => navigate("/reports")} className="bg-[#1E40AF] hover:bg-[#1E3A8A] text-white shadow-xs">
              <BarChart3 className="mr-2 h-4 w-4" /> Child Report Card
            </Button>
          )}
        </div>
      </div>

      {/* --- TOP ROW: ROLE-SPECIFIC STATS --- */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <DashboardStats role={role} data={statsData} />
      </div>

      {/* --- MAIN CONTENT GRID --- */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        {/* LEFT COLUMN (Content) */}
        <div className="col-span-4 space-y-6">
          {/* AI WIDGET */}
          <AiInsightWidget role={role} />

          {/* TEACHER: TODAY'S TEACHING SCHEDULE */}
          {role === "teacher" && (
            <Card className="bg-white border-[#E2E8F0] shadow-xs">
              <CardHeader className="pb-3 border-b border-[#F1F5F9]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-[#1E40AF]" />
                    <CardTitle className="text-base font-bold text-[#0F172A]">Today's Teaching Schedule</CardTitle>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => navigate("/timetable")} className="text-xs text-[#1E40AF] hover:text-[#1E3A8A]">
                    Full Schedule <ArrowRight className="ml-1 h-3 w-3" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-2.5">
                {statsData.todayPeriods && statsData.todayPeriods.length > 0 ? (
                  statsData.todayPeriods.map((p: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-3 rounded-lg border border-[#F1F5F9] bg-[#F8FAFC]/60">
                      <div className="flex items-center space-x-3">
                        <div className="flex size-8 items-center justify-center rounded-lg bg-blue-100 text-[#1E40AF] font-bold text-xs">
                          P{idx + 1}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-[#0F172A]">{p.subjectName}</p>
                          <p className="text-xs text-[#64748B]">{p.className}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs font-mono text-[#0F172A] border-[#E2E8F0]">
                        {p.startTime} - {p.endTime}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <div className="py-6 text-center text-xs text-[#64748B]">
                    No periods assigned for today.
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* STUDENT: TODAY'S CLASS SCHEDULE & UPCOMING QUIZZES */}
          {role === "student" && (
            <>
              <Card className="bg-white border-[#E2E8F0] shadow-xs">
                <CardHeader className="pb-3 border-b border-[#F1F5F9]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-[#1E40AF]" />
                      <CardTitle className="text-base font-bold text-[#0F172A]">Today's Period Schedule</CardTitle>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => navigate("/timetable")} className="text-xs text-[#1E40AF] hover:text-[#1E3A8A]">
                      Timetable <ArrowRight className="ml-1 h-3 w-3" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-4 space-y-2.5">
                  {statsData.todayPeriods && statsData.todayPeriods.length > 0 ? (
                    statsData.todayPeriods.map((p: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between p-3 rounded-lg border border-[#F1F5F9] bg-[#F8FAFC]/60">
                        <div className="flex items-center space-x-3">
                          <div className="flex size-8 items-center justify-center rounded-lg bg-teal-100 text-[#0F766E] font-bold text-xs">
                            P{idx + 1}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-[#0F172A]">{p.subject}</p>
                            <p className="text-xs text-[#64748B]">Teacher: {p.teacher}</p>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs font-mono text-[#0F172A] border-[#E2E8F0]">
                          {p.startTime} - {p.endTime}
                        </Badge>
                      </div>
                    ))
                  ) : (
                    <div className="py-6 text-center text-xs text-[#64748B]">
                      No class periods scheduled for today.
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* AVAILABLE EXAMS */}
              <Card className="bg-white border-[#E2E8F0] shadow-xs">
                <CardHeader className="pb-3 border-b border-[#F1F5F9]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <BookOpen className="h-4 w-4 text-[#D97706]" />
                      <CardTitle className="text-base font-bold text-[#0F172A]">Upcoming Assessments & Quizzes</CardTitle>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => navigate("/lms/exams")} className="text-xs text-[#1E40AF] hover:text-[#1E3A8A]">
                      View All <ArrowRight className="ml-1 h-3 w-3" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-4 space-y-2.5">
                  {statsData.upcomingExams && statsData.upcomingExams.length > 0 ? (
                    statsData.upcomingExams.map((exam: any) => (
                      <div key={exam._id} className="flex items-center justify-between p-3 rounded-lg border border-[#F1F5F9] bg-[#F8FAFC]/60">
                        <div>
                          <p className="text-sm font-semibold text-[#0F172A]">{exam.title}</p>
                          <p className="text-xs text-[#64748B]">Subject: {exam.subject || "General"}</p>
                        </div>
                        <Button size="sm" onClick={() => navigate(`/lms/exams/${exam._id}`)} className="bg-[#1E40AF] hover:bg-[#1E3A8A] text-white text-xs h-8">
                          Start Quiz
                        </Button>
                      </div>
                    ))
                  ) : (
                    <div className="py-6 text-center text-xs text-[#64748B]">
                      No pending assessments at this time!
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}

          {/* PARENT: CHILD PROGRESS PREVIEW */}
          {role === "parent" && (
            <Card className="bg-white border-[#E2E8F0] shadow-xs">
              <CardHeader className="pb-3 border-b border-[#F1F5F9]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <GraduationCap className="h-4 w-4 text-[#1E40AF]" />
                    <CardTitle className="text-base font-bold text-[#0F172A]">
                      {statsData.childName || "Alex Johnson"}'s Academic Standing
                    </CardTitle>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => navigate("/reports")} className="text-xs text-[#1E40AF] hover:text-[#1E3A8A]">
                    Report Card <ArrowRight className="ml-1 h-3 w-3" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#F1F5F9]">
                    <p className="text-xs text-[#64748B]">Attendance</p>
                    <p className="text-lg font-bold text-emerald-600">{statsData.childAttendance || "96%"}</p>
                    <p className="text-[11px] text-[#94A3B8]">{statsData.childPresentDays || "Regular attendance"}</p>
                  </div>
                  <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#F1F5F9]">
                    <p className="text-xs text-[#64748B]">Class & Section</p>
                    <p className="text-lg font-bold text-[#0F172A]">{statsData.childClass || "Grade 10-A"}</p>
                    <p className="text-[11px] text-emerald-600 font-medium">Status: Active</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ANNOUNCEMENTS WIDGET (For Everyone) */}
          <Card className="bg-white border-[#E2E8F0] shadow-xs">
            <CardHeader className="pb-3 border-b border-[#F1F5F9]">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Megaphone className="h-4 w-4 text-[#1E40AF]" />
                  <CardTitle className="text-base font-bold text-[#0F172A]">Campus Notices & Alerts</CardTitle>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate("/announcements")}
                  className="text-xs text-[#1E40AF] hover:text-[#1E3A8A]"
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
                    className="p-3 rounded-lg border border-[#F1F5F9] bg-[#F8FAFC]/50 hover:bg-[#F8FAFC] transition-colors space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {ann.priority === "urgent" && (
                          <Badge className="bg-rose-100 text-rose-800 text-[10px] px-1.5 py-0.5">Urgent</Badge>
                        )}
                        {ann.priority === "high" && (
                          <Badge className="bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0.5">High</Badge>
                        )}
                        <h4 className="text-sm font-semibold text-[#0F172A]">{ann.title}</h4>
                      </div>
                      <span className="text-[11px] text-[#94A3B8]">
                        {new Date(ann.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      </span>
                    </div>
                    <p className="text-xs text-[#64748B] line-clamp-2">{ann.content}</p>
                  </div>
                ))
              ) : (
                <div className="py-6 text-center text-xs text-[#64748B]">
                  No active circulars at this moment.
                </div>
              )}
            </CardContent>
          </Card>

          {/* ADMIN: RECENT ACTIVITY AUDIT LOG */}
          {role === "admin" && (
            <Card className="bg-white border-[#E2E8F0] shadow-xs">
              <CardHeader className="pb-3 border-b border-[#F1F5F9]">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-bold text-[#0F172A]">System Audit & Activity</CardTitle>
                    <CardDescription className="text-xs text-[#64748B]">
                      Verified operational logs from academic and user events.
                    </CardDescription>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => navigate("/activities-log")} className="text-xs text-[#1E40AF] hover:text-[#1E3A8A]">
                    View All <ArrowRight className="ml-1 h-3 w-3" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-3">
                  {statsData.recentActivity && statsData.recentActivity.length > 0 ? (
                    statsData.recentActivity.map((activity: string, i: number) => (
                      <div
                        key={i}
                        className="flex items-start pb-3 last:mb-0 last:pb-0 border-b border-[#F1F5F9] last:border-0"
                      >
                        <CheckCircle2 className="mr-3 h-4 w-4 text-[#16A34A] mt-0.5 shrink-0" />
                        <div className="space-y-0.5">
                          <p className="text-sm font-medium text-[#0F172A] leading-snug">
                            {activity}
                          </p>
                          <p className="text-xs text-[#94A3B8]">Verified event</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-[#64748B] py-2">No recent activity recorded.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* RIGHT COLUMN: ROLE-SPECIFIC QUICK NAVIGATION */}
        <div className="col-span-3 space-y-6">
          <Card className="bg-white border-[#E2E8F0] shadow-xs">
            <CardHeader className="pb-3 border-b border-[#F1F5F9]">
              <CardTitle className="text-base font-bold text-[#0F172A]">
                {role === "admin" && "Administrative Hub"}
                {role === "teacher" && "Teacher Quick Actions"}
                {role === "student" && "My Academic Tools"}
                {role === "parent" && "Parent Monitoring"}
              </CardTitle>
              <CardDescription className="text-xs text-[#64748B]">
                Direct access to role-specific controls
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2.5 pt-4">
              {/* ADMIN NAVIGATION */}
              {role === "admin" && (
                <>
                  <Button
                    variant="outline"
                    className="justify-start h-11 border-[#E2E8F0] hover:bg-[#F8FAFC] text-[#0F172A] font-medium"
                    onClick={() => navigate("/classes")}
                  >
                    <GraduationCap className="mr-3 h-4 w-4 text-[#1E40AF]" /> Manage Classes & Sections
                  </Button>
                  <Button
                    variant="outline"
                    className="justify-start h-11 border-[#E2E8F0] hover:bg-[#F8FAFC] text-[#0F172A] font-medium"
                    onClick={() => navigate("/subjects")}
                  >
                    <BookOpen className="mr-3 h-4 w-4 text-[#0F766E]" /> Manage Curriculum & Subjects
                  </Button>
                  <Button
                    variant="outline"
                    className="justify-start h-11 border-[#E2E8F0] hover:bg-[#F8FAFC] text-[#0F172A] font-medium"
                    onClick={() => navigate("/users/students")}
                  >
                    <Users className="mr-3 h-4 w-4 text-[#D97706]" /> Student Directory
                  </Button>
                  <Button
                    variant="outline"
                    className="justify-start h-11 border-[#E2E8F0] hover:bg-[#F8FAFC] text-[#0F172A] font-medium"
                    onClick={() => navigate("/users/teachers")}
                  >
                    <Users className="mr-3 h-4 w-4 text-[#16A34A]" /> Faculty Directory
                  </Button>
                  <Button
                    variant="outline"
                    className="justify-start h-11 border-[#E2E8F0] hover:bg-[#F8FAFC] text-[#0F172A] font-medium"
                    onClick={() => navigate("/settings/academic-years")}
                  >
                    <Settings2 className="mr-3 h-4 w-4 text-[#475569]" /> Academic Year Setup
                  </Button>
                  <Button
                    variant="outline"
                    className="justify-start h-11 border-[#E2E8F0] hover:bg-[#F8FAFC] text-[#0F172A] font-medium"
                    onClick={() => navigate("/reports")}
                  >
                    <BarChart3 className="mr-3 h-4 w-4 text-[#DC2626]" /> Institutional Reports & Analytics
                  </Button>
                </>
              )}

              {/* TEACHER NAVIGATION */}
              {role === "teacher" && (
                <>
                  <Button
                    variant="outline"
                    className="justify-start h-11 border-[#E2E8F0] hover:bg-[#F8FAFC] text-[#0F172A] font-medium"
                    onClick={() => navigate("/attendance")}
                  >
                    <CalendarCheck className="mr-3 h-4 w-4 text-[#16A34A]" /> Daily Roll Call Attendance
                  </Button>
                  <Button
                    variant="outline"
                    className="justify-start h-11 border-[#E2E8F0] hover:bg-[#F8FAFC] text-[#0F172A] font-medium"
                    onClick={() => navigate("/lms/exams")}
                  >
                    <FileText className="mr-3 h-4 w-4 text-[#D97706]" /> Create & Grade LMS Quizzes
                  </Button>
                  <Button
                    variant="outline"
                    className="justify-start h-11 border-[#E2E8F0] hover:bg-[#F8FAFC] text-[#0F172A] font-medium"
                    onClick={() => navigate("/timetable")}
                  >
                    <Calendar className="mr-3 h-4 w-4 text-[#0F766E]" /> Teaching Timetable
                  </Button>
                  <Button
                    variant="outline"
                    className="justify-start h-11 border-[#E2E8F0] hover:bg-[#F8FAFC] text-[#0F172A] font-medium"
                    onClick={() => navigate("/users/students")}
                  >
                    <Users className="mr-3 h-4 w-4 text-[#1E40AF]" /> Enrolled Student Roster
                  </Button>
                  <Button
                    variant="outline"
                    className="justify-start h-11 border-[#E2E8F0] hover:bg-[#F8FAFC] text-[#0F172A] font-medium"
                    onClick={() => navigate("/reports")}
                  >
                    <BarChart3 className="mr-3 h-4 w-4 text-[#9333EA]" /> Class Performance Analytics
                  </Button>
                </>
              )}

              {/* STUDENT NAVIGATION */}
              {role === "student" && (
                <>
                  <Button
                    variant="outline"
                    className="justify-start h-11 border-[#E2E8F0] hover:bg-[#F8FAFC] text-[#0F172A] font-medium"
                    onClick={() => navigate("/reports")}
                  >
                    <BarChart3 className="mr-3 h-4 w-4 text-[#1E40AF]" /> My Academic Report Card
                  </Button>
                  <Button
                    variant="outline"
                    className="justify-start h-11 border-[#E2E8F0] hover:bg-[#F8FAFC] text-[#0F172A] font-medium"
                    onClick={() => navigate("/lms/exams")}
                  >
                    <FileText className="mr-3 h-4 w-4 text-[#D97706]" /> Online Quizzes & Tests
                  </Button>
                  <Button
                    variant="outline"
                    className="justify-start h-11 border-[#E2E8F0] hover:bg-[#F8FAFC] text-[#0F172A] font-medium"
                    onClick={() => navigate("/timetable")}
                  >
                    <Calendar className="mr-3 h-4 w-4 text-[#0F766E]" /> Weekly Class Timetable
                  </Button>
                  <Button
                    variant="outline"
                    className="justify-start h-11 border-[#E2E8F0] hover:bg-[#F8FAFC] text-[#0F172A] font-medium"
                    onClick={() => navigate("/attendance")}
                  >
                    <Clock className="mr-3 h-4 w-4 text-[#16A34A]" /> My Attendance History
                  </Button>
                  <Button
                    variant="outline"
                    className="justify-start h-11 border-[#E2E8F0] hover:bg-[#F8FAFC] text-[#0F172A] font-medium"
                    onClick={() => navigate("/announcements")}
                  >
                    <Megaphone className="mr-3 h-4 w-4 text-[#DC2626]" /> School Circulars & Notices
                  </Button>
                </>
              )}

              {/* PARENT NAVIGATION */}
              {role === "parent" && (
                <>
                  <Button
                    variant="outline"
                    className="justify-start h-11 border-[#E2E8F0] hover:bg-[#F8FAFC] text-[#0F172A] font-medium"
                    onClick={() => navigate("/reports")}
                  >
                    <BarChart3 className="mr-3 h-4 w-4 text-[#1E40AF]" /> View Child's Report Card
                  </Button>
                  <Button
                    variant="outline"
                    className="justify-start h-11 border-[#E2E8F0] hover:bg-[#F8FAFC] text-[#0F172A] font-medium"
                    onClick={() => navigate("/attendance")}
                  >
                    <Clock className="mr-3 h-4 w-4 text-[#16A34A]" /> View Daily Attendance Record
                  </Button>
                  <Button
                    variant="outline"
                    className="justify-start h-11 border-[#E2E8F0] hover:bg-[#F8FAFC] text-[#0F172A] font-medium"
                    onClick={() => navigate("/timetable")}
                  >
                    <Calendar className="mr-3 h-4 w-4 text-[#0F766E]" /> View Child's Class Timetable
                  </Button>
                  <Button
                    variant="outline"
                    className="justify-start h-11 border-[#E2E8F0] hover:bg-[#F8FAFC] text-[#0F172A] font-medium"
                    onClick={() => navigate("/announcements")}
                  >
                    <Megaphone className="mr-3 h-4 w-4 text-[#DC2626]" /> Parent Notices & Circulars
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
