import { type Request, type Response } from "express";
import { UserService } from "../services/userService.ts";
import type { AuthRequest } from "../middleware/auth.ts";

// @desc    Register a new user
// @route   POST /api/users/register
// @access  Private (Admin & Teacher with restrictions) / Public (Student only)
export const register = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await UserService.registerUser(
      req.body,
      req.user?.role,
      req.user?._id?.toString()
    );
    res.status(result.status).json(result.data);
  } catch (error) {
    res.status(500).json({ message: "Server error occurred during user registration" });
  }
};

// @desc    Auth user & get token (Safe DTO + isActive check)
// @route   POST /api/users/login
// @access  Public
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;
    const result = await UserService.loginUser(email, password, res);
    res.status(result.status).json(result.data);
  } catch (error) {
    res.status(500).json({ message: "Server error during login" });
  }
};

// @desc    Update user (Admin full access, Teacher students only)
// @route   PUT /api/users/update/:id
// @access  Private (Admin / Teacher)
export const updateUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await UserService.updateUser(
      req.params.id as string,
      req.body,
      req.user?.role,
      req.user?._id?.toString()
    );
    res.status(result.status).json(result.data);
  } catch (error) {
    res.status(500).json({ message: "Server error while updating user" });
  }
};

// @desc    Self-Service: Update current user profile
// @route   PUT /api/users/profile
// @access  Private (Authenticated User)
export const updateProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Not authorized" });
      return;
    }
    const result = await UserService.updateProfile(req.user._id.toString(), req.body);
    res.status(result.status).json(result.data);
  } catch (error) {
    res.status(500).json({ message: "Server error while updating profile" });
  }
};

// @desc    Self-Service: Change current user password (verifies current password)
// @route   PUT /api/users/change-password
// @access  Private (Authenticated User)
export const changePassword = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Not authorized" });
      return;
    }
    const result = await UserService.changePassword(req.user._id.toString(), req.body);
    res.status(result.status).json(result.data);
  } catch (error) {
    res.status(500).json({ message: "Server error while changing password" });
  }
};

// @desc    Public: Request password reset link via email
// @route   POST /api/users/forgot-password
// @access  Public
export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const clientOrigin = req.headers.origin as string | undefined;
    const result = await UserService.forgotPassword(req.body.email, clientOrigin);
    res.status(result.status).json(result.data);
  } catch (error) {
    res.status(500).json({ message: "Server error while processing password reset request" });
  }
};

// @desc    Public: Reset password using verification token
// @route   POST /api/users/reset-password
// @access  Public
export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await UserService.resetPassword(req.body);
    res.status(result.status).json(result.data);
  } catch (error) {
    res.status(500).json({ message: "Server error while resetting password" });
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

    const result = await UserService.getUsersDirectory(
      { page, limit, role: requestedRole, search },
      req.user?.role
    );
    res.status(result.status).json(result.data);
  } catch (error) {
    res.status(500).json({ message: "Server error while fetching users" });
  }
};

// @desc    Delete user (Admin full access, Teacher students only)
// @route   DELETE /api/users/delete/:id
// @access  Private (Admin / Teacher)
export const deleteUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await UserService.deleteUser(
      req.params.id as string,
      req.user?.role,
      req.user?._id?.toString()
    );
    res.status(result.status).json(result.data);
  } catch (error) {
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
          phoneNumber: req.user.phoneNumber || "",
          address: req.user.address || "",
          emergencyContact: req.user.emergencyContact || { name: "", phone: "", relationship: "" },
          avatar: req.user.avatar || "",
          studentClass: req.user.studentClass,
          teacherSubject: req.user.teacherSubject,
        },
      });
    } else {
      res.status(401).json({ message: "Not authorized" });
    }
  } catch (error) {
    res.status(500).json({ message: "Server error while fetching profile" });
  }
};

// @desc    Logout user / clear cookie
// @route   POST /api/users/logout
// @access  Public
export const logoutUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const isProduction = process.env.NODE_ENV === "production";
    res.cookie("jwt", "", {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? ((process.env.COOKIE_SAME_SITE as any) || "none") : "lax",
      expires: new Date(0), // expire the cookie immediately
      path: "/",
    });
    res.json({ message: "Logged out successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error during logout" });
  }
};
