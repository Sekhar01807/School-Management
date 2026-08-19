import AcademicYear from "../models/academicYear.ts";
import { logActivity } from "../utils/activitieslog.ts";
import { escapeRegex } from "../utils/escapeRegex.ts";
import type {
  CreateAcademicYearInput,
  UpdateAcademicYearInput,
} from "../validators/schemas.ts";

export class AcademicYearService {
  static async createAcademicYear(
    input: CreateAcademicYearInput,
    requesterId?: string
  ): Promise<{ status: number; data: any }> {
    const existingYear = await AcademicYear.findOne({
      $or: [
        { name: input.name },
        { fromYear: new Date(input.fromYear), toYear: new Date(input.toYear) },
      ],
    });

    if (existingYear) {
      return {
        status: 400,
        data: { message: "Academic Year with this name or date range already exists." },
      };
    }

    // Atomic update: If setting as current, deactivate all others first
    if (input.isCurrent) {
      await AcademicYear.updateMany({}, { isCurrent: false });
    }

    const academicYear = await AcademicYear.create({
      name: input.name,
      fromYear: new Date(input.fromYear),
      toYear: new Date(input.toYear),
      isCurrent: Boolean(input.isCurrent),
    });

    if (requesterId) {
      await logActivity({
        userId: requesterId,
        action: `Created academic year: ${academicYear.name}`,
      });
    }

    return { status: 201, data: academicYear };
  }

  static async getAllAcademicYears(query: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<{ status: number; data: any }> {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (query.search) {
      const sanitized = escapeRegex(query.search.trim());
      filter.name = { $regex: sanitized, $options: "i" };
    }

    const [total, years] = await Promise.all([
      AcademicYear.countDocuments(filter),
      AcademicYear.find(filter)
        .sort({ isCurrent: -1, fromYear: -1 })
        .skip(skip)
        .limit(limit),
    ]);

    return {
      status: 200,
      data: {
        years,
        pagination: {
          total,
          page,
          pages: Math.ceil(total / limit) || 1,
          limit,
        },
      },
    };
  }

  static async getCurrentAcademicYear(): Promise<{ status: number; data: any }> {
    let currentYear = await AcademicYear.findOne({ isCurrent: true });
    if (!currentYear) {
      currentYear = await AcademicYear.findOne().sort({ fromYear: -1 });
    }

    if (!currentYear) {
      return {
        status: 404,
        data: { message: "No academic year found. Please create one." },
      };
    }

    return { status: 200, data: currentYear };
  }

  static async updateAcademicYear(
    yearId: string,
    input: UpdateAcademicYearInput,
    requesterId?: string
  ): Promise<{ status: number; data: any }> {
    const currentDoc = await AcademicYear.findById(yearId);
    if (!currentDoc) {
      return { status: 404, data: { message: "Academic Year not found" } };
    }

    // Atomic update: If setting as current, deactivate all other years
    if (input.isCurrent) {
      await AcademicYear.updateMany({ _id: { $ne: yearId } }, { isCurrent: false });
    }

    const updatePayload: any = {};
    if (input.name) updatePayload.name = input.name;
    if (input.fromYear) updatePayload.fromYear = new Date(input.fromYear);
    if (input.toYear) updatePayload.toYear = new Date(input.toYear);
    if (input.isCurrent !== undefined) updatePayload.isCurrent = input.isCurrent;

    const updatedYear = await AcademicYear.findByIdAndUpdate(yearId, updatePayload, {
      new: true,
      runValidators: true,
    });

    if (requesterId) {
      await logActivity({
        userId: requesterId,
        action: `Updated academic year: ${updatedYear?.name}`,
      });
    }

    return { status: 200, data: updatedYear };
  }

  static async deleteAcademicYear(
    yearId: string,
    requesterId?: string
  ): Promise<{ status: number; data: any }> {
    const year = await AcademicYear.findById(yearId);
    if (!year) {
      return { status: 404, data: { message: "Academic Year not found" } };
    }

    if (year.isCurrent) {
      return {
        status: 400,
        data: { message: "Cannot delete the active academic year. Please set another year as active first." },
      };
    }

    await year.deleteOne();

    if (requesterId) {
      await logActivity({
        userId: requesterId,
        action: `Deleted academic year: ${year.name}`,
      });
    }

    return { status: 200, data: { message: "Academic Year deleted successfully" } };
  }
}
