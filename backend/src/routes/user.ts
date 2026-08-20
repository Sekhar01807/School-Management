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
import { validateBody } from "../middleware/validate.ts";
import {
  validateRegister,
  validateLogin,
  validateUpdateUser,
} from "../validators/schemas.ts";

const userRoutes = express.Router();

// User Registration (Public registration & authenticated user creation)
userRoutes.post(
  "/register",
  validateBody(validateRegister),
  register
);

// Authentication & Session
userRoutes.post("/login", loginRateLimiter, validateBody(validateLogin), login);
userRoutes.post("/logout", logoutUser);
userRoutes.get("/profile", protect, getUserProfile);

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
