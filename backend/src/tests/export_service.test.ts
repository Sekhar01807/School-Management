import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { escapeCsv } from "../services/exportService.ts";

describe("SchoolSync Data Export & CSV Generation Test Suite", () => {
  describe("1. RFC-4180 CSV Field Escaping Rules", () => {
    it("should return empty quotes for null or undefined fields", () => {
      assert.strictEqual(escapeCsv(null), '""');
      assert.strictEqual(escapeCsv(undefined), '""');
    });

    it("should return primitive values unchanged when containing no special characters", () => {
      assert.strictEqual(escapeCsv("Grade 10A"), '"Grade 10A"');
      assert.strictEqual(escapeCsv(100), '"100"');
      assert.strictEqual(escapeCsv(true), '"true"');
    });

    it("should escape commas by enclosing the string in quotes", () => {
      const field = "Smith, John";
      const escaped = escapeCsv(field);
      assert.strictEqual(escaped, '"Smith, John"');
    });

    it("should escape double quotes by doubling them inside quotes", () => {
      const field = 'Professor "Albus" Dumbledore';
      const escaped = escapeCsv(field);
      assert.strictEqual(escaped, '""Professor ""Albus"" Dumbledore""');
    });

    it("should safely handle fields containing newline and carriage return characters", () => {
      const fieldWithNewline = "Line 1\nLine 2\r\nLine 3";
      const escaped = escapeCsv(fieldWithNewline);
      assert.ok(escaped.startsWith('"'));
      assert.ok(escaped.endsWith('"'));
      assert.ok(escaped.includes("\n"));
    });
  });

  describe("2. CSV Header & Table Row Matrix Formatting", () => {
    it("should format a standard attendance register row array with UTF-8 BOM", () => {
      const headers = ["Student Name", "Email Address", "Day 1", "Day 2", "Total Present", "Attendance Rate (%)"];
      const row = ["Jane Doe", "jane@example.com", "P", "A", "1", "50.0%"];

      const csvContent =
        "\uFEFF" +
        [headers.map(escapeCsv).join(","), row.map(escapeCsv).join(",")].join("\r\n");

      assert.ok(csvContent.startsWith("\uFEFF"));
      assert.ok(csvContent.includes('"Jane Doe","jane@example.com"'));
      assert.ok(csvContent.includes('"50.0%"'));
    });

    it("should handle edge case students with special punctuation in names and emails", () => {
      const specialName = "O'Connor, Jr., Michael \"Mike\"";
      const email = "mike.o'connor+school@test.edu";
      const row = [escapeCsv(specialName), escapeCsv(email)].join(",");

      assert.ok(row.includes('""Mike""'));
      assert.ok(row.includes("O'Connor, Jr."));
    });
  });
});
