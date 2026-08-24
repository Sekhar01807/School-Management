import { describe, it } from "node:test";
import assert from "node:assert/strict";

describe("SchoolSync Attendance Subsystem Test Suite", () => {
  describe("1. Student Attendance Percentage Calculation", () => {
    function computeStudentAttendanceRate(records: { status: "present" | "absent" | "late" | "excused" }[]) {
      if (records.length === 0) return 0;

      // Present = 1.0, Late = 0.8, Excused = 1.0 (neutral), Absent = 0.0
      let totalPoints = 0;
      records.forEach((r) => {
        if (r.status === "present" || r.status === "excused") {
          totalPoints += 1.0;
        } else if (r.status === "late") {
          totalPoints += 0.8;
        }
      });

      return Math.round((totalPoints / records.length) * 100);
    }

    it("should calculate 100% when all days are present or excused", () => {
      const records: { status: "present" | "absent" | "late" | "excused" }[] = [
        { status: "present" },
        { status: "present" },
        { status: "excused" },
        { status: "present" },
      ];
      const rate = computeStudentAttendanceRate(records);
      assert.strictEqual(rate, 100);
    });

    it("should flag threshold warning when attendance drops below 75%", () => {
      const records: { status: "present" | "absent" | "late" | "excused" }[] = [
        { status: "present" },
        { status: "absent" },
        { status: "absent" },
        { status: "present" },
      ];
      const rate = computeStudentAttendanceRate(records);
      assert.strictEqual(rate, 50);
      const requiresWarning = rate < 75;
      assert.strictEqual(requiresWarning, true);
    });
  });

  describe("2. Date Normalization for Daily Registers", () => {
    function normalizeAttendanceDate(input: string | Date): string {
      const d = new Date(input);
      const yyyy = d.getUTCFullYear();
      const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
      const dd = String(d.getUTCDate()).padStart(2, "0");
      return `${yyyy}-${mm}-${dd}`;
    }

    it("should normalize timestamps to UTC YYYY-MM-DD to prevent duplicate daily registers", () => {
      const morningTime = "2026-08-24T08:30:00.000Z";
      const eveningTime = "2026-08-24T17:45:00.000Z";

      assert.strictEqual(normalizeAttendanceDate(morningTime), "2026-08-24");
      assert.strictEqual(normalizeAttendanceDate(eveningTime), "2026-08-24");
    });
  });

  describe("3. Campus Daily Overview Aggregation", () => {
    function calculateCampusAttendance(
      classes: { present: number; absent: number; late: number; excused: number }[]
    ) {
      let totalStudents = 0;
      let totalAttended = 0;

      classes.forEach((c) => {
        const classTotal = c.present + c.absent + c.late + c.excused;
        totalStudents += classTotal;
        totalAttended += c.present + c.late + c.excused;
      });

      const overallPercentage = totalStudents > 0 ? Math.round((totalAttended / totalStudents) * 100) : 0;
      return { totalStudents, totalAttended, overallPercentage };
    }

    it("should aggregate overall campus attendance percentage across multiple grades", () => {
      const classesData = [
        { present: 28, absent: 2, late: 2, excused: 0 }, // 32 students, 30 attended
        { present: 25, absent: 5, late: 0, excused: 0 }, // 30 students, 25 attended
      ];
      const stats = calculateCampusAttendance(classesData);
      assert.strictEqual(stats.totalStudents, 62);
      assert.strictEqual(stats.totalAttended, 55);
      assert.strictEqual(stats.overallPercentage, 89);
    });
  });
});
