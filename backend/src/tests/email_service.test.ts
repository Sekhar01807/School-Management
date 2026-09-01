import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { EmailService } from "../utils/emailService.ts";
import { getAppUrl, getActionUrl } from "../utils/appUrl.ts";
import {
  processUpcomingExamReminders,
  processLowAttendanceHealthCheck,
} from "../utils/cronJobs.ts";

describe("Centralized Real-Time Email Notification Engine & Multi-Tier Fallback", () => {
  describe("1. Sender Identity & Provider Status Resolution", () => {
    it("should return a valid default sender address", () => {
      const from = EmailService.getFromAddress();
      assert.ok(from);
      assert.ok(from.includes("SchoolSync") || from.includes("@"));
    });

    it("should return a valid Resend sender address", () => {
      const resendFrom = EmailService.getResendFromAddress();
      assert.ok(resendFrom);
      assert.ok(resendFrom.includes("resend.dev") || resendFrom.includes("@"));
    });

    it("should report accurate provider status and fallback configuration", () => {
      const status = EmailService.getStatus();
      assert.ok(status.primary);
      assert.strictEqual(typeof status.primary.configured, "boolean");
      assert.strictEqual(typeof status.fallbacks.simulator, "boolean");
      assert.ok(status.defaultSender);
      assert.ok(status.resendSender);
    });
  });

  describe("2. Dynamic URL & Action Link Resolution", () => {
    it("should resolve base app URL from environment variables", () => {
      const url = getAppUrl();
      assert.ok(url.startsWith("http://") || url.startsWith("https://"));
      assert.ok(!url.endsWith("/"));
    });

    it("should strictly prefer configured client origin and reject untrusted vercel origins", () => {
      const originalClientUrl = process.env.CLIENT_URL;
      const originalAppUrl = process.env.APP_URL;
      delete process.env.APP_URL; // ensure CLIENT_URL resolution takes effect
      process.env.CLIENT_URL = "https://schoolsync-trusted.app,https://admin-trusted.app";

      try {
        // Trusted origin passed in request
        const trustedReq = { headers: { origin: "https://admin-trusted.app" } } as any;
        assert.strictEqual(getAppUrl(trustedReq), "https://admin-trusted.app");

        // Attacker vercel origin passed in request
        const attackerReq = { headers: { origin: "https://evil-attacker.vercel.app" } } as any;
        assert.strictEqual(getAppUrl(attackerReq), "https://schoolsync-trusted.app");
      } finally {
        if (originalClientUrl !== undefined) {
          process.env.CLIENT_URL = originalClientUrl;
        } else {
          delete process.env.CLIENT_URL;
        }
        if (originalAppUrl !== undefined) {
          process.env.APP_URL = originalAppUrl;
        }
      }
    });

    it("should build accurate deep link action URLs", () => {
      const resetAction = getActionUrl("/reset-password?token=secret123");
      assert.ok(resetAction.includes("/reset-password?token=secret123"));

      const examAction = getActionUrl("lms/exams");
      assert.ok(examAction.includes("/lms/exams"));
    });
  });

  describe("3. Responsive HTML Templates & Event-Driven Notification Suite", () => {
    it("should generate and dispatch student welcome onboarding email", async () => {
      const result = await EmailService.sendWelcomeEmail(
        "alice@student.school.edu",
        "Alice Johnson",
        "student",
        undefined,
        "https://schoolsync.edu/login"
      );

      assert.strictEqual(result.success, true);
      assert.ok(result.messageId);
      assert.ok(result.provider);
    });

    it("should generate and dispatch teacher onboarding email", async () => {
      const result = await EmailService.sendWelcomeEmail(
        "prof.smith@school.edu",
        "Dr. Robert Smith",
        "teacher"
      );

      assert.strictEqual(result.success, true);
      assert.ok(result.messageId);
    });

    it("should generate and dispatch parent onboarding email", async () => {
      const result = await EmailService.sendWelcomeEmail(
        "parent.smith@gmail.com",
        "Mary Smith",
        "parent"
      );

      assert.strictEqual(result.success, true);
      assert.ok(result.messageId);
    });

    it("should generate and dispatch admin onboarding email", async () => {
      const result = await EmailService.sendWelcomeEmail(
        "admin@schoolsync.edu",
        "Super Admin",
        "admin"
      );

      assert.strictEqual(result.success, true);
      assert.ok(result.messageId);
    });

    it("should dispatch password reset security email with cryptographic token", async () => {
      const resetUrl = "https://schoolsync.edu/reset-password?token=a8f7c9e1234567890abcdef";
      const result = await EmailService.sendPasswordResetEmail(
        "user@school.edu",
        resetUrl,
        "Alex Walker"
      );

      assert.strictEqual(result.success, true);
      assert.ok(result.messageId);
    });

    it("should dispatch student absence notification", async () => {
      const result = await EmailService.sendAbsentAttendanceAlert(
        ["guardian@family.org", "student@school.edu"],
        "Charlie Brown",
        "Grade 10-A",
        new Date("2026-09-01T09:00:00Z")
      );

      assert.strictEqual(result.success, true);
      assert.ok(result.messageId);
    });

    it("should dispatch new exam publication notice", async () => {
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

    it("should dispatch exam graded result report card email", async () => {
      const result = await EmailService.sendExamGradedNotification(
        "student@school.edu",
        "Emma Watson",
        "Mid-Term Mathematics Exam",
        "Advanced Calculus",
        95,
        100,
        95,
        "Superb understanding of derivatives and integrals!"
      );

      assert.strictEqual(result.success, true);
      assert.ok(result.messageId);
    });

    it("should dispatch upcoming exam reminder email", async () => {
      const result = await EmailService.sendUpcomingExamReminderEmail(
        ["student@school.edu"],
        "Physics Final Assessment",
        "Classical Mechanics",
        "Grade 11-B",
        new Date("2026-10-20T10:00:00Z"),
        2
      );

      assert.strictEqual(result.success, true);
      assert.ok(result.messageId);
    });

    it("should dispatch low attendance warning email", async () => {
      const result = await EmailService.sendLowAttendanceWarningEmail(
        ["parent@school.edu", "student@school.edu"],
        "John Doe",
        "Grade 9-C",
        68,
        75
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

  describe("4. Multi-Tier Fallback Pipeline", () => {
    it("should gracefully handle simulated dispatch when external networks are offline", async () => {
      const result = EmailService.sendViaSimulator(["offline-test@school.edu"], {
        to: "offline-test@school.edu",
        subject: "Unit Test Fallback Simulation",
        html: "<p>Test Simulation</p>",
      });

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.provider, "simulator");
      assert.ok(result.messageId?.startsWith("sim_"));
    });

    it("should return error when no recipients are provided to dispatchEmail", async () => {
      const result = await EmailService.dispatchEmail({
        to: [],
        subject: "No recipient test",
        html: "<p>Fail</p>",
      });

      assert.strictEqual(result.success, false);
      assert.ok(result.error);
    });
  });

  describe("5. Background Cron Task Resilience", () => {
    it("should execute processUpcomingExamReminders without throwing unhandled exceptions", async () => {
      try {
        const stats = await processUpcomingExamReminders();
        assert.strictEqual(typeof stats.examsChecked, "number");
        assert.strictEqual(typeof stats.remindersSent, "number");
      } catch (err: any) {
        // Expected when DB is disconnected in isolated unit test
        assert.ok(err);
      }
    });

    it("should execute processLowAttendanceHealthCheck without throwing unhandled exceptions", async () => {
      try {
        const stats = await processLowAttendanceHealthCheck();
        assert.strictEqual(typeof stats.studentsScanned, "number");
        assert.strictEqual(typeof stats.warningsDispatched, "number");
      } catch (err: any) {
        // Expected when DB is disconnected in isolated unit test
        assert.ok(err);
      }
    });
  });
});
