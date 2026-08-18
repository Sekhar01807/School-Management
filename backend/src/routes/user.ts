import express from "express";
import {
  register,
  login,
  updateUser,
  deleteUser,
  logoutUser,
  getUserProfile,
  getUsers,
} from "../controllers/user.ts";
import { protect, authorize } from "../middleware/auth.ts";
import { loginRateLimiter } from "../middleware/rateLimiter.ts";

const userRoutes = express.Router();

// User Registration (Admin full access, Teacher students only)
userRoutes.post(
  "/register",
  protect,
  authorize(["admin", "teacher"]),
  register
);

// Authentication & Session
userRoutes.post("/login", loginRateLimiter, login);
userRoutes.post("/logout", logoutUser);
userRoutes.get("/profile", protect, getUserProfile);

// User Directory (Admin all, Teacher students only)
userRoutes.get("/", protect, authorize(["admin", "teacher"]), getUsers);

// Update User (Supports both PUT and PATCH)
userRoutes.put(
  "/update/:id",
  protect,
  authorize(["admin", "teacher"]),
  updateUser
);
userRoutes.patch(
  "/update/:id",
  protect,
  authorize(["admin", "teacher"]),
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
