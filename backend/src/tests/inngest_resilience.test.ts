import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  safeExtractJSON,
  generateDeterministicSchedule,
} from "../inngest/functions.ts";

describe("SchoolSync Inngest Resilience & LLM Defensive Parsing Test Suite", () => {
  describe("1. Defensive JSON Extraction & Markdown Stripping", () => {
    it("should safely parse raw valid JSON without markdown fences", () => {
      const input = '{"schedule":[{"day":"Monday","periods":[]}]}';
      const result = safeExtractJSON(input);
      assert.ok(result);
      assert.strictEqual(result.schedule[0].day, "Monday");
    });

    it("should strip markdown code blocks with ```json fences", () => {
      const input = "```json\n{\n  \"schedule\": [\n    {\"day\": \"Tuesday\", \"periods\": []}\n  ]\n}\n```";
      const result = safeExtractJSON(input);
      assert.ok(result);
      assert.strictEqual(result.schedule[0].day, "Tuesday");
    });

    it("should extract JSON embedded within conversational LLM text preamble", () => {
      const input = "Sure, here is your generated weekly timetable for Grade 10-A:\n\n```json\n{\"schedule\":[{\"day\":\"Wednesday\",\"periods\":[]}]}\n```\nHope this helps your school!";
      const result = safeExtractJSON(input);
      assert.ok(result);
      assert.strictEqual(result.schedule[0].day, "Wednesday");
    });

    it("should return null gracefully on malformed truncated strings without throwing unhandled exceptions", () => {
      const malformedInput = "{ schedule: [ { day: 'Monday', periods: [ { incomplete... ";
      const result = safeExtractJSON(malformedInput);
      assert.strictEqual(result, null);
    });

    it("should return null for null, undefined, or non-string inputs", () => {
      assert.strictEqual(safeExtractJSON(null as any), null);
      assert.strictEqual(safeExtractJSON(undefined as any), null);
      assert.strictEqual(safeExtractJSON(12345 as any), null);
    });
  });

  describe("2. Deterministic Timetable Fallback Scheduling Engine", () => {
    const mockContext = {
      subjects: [
        { id: "SUB_MATH", name: "Mathematics", code: "MATH101" },
        { id: "SUB_PHYS", name: "Physics", code: "PHYS101" },
        { id: "SUB_ENGL", name: "English", code: "ENG101" },
      ],
      teachers: [
        { id: "T_ALICE", name: "Alice", subjects: ["SUB_MATH"] },
        { id: "T_BOB", name: "Bob", subjects: ["SUB_PHYS"] },
        { id: "T_CHARLIE", name: "Charlie", subjects: ["SUB_ENGL"] },
      ],
    };

    const mockSettings = {
      startTime: "08:00",
      endTime: "14:00",
      periods: 6,
    };

    it("should generate a complete 5-day school week timetable (Monday to Friday)", () => {
      const schedule = generateDeterministicSchedule(mockContext, mockSettings);
      assert.strictEqual(schedule.length, 5);
      assert.deepStrictEqual(
        schedule.map((d) => d.day),
        ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
      );
    });

    it("should populate exactly the requested number of periods per day with valid timing", () => {
      const schedule = generateDeterministicSchedule(mockContext, mockSettings);
      for (const daySchedule of schedule) {
        assert.strictEqual(daySchedule.periods.length, 6);
        assert.strictEqual(daySchedule.periods[0].startTime, "08:00");
        assert.ok(daySchedule.periods[0].endTime > daySchedule.periods[0].startTime);
      }
    });

    it("should assign qualified teachers matching their subject qualifications", () => {
      const schedule = generateDeterministicSchedule(mockContext, mockSettings);
      for (const daySchedule of schedule) {
        for (const period of daySchedule.periods) {
          assert.ok(period.subject);
          assert.ok(period.teacher);
          if (period.subject === "SUB_MATH") {
            assert.strictEqual(period.teacher, "T_ALICE");
          } else if (period.subject === "SUB_PHYS") {
            assert.strictEqual(period.teacher, "T_BOB");
          } else if (period.subject === "SUB_ENGL") {
            assert.strictEqual(period.teacher, "T_CHARLIE");
          }
        }
      }
    });

    it("should handle edge case when period count is custom (e.g., 4 periods)", () => {
      const customSettings = {
        startTime: "09:00",
        endTime: "13:00",
        periods: 4,
      };
      const schedule = generateDeterministicSchedule(mockContext, customSettings);
      assert.strictEqual(schedule.length, 5);
      assert.strictEqual(schedule[0].periods.length, 4);
      assert.strictEqual(schedule[0].periods[0].startTime, "09:00");
    });
  });
});
