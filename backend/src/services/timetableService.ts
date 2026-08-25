import Timetable from "../models/timetable.ts";
import { inngest } from "../inngest/index.ts";
import { logActivity } from "../utils/activitieslog.ts";
import type { GenerateTimetableInput } from "../validators/schemas.ts";
import type { IUser } from "../models/user.ts";
import { canAccessClassData } from "../utils/authorization.ts";

export class TimetableService {
  static async generateTimetable(
    input: GenerateTimetableInput,
    requesterId?: string
  ): Promise<{ status: number; data: any }> {
    await inngest.send({
      name: "generate/timetable",
      data: {
        classId: input.classId,
        academicYearId: input.academicYearId,
        settings: input.settings,
      },
    });

    if (requesterId) {
      await logActivity({
        userId: requesterId,
        action: `Requested timetable generation for class ID: ${input.classId}`,
      });
    }

    return {
      status: 200,
      data: { message: "Timetable generation initiated" },
    };
  }

  static async getTimetable(
    classId: string,
    user: IUser
  ): Promise<{ status: number; data: any }> {
    // Resource Authorization: Enforce multi-tenant class boundaries for students & parents
    if (user.role === "student" || user.role === "parent") {
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
}
