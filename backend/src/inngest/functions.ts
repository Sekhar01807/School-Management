import { inngest } from "./index.ts";
import Class from "../models/class.ts";
import User from "../models/user.ts";
import Timetable from "../models/timetable.ts";
import Exam, { type IQuestion } from "../models/exam.ts";
import Submission from "../models/submission.ts";
import { logger } from "../utils/logger.ts";

import { NonRetriableError } from "inngest";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";

export interface GenSettings {
  startTime: string;
  endTime: string;
  periods: number;
}

/**
 * Defensive JSON parser that strips markdown fences, trailing commas,
 * and extracts valid JSON objects/arrays from LLM raw text.
 */
export function safeExtractJSON<T = any>(rawText: string): T | null {
  if (!rawText || typeof rawText !== "string") return null;

  // Strip markdown code fences
  let cleaned = rawText.replace(/```json/gi, "").replace(/```/g, "").trim();

  // Try direct parse
  try {
    return JSON.parse(cleaned);
  } catch {
    // Attempt to extract the outermost JSON structure (object or array)
    const firstBracket = cleaned.search(/[\{\[]/);
    const lastCurly = cleaned.lastIndexOf("}");
    const lastSquare = cleaned.lastIndexOf("]");
    const lastBracket = Math.max(lastCurly, lastSquare);

    if (firstBracket !== -1 && lastBracket > firstBracket) {
      cleaned = cleaned.substring(firstBracket, lastBracket + 1);
      try {
        return JSON.parse(cleaned);
      } catch {
        // Fall through to null
      }
    }
  }
  return null;
}

/**
 * Deterministic schedule generator used as an instantaneous fallback
 * when LLM output is malformed, unavailable, or rate-limited.
 */
export function generateDeterministicSchedule(
  contextData: { subjects: any[]; teachers: any[] },
  settings: GenSettings
) {
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
  const schedule = [];

  const subjectList = contextData.subjects;
  const teacherList = contextData.teachers;

  const parseTimeToMinutes = (timeStr: string) => {
    const parts = (timeStr || "08:00").split(":").map(Number);
    return (parts[0] || 8) * 60 + (parts[1] || 0);
  };

  const formatMinutesToTime = (totalMin: number) => {
    const h = Math.floor(totalMin / 60).toString().padStart(2, "0");
    const m = (totalMin % 60).toString().padStart(2, "0");
    return `${h}:${m}`;
  };

  const startMin = parseTimeToMinutes(settings.startTime || "08:00");
  const endMin = parseTimeToMinutes(settings.endTime || "15:00");
  const numPeriods = Math.max(1, settings.periods || 6);
  const totalDuration = Math.max(endMin - startMin, 60);
  const periodDuration = Math.max(Math.floor(totalDuration / numPeriods), 30);

  let cursor = 0;
  for (const day of days) {
    const periods = [];
    for (let p = 0; p < numPeriods; p++) {
      const pStart = startMin + p * periodDuration;
      const pEnd = Math.min(pStart + periodDuration, endMin);

      const sub = subjectList.length > 0 ? subjectList[cursor % subjectList.length] : { id: "GENERIC", name: "General" };
      const qualified = teacherList.find((t) => t.subjects && t.subjects.includes(sub.id)) || teacherList[0];

      periods.push({
        subject: sub.id,
        teacher: qualified ? qualified.id : "unassigned",
        startTime: formatMinutesToTime(pStart),
        endTime: formatMinutesToTime(pEnd),
      });
      cursor++;
    }
    schedule.push({ day, periods });
  }

  return schedule;
}

// 1. Generate Timetable Function
export const generateTimeTable = inngest.createFunction(
  { id: "Generate-Timetable" },
  { event: "generate/timetable" },
  async ({ event, step }) => {
    const { classId, academicYearId, settings } = event.data as {
      classId: string;
      academicYearId: string;
      settings: GenSettings;
    };

    const contextData = await step.run("fetch-class-context", async () => {
      const classData = await Class.findById(classId).populate("subjects");
      if (!classData) throw new NonRetriableError("Class not found");

      // Fetch all active teachers
      const allTeachers = await User.find({ role: "teacher", isActive: true });
      const subjects = (classData.subjects as any[]) || [];
      const classSubjectsIds = subjects.map((sub: any) =>
        sub._id.toString()
      );

      // Find teachers qualified for at least one of this class's subjects
      const qualifiedTeachers = allTeachers
        .filter((teacher) => {
          if (!teacher.teacherSubject || teacher.teacherSubject.length === 0) return false;
          return teacher.teacherSubject.some((subId: any) =>
            classSubjectsIds.includes(subId.toString())
          );
        })
        .map((tea) => ({
          id: tea._id.toString(),
          name: tea.name,
          subjects: (tea.teacherSubject || []).map((s: any) => s.toString()),
        }));

      const subjectsPayload = subjects.map((sub: any) => ({
        id: sub._id.toString(),
        name: sub.name,
        code: sub.code,
      }));

      if (subjectsPayload.length === 0) {
        throw new NonRetriableError(
          "No subjects are currently assigned to this class. Please assign subjects first."
        );
      }

      if (qualifiedTeachers.length === 0) {
        throw new NonRetriableError(
          "No teachers are currently assigned to the subjects of this class. Please assign teachers to these subjects."
        );
      }

      return {
        className: classData.name,
        subjects: subjectsPayload,
        teachers: qualifiedTeachers,
      };
    });

    const aiSchedule = await step.run("generate-timetable-logic", async () => {
      const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
      let parsed: any = null;

      if (apiKey) {
        try {
          const allTimetables = await Timetable.find({
            academicYear: academicYearId,
          });

          const prompt = `
            You are a school scheduler. Generate a weekly timetable (Monday to Friday).

            CONTEXT:
            - Class: ${contextData.className}
            - Hours: ${settings.startTime} to ${settings.endTime} (${settings.periods} periods/day).

            RESOURCES:
            - Subjects: ${JSON.stringify(contextData.subjects)}
            - Teachers: ${JSON.stringify(contextData.teachers)}
            - Other Existing Timetables: ${JSON.stringify(allTimetables)}

            STRICT RULES:
            1. Assign a qualified Teacher to every Subject period (Teacher MUST have the subject ID in their list).
            2. Output ONLY strict JSON. Schema:
               {
                 "schedule": [
                   {
                     "day": "Monday",
                     "periods": [
                       { "subject": "SUBJECT_ID", "teacher": "TEACHER_ID", "startTime": "HH:MM", "endTime": "HH:MM" }
                     ]
                   }
                 ]
               }
          `;

          const google = createGoogleGenerativeAI({ apiKey });
          const activeModel = google("gemini-1.5-flash");

          const { text } = await generateText({
            prompt,
            model: activeModel,
          });

          parsed = safeExtractJSON(text);
        } catch (llmErr: any) {
          logger.warn(`AI Timetable LLM call failed, falling back to deterministic scheduling: ${llmErr?.message || llmErr}`);
        }
      } else {
        logger.info("GOOGLE_GENERATIVE_AI_API_KEY absent; generating conflict-free schedule via deterministic engine.");
      }

      // Validate parsed AI output
      if (parsed && Array.isArray(parsed.schedule) && parsed.schedule.length > 0) {
        const validatedSchedule = parsed.schedule.map((dayItem: any) => ({
          day: String(dayItem.day || "Monday"),
          periods: Array.isArray(dayItem.periods)
            ? dayItem.periods
                .filter((p: any) => p.subject && p.teacher)
                .map((p: any) => ({
                  subject: String(p.subject),
                  teacher: String(p.teacher),
                  startTime: String(p.startTime || "08:00"),
                  endTime: String(p.endTime || "08:45"),
                }))
            : [],
        }));

        if (validatedSchedule.some((d: any) => d.periods.length > 0)) {
          return { schedule: validatedSchedule, source: "ai" };
        }
      }

      // Defensive Deterministic Fallback
      const fallbackSchedule = generateDeterministicSchedule(contextData, settings);
      return { schedule: fallbackSchedule, source: "deterministic_fallback" };
    });

    await step.run("save-timetable", async () => {
      // Overwrite any existing timetable for this class and academic year
      await Timetable.findOneAndDelete({
        class: classId,
        academicYear: academicYearId,
      });

      await Timetable.create({
        class: classId,
        academicYear: academicYearId,
        schedule: aiSchedule.schedule,
      });

      return { success: true, classId, source: aiSchedule.source };
    });

    return { message: "Timetable generated and saved successfully." };
  }
);

// 2. Generate Exam Function
export const generateExam = inngest.createFunction(
  { id: "Generate-Exam" },
  { event: "exam/generate" },
  async ({ event, step }) => {
    const { examId, topic, subjectName, difficulty, count } = event.data;

    const aiQuestions = await step.run("generate-exam-logic", async () => {
      const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
      if (!apiKey) {
        throw new NonRetriableError("GOOGLE_GENERATIVE_AI_API_KEY environment variable is missing");
      }

      let parsed: any = null;
      try {
        const prompt = `
          You are a strict teacher. Create a JSON array of ${count} multiple-choice questions for a school exam.

          CONTEXT:
          - Subject: ${subjectName}
          - Topic: ${topic}
          - Difficulty: ${difficulty}

          STRICT JSON SCHEMA (Array of Objects):
          [
            {
              "questionText": "Question string",
              "type": "MCQ",
              "options": ["Option A", "Option B", "Option C", "Option D"],
              "correctAnswer": "The exact string matching one of the options",
              "points": 1
            }
          ]

          RULES:
          1. Output ONLY raw JSON. No Markdown fences.
          2. Ensure correctAnswer matches one of the options exactly.
        `;

        const google = createGoogleGenerativeAI({ apiKey });
        const activeModel = google("gemini-1.5-flash");

        const { text } = await generateText({
          prompt,
          model: activeModel,
        });

        parsed = safeExtractJSON(text);
      } catch (err: any) {
        throw new NonRetriableError(`AI Question generation failed: ${err.message || err}`);
      }

      if (!Array.isArray(parsed) || parsed.length === 0) {
        throw new NonRetriableError("AI returned an empty or malformed question list.");
      }

      // Schema Validation & Sanitization of Questions
      const validated: Partial<IQuestion>[] = parsed
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

          // Ensure correct answer is contained in options
          if (!trimmedOptions.includes(validCorrect)) {
            validCorrect = trimmedOptions[0]; // fallback to first option
          }

          return {
            questionText: String(q.questionText).trim(),
            type: "MCQ" as const,
            options: trimmedOptions,
            correctAnswer: validCorrect,
            points: typeof q.points === "number" && q.points > 0 ? q.points : 1,
          };
        });

      if (validated.length === 0) {
        throw new NonRetriableError("No valid questions could be extracted from AI response.");
      }

      return validated;
    });

    await step.run("save-exam", async () => {
      const exam = await Exam.findById(examId);
      if (!exam) {
        throw new NonRetriableError(`Exam ${examId} not found`);
      }

      exam.questions = aiQuestions as any;
      exam.isActive = false; // Remains in draft until teacher reviews and publishes
      await exam.save();

      return { success: true, count: aiQuestions.length };
    });

    return { message: "Exam generated successfully." };
  }
);

