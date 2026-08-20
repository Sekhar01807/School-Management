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
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, FileText, CheckCircle2, UserCheck, ArrowRight } from "lucide-react";

// Custom Components
import { AiInsightWidget } from "@/components/dashboard/ai-insight-widget";
import { DashboardStats } from "@/components/dashboard/dashboard-stats";

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [statsData, setStatsData] = useState<any>({});

  // 1. Fetch Dashboard Stats
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const { data } = await api.get("/dashboard/stats");
        setStatsData(data || {});
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
          {user?.role === "admin" && (
            <Button onClick={() => navigate("/users/students")} className="bg-[#1E40AF] hover:bg-[#1E3A8A] text-white">
              <UserCheck className="mr-2 h-4 w-4" /> Manage Students
            </Button>
          )}
          {user?.role === "teacher" && (
            <Button onClick={() => navigate("/lms/exams")} className="bg-[#1E40AF] hover:bg-[#1E3A8A] text-white">
              <FileText className="mr-2 h-4 w-4" /> Create Assessment
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
                onClick={() => navigate("/timetable")}
              >
                <Calendar className="mr-3 h-4 w-4 text-[#1E40AF]" /> View Class Timetable
              </Button>
              <Button
                variant="outline"
                className="justify-start h-11 border-[#E2E8F0] hover:bg-[#F8FAFC] text-[#0F172A] font-medium"
                onClick={() => navigate("/lms/exams")}
              >
                <FileText className="mr-3 h-4 w-4 text-[#0F766E]" /> Assessments & Quizzes
              </Button>
              {user?.role === "admin" && (
                <Button
                  variant="outline"
                  className="justify-start h-11 border-[#E2E8F0] hover:bg-[#F8FAFC] text-[#0F172A] font-medium"
                  onClick={() => navigate("/settings/academic-years")}
                >
                  <Calendar className="mr-3 h-4 w-4 text-[#D97706]" /> Academic Settings
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
