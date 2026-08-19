import Class from "../models/class.ts";
import { logActivity } from "../utils/activitieslog.ts";
import { escapeRegex } from "../utils/escapeRegex.ts";
import type { CreateClassInput, UpdateClassInput } from "../validators/schemas.ts";

export class ClassService {
  static async createClass(
    input: CreateClassInput,
    requesterId?: string
  ): Promise<{ status: number; data: any }> {
    const existingClass = await Class.findOne({
      name: input.name,
      academicYear: input.academicYear,
    });

    if (existingClass) {
      return {
        status: 400,
        data: { message: "Class with this name already exists for the specified academic year." },
      };
    }

    const newClass = await Class.create({
      name: input.name,
      academicYear: input.academicYear,
      classTeacher: input.classTeacher || null,
      capacity: input.capacity || 40,
      subjects: input.subjects || [],
    });

    if (requesterId) {
      await logActivity({
        userId: requesterId,
        action: `Created new class: ${newClass.name}`,
      });
    }

    return { status: 201, data: newClass };
  }

  static async getAllClasses(query: {
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

    const [total, classes] = await Promise.all([
      Class.countDocuments(filter),
      Class.find(filter)
        .populate("academicYear", "name isCurrent")
        .populate("classTeacher", "name email")
        .populate("subjects", "name code")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
    ]);

    return {
      status: 200,
      data: {
        classes,
        pagination: {
          total,
          page,
          pages: Math.ceil(total / limit) || 1,
          limit,
        },
      },
    };
  }

  static async updateClass(
    classId: string,
    input: UpdateClassInput,
    requesterId?: string
  ): Promise<{ status: number; data: any }> {
    const currentClass = await Class.findById(classId);
    if (!currentClass) {
      return { status: 404, data: { message: "Class not found" } };
    }

    const checkName = input.name || currentClass.name;
    const checkYear = input.academicYear || currentClass.academicYear;

    // Targeted duplicate check: check name collision in the same academic year
    const duplicate = await Class.findOne({
      _id: { $ne: classId },
      name: checkName,
      academicYear: checkYear,
    });

    if (duplicate) {
      return {
        status: 400,
        data: { message: "A class with this name already exists in the selected academic year." },
      };
    }

    const updatePayload: any = {
      name: checkName,
      academicYear: checkYear,
      capacity: input.capacity !== undefined ? input.capacity : currentClass.capacity,
    };

    if (input.classTeacher !== undefined) {
      updatePayload.classTeacher = input.classTeacher || null;
    }

    if (input.subjects !== undefined) {
      updatePayload.subjects = input.subjects;
    }

    const updatedClass = await Class.findByIdAndUpdate(classId, updatePayload, {
      new: true,
      runValidators: true,
    })
      .populate("academicYear", "name isCurrent")
      .populate("classTeacher", "name email")
      .populate("subjects", "name code");

    if (requesterId) {
      await logActivity({
        userId: requesterId,
        action: `Updated class: ${updatedClass?.name}`,
      });
    }

    return { status: 200, data: updatedClass };
  }

  static async deleteClass(
    classId: string,
    requesterId?: string
  ): Promise<{ status: number; data: any }> {
    const deletedClass = await Class.findByIdAndDelete(classId);
    if (!deletedClass) {
      return { status: 404, data: { message: "Class not found" } };
    }

    if (requesterId) {
      await logActivity({
        userId: requesterId,
        action: `Deleted class: ${deletedClass.name}`,
      });
    }

    return { status: 200, data: { message: "Class removed successfully" } };
  }
}
