import { useState } from "react";
import { Sparkles, RefreshCw, Lightbulb, BrainCircuit } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

interface Props {
  role?: string;
}

export function AiInsightWidget({ role }: Props) {
  const [insight, setInsight] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const generateInsight = async () => {
    setLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));

      let mockResponse = "";
      if (role === "admin") {
        mockResponse =
          "School Summary: Grade 10-A achieved a 98% attendance rating this week. High school math scores improved by 7% compared to last month.";
      } else if (role === "teacher") {
        mockResponse =
          "Teacher Note: 3 students in Grade 9 Science need a quick review on Quiz #2 topics before next week's test.";
      } else if (role === "student") {
        mockResponse =
          "Study Reminder: Your Physics exam is in 3 days. Focus on reviewing chapters 4 and 5.";
      } else {
        mockResponse = "All classes, timetables, and quizzes are updated and running on schedule.";
      }

      setInsight(mockResponse);
    } catch (e) {
      toast.error("Could not load overview");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="bg-white border-[#E2E8F0] shadow-xs overflow-hidden relative">
      <BrainCircuit className="absolute -right-6 -bottom-6 h-36 w-36 text-blue-50/70 dark:text-blue-950/20 pointer-events-none" />

      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-semibold text-[#1E40AF] flex items-center gap-2">
          <div className="flex size-6 items-center justify-center rounded-md bg-blue-100/70 text-[#1E40AF]">
            <Sparkles className="h-3.5 w-3.5" />
          </div>
          Daily Academic Overview
        </CardTitle>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-[#64748B] hover:text-[#1E40AF] hover:bg-blue-50 rounded-lg"
          onClick={generateInsight}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2 py-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-[85%]" />
            <Skeleton className="h-4 w-[60%]" />
          </div>
        ) : insight ? (
          <div className="flex gap-3 items-start p-3 rounded-lg bg-blue-50/60 border border-blue-100 text-[#0F172A]">
            <Lightbulb className="h-5 w-5 text-[#D97706] shrink-0 mt-0.5" />
            <p className="text-sm text-[#0F172A] leading-relaxed font-medium">
              {insight}
            </p>
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-sm text-[#64748B] mb-3">
              Click below to view daily attendance notes and class reminders.
            </p>
            <Button size="sm" onClick={generateInsight} className="bg-[#1E40AF] hover:bg-[#1E3A8A] text-white">
              View Daily Overview
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
