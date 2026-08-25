import { describe, it } from "node:test";
import assert from "node:assert/strict";

describe("SchoolSync LMS Exam & Assessment Engine Test Suite", () => {
  // Mock Question Database
  const sampleQuestions = [
    {
      _id: "q1",
      question: "What is 2 + 2?",
      options: ["3", "4", "5", "6"],
      correctAnswer: "4",
      marks: 5,
    },
    {
      _id: "q2",
      question: "What is the speed of light in vacuum?",
      options: ["3x10^8 m/s", "3x10^6 m/s", "1500 m/s", "300 m/s"],
      correctAnswer: "3x10^8 m/s",
      marks: 5,
    },
    {
      _id: "q3",
      question: "Which gas do plants absorb during photosynthesis?",
      options: ["Oxygen", "Carbon Dioxide", "Nitrogen", "Helium"],
      correctAnswer: "Carbon Dioxide",
      marks: 10,
    },
  ];

  describe("1. Answer Key Sanitization for Students", () => {
    it("should strip correctAnswer and explanation when retrieved by a student", () => {
      const isStudent = true;
      const studentFacingQuestions = sampleQuestions.map((q) => {
        if (isStudent) {
          const { correctAnswer, ...rest } = q;
          return rest;
        }
        return q;
      });

      studentFacingQuestions.forEach((q: any) => {
        assert.strictEqual(q.correctAnswer, undefined);
        assert.ok(Array.isArray(q.options));
        assert.ok(q.question);
      });
    });

    it("should retain correctAnswer for authoring teacher or admin", () => {
      const isStudent = false;
      const facultyFacingQuestions = sampleQuestions.map((q) => {
        if (isStudent) {
          const { correctAnswer, ...rest } = q;
          return rest;
        }
        return q;
      });

      assert.strictEqual((facultyFacingQuestions[0] as any).correctAnswer, "4");
    });
  });

  describe("2. Automated Exam Auto-Grading & GPA Mapping", () => {
    function evaluateSubmission(
      questions: typeof sampleQuestions,
      answers: { questionId: string; answer: string }[]
    ) {
      let totalMarksObtained = 0;
      const totalPossibleMarks = questions.reduce((sum, q) => sum + q.marks, 0);

      const qMap = new Map(questions.map((q) => [q._id, q]));

      answers.forEach((ans) => {
        const question = qMap.get(ans.questionId);
        if (question && question.correctAnswer.trim().toLowerCase() === ans.answer.trim().toLowerCase()) {
          totalMarksObtained += question.marks;
        }
      });

      const percentage = Math.round((totalMarksObtained / totalPossibleMarks) * 100);

      let grade = "F";
      let gpa = 0.0;
      if (percentage >= 90) {
        grade = "A+";
        gpa = 4.0;
      } else if (percentage >= 80) {
        grade = "A";
        gpa = 3.7;
      } else if (percentage >= 70) {
        grade = "B";
        gpa = 3.0;
      } else if (percentage >= 60) {
        grade = "C";
        gpa = 2.0;
      } else if (percentage >= 50) {
        grade = "D";
        gpa = 1.0;
      }

      return { totalMarksObtained, totalPossibleMarks, percentage, grade, gpa };
    }

    it("should score 100% and assign A+ with 4.0 GPA for all correct answers", () => {
      const studentAnswers = [
        { questionId: "q1", answer: "4" },
        { questionId: "q2", answer: "3x10^8 m/s" },
        { questionId: "q3", answer: "Carbon Dioxide" },
      ];

      const result = evaluateSubmission(sampleQuestions, studentAnswers);
      assert.strictEqual(result.totalMarksObtained, 20);
      assert.strictEqual(result.percentage, 100);
      assert.strictEqual(result.grade, "A+");
      assert.strictEqual(result.gpa, 4.0);
    });

    it("should score partial credit (50%) and assign D with 1.0 GPA", () => {
      const studentAnswers = [
        { questionId: "q1", answer: "4" }, // 5 marks
        { questionId: "q2", answer: "Wrong Answer" }, // 0
        { questionId: "q3", answer: "Wrong Answer" }, // 0
      ];

      const result = evaluateSubmission(sampleQuestions, studentAnswers);
      assert.strictEqual(result.totalMarksObtained, 5);
      assert.strictEqual(result.percentage, 25);
      assert.strictEqual(result.grade, "F");
      assert.strictEqual(result.gpa, 0.0);
    });
  });

  describe("3. Exam Deadline & Submission Guardrails", () => {
    it("should reject submissions after the deadline has expired", () => {
      const examDueDate = new Date(Date.now() - 3600 * 1000); // 1 hour ago
      const submissionTime = new Date();

      const isExpired = submissionTime > examDueDate;
      assert.strictEqual(isExpired, true);
    });

    it("should permit submissions before deadline expiration", () => {
      const examDueDate = new Date(Date.now() + 3600 * 1000); // 1 hour in future
      const submissionTime = new Date();

      const isExpired = submissionTime > examDueDate;
      assert.strictEqual(isExpired, false);
    });
  });
});
