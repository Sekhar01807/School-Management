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
import {
  loginRateLimiter,
  registerRateLimiter,
  passwordResetRateLimiter,
} from "../middleware/rateLimiter.ts";
import { protect, protectOptional, authorize } from "../middleware/auth.ts";
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

// User Registration (Public registration & authenticated user creation, rate-limited to 5/15min)
userRoutes.post(
  "/register",
  registerRateLimiter,
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

// Public Password Recovery Flow (Rate-limited to 3/15min)
userRoutes.post(
  "/forgot-password",
  passwordResetRateLimiter,
  validateBody(validateForgotPassword),
  forgotPassword
);
userRoutes.post(
  "/reset-password",
  passwordResetRateLimiter,
  validateBody(validateResetPassword),
  resetPassword
);

// User Directory (Admin all, Teacher students only)
userRoutes.get("/", protect, authorize(["admin", "teacher"]), getUsers);

// Update User (Admin only, supports both PUT and PATCH)
userRoutes.put(
  "/update/:id",
  protect,
  authorize(["admin"]),
  validateBody(validateUpdateUser),
  updateUser
);
userRoutes.patch(
  "/update/:id",
  protect,
  authorize(["admin"]),
  validateBody(validateUpdateUser),
  updateUser
);

// Delete User (Admin only)
userRoutes.delete(
  "/delete/:id",
  protect,
  authorize(["admin"]),
  deleteUser
);

export default userRoutes;
