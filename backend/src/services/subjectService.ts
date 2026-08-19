import Subject from "../models/subject.ts";
import { logActivity } from "../utils/activitieslog.ts";
import { escapeRegex } from "../utils/escapeRegex.ts";
import type { CreateSubjectInput, UpdateSubjectInput } from "../validators/schemas.ts";

export class SubjectService {
  static async createSubject(
    input: CreateSubjectInput,
    requesterId?: string
  ): Promise<{ status: number; data: any }> {
    const subjectExists = await Subject.findOne({ code: input.code });
    if (subjectExists) {
      return {
        status: 400,
        data: { message: "Subject with this code already exists." },
      };
    }

    const newSubject = await Subject.create({
      name: input.name,
      code: input.code,
      isActive: input.isActive !== undefined ? input.isActive : true,
      teacher: input.teacher || [],
    });

    if (requesterId) {
      await logActivity({
        userId: requesterId,
        action: `Created subject: ${newSubject.name}`,
      });
    }

    return { status: 201, data: newSubject };
  }

  static async getAllSubjects(query: {
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
      filter.$or = [
        { name: { $regex: sanitized, $options: "i" } },
        { code: { $regex: sanitized, $options: "i" } },
      ];
    }

    const [total, subjects] = await Promise.all([
      Subject.countDocuments(filter),
      Subject.find(filter)
        .populate("teacher", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
    ]);

    return {
      status: 200,
      data: {
        subjects,
        pagination: {
          total,
          page,
          pages: Math.ceil(total / limit) || 1,
          limit,
        },
      },
    };
  }

  static async updateSubject(
    subjectId: string,
    input: UpdateSubjectInput,
    requesterId?: string
  ): Promise<{ status: number; data: any }> {
    const existingSubject = await Subject.findById(subjectId);
    if (!existingSubject) {
      return { status: 404, data: { message: "Subject not found" } };
    }

    if (input.code && input.code !== existingSubject.code) {
      const duplicateCode = await Subject.findOne({
        _id: { $ne: subjectId },
        code: input.code,
      });
      if (duplicateCode) {
        return {
          status: 400,
          data: { message: "Subject with this code already exists." },
        };
      }
    }

    const updatePayload: any = {};
    if (input.name) updatePayload.name = input.name;
    if (input.code) updatePayload.code = input.code;
    if (input.isActive !== undefined) updatePayload.isActive = input.isActive;
    if (input.teacher !== undefined) updatePayload.teacher = input.teacher;

    const updatedSubject = await Subject.findByIdAndUpdate(subjectId, updatePayload, {
      new: true,
      runValidators: true,
    }).populate("teacher", "name email");

    if (requesterId) {
      await logActivity({
        userId: requesterId,
        action: `Updated subject: ${updatedSubject?.name}`,
      });
    }

    return { status: 200, data: updatedSubject };
  }

  static async deleteSubject(
    subjectId: string,
    requesterId?: string
  ): Promise<{ status: number; data: any }> {
    const deletedSubject = await Subject.findByIdAndDelete(subjectId);
    if (!deletedSubject) {
      return { status: 404, data: { message: "Subject not found" } };
    }

    if (requesterId) {
      await logActivity({
        userId: requesterId,
        action: `Deleted subject: ${deletedSubject.name}`,
      });
    }

    return { status: 200, data: { message: "Subject deleted successfully" } };
  }
}
