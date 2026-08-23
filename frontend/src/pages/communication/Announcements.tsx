import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/AuthProvider";
import { api } from "@/lib/api";
import { toast } from "sonner";
import type { Announcement, AnnouncementPriority, AnnouncementAudience, Class } from "@/types";

// UI Imports
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Megaphone,
  Plus,
  Search,
  Calendar,
  User,
  Trash2,
  AlertTriangle,
  Info,
  CheckCircle,
  Filter,
} from "lucide-react";

export default function AnnouncementsPage() {
  const { user } = useAuth();
  const canCreate = user?.role === "admin" || user?.role === "teacher";

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");

  // Create Modal State
  const [isOpen, setIsOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [priority, setPriority] = useState<AnnouncementPriority>("medium");
  const [audience, setAudience] = useState<AnnouncementAudience>("all");
  const [targetClass, setTargetClass] = useState<string>("");
  const [classes, setClasses] = useState<Class[]>([]);

  // 1. Load Announcements
  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const res = await api.get("/announcements");
      setAnnouncements(res.data || []);
    } catch (error) {
      console.error("Failed to load announcements:", error);
      toast.error("Failed to load announcements");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();

    // If teacher/admin, load classes for targeted announcements
    if (canCreate) {
      api.get("/classes")
        .then((res) => setClasses(res.data.classes || res.data || []))
        .catch(console.error);
    }
  }, [canCreate]);

  // 2. Handle Create Announcement
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      toast.error("Please enter a title and content");
      return;
    }

    try {
      setCreating(true);
      await api.post("/announcements", {
        title,
        content,
        priority,
        audience: [audience],
        targetClass: audience === "class" ? targetClass : null,
      });

      toast.success("Announcement broadcasted successfully!");
      setIsOpen(false);
      setTitle("");
      setContent("");
      setPriority("medium");
      setAudience("all");
      setTargetClass("");
      fetchAnnouncements();
    } catch (error: any) {
      console.error("Create announcement error:", error);
      toast.error(error?.response?.data?.message || "Failed to publish announcement");
    } finally {
      setCreating(false);
    }
  };

  // 3. Handle Delete Announcement
  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to remove this announcement?")) return;
    try {
      await api.delete(`/announcements/${id}`);
      toast.success("Announcement removed");
      setAnnouncements((prev) => prev.filter((a) => a._id !== id));
    } catch (error: any) {
      console.error("Delete error:", error);
      toast.error("Failed to delete announcement");
    }
  };

  // Filtered List
  const filtered = announcements.filter((a) => {
    const matchesSearch =
      a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPriority = priorityFilter === "all" || a.priority === priorityFilter;
    return matchesSearch && matchesPriority;
  });

  const getPriorityBadge = (p: AnnouncementPriority) => {
    switch (p) {
      case "urgent":
        return <Badge className="bg-rose-100 text-rose-800 border-rose-200">Urgent</Badge>;
      case "high":
        return <Badge className="bg-amber-100 text-amber-800 border-amber-200">High Priority</Badge>;
      case "medium":
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">General Notice</Badge>;
      case "low":
        return <Badge className="bg-slate-100 text-slate-800 border-slate-200">Information</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="flex-1 space-y-6 p-8 pt-6 bg-[#F8FAFC] min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[#0F172A]">
            Campus Noticeboard & Announcements
          </h1>
          <p className="text-sm text-[#64748B] mt-0.5">
            Official institutional updates, academic alerts, and community circulars.
          </p>
        </div>

        {canCreate && (
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[#1E40AF] hover:bg-[#1E3A8A] text-white shadow-xs">
                <Plus className="mr-2 h-4 w-4" /> New Announcement
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[550px] bg-white">
              <DialogHeader>
                <DialogTitle className="text-lg font-bold text-[#0F172A]">
                  Publish Institutional Notice
                </DialogTitle>
                <DialogDescription className="text-xs text-[#64748B]">
                  Broadcast an official announcement to targeted campus groups or the entire school.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleCreate} className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#0F172A]">Notice Title</label>
                  <Input
                    placeholder="e.g., Midterm Schedule Update / Science Fair Notice"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    className="bg-white border-[#E2E8F0]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#0F172A]">Priority Level</label>
                    <Select
                      value={priority}
                      onValueChange={(val: AnnouncementPriority) => setPriority(val)}
                    >
                      <SelectTrigger className="bg-white border-[#E2E8F0]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low (Info)</SelectItem>
                        <SelectItem value="medium">Medium (Standard)</SelectItem>
                        <SelectItem value="high">High (Important)</SelectItem>
                        <SelectItem value="urgent">Urgent (Immediate Attention)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#0F172A]">Target Audience</label>
                    <Select
                      value={audience}
                      onValueChange={(val: AnnouncementAudience) => setAudience(val)}
                    >
                      <SelectTrigger className="bg-white border-[#E2E8F0]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Everyone (All Campus)</SelectItem>
                        <SelectItem value="student">Students Only</SelectItem>
                        <SelectItem value="teacher">Teachers Only</SelectItem>
                        <SelectItem value="parent">Parents Only</SelectItem>
                        <SelectItem value="class">Specific Class</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {audience === "class" && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#0F172A]">Select Class</label>
                    <Select value={targetClass} onValueChange={setTargetClass}>
                      <SelectTrigger className="bg-white border-[#E2E8F0]">
                        <SelectValue placeholder="Choose a class" />
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
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#0F172A]">Message Content</label>
                  <Textarea
                    placeholder="Write your announcement details here..."
                    rows={4}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    required
                    className="bg-white border-[#E2E8F0]"
                  />
                </div>

                <DialogFooter className="pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsOpen(false)}
                    className="border-[#E2E8F0]"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={creating}
                    className="bg-[#1E40AF] hover:bg-[#1E3A8A] text-white"
                  >
                    {creating ? "Publishing..." : "Broadcast Notice"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Filter and Search Bar */}
      <Card className="bg-white border-[#E2E8F0] shadow-xs">
        <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#94A3B8]" />
            <Input
              placeholder="Search announcements..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-white border-[#E2E8F0] text-sm"
            />
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <Filter className="h-4 w-4 text-[#64748B]" />
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-40 bg-white border-[#E2E8F0] text-xs">
                <SelectValue placeholder="All Priorities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Information</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Announcements Stream */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="bg-white border-[#E2E8F0] shadow-xs">
          <CardContent className="py-16 text-center text-[#64748B]">
            <Megaphone className="mx-auto h-12 w-12 text-[#94A3B8] mb-3" />
            <p className="font-semibold text-[#0F172A] text-base">No Announcements Found</p>
            <p className="text-xs text-[#64748B] mt-1">
              There are currently no circulars or notices matching your filters.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filtered.map((item) => {
            const isUrgent = item.priority === "urgent";
            return (
              <Card
                key={item._id}
                className={`bg-white border transition-all duration-200 shadow-xs hover:shadow-sm ${
                  isUrgent ? "border-rose-300 bg-rose-50/20" : "border-[#E2E8F0]"
                }`}
              >
                <CardHeader className="pb-3">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                        {getPriorityBadge(item.priority)}
                        <Badge variant="outline" className="text-xs font-normal border-[#CBD5E1]">
                          Target: {item.audience?.join(", ") || "All"}
                          {item.targetClass ? ` (${item.targetClass.name})` : ""}
                        </Badge>
                      </div>
                      <CardTitle className="text-lg font-bold text-[#0F172A] pt-1">
                        {item.title}
                      </CardTitle>
                    </div>

                    {(user?.role === "admin" || (item.createdBy as any)?._id === user?._id) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(item._id)}
                        className="text-[#94A3B8] hover:text-rose-600 hover:bg-rose-50 self-end sm:self-start h-8 w-8 p-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="pb-4">
                  <p className="text-sm text-[#334155] whitespace-pre-wrap leading-relaxed">
                    {item.content}
                  </p>
                </CardContent>

                <CardFooter className="pt-0 border-t border-[#F1F5F9] flex items-center justify-between text-xs text-[#64748B] pt-3">
                  <div className="flex items-center space-x-1.5">
                    <User className="h-3.5 w-3.5 text-[#94A3B8]" />
                    <span>
                      Posted by <strong className="text-[#0F172A]">{item.createdBy?.name || "Administration"}</strong>
                    </span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <Calendar className="h-3.5 w-3.5 text-[#94A3B8]" />
                    <span>
                      {new Date(item.createdAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
