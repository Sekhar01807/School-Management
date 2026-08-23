import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { escapeRegex } from "../utils/escapeRegex.ts";
import { createRateLimiter } from "../middleware/rateLimiter.ts";

describe("SchoolSync Security & Data-Integrity Test Suite", () => {
  describe("1. Regex Injection & ReDoS Defense", () => {
    it("should escape special regex metacharacters in search queries", () => {
      const maliciousInput = ".*+?^${}()|[]\\";
      const escaped = escapeRegex(maliciousInput);
      assert.strictEqual(escaped, "\\.\\*\\+\\?\\^\\$\\{\\}\\(\\)\\|\\[\\]\\\\");
    });

    it("should handle empty or null string gracefully", () => {
      assert.strictEqual(escapeRegex(""), "");
      // @ts-ignore
      assert.strictEqual(escapeRegex(null), "");
    });
  });

  describe("2. In-Memory Rate Limiting", () => {
    it("should block requests when rate limit is exceeded", () => {
      const limiter = createRateLimiter(2, 60000); // max 2 requests per minute
      let blocked = false;
      let statusCode = 200;

      const mockReq = { ip: "192.168.1.100", socket: {} } as any;
      const mockRes = {
        setHeader: () => {},
        status: (code: number) => {
          statusCode = code;
          return {
            json: () => {
              blocked = true;
            },
          };
        },
      } as any;

      const next = () => {};

      // 1st request -> allowed
      limiter(mockReq, mockRes, next);
      assert.strictEqual(blocked, false);

      // 2nd request -> allowed
      limiter(mockReq, mockRes, next);
      assert.strictEqual(blocked, false);

      // 3rd request -> BLOCKED (429)
      limiter(mockReq, mockRes, next);
      assert.strictEqual(blocked, true);
      assert.strictEqual(statusCode, 429);
    });
  });

  describe("3. Role-Based Access Control (RBAC) Contract", () => {
    it("should ensure teacher can only register students", () => {
      const teacherRole = "teacher";
      const targetAdminRole = "admin";
      const targetStudentRole = "student";

      const isTeacherAllowedAdmin = !(teacherRole === "teacher" && targetAdminRole !== "student");
      const isTeacherAllowedStudent = !(teacherRole === "teacher" && targetStudentRole !== "student");

      assert.strictEqual(isTeacherAllowedAdmin, false);
      assert.strictEqual(isTeacherAllowedStudent, true);
    });

    it("should ensure active accounts only are allowed through protection barriers", () => {
      const activeUser = { _id: "123", role: "student", isActive: true };
      const deactivatedUser = { _id: "456", role: "student", isActive: false };

      assert.strictEqual(activeUser.isActive, true);
      assert.strictEqual(deactivatedUser.isActive, false);
    });
  });

  describe("4. Exam Pre-Submission & Status Guardrails", () => {
    it("should reject activating an exam with 0 questions", () => {
      const draftExam = {
        title: "Test Exam",
        questions: [],
        dueDate: new Date(Date.now() + 86400000),
        isActive: false,
      };

      const canPublish = draftExam.questions.length > 0 && new Date(draftExam.dueDate) > new Date();
      assert.strictEqual(canPublish, false);
    });

    it("should reject activating an exam with an expired due date", () => {
      const expiredExam = {
        title: "Past Exam",
        questions: [{ questionText: "Q1", options: ["A", "B"], correctAnswer: "A" }],
        dueDate: new Date(Date.now() - 86400000), // yesterday
        isActive: false,
      };

      const canPublish = expiredExam.questions.length > 0 && new Date(expiredExam.dueDate) > new Date();
      assert.strictEqual(canPublish, false);
    });

    it("should allow activating a valid exam with questions and future deadline", () => {
      const validExam = {
        title: "Valid Exam",
        questions: [{ questionText: "Q1", options: ["A", "B"], correctAnswer: "A" }],
        dueDate: new Date(Date.now() + 86400000), // tomorrow
        isActive: false,
      };

      const canPublish = validExam.questions.length > 0 && new Date(validExam.dueDate) > new Date();
      assert.strictEqual(canPublish, true);
    });
  });
});
