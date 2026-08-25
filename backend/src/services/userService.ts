import crypto from "crypto";
import User, { type IUser } from "../models/user.ts";
import { generateToken } from "../utils/generateToken.ts";
import { logActivity } from "../utils/activitieslog.ts";
import { escapeRegex } from "../utils/escapeRegex.ts";
import { EmailService } from "./emailService.ts";
import type {
  RegisterInput,
  UpdateUserInput,
  UpdateProfileInput,
  ChangePasswordInput,
  ResetPasswordInput,
} from "../validators/schemas.ts";
import { type Response } from "express";

/**
 * Safely resolves the base URL for password reset emails.
 * Strictly derives the URL from configured trusted origins (CLIENT_URL) to prevent
 * Host Header / Reset Token Poisoning via arbitrary client Origin/Referer headers.
 */
export function getTrustedResetBaseUrl(clientOrigin?: string): string {
  const rawOrigins = process.env.CLIENT_URL || "http://localhost:5173,http://localhost:3000";
  const allowedOrigins = rawOrigins
    .split(",")
    .map((o) => o.trim().replace(/\/$/, ""))
    .filter(Boolean);

  if (clientOrigin) {
    const normalized = clientOrigin.replace(/\/$/, "");
    if (allowedOrigins.includes(normalized)) {
      return normalized;
    }
    // Allow loopback only in non-production environments
    if (
      process.env.NODE_ENV !== "production" &&
      /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(normalized)
    ) {
      return normalized;
    }
  }

  return allowedOrigins[0] || "http://localhost:5173";
}

export class UserService {
  /**
   * Register a new user with RBAC role boundaries
   */
  static async registerUser(
    input: RegisterInput,
    requesterRole?: string,
    requesterId?: string
  ): Promise<{ status: number; data: any }> {
    let assignedRole: "admin" | "teacher" | "student" | "parent" = "student";

    // 1. Unauthenticated public registration
    if (!requesterRole) {
      if (input.role && input.role !== "student") {
        return {
          status: 403,
          data: {
            message:
              "Public registration is restricted to student accounts only. Administrator privileges are required to register staff or admin accounts.",
          },
        };
      }
      assignedRole = "student";
    }
    // 2. Teacher caller (only allowed to create students)
    else if (requesterRole === "teacher") {
      if (input.role && input.role !== "student") {
        return {
          status: 403,
          data: { message: "Teachers are only authorized to register student accounts." },
        };
      }
      assignedRole = "student";
    }
    // 3. Admin caller (allowed to create any role)
    else if (requesterRole === "admin") {
      assignedRole = input.role || "student";
    }
    // 4. Other roles (student, parent) are not authorized to create accounts
    else {
      return {
        status: 403,
        data: { message: "You are not authorized to register new user accounts." },
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

    const teacherSubjects = input.teacherSubject || [];

    const newUser = await User.create({
      name: input.name,
      email: input.email,
      password: input.password,
      role: assignedRole,
      studentClass: assignedRole === "student" ? input.studentClass : undefined,
      teacherSubject: assignedRole === "teacher" ? teacherSubjects : [],
      isActive: input.isActive !== undefined ? input.isActive : true,
    });

    if (requesterId) {
      await logActivity({
        userId: requesterId,
        action: "Registered User",
        details: `Registered ${newUser.role} with email: ${newUser.email}`,
      });
    }

    // Asynchronously dispatch one-time welcome onboarding email
    EmailService.sendWelcomeEmail(newUser.email, newUser.name, newUser.role).catch((err) =>
      console.error("Error sending welcome onboarding email:", err.message)
    );

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
        phoneNumber: user.phoneNumber,
        address: user.address,
        emergencyContact: user.emergencyContact,
        avatar: user.avatar,
        studentClass: user.studentClass,
        teacherSubject: user.teacherSubject,
      },
    };
  }

  /**
   * Self-Service Profile Update
   */
  static async updateProfile(
    userId: string,
    input: UpdateProfileInput
  ): Promise<{ status: number; data: any }> {
    const user = await User.findById(userId);
    if (!user) {
      return { status: 404, data: { message: "User not found" } };
    }

    if (input.name) user.name = input.name;
    if (input.phoneNumber !== undefined) user.phoneNumber = input.phoneNumber;
    if (input.address !== undefined) user.address = input.address;
    if (input.avatar !== undefined) user.avatar = input.avatar;
    if (input.emergencyContact !== undefined) user.emergencyContact = input.emergencyContact;

    await user.save();

    await logActivity({
      userId: user._id.toString(),
      action: "Updated Profile",
      details: `User ${user.email} updated personal profile details`,
    });

    return {
      status: 200,
      data: {
        message: "Profile updated successfully",
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
          phoneNumber: user.phoneNumber,
          address: user.address,
          emergencyContact: user.emergencyContact,
          avatar: user.avatar,
          studentClass: user.studentClass,
          teacherSubject: user.teacherSubject,
        },
      },
    };
  }

  /**
   * Self-Service Change Password (verifies current password)
   */
  static async changePassword(
    userId: string,
    input: ChangePasswordInput
  ): Promise<{ status: number; data: any }> {
    const user = await User.findById(userId);
    if (!user) {
      return { status: 404, data: { message: "User not found" } };
    }

    const isMatch = await user.matchPassword(input.currentPassword);
    if (!isMatch) {
      return { status: 400, data: { message: "Current password is incorrect." } };
    }

    user.password = input.newPassword;
    await user.save();

    await logActivity({
      userId: user._id.toString(),
      action: "Changed Password",
      details: `User ${user.email} successfully changed their account password`,
    });

    return {
      status: 200,
      data: { message: "Password updated successfully." },
    };
  }

  /**
   * Request Password Reset (generates secure token & sends email)
   */
  static async forgotPassword(
    email: string,
    clientOrigin?: string
  ): Promise<{ status: number; data: any }> {
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      // Return 200 to prevent email enumeration / account snooping
      return {
        status: 200,
        data: { message: "If an account with that email exists, a password reset link has been dispatched." },
      };
    }

    // Generate random 32-byte token
    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    await user.save();

    const baseUrl = getTrustedResetBaseUrl(clientOrigin);
    const resetUrl = `${baseUrl}/reset-password?token=${rawToken}`;

    await EmailService.sendPasswordResetEmail(user.email, resetUrl, user.name);

    return {
      status: 200,
      data: { message: "If an account with that email exists, a password reset link has been dispatched." },
    };
  }

  /**
   * Reset Password with valid token
   */
  static async resetPassword(
    input: ResetPasswordInput
  ): Promise<{ status: number; data: any }> {
    const hashedToken = crypto.createHash("sha256").update(input.token.trim()).digest("hex");

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: new Date() },
    });

    if (!user) {
      return {
        status: 400,
        data: { message: "Password reset token is invalid or has expired." },
      };
    }

    user.password = input.newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    await logActivity({
      userId: user._id.toString(),
      action: "Reset Password via Email Link",
      details: `Password reset completed for ${user.email}`,
    });

    return {
      status: 200,
      data: { message: "Password has been reset successfully. You may now sign in with your new password." },
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
