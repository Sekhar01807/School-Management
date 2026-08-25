import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { safeExtractJSON } from "../inngest/functions.ts";

describe("SchoolSync Inngest Exam Resilience & LLM Question Sanitizer Suite", () => {
  describe("1. MCQ Array Extraction & Markdown Sanitization", () => {
    it("should extract a clean JSON array of exam questions with markdown fences", () => {
      const rawLLM = `
\`\`\`json
[
  {
    "questionText": "What is the capital of France?",
    "type": "MCQ",
    "options": ["Paris", "London", "Berlin", "Madrid"],
    "correctAnswer": "Paris",
    "points": 1
  }
]
\`\`\`
`;
      const parsed = safeExtractJSON(rawLLM);
      assert.ok(Array.isArray(parsed));
      assert.strictEqual(parsed.length, 1);
      assert.strictEqual(parsed[0].questionText, "What is the capital of France?");
      assert.strictEqual(parsed[0].correctAnswer, "Paris");
    });

    it("should parse multiple choice questions with preamble and trailing text", () => {
      const rawLLM = `Here are 2 questions for your biology test:\n\n[\n  {\n    "questionText": "What is the powerhouse of the cell?",\n    "type": "MCQ",\n    "options": ["Mitochondria", "Ribosome", "Nucleus", "Golgi"],\n    "correctAnswer": "Mitochondria",\n    "points": 2\n  },\n  {\n    "questionText": "What is chlorophyll?",\n    "type": "MCQ",\n    "options": ["A green pigment", "A protein", "A carbohydrate", "A lipid"],\n    "correctAnswer": "A green pigment",\n    "points": 2\n  }\n]\n\nHope these work!`;
      const parsed = safeExtractJSON(rawLLM);
      assert.ok(Array.isArray(parsed));
      assert.strictEqual(parsed.length, 2);
      assert.strictEqual(parsed[0].options[0], "Mitochondria");
      assert.strictEqual(parsed[1].points, 2);
    });
  });

  describe("2. Question Schema Validation & Fallback Answer Alignment", () => {
    function sanitizeQuestions(rawQuestions: any[]) {
      return rawQuestions
        .filter((q: any) => {
          return (
            typeof q.questionText === "string" &&
            q.questionText.trim().length > 0 &&
            Array.isArray(q.options) &&
            q.options.length >= 2 &&
            typeof q.correctAnswer === "string" &&
            q.correctAnswer.trim().length > 0
          );
        })
        .map((q: any) => {
          const trimmedOptions = q.options.map((opt: any) => String(opt).trim());
          let validCorrect = String(q.correctAnswer).trim();

          // Fallback to first option if LLM generated a correctAnswer not in options list
          if (!trimmedOptions.includes(validCorrect)) {
            validCorrect = trimmedOptions[0];
          }

          return {
            questionText: String(q.questionText).trim(),
            type: "MCQ" as const,
            options: trimmedOptions,
            correctAnswer: validCorrect,
            points: typeof q.points === "number" && q.points > 0 ? q.points : 1,
          };
        });
    }

    it("should automatically fall back to option 0 if the LLM hallucinated an answer not in options", () => {
      const raw = [
        {
          questionText: "What is 2 + 2?",
          options: ["4", "5", "6", "7"],
          correctAnswer: "Four", // Not strictly matching any element in options
          points: 1,
        },
      ];

      const sanitized = sanitizeQuestions(raw);
      assert.strictEqual(sanitized.length, 1);
      assert.strictEqual(sanitized[0].correctAnswer, "4");
    });

    it("should drop invalid question objects missing options or questionText", () => {
      const raw = [
        { questionText: "Valid question?", options: ["Yes", "No"], correctAnswer: "Yes", points: 1 },
        { questionText: "", options: ["A", "B"], correctAnswer: "A" }, // Blank text
        { questionText: "Incomplete?", options: ["Only One"], correctAnswer: "Only One" }, // Only 1 option
        { questionText: "No answer?", options: ["A", "B"], correctAnswer: "" }, // Empty answer
      ];

      const sanitized = sanitizeQuestions(raw);
      assert.strictEqual(sanitized.length, 1);
      assert.strictEqual(sanitized[0].questionText, "Valid question?");
    });
  });

  describe("3. Exam Submission Auto-Scoring Engine", () => {
    function scoreSubmission(
      questions: Array<{ _id: string; points?: number; correctAnswer: string }>,
      studentAnswers: Array<{ questionId: string; answer: string }>
    ) {
      let score = 0;
      let totalPoints = 0;

      questions.forEach((question) => {
        const points = question.points || 1;
        totalPoints += points;

        const studentAns = Array.isArray(studentAnswers)
          ? studentAnswers.find((a) => String(a.questionId) === question._id)
          : undefined;

        if (studentAns && studentAns.answer === question.correctAnswer) {
          score += points;
        }
      });

      return { score, totalPoints, percentage: totalPoints > 0 ? (score / totalPoints) * 100 : 0 };
    }

    it("should correctly grade 100% when all answers match", () => {
      const questions = [
        { _id: "q1", points: 2, correctAnswer: "A" },
        { _id: "q2", points: 3, correctAnswer: "C" },
      ];
      const answers = [
        { questionId: "q1", answer: "A" },
        { questionId: "q2", answer: "C" },
      ];

      const result = scoreSubmission(questions, answers);
      assert.strictEqual(result.score, 5);
      assert.strictEqual(result.totalPoints, 5);
      assert.strictEqual(result.percentage, 100);
    });

    it("should handle partial scoring with unanswered or incorrect questions", () => {
      const questions = [
        { _id: "q1", points: 10, correctAnswer: "B" },
        { _id: "q2", points: 10, correctAnswer: "D" },
      ];
      const answers = [
        { questionId: "q1", answer: "B" },
        { questionId: "q2", answer: "WRONG" },
      ];

      const result = scoreSubmission(questions, answers);
      assert.strictEqual(result.score, 10);
      assert.strictEqual(result.totalPoints, 20);
      assert.strictEqual(result.percentage, 50);
    });

    it("should award zero points gracefully when answers list is empty or null", () => {
      const questions = [{ _id: "q1", points: 5, correctAnswer: "A" }];
      const result = scoreSubmission(questions, null as any);
      assert.strictEqual(result.score, 0);
      assert.strictEqual(result.totalPoints, 5);
      assert.strictEqual(result.percentage, 0);
    });
  });
});
