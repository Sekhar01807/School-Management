import { describe, it } from "node:test";
import assert from "node:assert/strict";

describe("SchoolSync Announcement & Broadcast Subsystem Test Suite", () => {
  interface Announcement {
    _id: string;
    title: string;
    content: string;
    targetAudience: "all" | "teacher" | "student" | "class";
    targetClass?: string;
    priority: "low" | "medium" | "high" | "urgent";
    authorId: string;
  }

  const sampleAnnouncements: Announcement[] = [
    {
      _id: "ann_1",
      title: "Campus Fire Drill Tomorrow",
      content: "All faculty and learners must follow evacuation protocol at 10 AM.",
      targetAudience: "all",
      priority: "high",
      authorId: "admin_1",
    },
    {
      _id: "ann_2",
      title: "Faculty Curriculum Meeting",
      content: "Department heads meet in conference room 3.",
      targetAudience: "teacher",
      priority: "medium",
      authorId: "admin_1",
    },
    {
      _id: "ann_3",
      title: "Grade 10 Math Homework Reminder",
      content: "Calculus worksheet due by Friday.",
      targetAudience: "class",
      targetClass: "class_10a",
      priority: "low",
      authorId: "teacher_sarah",
    },
  ];

  describe("1. Role & Audience Filtering", () => {
    function filterAnnouncementsForUser(
      announcements: Announcement[],
      user: { role: string; studentClass?: string }
    ): Announcement[] {
      return announcements.filter((ann) => {
        if (user.role === "admin") return true; // Admins view all broadcasts
        if (ann.targetAudience === "all") return true;
        if (ann.targetAudience === user.role) return true;
        if (ann.targetAudience === "class" && user.role === "student" && ann.targetClass === user.studentClass) {
          return true;
        }
        return false;
      });
    }

    it("should allow students in Grade 10-A to see 'all' and their class announcements, but not teacher-only", () => {
      const student = { role: "student", studentClass: "class_10a" };
      const visible = filterAnnouncementsForUser(sampleAnnouncements, student);
      assert.strictEqual(visible.length, 2);
      assert.strictEqual(visible.some((a) => a._id === "ann_1"), true); // all
      assert.strictEqual(visible.some((a) => a._id === "ann_3"), true); // class_10a
      assert.strictEqual(visible.some((a) => a._id === "ann_2"), false); // teacher only
    });

    it("should allow teachers to view 'all' and 'teacher' announcements", () => {
      const teacher = { role: "teacher" };
      const visible = filterAnnouncementsForUser(sampleAnnouncements, teacher);
      assert.strictEqual(visible.length, 2);
      assert.strictEqual(visible.some((a) => a._id === "ann_1"), true);
      assert.strictEqual(visible.some((a) => a._id === "ann_2"), true);
    });

    it("should allow admins to view all announcements across the entire institution", () => {
      const admin = { role: "admin" };
      const visible = filterAnnouncementsForUser(sampleAnnouncements, admin);
      assert.strictEqual(visible.length, 3);
    });
  });

  describe("2. Author-Scoped Mutation Permissions", () => {
    function canMutateAnnouncement(announcement: Announcement, actor: { id: string; role: string }): boolean {
      if (actor.role === "admin") return true;
      return announcement.authorId === actor.id;
    }

    it("should allow the original authoring teacher to edit or delete their announcement", () => {
      const teacherSarah = { id: "teacher_sarah", role: "teacher" };
      const canEdit = canMutateAnnouncement(sampleAnnouncements[2], teacherSarah);
      assert.strictEqual(canEdit, true);
    });

    it("should prevent another teacher from editing someone else's announcement", () => {
      const teacherJohn = { id: "teacher_john", role: "teacher" };
      const canEdit = canMutateAnnouncement(sampleAnnouncements[2], teacherJohn);
      assert.strictEqual(canEdit, false);
    });
  });
});
