import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { generateDeterministicSchedule } from "../services/timetableService.ts";

describe("SchoolSync Timetable & Schedule Engine Test Suite", () => {
  interface PeriodSlot {
    day: "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday";
    periodNumber: number;
    startTime: string;
    endTime: string;
    subjectId: string;
    teacherId: string;
    classroom: string;
  }

  describe("1. Faculty Schedule Conflict Detection (Zero Double-Booking)", () => {
    function detectTeacherConflict(existingSlots: PeriodSlot[], newSlot: PeriodSlot): boolean {
      return existingSlots.some(
        (slot) =>
          slot.day === newSlot.day &&
          slot.periodNumber === newSlot.periodNumber &&
          slot.teacherId === newSlot.teacherId
      );
    }

    it("should detect and reject when a teacher is already booked in another class during the same period", () => {
      const activeSchedule: PeriodSlot[] = [
        {
          day: "Monday",
          periodNumber: 1,
          startTime: "08:30",
          endTime: "09:15",
          subjectId: "math_101",
          teacherId: "teacher_sarah",
          classroom: "Room 101",
        },
      ];

      const overlappingSlot: PeriodSlot = {
        day: "Monday",
        periodNumber: 1,
        startTime: "08:30",
        endTime: "09:15",
        subjectId: "math_102",
        teacherId: "teacher_sarah", // Conflict!
        classroom: "Room 102",
      };

      const hasConflict = detectTeacherConflict(activeSchedule, overlappingSlot);
      assert.strictEqual(hasConflict, true);
    });

    it("should permit slot when teacher is available during that period", () => {
      const activeSchedule: PeriodSlot[] = [
        {
          day: "Monday",
          periodNumber: 1,
          startTime: "08:30",
          endTime: "09:15",
          subjectId: "math_101",
          teacherId: "teacher_sarah",
          classroom: "Room 101",
        },
      ];

      const validSlot: PeriodSlot = {
        day: "Monday",
        periodNumber: 2,
        startTime: "09:20",
        endTime: "10:05",
        subjectId: "math_102",
        teacherId: "teacher_sarah",
        classroom: "Room 102",
      };

      const hasConflict = detectTeacherConflict(activeSchedule, validSlot);
      assert.strictEqual(hasConflict, false);
    });
  });

  describe("2. Classroom Collision Prevention", () => {
    function detectRoomCollision(existingSlots: PeriodSlot[], newSlot: PeriodSlot): boolean {
      return existingSlots.some(
        (slot) =>
          slot.day === newSlot.day &&
          slot.periodNumber === newSlot.periodNumber &&
          slot.classroom.toLowerCase().trim() === newSlot.classroom.toLowerCase().trim()
      );
    }

    it("should prevent multiple classes from sharing the same physical room simultaneously", () => {
      const activeSchedule: PeriodSlot[] = [
        {
          day: "Wednesday",
          periodNumber: 3,
          startTime: "10:15",
          endTime: "11:00",
          subjectId: "phy_101",
          teacherId: "teacher_mike",
          classroom: "Physics Lab A",
        },
      ];

      const roomClashSlot: PeriodSlot = {
        day: "Wednesday",
        periodNumber: 3,
        startTime: "10:15",
        endTime: "11:00",
        subjectId: "chem_101",
        teacherId: "teacher_anna",
        classroom: "Physics Lab A", // Collision!
      };

      assert.strictEqual(detectRoomCollision(activeSchedule, roomClashSlot), true);
    });
  });

  describe("3. Lunch Break Slot Generation", () => {
    function generateDailySlotsWithLunch(
      totalPeriods: number,
      lunchAfterPeriod: number,
      periodDurationMins: number,
      startHour: number,
      startMinute: number
    ) {
      const slots: { period: number; label: string; start: string; end: string }[] = [];
      let currentMinutes = startHour * 60 + startMinute;

      const formatTime = (mins: number) => {
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
      };

      let periodCount = 1;
      for (let i = 1; i <= totalPeriods; i++) {
        const start = formatTime(currentMinutes);
        currentMinutes += periodDurationMins;
        const end = formatTime(currentMinutes);

        slots.push({ period: periodCount++, label: `Period ${i}`, start, end });

        // Insert 45-min Lunch Break
        if (i === lunchAfterPeriod) {
          const lunchStart = formatTime(currentMinutes);
          currentMinutes += 45;
          const lunchEnd = formatTime(currentMinutes);
          slots.push({ period: 0, label: "Lunch Break", start: lunchStart, end: lunchEnd });
        }
      }

      return slots;
    }

    it("should insert lunch break seamlessly into the daily bell schedule", () => {
      const schedule = generateDailySlotsWithLunch(6, 3, 45, 8, 30);
      assert.strictEqual(schedule.length, 7); // 6 periods + 1 lunch
      const lunchSlot = schedule.find((s) => s.label === "Lunch Break");
      assert.ok(lunchSlot);
      assert.strictEqual(lunchSlot?.start, "10:45");
      assert.strictEqual(lunchSlot?.end, "11:30");
    });
  });

  describe("4. Deterministic Schedule Matrix Generation Engine", () => {
    const mockContext = {
      subjects: [
        { id: "SUB_MATH", name: "Mathematics", code: "MATH101" },
        { id: "SUB_PHYS", name: "Physics", code: "PHYS101" },
        { id: "SUB_CHEM", name: "Chemistry", code: "CHEM101" },
        { id: "SUB_ENGL", name: "English", code: "ENG101" },
      ],
      teachers: [
        { id: "T_ALICE", name: "Alice", subjects: ["SUB_MATH"] },
        { id: "T_BOB", name: "Bob", subjects: ["SUB_PHYS"] },
        { id: "T_CHARLIE", name: "Charlie", subjects: ["SUB_CHEM"] },
        { id: "T_DIANA", name: "Diana", subjects: ["SUB_ENGL"] },
      ],
    };

    it("should generate balanced 5-day weekly grid from Monday to Friday", () => {
      const schedule = generateDeterministicSchedule(mockContext, {
        startTime: "08:00",
        endTime: "14:00",
        periods: 6,
      });

      assert.strictEqual(schedule.length, 5);
      const days = schedule.map((d: any) => d.day);
      assert.deepStrictEqual(days, ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]);
    });

    it("should assign qualified teacher for every scheduled subject slot", () => {
      const schedule = generateDeterministicSchedule(mockContext, {
        startTime: "08:30",
        endTime: "14:30",
        periods: 6,
      });

      for (const day of schedule) {
        for (const period of day.periods) {
          if (period.subject === "SUB_MATH") assert.strictEqual(period.teacher, "T_ALICE");
          if (period.subject === "SUB_PHYS") assert.strictEqual(period.teacher, "T_BOB");
          if (period.subject === "SUB_CHEM") assert.strictEqual(period.teacher, "T_CHARLIE");
          if (period.subject === "SUB_ENGL") assert.strictEqual(period.teacher, "T_DIANA");
        }
      }
    });

    it("should accurately compute period intervals based on total hours and period counts", () => {
      const schedule = generateDeterministicSchedule(mockContext, {
        startTime: "09:00",
        endTime: "13:00",
        periods: 4,
      });

      assert.strictEqual(schedule[0].periods.length, 4);
      assert.strictEqual(schedule[0].periods[0].startTime, "09:00");
      assert.strictEqual(schedule[0].periods[0].endTime, "10:00"); // 4 hours / 4 periods = 60 mins
      assert.strictEqual(schedule[0].periods[1].startTime, "10:00");
      assert.strictEqual(schedule[0].periods[1].endTime, "11:00");
    });

    it("should handle single subject and single teacher gracefully", () => {
      const singleContext = {
        subjects: [{ id: "SUB_MATH", name: "Mathematics", code: "MATH101" }],
        teachers: [{ id: "T_ALICE", name: "Alice", subjects: ["SUB_MATH"] }],
      };

      const schedule = generateDeterministicSchedule(singleContext, {
        startTime: "08:00",
        endTime: "12:00",
        periods: 4,
      });

      assert.strictEqual(schedule.length, 5);
      for (const day of schedule) {
        assert.strictEqual(day.periods.length, 4);
        for (const p of day.periods) {
          assert.strictEqual(p.subject, "SUB_MATH");
          assert.strictEqual(p.teacher, "T_ALICE");
        }
      }
    });
  });
});
