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
  UserCheck,
  ArrowRight,
  CalendarCheck,
  Megaphone,
  BarChart3,
  Clock,
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

  return (
    <div className="flex-1 space-y-6 p-8 pt-6 bg-[#F8FAFC] min-h-screen">
      {/* --- HEADER --- */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[#0F172A]">Dashboard</h1>
          <p className="text-sm text-[#64748B] mt-0.5">
            Welcome back, <span className="font-semibold text-[#0F172A]">{user?.name}</span>! Here is your daily academic operations overview.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {/* Role specific quick actions */}
          {(user?.role === "admin" || user?.role === "teacher") && (
            <Button onClick={() => navigate("/attendance")} className="bg-[#1E40AF] hover:bg-[#1E3A8A] text-white shadow-xs">
              <CalendarCheck className="mr-2 h-4 w-4" /> Roll Call Attendance
            </Button>
          )}
          {user?.role === "student" && (
            <Button onClick={() => navigate("/reports")} className="bg-[#1E40AF] hover:bg-[#1E3A8A] text-white shadow-xs">
              <BarChart3 className="mr-2 h-4 w-4" /> View Report Card
            </Button>
          )}
        </div>
      </div>

      {/* --- TOP ROW: STATS --- */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <DashboardStats role={user?.role || "student"} data={statsData} />
      </div>

      {/* --- MAIN CONTENT GRID --- */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        {/* LEFT COLUMN (Content) */}
        <div className="col-span-4 space-y-6">
          {/* AI WIDGET */}
          <AiInsightWidget role={user?.role} />

          {/* ANNOUNCEMENTS WIDGET */}
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

          {/* RECENT ACTIVITY CARD */}
          {user?.role === "admin" && (
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
                          <p className="text-xs text-[#94A3B8]">
                            Verified event
                          </p>
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

        {/* RIGHT COLUMN (Schedule/Quick Links) */}
        <div className="col-span-3 space-y-6">
          <Card className="bg-white border-[#E2E8F0] shadow-xs">
            <CardHeader className="pb-3 border-b border-[#F1F5F9]">
              <CardTitle className="text-base font-bold text-[#0F172A]">Quick Navigation</CardTitle>
              <CardDescription className="text-xs text-[#64748B]">Direct access to primary academic tools</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2.5 pt-4">
              <Button
                variant="outline"
                className="justify-start h-11 border-[#E2E8F0] hover:bg-[#F8FAFC] text-[#0F172A] font-medium"
                onClick={() => navigate("/attendance")}
              >
                <CalendarCheck className="mr-3 h-4 w-4 text-[#16A34A]" /> Daily Attendance
              </Button>
              <Button
                variant="outline"
                className="justify-start h-11 border-[#E2E8F0] hover:bg-[#F8FAFC] text-[#0F172A] font-medium"
                onClick={() => navigate("/reports")}
              >
                <BarChart3 className="mr-3 h-4 w-4 text-[#1E40AF]" /> Academic Reports & Analytics
              </Button>
              <Button
                variant="outline"
                className="justify-start h-11 border-[#E2E8F0] hover:bg-[#F8FAFC] text-[#0F172A] font-medium"
                onClick={() => navigate("/timetable")}
              >
                <Calendar className="mr-3 h-4 w-4 text-[#0F766E]" /> View Class Timetable
              </Button>
              <Button
                variant="outline"
                className="justify-start h-11 border-[#E2E8F0] hover:bg-[#F8FAFC] text-[#0F172A] font-medium"
                onClick={() => navigate("/lms/exams")}
              >
                <FileText className="mr-3 h-4 w-4 text-[#D97706]" /> Assessments & Quizzes
              </Button>
              <Button
                variant="outline"
                className="justify-start h-11 border-[#E2E8F0] hover:bg-[#F8FAFC] text-[#0F172A] font-medium"
                onClick={() => navigate("/announcements")}
              >
                <Megaphone className="mr-3 h-4 w-4 text-[#DC2626]" /> Campus Noticeboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

