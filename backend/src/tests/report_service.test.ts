import { describe, it } from "node:test";
import assert from "node:assert/strict";

describe("SchoolSync Academic Reports & Performance Analytics Test Suite", () => {
  interface SubjectScore {
    subjectName: string;
    score: number;
    maxScore: number;
    credits: number;
  }

  describe("1. Cumulative GPA & Letter Grade Mapping", () => {
    function computeGPA(subjects: SubjectScore[]) {
      let totalQualityPoints = 0;
      let totalCredits = 0;

      subjects.forEach((sub) => {
        const percentage = (sub.score / sub.maxScore) * 100;
        let gradePoint = 0.0;

        if (percentage >= 90) gradePoint = 4.0;
        else if (percentage >= 80) gradePoint = 3.0;
        else if (percentage >= 70) gradePoint = 2.0;
        else if (percentage >= 60) gradePoint = 1.0;
        else gradePoint = 0.0;

        totalQualityPoints += gradePoint * sub.credits;
        totalCredits += sub.credits;
      });

      const gpa = totalCredits > 0 ? Number((totalQualityPoints / totalCredits).toFixed(2)) : 0.0;
      return { gpa, totalCredits };
    }

    it("should calculate correct weighted GPA across subjects with varying credit hours", () => {
      const studentSubjects: SubjectScore[] = [
        { subjectName: "Mathematics", score: 95, maxScore: 100, credits: 4 }, // 4.0 * 4 = 16
        { subjectName: "Physics", score: 85, maxScore: 100, credits: 3 },     // 3.0 * 3 = 9
        { subjectName: "English", score: 75, maxScore: 100, credits: 3 },     // 2.0 * 3 = 6
      ];

      // Total QP = 16 + 9 + 6 = 31, Total Credits = 10 -> GPA = 3.10
      const result = computeGPA(studentSubjects);
      assert.strictEqual(result.gpa, 3.1);
      assert.strictEqual(result.totalCredits, 10);
    });
  });

  describe("2. CSV Export Formatting", () => {
    function generateStudentReportCsv(
      students: { name: string; email: string; gpa: number; grade: string }[]
    ): string {
      const headers = ["Student Name", "Email Address", "Cumulative GPA", "Honor Grade"];
      const rows = students.map((s) => [
        `"${s.name.replace(/"/g, '""')}"`,
        `"${s.email}"`,
        s.gpa.toFixed(2),
        `"${s.grade}"`,
      ]);

      return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    }

    it("should generate valid escaped RFC-4180 CSV strings for download", () => {
      const data = [
        { name: "John Doe", email: "john@school.edu", gpa: 3.85, grade: "A" },
        { name: 'Alice "AJ" Smith', email: "alice@school.edu", gpa: 4.0, grade: "A+" },
      ];

      const csv = generateStudentReportCsv(data);
      assert.ok(csv.startsWith("Student Name,Email Address,Cumulative GPA,Honor Grade"));
      assert.ok(csv.includes('"Alice ""AJ"" Smith"'));
      assert.ok(csv.includes('"john@school.edu"'));
    });
  });
});
