import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  registerSchema,
  loginSchema,
  updateProfileSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  updateUserSchema,
  createClassSchema,
  updateClassSchema,
  createSubjectSchema,
  updateSubjectSchema,
  createAcademicYearSchema,
  updateAcademicYearSchema,
  generateExamSchema,
  submitExamSchema,
  questionSchema,
  generateTimetableSchema,
  bulkAttendanceSchema,
  createAnnouncementSchema,
  validatePasswordSecurity,
} from "../validators/schemas.ts";

describe("SchoolSync Comprehensive Zod Validation Test Suite", () => {
  describe("1. Password Security Refinements & Standalone Validator", () => {
    it("should accept compliant passwords with uppercase, lowercase, numbers, and symbols", () => {
      const result = validatePasswordSecurity("ComplexPassword@2026!");
      assert.strictEqual(result.valid, true);
      assert.strictEqual(result.errors.length, 0);
    });

    it("should reject dictionary and common weak passwords", () => {
      const result = validatePasswordSecurity("password123");
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.some((e) => e.includes("easily guessable")));
    });

    it("should reject passwords containing the user email username", () => {
      const result = validatePasswordSecurity("JohnDoe12345!@", { email: "johndoe@school.edu" });
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.some((e) => e.includes("email prefix")));
    });

    it("should reject passwords exceeding 72 characters", () => {
      const longPassword = "A1!" + "a".repeat(75);
      const result = validatePasswordSecurity(longPassword);
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.some((e) => e.includes("72 characters")));
    });
  });

  describe("2. User Domain Schemas", () => {
    it("registerSchema: transforms teacherSubjects alias into teacherSubject array", () => {
      const input = {
        name: "Professor Smith",
        email: "SMITH@SCHOOL.EDU",
        password: "StrongPassword123!",
        role: "teacher",
        teacherSubjects: ["sub_1", "sub_2"],
      };
      const parsed = registerSchema.parse(input);
      assert.strictEqual(parsed.email, "smith@school.edu");
      assert.deepStrictEqual(parsed.teacherSubject, ["sub_1", "sub_2"]);
      assert.strictEqual(parsed.isActive, true);
    });

    it("loginSchema: strips and normalizes email to lowercase", () => {
      const input = { email: "  ADMIN@SCHOOLSYNC.COM  ", password: "Password123" };
      const parsed = loginSchema.parse(input);
      assert.strictEqual(parsed.email, "admin@schoolsync.com");
    });

    it("updateProfileSchema: accepts partial profile and emergencyContact", () => {
      const input = {
        name: "Alex Johnson",
        phoneNumber: "+1 555-0199",
        emergencyContact: {
          name: "Mary Johnson",
          phone: "+1 555-0198",
          relationship: "Mother",
        },
      };
      const parsed = updateProfileSchema.parse(input);
      assert.strictEqual(parsed.name, "Alex Johnson");
      assert.strictEqual(parsed.emergencyContact?.relationship, "Mother");
    });

    it("changePasswordSchema: rejects when newPassword is equal to currentPassword", () => {
      const input = {
        currentPassword: "SecurePassword123!",
        newPassword: "SecurePassword123!",
      };
      const result = changePasswordSchema.safeParse(input);
      assert.strictEqual(result.success, false);
    });

    it("forgotPasswordSchema & resetPasswordSchema: validates tokens and passwords", () => {
      const forgot = forgotPasswordSchema.safeParse({ email: "invalid-email" });
      assert.strictEqual(forgot.success, false);

      const reset = resetPasswordSchema.safeParse({
        token: "tok_12345678",
        newPassword: "NewValidPassword2026!",
      });
      assert.strictEqual(reset.success, true);
    });
  });

  describe("3. Academic Domain Schemas (Class, Subject, Academic Year)", () => {
    it("createClassSchema: defaults capacity to 40 and subjects to empty array", () => {
      const input = {
        name: "Grade 11-B",
        academicYear: "year_2026",
      };
      const parsed = createClassSchema.parse(input);
      assert.strictEqual(parsed.capacity, 40);
      assert.deepStrictEqual(parsed.subjects, []);
      assert.strictEqual(parsed.classTeacher, null);
    });

    it("createSubjectSchema: automatically uppercases subject code", () => {
      const input = {
        name: "Advanced Physics",
        code: "phy201",
      };
      const parsed = createSubjectSchema.parse(input);
      assert.strictEqual(parsed.code, "PHY201");
      assert.strictEqual(parsed.isActive, true);
    });

    it("createAcademicYearSchema: enforces start date before end date", () => {
      const valid = createAcademicYearSchema.safeParse({
        name: "2026-2027",
        fromYear: "2026-08-01",
        toYear: "2027-06-30",
        isCurrent: true,
      });
      assert.strictEqual(valid.success, true);

      const invalid = createAcademicYearSchema.safeParse({
        name: "2026-2027",
        fromYear: "2027-08-01",
        toYear: "2026-06-30",
      });
      assert.strictEqual(invalid.success, false);
    });
  });

  describe("4. LMS & Exam Schemas", () => {
    it("questionSchema: validates multiple choice structure", () => {
      const q = questionSchema.parse({
        question: "What is the powerhouse of the cell?",
        options: ["Nucleus", "Mitochondria", "Ribosome", "Chloroplast"],
        correctAnswer: "Mitochondria",
      });
      assert.strictEqual(q.options.length, 4);
      assert.strictEqual(q.correctAnswer, "Mitochondria");
    });

    it("generateExamSchema: defaults difficulty to Medium and count to 10", () => {
      const input = {
        subject: "sub_math101",
        class: "class_10a",
        topic: "Linear Algebra",
      };
      const parsed = generateExamSchema.parse(input);
      assert.strictEqual(parsed.difficulty, "Medium");
      assert.strictEqual(parsed.count, 10);
      assert.strictEqual(parsed.duration, 60);
    });

    it("submitExamSchema: enforces answers array is non-empty", () => {
      const empty = submitExamSchema.safeParse({ answers: [] });
      assert.strictEqual(empty.success, false);

      const valid = submitExamSchema.safeParse({
        answers: [{ questionId: "q_1", answer: "Option B" }],
      });
      assert.strictEqual(valid.success, true);
    });
  });

  describe("5. Timetable, Attendance & Announcements Schemas", () => {
    it("generateTimetableSchema: populates default bell schedule", () => {
      const parsed = generateTimetableSchema.parse({
        classId: "cls_1",
        academicYearId: "yr_1",
      });
      assert.strictEqual(parsed.settings.startTime, "08:00");
      assert.strictEqual(parsed.settings.endTime, "15:00");
      assert.strictEqual(parsed.settings.periods, 6);
    });

    it("bulkAttendanceSchema: validates student record status enum", () => {
      const valid = bulkAttendanceSchema.safeParse({
        classId: "cls_10",
        date: "2026-08-24",
        records: [
          { student: "std_1", status: "present" },
          { student: "std_2", status: "late", remarks: "Traffic delay" },
          { student: "std_3", status: "absent" },
          { student: "std_4", status: "excused", remarks: "Doctor appointment" },
        ],
      });
      assert.strictEqual(valid.success, true);

      const invalid = bulkAttendanceSchema.safeParse({
        classId: "cls_10",
        date: "2026-08-24",
        records: [{ student: "std_1", status: "invalid_status" }],
      });
      assert.strictEqual(invalid.success, false);
    });

    it("createAnnouncementSchema: defaults audience to 'all' and priority to 'medium'", () => {
      const parsed = createAnnouncementSchema.parse({
        title: "Annual Science Fair 2026",
        content: "Submissions for the science fair are now open until next Friday.",
      });
      assert.strictEqual(parsed.targetAudience, "all");
      assert.strictEqual(parsed.priority, "medium");
    });
  });
});
