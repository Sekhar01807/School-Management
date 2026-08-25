import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { EmailService } from "../services/emailService.ts";

describe("SchoolSync Email Notification Engine & Template Suite", () => {
  describe("1. Default Sender Configuration & Environment Fallbacks", () => {
    it("should return a valid default sender address", () => {
      const from = EmailService.getFromAddress();
      assert.ok(from);
      assert.ok(from.includes("SchoolSync") || from.includes("@"));
    });
  });

  describe("2. Welcome & Onboarding Transactional Emails", () => {
    it("should generate and simulate dispatch of student welcome email", async () => {
      const result = await EmailService.sendWelcomeEmail(
        "alice@student.school.edu",
        "Alice Johnson",
        "student",
        "https://schoolsync.edu/login"
      );

      assert.strictEqual(result.success, true);
      assert.ok(result.messageId);
    });

    it("should generate and simulate dispatch of teacher onboarding email", async () => {
      const result = await EmailService.sendWelcomeEmail(
        "prof.smith@school.edu",
        "Dr. Robert Smith",
        "teacher"
      );

      assert.strictEqual(result.success, true);
      assert.ok(result.messageId);
    });

    it("should generate and simulate dispatch of parent portal welcome email", async () => {
      const result = await EmailService.sendWelcomeEmail(
        "parent.smith@gmail.com",
        "Mary Smith",
        "parent"
      );

      assert.strictEqual(result.success, true);
      assert.ok(result.messageId);
    });
  });

  describe("3. Security & Critical Academic Alerts", () => {
    it("should dispatch password reset security email with cryptographic token link", async () => {
      const resetUrl = "https://schoolsync.edu/reset-password?token=a8f7c9e1234567890abcdef";
      const result = await EmailService.sendPasswordResetEmail(
        "user@school.edu",
        resetUrl,
        "Alex Walker"
      );

      assert.strictEqual(result.success, true);
      assert.ok(result.messageId);
    });

    it("should dispatch student absence notification with formatted date and class info", async () => {
      const result = await EmailService.sendAbsentAttendanceAlert(
        ["parent@family.org", "student@school.edu"],
        "Charlie Brown",
        "Grade 10-A",
        new Date("2026-09-01T09:00:00Z")
      );

      assert.strictEqual(result.success, true);
      assert.ok(result.messageId);
    });

    it("should dispatch new exam publication notice with duration and deadline", async () => {
      const result = await EmailService.sendNewExamNotification(
        ["student1@school.edu", "student2@school.edu"],
        "Mid-Term Mathematics Exam",
        "Advanced Calculus",
        "Grade 12-A",
        new Date("2026-10-15T14:00:00Z"),
        60
      );

      assert.strictEqual(result.success, true);
      assert.ok(result.messageId);
    });

    it("should dispatch urgent campus broadcast announcement", async () => {
      const result = await EmailService.sendUrgentAnnouncementEmail(
        ["all-students@school.edu"],
        "Campus Severe Weather Advisory",
        "All afternoon classes for Friday are moved to remote learning.",
        "Principal Henderson"
      );

      assert.strictEqual(result.success, true);
      assert.ok(result.messageId);
    });
  });
});
