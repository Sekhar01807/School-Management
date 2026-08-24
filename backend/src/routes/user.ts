import express from "express";
import {
  register,
  login,
  updateUser,
  deleteUser,
  logoutUser,
  getUserProfile,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
  getUsers,
} from "../controllers/user.ts";
import { protect, authorize, protectOptional } from "../middleware/auth.ts";
import { loginRateLimiter } from "../middleware/rateLimiter.ts";
import { validateBody } from "../middleware/validate.ts";
import {
  validateRegister,
  validateLogin,
  validateUpdateUser,
  validateUpdateProfile,
  validateChangePassword,
  validateForgotPassword,
  validateResetPassword,
} from "../validators/schemas.ts";

const userRoutes = express.Router();

// User Registration (Public registration & authenticated user creation)
userRoutes.post(
  "/register",
  protectOptional,
  validateBody(validateRegister),
  register
);

// Authentication & Session
userRoutes.post("/login", loginRateLimiter, validateBody(validateLogin), login);
userRoutes.post("/logout", logoutUser);
userRoutes.get("/profile", protect, getUserProfile);

// Self-Service Profile & Password Management
userRoutes.put("/profile", protect, validateBody(validateUpdateProfile), updateProfile);
userRoutes.put("/change-password", protect, validateBody(validateChangePassword), changePassword);

// Public Password Recovery Flow
userRoutes.post("/forgot-password", validateBody(validateForgotPassword), forgotPassword);
userRoutes.post("/reset-password", validateBody(validateResetPassword), resetPassword);

// User Directory (Admin all, Teacher students only)
userRoutes.get("/", protect, authorize(["admin", "teacher"]), getUsers);

// Update User (Supports both PUT and PATCH)
userRoutes.put(
  "/update/:id",
  protect,
  authorize(["admin", "teacher"]),
  validateBody(validateUpdateUser),
  updateUser
);
userRoutes.patch(
  "/update/:id",
  protect,
  authorize(["admin", "teacher"]),
  validateBody(validateUpdateUser),
  updateUser
);

// Delete User
userRoutes.delete(
  "/delete/:id",
  protect,
  authorize(["admin", "teacher"]),
  deleteUser
);

export default userRoutes;
