import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  validateCreateClass,
  validateUpdateClass,
  validateCreateSubject,
  validateUpdateSubject,
  validateCreateAcademicYear,
  validateUpdateAcademicYear,
  validateRegister,
  validateUpdateUser,
} from "../validators/schemas.ts";

describe("SchoolSync Academic Domain & Entity Lifecycle Test Suite", () => {
  describe("1. Class Section Validation & Capacity Guardrails", () => {
    it("should accept valid class creation payload with custom capacity", () => {
      const payload = {
        name: "Grade 11-B",
        academicYear: "65f1a2b3c4d5e6f7a8b9c0d1",
        capacity: 35,
        subjects: ["65f1a2b3c4d5e6f7a8b9c0d2"],
      };

      const result = validateCreateClass(payload);
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.data?.name, "Grade 11-B");
      assert.strictEqual(result.data?.capacity, 35);
    });

    it("should reject negative or zero class capacity", () => {
      const payload = {
        name: "Grade 11-B",
        academicYear: "65f1a2b3c4d5e6f7a8b9c0d1",
        capacity: 0,
      };

      const result = validateCreateClass(payload);
      assert.strictEqual(result.success, false);
      assert.ok(result.errors?.some((e) => e.includes("positive integer")));
    });

    it("should allow partial update of class name and teacher without modifying capacity", () => {
      const updatePayload = {
        name: "Grade 11-B (Honors)",
        classTeacher: "65f1a2b3c4d5e6f7a8b9c0d3",
      };

      const result = validateUpdateClass(updatePayload);
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.data?.name, "Grade 11-B (Honors)");
    });
  });

  describe("2. Subject Curriculum & Code Normalization", () => {
    it("should automatically normalize subject codes to uppercase", () => {
      const payload = {
        name: "Advanced Chemistry",
        code: "chem201",
        teacher: ["65f1a2b3c4d5e6f7a8b9c0d4"],
      };

      const result = validateCreateSubject(payload);
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.data?.code, "CHEM201");
    });

    it("should reject empty subject code or empty subject name", () => {
      const invalidPayload = {
        name: "   ",
        code: "",
      };

      const result = validateCreateSubject(invalidPayload);
      assert.strictEqual(result.success, false);
      assert.ok(result.errors && result.errors.length >= 2);
    });

    it("should allow updating subject status to deactivated", () => {
      const updatePayload = {
        isActive: false,
      };

      const result = validateUpdateSubject(updatePayload);
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.data?.isActive, false);
    });
  });

  describe("3. Academic Year Constraints & Date Validation", () => {
    it("should accept valid academic year with chronological start and end dates", () => {
      const payload = {
        name: "2026-2027",
        fromYear: "2026-08-01",
        toYear: "2027-06-30",
        isCurrent: true,
      };

      const result = validateCreateAcademicYear(payload);
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.data?.name, "2026-2027");
      assert.strictEqual(result.data?.isCurrent, true);
    });

    it("should reject inverted academic year date ranges (end before start)", () => {
      const payload = {
        name: "2026-2027",
        fromYear: "2027-08-01",
        toYear: "2026-06-30",
      };

      const result = validateCreateAcademicYear(payload);
      assert.strictEqual(result.success, false);
      assert.ok(result.errors?.some((e) => e.includes("precede the end date")));
    });

    it("should validate partial academic year updates maintaining date validity", () => {
      const updatePayload = {
        fromYear: "2026-09-01",
        toYear: "2027-07-15",
      };

      const result = validateUpdateAcademicYear(updatePayload);
      assert.strictEqual(result.success, true);
    });
  });

  describe("4. User Account Role Normalization & Subject Mapping", () => {
    it("should correctly assign studentClass for student registration", () => {
      const payload = {
        name: "Student Alpha",
        email: "alpha@school.edu",
        password: "StrongPassword123!",
        role: "student",
        studentClass: "65f1a2b3c4d5e6f7a8b9c0d1",
      };

      const result = validateRegister(payload);
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.data?.studentClass, "65f1a2b3c4d5e6f7a8b9c0d1");
    });

    it("should map teacherSubjects correctly in updateUserSchema", () => {
      const payload = {
        name: "Professor Xavier",
        teacherSubject: ["65f1a2b3c4d5e6f7a8b9c0d2", "65f1a2b3c4d5e6f7a8b9c0d3"],
      };

      const result = validateUpdateUser(payload);
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.data?.teacherSubject.length, 2);
    });
  });
});
