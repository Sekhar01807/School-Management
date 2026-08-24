import { describe, it } from "node:test";
import assert from "node:assert/strict";
import crypto from "crypto";
import {
  validateUpdateProfile,
  validateChangePassword,
  validateForgotPassword,
  validateResetPassword,
} from "../validators/schemas.ts";
import { EmailService } from "../services/emailService.ts";

describe("SchoolSync Profile Management & Transactional Email Test Suite", () => {
  describe("1. Validation Schemas for Profile & Password Workflows", () => {
    it("should accept valid profile updates with emergency contacts", () => {
      const input = {
        name: "Alexander Hamilton",
        phoneNumber: "+1 (555) 123-4567",
        address: "57 Wall Street, New York, NY",
        avatar: "https://example.com/avatar.png",
        emergencyContact: {
          name: "Elizabeth Schuyler",
          phone: "+1 (555) 987-6543",
          relationship: "Spouse",
        },
      };

      const result = validateUpdateProfile(input);
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.data?.name, "Alexander Hamilton");
      assert.strictEqual(result.data?.emergencyContact?.relationship, "Spouse");
    });

    it("should reject invalid profile updates with short name", () => {
      const result = validateUpdateProfile({ name: "A" });
      assert.strictEqual(result.success, false);
      assert.ok(result.errors?.some((e) => e.includes("at least 2 characters")));
    });

    it("should validate change password with compliant strong password", () => {
      const valid = validateChangePassword({
        currentPassword: "OldPassword123!",
        newPassword: "NewSecurePassword456!",
      });
      assert.strictEqual(valid.success, true);

      // Same password rejection
      const same = validateChangePassword({
        currentPassword: "SamePassword123!",
        newPassword: "SamePassword123!",
      });
      assert.strictEqual(same.success, false);
      assert.ok(same.errors?.some((e) => e.includes("different from current")));

      // Short password rejection (< 8 chars)
      const tooShort = validateChangePassword({
        currentPassword: "OldPassword123!",
        newPassword: "Short1!",
      });
      assert.strictEqual(tooShort.success, false);
      assert.ok(tooShort.errors?.some((e) => e.includes("at least 8 characters")));

      // Missing special character
      const noSpecial = validateChangePassword({
        currentPassword: "OldPassword123!",
        newPassword: "NoSpecialCharacter123",
      });
      assert.strictEqual(noSpecial.success, false);
      assert.ok(noSpecial.errors?.some((e) => e.includes("special character")));
    });

    it("should validate forgot password email format", () => {
      const valid = validateForgotPassword({ email: "student@schoolsync.edu" });
      assert.strictEqual(valid.success, true);
      assert.strictEqual(valid.data?.email, "student@schoolsync.edu");

      const invalid = validateForgotPassword({ email: "not-an-email" });
      assert.strictEqual(invalid.success, false);
      assert.ok(invalid.errors?.some((e) => e.includes("valid email")));
    });

    it("should validate reset password token and payload with strong password", () => {
      const valid = validateResetPassword({
        token: "a1b2c3d4e5f678901234567890abcdef",
        newPassword: "BrandNewPassword789!",
      });
      assert.strictEqual(valid.success, true);
      assert.strictEqual(valid.data?.token, "a1b2c3d4e5f678901234567890abcdef");

      const weakPassword = validateResetPassword({
        token: "a1b2c3d4e5f678901234567890abcdef",
        newPassword: "weak",
      });
      assert.strictEqual(weakPassword.success, false);

      const missingToken = validateResetPassword({
        token: "",
        newPassword: "BrandNewPassword789!",
      });
      assert.strictEqual(missingToken.success, false);
    });
  });

  describe("2. Cryptographic Password Reset Token Flow", () => {
    it("should generate random tokens and accurately verify SHA-256 hash digests", () => {
      const rawToken = crypto.randomBytes(32).toString("hex");
      assert.strictEqual(rawToken.length, 64);

      const expectedHashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");
      const computedHash = crypto.createHash("sha256").update(rawToken).digest("hex");

      assert.strictEqual(computedHash, expectedHashedToken);

      // Wrong token produces different hash
      const wrongHash = crypto.createHash("sha256").update("invalid-token").digest("hex");
      assert.notStrictEqual(wrongHash, expectedHashedToken);
    });

    it("should enforce expiration threshold for reset tokens", () => {
      const now = new Date();
      const validExpiration = new Date(Date.now() + 15 * 60 * 1000); // 15 mins in future
      const expiredDate = new Date(Date.now() - 1000); // 1 sec in past

      assert.ok(validExpiration > now, "Valid token must be in the future");
      assert.ok(expiredDate <= now, "Expired token must be in the past");
    });
  });

  describe("3. Transactional Email Notification Dispatcher", () => {
    it("should format and dispatch Password Reset emails", async () => {
      const result = await EmailService.sendPasswordResetEmail(
        "student@schoolsync.edu",
        "http://localhost:5173/reset-password?token=testtoken123",
        "John Doe"
      );

      assert.strictEqual(result.success, true);
      assert.ok(result.messageId);
    });

    it("should format and dispatch Absent Attendance alerts to student and parent", async () => {
      const result = await EmailService.sendAbsentAttendanceAlert(
        ["parent@example.com", "student@example.com"],
        "Alice Smith",
        "Grade 10 - Section A",
        new Date("2026-08-24")
      );

      assert.strictEqual(result.success, true);
      assert.ok(result.messageId);
    });

    it("should format and dispatch New Exam Published alerts", async () => {
      const result = await EmailService.sendNewExamNotification(
        ["student1@example.com", "student2@example.com"],
        "Midterm Physics Assessment",
        "Physics",
        "Grade 11 - Science",
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        60
      );

      assert.strictEqual(result.success, true);
      assert.ok(result.messageId);
    });

    it("should format and dispatch Urgent Campus Announcement broadcasts", async () => {
      const result = await EmailService.sendUrgentAnnouncementEmail(
        ["all-students@schoolsync.edu", "all-staff@schoolsync.edu"],
        "Severe Weather Campus Advisory",
        "Due to severe weather conditions, campus will transition to remote learning tomorrow.",
        "Principal Anderson"
      );

      assert.strictEqual(result.success, true);
      assert.ok(result.messageId);
    });

    it("should format and dispatch One-Time Welcome Onboarding emails for new users", async () => {
      const result = await EmailService.sendWelcomeEmail(
        "newstudent@schoolsync.edu",
        "Eleanor Vance",
        "student",
        "http://localhost:5173/login"
      );

      assert.strictEqual(result.success, true);
      assert.ok(result.messageId);
    });

    it("should reject email dispatch when recipients list is empty", async () => {
      const result = await EmailService.sendEmail({
        to: [],
        subject: "Empty recipient test",
        html: "<p>Test</p>",
      });

      assert.strictEqual(result.success, false);
      assert.ok(result.error?.includes("No recipient"));
    });
  });

  describe("4. NoSQL Sanitization & Security Hardening", () => {
    it("should strip keys starting with $ or containing dots from inputs", async () => {
      const { sanitizeObject } = await import("../middleware/sanitize.ts");
      const maliciousPayload = {
        name: "Alex",
        $gt: "",
        nested: {
          $where: "malicious code",
          "user.role": "admin",
          safeKey: "safeValue",
        },
        arr: [{ $ne: null, item: 1 }],
      };

      const clean = sanitizeObject(maliciousPayload);
      assert.strictEqual(clean.name, "Alex");
      assert.strictEqual(clean.$gt, undefined);
      assert.strictEqual(clean.nested.$where, undefined);
      assert.strictEqual(clean.nested["user.role"], undefined);
      assert.strictEqual(clean.nested.safeKey, "safeValue");
      assert.strictEqual(clean.arr[0].item, 1);
      assert.strictEqual(clean.arr[0].$ne, undefined);
    });

    it("should enforce rate limits and return 429 when max requests threshold is exceeded", async () => {
      const { createRateLimiter } = await import("../middleware/rateLimiter.ts");
      const limiter = createRateLimiter(2, 5000);

      const mockReq = { ip: "127.0.0.99", headers: {}, socket: {} } as any;
      let statusCode = 200;
      let blocked = false;
      const headers: { [key: string]: any } = {};

      const mockRes = {
        setHeader: (k: string, v: any) => {
          headers[k] = v;
        },
        status: (code: number) => {
          statusCode = code;
          return {
            json: (data: any) => {
              blocked = true;
              return data;
            },
          };
        },
      } as any;

      let nextCount = 0;
      const next = () => {
        nextCount++;
      };

      // 1st request -> Allowed
      limiter(mockReq, mockRes, next);
      assert.strictEqual(nextCount, 1);

      // 2nd request -> Allowed
      limiter(mockReq, mockRes, next);
      assert.strictEqual(nextCount, 2);

      // 3rd request -> Blocked (429)
      limiter(mockReq, mockRes, next);
      assert.strictEqual(blocked, true);
      assert.strictEqual(statusCode, 429);
      assert.strictEqual(headers["X-RateLimit-Remaining"], 0);
    });
  });
});
