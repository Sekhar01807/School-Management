import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  validateRegister,
  validateLogin,
  validateCreateClass,
  validateCreateAcademicYear,
  validateGenerateExam,
  validateSubmitExam,
} from "../validators/schemas.ts";

describe("SchoolSync Request Validation Schemas Test Suite", () => {
  describe("1. User Registration Validation", () => {
    it("should accept valid registration payload", () => {
      const payload = {
        name: "Jane Doe",
        email: "JANE.DOE@SCHOOL.EDU ",
        password: "securePassword123",
        role: "teacher",
      };

      const result = validateRegister(payload);
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.data?.email, "jane.doe@school.edu");
      assert.strictEqual(result.data?.name, "Jane Doe");
    });

    it("should reject invalid email format", () => {
      const payload = {
        name: "Jane Doe",
        email: "not-an-email",
        password: "securePassword123",
      };

      const result = validateRegister(payload);
      assert.strictEqual(result.success, false);
      assert.ok((result.errors?.length || 0) > 0);
    });

    it("should reject password shorter than 6 characters", () => {
      const payload = {
        name: "Jane Doe",
        email: "jane@school.edu",
        password: "123",
      };

      const result = validateRegister(payload);
      assert.strictEqual(result.success, false);
      assert.ok(result.errors?.some((e) => e.includes("6 characters")));
    });
  });

  describe("2. Login Validation", () => {
    it("should accept valid login payload", () => {
      const payload = { email: "admin@schoolsync.edu", password: "adminPassword" };
      const result = validateLogin(payload);
      assert.strictEqual(result.success, true);
    });

    it("should reject login with empty password", () => {
      const payload = { email: "admin@schoolsync.edu", password: "" };
      const result = validateLogin(payload);
      assert.strictEqual(result.success, false);
    });
  });

  describe("3. Academic Year Validation", () => {
    it("should reject academic year when start date is after end date", () => {
      const payload = {
        name: "2025-2026",
        fromYear: "2026-06-01",
        toYear: "2025-09-01", // before start date
      };

      const result = validateCreateAcademicYear(payload);
      assert.strictEqual(result.success, false);
      assert.ok(result.errors?.some((e) => e.includes("precede")));
    });

    it("should accept valid date range", () => {
      const payload = {
        name: "2025-2026",
        fromYear: "2025-09-01",
        toYear: "2026-06-30",
        isCurrent: true,
      };

      const result = validateCreateAcademicYear(payload);
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.data?.isCurrent, true);
    });
  });

  describe("4. Class Creation Validation", () => {
    it("should reject class with missing name or academic year", () => {
      const payload = { name: "", academicYear: "" };
      const result = validateCreateClass(payload);
      assert.strictEqual(result.success, false);
      assert.ok((result.errors?.length || 0) >= 2);
    });

    it("should accept valid class payload with default capacity", () => {
      const payload = {
        name: "Grade 10 - A",
        academicYear: "year_123",
      };

      const result = validateCreateClass(payload);
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.data?.capacity, 40);
    });
  });

  describe("5. Exam & Submission Validation", () => {
    it("should reject exam generation with count > 50", () => {
      const payload = {
        topic: "Calculus",
        subject: "sub_1",
        class: "class_1",
        count: 100, // exceeds max limit of 50
      };

      const result = validateGenerateExam(payload);
      assert.strictEqual(result.success, false);
      assert.ok(result.errors?.some((e) => e.includes("between 1 and 50")));
    });

    it("should reject empty submission answers array", () => {
      const payload = { answers: [] };
      const result = validateSubmitExam(payload);
      assert.strictEqual(result.success, false);
    });

    it("should accept valid exam submission answers", () => {
      const payload = {
        answers: [
          { questionId: "q_1", answer: "Option A" },
          { questionId: "q_2", answer: "Option C" },
        ],
      };

      const result = validateSubmitExam(payload);
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.data?.answers.length, 2);
    });
  });
});