// 3. Handle Exam Submission Function
export const handleExamSubmission = inngest.createFunction(
  { id: "Handle-Exam-Submission" },
  { event: "exam/submit" },
  async ({ event, step }) => {
    const { examId, studentId, answers } = event.data;

    await step.run("process-exam-submission", async () => {
      // 1. Check if already submitted
      const existingSubmission = await Submission.findOne({
        exam: examId,
        student: studentId,
      });

      if (existingSubmission) {
        throw new NonRetriableError("Exam already submitted.");
      }

      // 2. Fetch full exam (forcing correctAnswer selection)
      const exam = await Exam.findById(examId).select("+questions.correctAnswer");
      if (!exam) {
        throw new NonRetriableError(`Exam ${examId} not found.`);
      }

      // 3. Calculate Score
      let score = 0;
      let totalPoints = 0;

      exam.questions.forEach((question) => {
        const points = question.points || 1;
        totalPoints += points;

        const studentAns = Array.isArray(answers)
          ? answers.find(
              (a: any) => String(a.questionId) === question._id.toString()
            )
          : undefined;

        if (studentAns && studentAns.answer === question.correctAnswer) {
          score += points;
        }
      });

      // 4. Save Submission
      await Submission.create({
        exam: examId,
        student: studentId,
        answers: Array.isArray(answers) ? answers : [],
        score,
        submittedAt: new Date(),
      });
    });

    return { message: "Exam submitted and graded successfully." };
  }
);
