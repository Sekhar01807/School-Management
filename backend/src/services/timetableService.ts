import Timetable from "../models/timetable.ts";
import Class from "../models/class.ts";
import User from "../models/user.ts";
import { logActivity } from "../utils/activitieslog.ts";
import type { GenerateTimetableInput } from "../validators/schemas.ts";
import type { IUser } from "../models/user.ts";
import { canAccessClassData } from "../utils/authorization.ts";

export interface GenSettings {
  startTime: string;
  endTime: string;
  periods: number;
}

/**
 * Deterministic, conflict-free weekly timetable generator.
 * Produces balanced 5-day schedules matching subjects with qualified teachers.
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

      const sub =
        subjectList.length > 0
          ? subjectList[cursor % subjectList.length]
          : { id: "GENERIC", name: "General" };
      const qualified =
        teacherList.find((t) => t.subjects && t.subjects.includes(sub.id)) ||
        teacherList[0];

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

export class TimetableService {
  static async generateTimetable(
    input: GenerateTimetableInput,
    requesterId?: string
  ): Promise<{ status: number; data: any }> {
    const classData = await Class.findById(input.classId).populate("subjects");
    if (!classData) {
      return { status: 404, data: { message: "Class not found" } };
    }

    const allTeachers = await User.find({ role: "teacher", isActive: true });
    const subjects = (classData.subjects as any[]) || [];
    const classSubjectsIds = subjects.map((sub: any) => sub._id.toString());

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
      return {
        status: 400,
        data: {
          message:
            "No subjects are currently assigned to this class. Please assign subjects first.",
        },
      };
    }

    if (qualifiedTeachers.length === 0) {
      return {
        status: 400,
        data: {
          message:
            "No teachers are currently assigned to the subjects of this class. Please assign teachers to these subjects.",
        },
      };
    }

    const schedule = generateDeterministicSchedule(
      { subjects: subjectsPayload, teachers: qualifiedTeachers },
      input.settings
    );

    // Overwrite existing timetable for this class and academic year
    await Timetable.findOneAndDelete({
      class: input.classId,
      academicYear: input.academicYearId,
    });

    const timetable = await Timetable.create({
      class: input.classId,
      academicYear: input.academicYearId,
      schedule,
    });

    if (requesterId) {
      await logActivity({
        userId: requesterId,
        action: `Generated timetable for class: ${classData.name}`,
      });
    }

    return {
      status: 200,
      data: {
        message: "Timetable generated and saved successfully.",
        timetable,
      },
    };
  }

  static async getTimetable(
    classId: string,
    user: IUser
  ): Promise<{ status: number; data: any }> {
    // Resource Authorization: Enforce multi-tenant class boundaries for students
    if (user.role === "student") {
      const authCheck = await canAccessClassData(user, classId);
      if (!authCheck.authorized) {
        return {
          status: authCheck.statusCode || 403,
          data: {
            message:
              authCheck.reason ||
              "You are not authorized to view the timetable for this class.",
          },
        };
      }
    }

    const timetable = await Timetable.findOne({ class: classId })
      .populate("schedule.periods.subject", "name code")
      .populate("schedule.periods.teacher", "name email");

    if (!timetable) {
      return {
        status: 404,
        data: { message: "Timetable not found for this class." },
      };
    }

    return { status: 200, data: timetable };
  }

  static async saveManualTimetable(
    input: { classId: string; academicYearId?: string; schedule: any[] },
    requesterId?: string
  ): Promise<{ status: number; data: any }> {
    const classData = await Class.findById(input.classId);
    if (!classData) {
      return { status: 404, data: { message: "Class not found" } };
    }

    const yearId = input.academicYearId || classData.academicYear;

    const timetable = await Timetable.findOneAndUpdate(
      { class: input.classId },
      {
        class: input.classId,
        academicYear: yearId,
        schedule: input.schedule,
      },
      { upsert: true, returnDocument: "after" }
    )
      .populate("schedule.periods.subject", "name code")
      .populate("schedule.periods.teacher", "name email");

    if (requesterId) {
      await logActivity({
        userId: requesterId,
        action: `Manually updated timetable for class: ${classData.name}`,
      });
    }

    return {
      status: 200,
      data: {
        message: "Timetable updated and saved successfully.",
        timetable,
      },
    };
  }
}
