import { type Request, type Response } from "express";
import User, { UserRole } from "../models/user.ts";
import { generateToken } from "../utils/generateToken.ts";
import { logActivity } from "../utils/activitieslog.ts";
import type { AuthRequest } from "../middleware/auth.ts";
import { escapeRegex } from "../utils/escapeRegex.ts";

// @desc    Register a new user
// @route   POST /api/users/register
// @access  Private (Admin & Teacher with restrictions)
export const register = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      name,
      email,
      password,
      role = UserRole.STUDENT,
      studentClass,
      teacherSubject,
      teacherSubjects,
      isActive,
    } = req.body;

    const requesterRole = req.user?.role;

    // RBAC: Teachers can only register students
    if (requesterRole === "teacher" && role !== "student") {
      res.status(403).json({
        message: "Teachers are only authorized to register student accounts.",
      });
      return;
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.status(400).json({ message: "User with this email already exists" });
      return;
    }

    // Normalize teacher subjects array (supports both teacherSubject and teacherSubjects payload keys)
    const subjects = teacherSubject || teacherSubjects || [];

    // Create user
    const newUser = await User.create({
      name,
      email,
      password,
      role,
      studentClass: role === "student" ? studentClass : undefined,
      teacherSubject: role === "teacher" ? subjects : [],
      isActive: isActive !== undefined ? isActive : true,
    });

    if (newUser) {
      if (req.user) {
        await logActivity({
          userId: req.user._id.toString(),
          action: "Registered User",
          details: `Registered ${newUser.role} with email: ${newUser.email}`,
        });
      }

      res.status(201).json({
        _id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        isActive: newUser.isActive,
        studentClass: newUser.studentClass,
        teacherSubject: newUser.teacherSubject,
        message: "User registered successfully",
      });
    } else {
      res.status(400).json({ message: "Invalid user data provided" });
    }
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ message: "Server error occurred during user registration" });
  }
};

// @desc    Auth user & get token (Safe DTO + isActive check)
// @route   POST /api/users/login
// @access  Public
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ message: "Please provide both email and password" });
      return;
    }

    const user = await User.findOne({ email });

    // Check if user exists and password matches
    if (user && (await user.matchPassword(password))) {
      // Check if account is active
      if (!user.isActive) {
        res.status(403).json({
          message: "Your account has been deactivated. Please contact an administrator.",
        });
        return;
      }

      // Generate HTTP-only cookie token
      generateToken(user._id.toString(), res);

      // Return safe DTO (EXCLUDES password hash)
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        studentClass: user.studentClass,
        teacherSubject: user.teacherSubject,
      });
    } else {
      res.status(401).json({ message: "Invalid email or password" });
    }
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error during login" });
  }
};

// @desc    Update user (Admin full access, Teacher students only)
// @route   PUT /api/users/update/:id
// @access  Private (Admin / Teacher)
export const updateUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const targetUserId = req.params.id;
    const user = await User.findById(targetUserId);

    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    const requesterRole = req.user?.role;

    // RBAC: Teachers can only update students and cannot elevate roles
    if (requesterRole === "teacher") {
      if (user.role !== "student") {
        res.status(403).json({
          message: "Teachers are only authorized to modify student accounts.",
        });
        return;
      }

      if (req.body.role && req.body.role !== "student") {
        res.status(403).json({
          message: "Teachers cannot change user roles.",
        });
        return;
      }
    }

    user.name = req.body.name || user.name;
    user.email = req.body.email || user.email;

    if (req.body.role && requesterRole === "admin") {
      user.role = req.body.role;
    }

    if (req.body.isActive !== undefined && requesterRole === "admin") {
      user.isActive = req.body.isActive;
    }

    if (req.body.studentClass !== undefined) {
      user.studentClass = req.body.studentClass;
    }

    const updatedSubjects = req.body.teacherSubject || req.body.teacherSubjects;
    if (updatedSubjects !== undefined) {
      user.teacherSubject = updatedSubjects;
    }

    if (req.body.password) {
      user.password = req.body.password;
    }

    const updatedUser = await user.save();

    if (req.user) {
      await logActivity({
        userId: req.user._id.toString(),
        action: "Updated User",
        details: `Updated ${updatedUser.role} with email: ${updatedUser.email}`,
      });
    }

    res.json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      isActive: updatedUser.isActive,
      studentClass: updatedUser.studentClass,
      teacherSubject: updatedUser.teacherSubject,
      message: "User updated successfully",
    });
  } catch (error) {
    console.error("Update user error:", error);
    res.status(500).json({ message: "Server error while updating user" });
  }
};

// @desc    Get all users (With Pagination, Search & Role Filter)
// @route   GET /api/users
// @access  Private (Admin & Teacher)
export const getUsers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const requestedRole = req.query.role as string;
    const search = req.query.search as string;

    const skip = (page - 1) * limit;
    const filter: any = {};

    // RBAC: Teachers can only view students
    if (req.user?.role === "teacher") {
      filter.role = "student";
    } else if (requestedRole && requestedRole !== "all" && requestedRole !== "") {
      filter.role = requestedRole;
    }

    if (search) {
      const sanitizedSearch = escapeRegex(search.trim());
      filter.$or = [
        { name: { $regex: sanitizedSearch, $options: "i" } },
        { email: { $regex: sanitizedSearch, $options: "i" } },
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

    // Format output with both teacherSubject and teacherSubjects for backward UI compatibility
    const formattedUsers = users.map((u) => {
      const doc = u.toObject();
      return {
        ...doc,
        teacherSubjects: doc.teacherSubject,
      };
    });

    res.json({
      users: formattedUsers,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit) || 1,
        limit,
      },
    });
  } catch (error) {
    console.error("Get users error:", error);
    res.status(500).json({ message: "Server error while fetching users" });
  }
};

// @desc    Delete user (Admin full access, Teacher students only)
// @route   DELETE /api/users/delete/:id
// @access  Private (Admin / Teacher)
export const deleteUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    const requesterRole = req.user?.role;

    // RBAC: Teachers can only delete students
    if (requesterRole === "teacher" && user.role !== "student") {
      res.status(403).json({
        message: "Teachers are only authorized to delete student accounts.",
      });
      return;
    }

    // Prevent deleting your own account
    if (req.user && req.user._id.toString() === user._id.toString()) {
      res.status(400).json({ message: "You cannot delete your own account." });
      return;
    }

    await user.deleteOne();

    if (req.user) {
      await logActivity({
        userId: req.user._id.toString(),
        action: "Deleted User",
        details: `Deleted ${user.role} with email: ${user.email}`,
      });
    }

    res.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({ message: "Server error while deleting user" });
  }
};

// @desc    Get current user profile (via cookie)
// @route   GET /api/users/profile
// @access  Private
export const getUserProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (req.user) {
      res.json({
        user: {
          _id: req.user._id,
          name: req.user.name,
          email: req.user.email,
          role: req.user.role,
          isActive: req.user.isActive,
          studentClass: req.user.studentClass,
          teacherSubject: req.user.teacherSubject,
        },
      });
    } else {
      res.status(401).json({ message: "Not authorized" });
    }
  } catch (error) {
    console.error("Get user profile error:", error);
    res.status(500).json({ message: "Server error while fetching profile" });
  }
};

// @desc    Logout user / clear cookie
// @route   POST /api/users/logout
// @access  Public
export const logoutUser = async (req: Request, res: Response): Promise<void> => {
  try {
    res.cookie("jwt", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      expires: new Date(0), // expire the cookie immediately
    });
    res.json({ message: "Logged out successfully" });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({ message: "Server error during logout" });
  }
};
