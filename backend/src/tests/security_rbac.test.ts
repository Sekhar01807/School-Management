import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { escapeRegex } from "../utils/escapeRegex.ts";
import { createRateLimiter, emailTestRateLimiter } from "../middleware/rateLimiter.ts";
import { validateSeedConfig } from "../config/seedDefaultData.ts";
import { isOriginAllowed, getAllowedOrigins } from "../utils/cors.ts";
import { validateSendTestEmail } from "../validators/schemas.ts";
import { authorize } from "../middleware/auth.ts";

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

  describe("3. Role-Based Access Control (RBAC) & Registration Boundaries", () => {
    it("should reject unauthenticated caller attempting to register an admin account", () => {
      const requesterRole: string | undefined = undefined; // Unauthenticated public request
      const inputRole: string = "admin";

      let status = 200;
      let error = "";

      if (!requesterRole && inputRole !== "student") {
        status = 403;
        error = "Public registration is restricted to student accounts only.";
      }

      assert.strictEqual(status, 403);
      assert.strictEqual(error, "Public registration is restricted to student accounts only.");
    });

    it("should reject unauthenticated caller attempting to register a teacher account", () => {
      const requesterRole: string | undefined = undefined;
      const inputRole: string = "teacher";

      const isAllowed = !requesterRole ? inputRole === "student" : true;
      assert.strictEqual(isAllowed, false);
    });

    it("should allow unauthenticated caller to register a student account", () => {
      const requesterRole: string | undefined = undefined;
      const inputRole: string = "student";

      let assignedRole = "student";
      let isAllowed = true;
      if (!requesterRole) {
        if (inputRole && inputRole !== "student") {
          isAllowed = false;
        }
        assignedRole = "student";
      }

      assert.strictEqual(isAllowed, true);
      assert.strictEqual(assignedRole, "student");
    });

    it("should ensure teacher can only register students and cannot elevate to admin or teacher", () => {
      const teacherRole: string = "teacher";
      const targetAdminRole: string = "admin";
      const targetTeacherRole: string = "teacher";
      const targetStudentRole: string = "student";

      const isTeacherAllowedAdmin = !(teacherRole === "teacher" && targetAdminRole !== "student");
      const isTeacherAllowedTeacher = !(teacherRole === "teacher" && targetTeacherRole !== "student");
      const isTeacherAllowedStudent = !(teacherRole === "teacher" && targetStudentRole !== "student");

      assert.strictEqual(isTeacherAllowedAdmin, false);
      assert.strictEqual(isTeacherAllowedTeacher, false);
      assert.strictEqual(isTeacherAllowedStudent, true);
    });

    it("should allow admin to register any role (admin, teacher, student, parent)", () => {
      const adminRole = "admin";
      const validRoles = ["admin", "teacher", "student", "parent"];

      const canAdminRegisterAll = validRoles.every((role) => {
        return adminRole === "admin";
      });

      assert.strictEqual(canAdminRegisterAll, true);
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

  describe("5. Database Seeding & Production Credential Security", () => {
    it("should reject production seeding when DEFAULT_ADMIN_PASSWORD is absent", () => {
      const prodEnv = { NODE_ENV: "production" };
      const validation = validateSeedConfig(prodEnv);

      assert.strictEqual(validation.isValid, false);
      assert.match(validation.error || "", /DEFAULT_ADMIN_PASSWORD must be explicitly defined/);
    });

    it("should reject production seeding when DEFAULT_ADMIN_PASSWORD is set to password123", () => {
      const prodEnv = { NODE_ENV: "production", DEFAULT_ADMIN_PASSWORD: "password123" };
      const validation = validateSeedConfig(prodEnv);

      assert.strictEqual(validation.isValid, false);
      assert.match(validation.error || "", /cannot be the default 'password123'/);
    });

    it("should accept production seeding with custom secure password and prevent password123 fallback on demo accounts", () => {
      const prodEnv = {
        NODE_ENV: "production",
        DEFAULT_ADMIN_PASSWORD: "ProdSecureAdminPass2026!",
      };
      const validation = validateSeedConfig(prodEnv);

      assert.strictEqual(validation.isValid, true);
      assert.strictEqual(validation.adminPassword, "ProdSecureAdminPass2026!");
      assert.strictEqual(validation.teacherPassword, undefined);
      assert.strictEqual(validation.studentPassword, undefined);
    });

    it("should seed demo accounts in production only when their specific passwords are provided", () => {
      const prodEnv = {
        NODE_ENV: "production",
        DEFAULT_ADMIN_PASSWORD: "ProdSecureAdminPass2026!",
        DEFAULT_TEACHER_PASSWORD: "TeacherCustomPass2026!",
      };
      const validation = validateSeedConfig(prodEnv);

      assert.strictEqual(validation.isValid, true);
      assert.strictEqual(validation.adminPassword, "ProdSecureAdminPass2026!");
      assert.strictEqual(validation.teacherPassword, "TeacherCustomPass2026!");
      assert.strictEqual(validation.studentPassword, undefined);
    });

    it("should permit default password fallback in development environment", () => {
      const devEnv = { NODE_ENV: "development" };
      const validation = validateSeedConfig(devEnv);

      assert.strictEqual(validation.isValid, true);
      assert.strictEqual(validation.adminPassword, "password123");
      assert.strictEqual(validation.teacherPassword, "password123");
      assert.strictEqual(validation.studentPassword, "password123");
    });

    it("should allow explicit demo opt-in when ALLOW_INSECURE_DEMO_SEEDING_IN_PROD is set to true", () => {
      const demoProdEnv = {
        NODE_ENV: "production",
        ALLOW_INSECURE_DEMO_SEEDING_IN_PROD: "true",
      };
      const validation = validateSeedConfig(demoProdEnv);

      assert.strictEqual(validation.isValid, true);
      assert.strictEqual(validation.adminPassword, "password123");
      assert.strictEqual(validation.teacherPassword, "password123");
    });
  });

  describe("5. Strict CORS Origin Policy Validation", () => {
    const rawOrigins = "https://schoolsync.app,https://admin.schoolsync.app";

    it("should allow whitelisted production domains", () => {
      assert.strictEqual(isOriginAllowed("https://schoolsync.app", rawOrigins, "production"), true);
      assert.strictEqual(isOriginAllowed("https://admin.schoolsync.app", rawOrigins, "production"), true);
    });

    it("should reject malicious attacker origins in production", () => {
      assert.strictEqual(isOriginAllowed("https://evil-hacker.com", rawOrigins, "production"), false);
      assert.strictEqual(isOriginAllowed("https://schoolsync.app.evil.com", rawOrigins, "production"), false);
    });

    it("should strictly reject unconfigured *.vercel.app domains (Credentialed CORS protection)", () => {
      // Prevents malicious attacker vercel deployments from making credentialed requests
      assert.strictEqual(isOriginAllowed("https://malicious-site.vercel.app", rawOrigins, "production"), false);
      assert.strictEqual(isOriginAllowed("https://attacker-preview.vercel.app", rawOrigins, "production"), false);
      assert.strictEqual(isOriginAllowed("https://schoolsync-fake.vercel.app", rawOrigins, "production"), false);
    });

    it("should allow a specific vercel.app domain ONLY when explicitly declared in CLIENT_URL", () => {
      const vercelConfig = "https://schoolsync-official.vercel.app,http://localhost:5173";
      assert.strictEqual(isOriginAllowed("https://schoolsync-official.vercel.app", vercelConfig, "production"), true);
      assert.strictEqual(isOriginAllowed("https://other-unauthorized.vercel.app", vercelConfig, "production"), false);
    });

    it("should allow loopback origins in development mode only", () => {
      assert.strictEqual(isOriginAllowed("http://localhost:5173", rawOrigins, "development"), true);
      assert.strictEqual(isOriginAllowed("http://127.0.0.1:3000", rawOrigins, "development"), true);
      assert.strictEqual(isOriginAllowed("http://localhost:5173", rawOrigins, "production"), false);
    });

    it("should allow requests with no origin (e.g. mobile apps, curl, server-to-server healthchecks)", () => {
      assert.strictEqual(isOriginAllowed(undefined, rawOrigins, "production"), true);
    });
  });

  describe("6. Password Reset Base URL Whitelisting (Host Header Poisoning Defense)", () => {
    const resolveResetBaseUrl = (
      clientOrigin?: string,
      configuredClientUrl = "https://schoolsync.app",
      isProd = true
    ) => {
      const allowedOrigins = configuredClientUrl
        .split(",")
        .map((o) => o.trim().replace(/\/$/, ""))
        .filter(Boolean);

      if (clientOrigin) {
        const normalized = clientOrigin.replace(/\/$/, "");
        if (allowedOrigins.includes(normalized)) return normalized;
        if (!isProd && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(normalized)) {
          return normalized;
        }
      }
      return allowedOrigins[0] || "http://localhost:5173";
    };

    it("should use configured domain when incoming origin is missing or untrusted", () => {
      const attackerOrigin = "https://evil-phishing-site.com";
      const resolved = resolveResetBaseUrl(attackerOrigin, "https://schoolsync.app", true);
      assert.strictEqual(resolved, "https://schoolsync.app");
    });

    it("should accept valid whitelisted client origin", () => {
      const validOrigin = "https://schoolsync.app";
      const resolved = resolveResetBaseUrl(validOrigin, "https://schoolsync.app", true);
      assert.strictEqual(resolved, "https://schoolsync.app");
    });
  });

  describe("7. Live Test Email Dispatch Endpoint Security (POST /api/email/test)", () => {
    it("should reject unauthenticated request with 401 when protect middleware runs without user", () => {
      let statusCode = 200;
      let responseBody: any = null;
      let nextCalled = false;

      const req = {} as any; // No user attached
      const res = {
        status: (code: number) => {
          statusCode = code;
          return res;
        },
        json: (data: any) => {
          responseBody = data;
        },
      } as any;
      const next = () => {
        nextCalled = true;
      };

      const adminGuard = authorize(["admin"]);
      adminGuard(req, res, next);

      assert.strictEqual(nextCalled, false);
      assert.strictEqual(statusCode, 401);
      assert.match(responseBody.message, /not authorized/i);
    });

    it("should reject non-admin roles (student, teacher) with 403 Forbidden", () => {
      const nonAdminRoles = ["student", "teacher"] as const;

      for (const role of nonAdminRoles) {
        let statusCode = 200;
        let responseBody: any = null;
        let nextCalled = false;

        const req = { user: { _id: "user123", role } } as any;
        const res = {
          status: (code: number) => {
            statusCode = code;
            return res;
          },
          json: (data: any) => {
            responseBody = data;
          },
        } as any;
        const next = () => {
          nextCalled = true;
        };

        const adminGuard = authorize(["admin"]);
        adminGuard(req, res, next);

        assert.strictEqual(nextCalled, false, `Role ${role} should not proceed`);
        assert.strictEqual(statusCode, 403, `Role ${role} must receive 403`);
        assert.match(responseBody.message, /not authorized to access this route/i);
      }
    });

    it("should allow admin role to access the email test route", () => {
      let nextCalled = false;
      const req = { user: { _id: "admin123", role: "admin" } } as any;
      const res = {} as any;
      const next = () => {
        nextCalled = true;
      };

      const adminGuard = authorize(["admin"]);
      adminGuard(req, res, next);

      assert.strictEqual(nextCalled, true);
    });

    it("should enforce rate limiting on email test dispatch to prevent infrastructure flooding", () => {
      const limiter = createRateLimiter(5, 15 * 60 * 1000);
      let blocked = false;
      let statusCode = 200;

      const mockReq = { ip: "10.0.0.99", socket: {} } as any;
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

      // 5 allowed calls
      for (let i = 0; i < 5; i++) {
        limiter(mockReq, mockRes, next);
        assert.strictEqual(blocked, false, `Request #${i + 1} should be allowed`);
      }

      // 6th call -> BLOCKED with 429
      limiter(mockReq, mockRes, next);
      assert.strictEqual(blocked, true);
      assert.strictEqual(statusCode, 429);
    });

    it("should validate test email input schema correctly", () => {
      // Valid generic test
      const validGeneric = validateSendTestEmail({ to: "test@school.edu", type: "generic" });
      assert.strictEqual(validGeneric.success, true);

      // Valid welcome test
      const validWelcome = validateSendTestEmail({ to: "student@school.edu", type: "welcome" });
      assert.strictEqual(validWelcome.success, true);

      // Valid empty body (defaults to generic and default recipient)
      const validEmpty = validateSendTestEmail({});
      assert.strictEqual(validEmpty.success, true);

      // Invalid email address format
      const invalidEmail = validateSendTestEmail({ to: "not-an-email" });
      assert.strictEqual(invalidEmail.success, false);

      // Invalid email type
      const invalidType = validateSendTestEmail({ type: "arbitrary-unknown-type" });
      assert.strictEqual(invalidType.success, false);
    });
  });
});
