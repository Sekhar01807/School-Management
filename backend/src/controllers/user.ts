import { type Request, type Response } from "express";
import { UserService } from "../services/userService.ts";
import type { AuthRequest } from "../middleware/auth.ts";

// @desc    Register a new user
// @route   POST /api/users/register
// @access  Private (Admin & Teacher with restrictions)
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
      req.params.id,
      req.body,
      req.user?.role,
      req.user?._id?.toString()
    );
    res.status(result.status).json(result.data);
  } catch (error) {
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
      req.params.id,
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
