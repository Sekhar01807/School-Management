import { describe, it } from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";

describe("SchoolSync Business Logic & Calculation Test Suite", () => {
  describe("1. Automated Exam Scoring Engine", () => {
    const sampleQuestions = [
      { id: "q1", questionText: "What is 2+2?", correctAnswer: "4" },
      { id: "q2", questionText: "Capital of France?", correctAnswer: "Paris" },
      { id: "q3", questionText: "Speed of light in vacuum?", correctAnswer: "300,000 km/s" },
      { id: "q4", questionText: "Is water H2O?", correctAnswer: "Yes" },
    ];

    it("should accurately score 100% when all answers match", () => {
      const studentAnswers = [
        { questionId: "q1", answer: "4" },
        { questionId: "q2", answer: "Paris" },
        { questionId: "q3", answer: "300,000 km/s" },
        { questionId: "q4", answer: "Yes" },
      ];

      let score = 0;
      for (const ans of studentAnswers) {
        const q = sampleQuestions.find((item) => item.id === ans.questionId);
        if (q && q.correctAnswer.trim().toLowerCase() === ans.answer.trim().toLowerCase()) {
          score++;
        }
      }

      const percentage = Math.round((score / sampleQuestions.length) * 100);
      assert.strictEqual(score, 4);
      assert.strictEqual(percentage, 100);
    });

    it("should accurately compute partial scores with mixed answers", () => {
      const studentAnswers = [
        { questionId: "q1", answer: "4" },        // Correct
        { questionId: "q2", answer: "London" },   // Incorrect
        { questionId: "q3", answer: "300,000 km/s" }, // Correct
        { questionId: "q4", answer: "No" },       // Incorrect
      ];

      let score = 0;
      for (const ans of studentAnswers) {
        const q = sampleQuestions.find((item) => item.id === ans.questionId);
        if (q && q.correctAnswer.trim().toLowerCase() === ans.answer.trim().toLowerCase()) {
          score++;
        }
      }

      const percentage = Math.round((score / sampleQuestions.length) * 100);
      assert.strictEqual(score, 2);
      assert.strictEqual(percentage, 50);
    });
  });

  describe("2. Attendance Aggregation Logic", () => {
    it("should calculate exact student attendance percentages", () => {
      const attendanceRecords = [
        { status: "present" },
        { status: "present" },
        { status: "late" },      // counted in attendance
        { status: "absent" },
        { status: "excused" },   // excused
      ];

      const totalDays = attendanceRecords.length;
      const attendedDays = attendanceRecords.filter(
        (r) => r.status === "present" || r.status === "late" || r.status === "excused"
      ).length;

      const rate = Math.round((attendedDays / totalDays) * 100);
      assert.strictEqual(totalDays, 5);
      assert.strictEqual(attendedDays, 4);
      assert.strictEqual(rate, 80);
    });
  });

  describe("3. Academic Grade Boundary Conversion", () => {
    function getLetterGrade(percentage: number): string {
      if (percentage >= 90) return "A+";
      if (percentage >= 80) return "A";
      if (percentage >= 70) return "B";
      if (percentage >= 60) return "C";
      if (percentage >= 50) return "D";
      return "F";
    }

    it("should map scores to correct letter grades", () => {
      assert.strictEqual(getLetterGrade(95), "A+");
      assert.strictEqual(getLetterGrade(85), "A");
      assert.strictEqual(getLetterGrade(72), "B");
      assert.strictEqual(getLetterGrade(64), "C");
      assert.strictEqual(getLetterGrade(52), "D");
      assert.strictEqual(getLetterGrade(40), "F");
    });
  });

  describe("4. Bcrypt Password Security Hash Check", () => {
    it("should securely hash and verify password", async () => {
      const rawPassword = "password123";
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(rawPassword, salt);

      const isMatch = await bcrypt.compare(rawPassword, hash);
      const isMismatch = await bcrypt.compare("wrong_password", hash);

      assert.strictEqual(isMatch, true);
      assert.strictEqual(isMismatch, false);
    });
  });
});
