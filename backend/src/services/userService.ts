import User, { type IUser } from "../models/user.ts";
import { generateToken } from "../utils/generateToken.ts";
import { logActivity } from "../utils/activitieslog.ts";
import { escapeRegex } from "../utils/escapeRegex.ts";
import type { RegisterInput, UpdateUserInput } from "../validators/schemas.ts";
import { type Response } from "express";

export class UserService {
  /**
   * Register a new user with RBAC role boundaries
   */
  static async registerUser(
    input: RegisterInput,
    requesterRole?: string,
    requesterId?: string
  ): Promise<{ status: number; data: any }> {
    // RBAC: Teachers are only authorized to register student accounts
    if (requesterRole === "teacher" && input.role !== "student") {
      return {
        status: 403,
        data: { message: "Teachers are only authorized to register student accounts." },
      };
    }

    // Check duplicate email
    const existingUser = await User.findOne({ email: input.email });
    if (existingUser) {
      return {
        status: 400,
        data: { message: "User with this email already exists." },
      };
    }

    const newUser = await User.create({
      name: input.name,
      email: input.email,
      password: input.password,
      role: input.role || "student",
      studentClass: input.role === "student" ? input.studentClass : undefined,
      teacherSubject: input.role === "teacher" ? input.teacherSubject || [] : [],
      isActive: input.isActive !== undefined ? input.isActive : true,
    });

    if (requesterId) {
      await logActivity({
        userId: requesterId,
        action: "Registered User",
        details: `Registered ${newUser.role} with email: ${newUser.email}`,
      });
    }

    return {
      status: 201,
      data: {
        _id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        isActive: newUser.isActive,
        studentClass: newUser.studentClass,
        teacherSubject: newUser.teacherSubject,
        message: "User registered successfully",
      },
    };
  }

  /**
   * Authenticate user, verify active status, and issue HttpOnly JWT cookie
   */
  static async loginUser(
    email: string,
    pass: string,
    res: Response
  ): Promise<{ status: number; data: any }> {
    const user = await User.findOne({ email });

    if (!user || !(await user.matchPassword(pass))) {
      return {
        status: 401,
        data: { message: "Invalid email or password" },
      };
    }

    if (!user.isActive) {
      return {
        status: 403,
        data: { message: "Your account has been deactivated. Please contact an administrator." },
      };
    }

    // Issue secure HttpOnly cookie
    generateToken(user._id.toString(), res);

    return {
      status: 200,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        studentClass: user.studentClass,
        teacherSubject: user.teacherSubject,
      },
    };
  }

  /**
   * Update user details with scope and privilege escalation guards
   */
  static async updateUser(
    targetUserId: string,
    input: UpdateUserInput,
    requesterRole?: string,
    requesterId?: string
  ): Promise<{ status: number; data: any }> {
    const user = await User.findById(targetUserId);
    if (!user) {
      return { status: 404, data: { message: "User not found" } };
    }

    // RBAC: Teachers can only update students and cannot elevate privileges
    if (requesterRole === "teacher") {
      if (user.role !== "student") {
        return {
          status: 403,
          data: { message: "Teachers are only authorized to modify student accounts." },
        };
      }

      if (input.role && input.role !== "student") {
        return {
          status: 403,
          data: { message: "Teachers cannot change user roles." },
        };
      }
    }

    if (input.name) user.name = input.name;
    if (input.email) user.email = input.email;
    if (input.password) user.password = input.password;

    if (input.role && requesterRole === "admin") {
      user.role = input.role;
    }

    if (input.isActive !== undefined && requesterRole === "admin") {
      user.isActive = input.isActive;
    }

    if (input.studentClass !== undefined) {
      user.studentClass = input.studentClass ? (input.studentClass as any) : null;
    }

    if (input.teacherSubject !== undefined) {
      user.teacherSubject = input.teacherSubject as any;
    }

    const updatedUser = await user.save();

    if (requesterId) {
      await logActivity({
        userId: requesterId,
        action: "Updated User",
        details: `Updated ${updatedUser.role} with email: ${updatedUser.email}`,
      });
    }

    return {
      status: 200,
      data: {
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        isActive: updatedUser.isActive,
        studentClass: updatedUser.studentClass,
        teacherSubject: updatedUser.teacherSubject,
        message: "User updated successfully",
      },
    };
  }

  /**
   * Delete user with self-deletion and resource protection
   */
  static async deleteUser(
    targetUserId: string,
    requesterRole?: string,
    requesterId?: string
  ): Promise<{ status: number; data: any }> {
    const user = await User.findById(targetUserId);
    if (!user) {
      return { status: 404, data: { message: "User not found" } };
    }

    // RBAC: Teachers can only delete students
    if (requesterRole === "teacher" && user.role !== "student") {
      return {
        status: 403,
        data: { message: "Teachers are only authorized to delete student accounts." },
      };
    }

    // Prevent self-deletion
    if (requesterId && requesterId === user._id.toString()) {
      return {
        status: 400,
        data: { message: "You cannot delete your own account." },
      };
    }

    await user.deleteOne();

    if (requesterId) {
      await logActivity({
        userId: requesterId,
        action: "Deleted User",
        details: `Deleted ${user.role} with email: ${user.email}`,
      });
    }

    return {
      status: 200,
      data: { message: "User deleted successfully" },
    };
  }

  /**
   * Paginated & searchable user directory query
   */
  static async getUsersDirectory(
    query: { page?: number; limit?: number; role?: string; search?: string },
    requesterRole?: string
  ): Promise<{ status: number; data: any }> {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const filter: any = {};

    // Teachers can only view students
    if (requesterRole === "teacher") {
      filter.role = "student";
    } else if (query.role && query.role !== "all" && query.role !== "") {
      filter.role = query.role;
    }

    if (query.search) {
      const sanitized = escapeRegex(query.search.trim());
      filter.$or = [
        { name: { $regex: sanitized, $options: "i" } },
        { email: { $regex: sanitized, $options: "i" } },
      ];
    }

    const [total, users] = await Promise.all([
      User.countDocuments(filter),
      User.find(filter)
        .select("-password")
        .populate("studentClass", "_id name")
        .populate("teacherSubject", "_id name code")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
    ]);

    const formattedUsers = users.map((u) => {
      const doc = u.toObject();
      return {
        ...doc,
        teacherSubjects: doc.teacherSubject,
      };
    });

    return {
      status: 200,
      data: {
        users: formattedUsers,
        pagination: {
          total,
          page,
          pages: Math.ceil(total / limit) || 1,
          limit,
        },
      },
    };
  }
}
