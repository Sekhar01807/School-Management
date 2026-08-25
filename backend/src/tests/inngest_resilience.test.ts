import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { safeExtractJSON } from "../inngest/functions.ts";
import { generateDeterministicSchedule } from "../services/timetableService.ts";

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

  describe("3. AI Exam Question JSON Sanitization & Normalization", () => {
    it("should sanitize and extract multiple choice questions from raw JSON array", () => {
      const rawAIResponse = JSON.stringify([
        {
          questionText: "What is the capital of France?",
          type: "MCQ",
          options: ["Berlin", "Madrid", "Paris", "Rome"],
          correctAnswer: "Paris",
          points: 2,
        },
        {
          questionText: "What is 2 + 2?",
          type: "MCQ",
          options: ["3", "4", "5", "6"],
          correctAnswer: "4",
          points: 1,
        },
      ]);

      const extracted = safeExtractJSON(rawAIResponse);
      assert.ok(Array.isArray(extracted));
      assert.strictEqual(extracted.length, 2);
      assert.strictEqual(extracted[0].questionText, "What is the capital of France?");
      assert.strictEqual(extracted[0].correctAnswer, "Paris");
      assert.strictEqual(extracted[0].points, 2);
    });

    it("should gracefully extract questions when wrapped in conversational commentary", () => {
      const wrappedAIResponse = `
        Here are the generated physics questions for your test:
        \`\`\`json
        [
          {
            "questionText": "What is the unit of Force?",
            "type": "MCQ",
            "options": ["Newton", "Joule", "Watt", "Pascal"],
            "correctAnswer": "Newton",
            "points": 1
          }
        ]
        \`\`\`
        Good luck with the exam!
      `;

      const extracted = safeExtractJSON(wrappedAIResponse);
      assert.ok(Array.isArray(extracted));
      assert.strictEqual(extracted.length, 1);
      assert.strictEqual(extracted[0].correctAnswer, "Newton");
    });
  });

  describe("4. Exam Autograding Score Engine", () => {
    function computeExamScore(
      questions: { _id: string; correctAnswer: string; points?: number }[],
      answers: { questionId: string; answer: string }[]
    ) {
      let score = 0;
      let totalPoints = 0;

      questions.forEach((question) => {
        const points = question.points || 1;
        totalPoints += points;

        const studentAns = answers.find(
          (a) => String(a.questionId) === String(question._id)
        );

        if (studentAns && studentAns.answer === question.correctAnswer) {
          score += points;
        }
      });

      const percentage = totalPoints > 0 ? (score / totalPoints) * 100 : 0;
      return { score, totalPoints, percentage };
    }

    it("should calculate 100% score when all student answers match correct keys", () => {
      const questions = [
        { _id: "q1", correctAnswer: "Option A", points: 2 },
        { _id: "q2", correctAnswer: "Option C", points: 3 },
      ];
      const answers = [
        { questionId: "q1", answer: "Option A" },
        { questionId: "q2", answer: "Option C" },
      ];

      const result = computeExamScore(questions, answers);
      assert.strictEqual(result.score, 5);
      assert.strictEqual(result.totalPoints, 5);
      assert.strictEqual(result.percentage, 100);
    });

    it("should accurately compute partial scores when some answers are incorrect", () => {
      const questions = [
        { _id: "q1", correctAnswer: "Paris", points: 2 },
        { _id: "q2", correctAnswer: "4", points: 2 },
        { _id: "q3", correctAnswer: "Newton", points: 1 },
      ];
      const answers = [
        { questionId: "q1", answer: "Paris" },   // correct (+2)
        { questionId: "q2", answer: "5" },       // wrong (0)
        { questionId: "q3", answer: "Newton" },  // correct (+1)
      ];

      const result = computeExamScore(questions, answers);
      assert.strictEqual(result.score, 3);
      assert.strictEqual(result.totalPoints, 5);
      assert.strictEqual(result.percentage, 60);
    });

    it("should handle unanswered questions safely as 0 points", () => {
      const questions = [
        { _id: "q1", correctAnswer: "Paris", points: 2 },
        { _id: "q2", correctAnswer: "4", points: 2 },
      ];
      const answers = [
        { questionId: "q1", answer: "Paris" }, // only answered 1 of 2
      ];

      const result = computeExamScore(questions, answers);
      assert.strictEqual(result.score, 2);
      assert.strictEqual(result.totalPoints, 4);
      assert.strictEqual(result.percentage, 50);
    });
  });
});
