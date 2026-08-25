import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  validateCreateSubject,
  validateUpdateSubject,
  validateCreateClass,
  validateUpdateClass,
  validateCreateAcademicYear,
  validateUpdateAcademicYear,
} from "../validators/schemas.ts";

describe("SchoolSync Academic Structure & Entity Validation Suite", () => {
  describe("1. Subject Creation & Code Invariants", () => {
    it("should accept valid subject with uppercase code and optional teachers", () => {
      const payload = {
        name: "Introduction to Computer Science",
        code: "cs101",
        teacher: ["65f1a2b3c4d5e6f7a8b9c0d1"],
        isActive: true,
      };

      const result = validateCreateSubject(payload);
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.data?.code, "CS101");
      assert.strictEqual(result.data?.name, "Introduction to Computer Science");
      assert.strictEqual(result.data?.isActive, true);
    });

    it("should reject subject creation when name is empty or missing", () => {
      const payload = {
        name: "   ",
        code: "BIO101",
      };

      const result = validateCreateSubject(payload);
      assert.strictEqual(result.success, false);
      assert.ok(result.errors?.some((e) => e.includes("Subject name")));
    });

    it("should reject invalid teacher ObjectId strings in subject creation", () => {
      const payload = {
        name: "World History",
        code: "HIST101",
        teacher: ["invalid-mongo-id"],
      };

      const result = validateCreateSubject(payload);
      assert.strictEqual(result.success, false);
      assert.ok(result.errors?.some((e) => e.includes("Invalid Teacher ID")));
    });

    it("should allow partial subject updates without altering code", () => {
      const updatePayload = {
        name: "Modern World History & Politics",
        isActive: false,
      };

      const result = validateUpdateSubject(updatePayload);
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.data?.name, "Modern World History & Politics");
      assert.strictEqual(result.data?.isActive, false);
    });
  });

  describe("2. Class Section & Capacity Guardrails", () => {
    it("should enforce positive integer for class section capacity", () => {
      const validPayload = {
        name: "Grade 9-Alpha",
        academicYear: "65f1a2b3c4d5e6f7a8b9c0d2",
        capacity: 40,
        subjects: ["65f1a2b3c4d5e6f7a8b9c0d3"],
      };

      const validResult = validateCreateClass(validPayload);
      assert.strictEqual(validResult.success, true);
      assert.strictEqual(validResult.data?.capacity, 40);

      const invalidPayload = {
        ...validPayload,
        capacity: -5,
      };

      const invalidResult = validateCreateClass(invalidPayload);
      assert.strictEqual(invalidResult.success, false);
    });

    it("should reject invalid MongoDB ObjectId for academicYear on class creation", () => {
      const payload = {
        name: "Grade 10-B",
        academicYear: "not-a-valid-object-id",
        capacity: 30,
      };

      const result = validateCreateClass(payload);
      assert.strictEqual(result.success, false);
      assert.ok(result.errors?.some((e) => e.includes("academicYear")));
    });
  });

  describe("3. Academic Year Date Range Constraints", () => {
    it("should accept valid academic year with ISO date strings", () => {
      const payload = {
        name: "2026-2027 Academic Year",
        startDate: "2026-08-01T00:00:00.000Z",
        endDate: "2027-05-31T23:59:59.999Z",
        isCurrent: true,
      };

      const result = validateCreateAcademicYear(payload);
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.data?.name, "2026-2027 Academic Year");
      assert.strictEqual(result.data?.isCurrent, true);
    });

    it("should allow updating academic year status to inactive", () => {
      const updatePayload = {
        isCurrent: false,
      };

      const result = validateUpdateAcademicYear(updatePayload);
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.data?.isCurrent, false);
    });
  });
});
