import express from "express";
import {
  createAcademicYear,
  getAllAcademicYears,
  updateAcademicYear,
  deleteAcademicYear,
  getCurrentAcademicYear,
} from "../controllers/academicYear.ts";
import { protect, authorize } from "../middleware/auth.ts";
import { validateBody } from "../middleware/validate.ts";
import {
  validateCreateAcademicYear,
  validateUpdateAcademicYear,
} from "../validators/schemas.ts";

const academicYearRouter = express.Router();

// Create Academic Year (Admin only)
academicYearRouter.post(
  "/create",
  protect,
  authorize(["admin"]),
  validateBody(validateCreateAcademicYear),
  createAcademicYear
);

// Get current active academic year (All authenticated users)
academicYearRouter.get(
  "/current",
  protect,
  authorize(["admin", "teacher", "student", "parent"]),
  getCurrentAcademicYear
);

// Get all academic years (Admin and Teacher)
academicYearRouter.get(
  "/",
  protect,
  authorize(["admin", "teacher"]),
  getAllAcademicYears
);

// Update Academic Year (Admin only, supports PUT and PATCH)
academicYearRouter.put(
  "/update/:id",
  protect,
  authorize(["admin"]),
  validateBody(validateUpdateAcademicYear),
  updateAcademicYear
);
academicYearRouter.patch(
  "/update/:id",
  protect,
  authorize(["admin"]),
  validateBody(validateUpdateAcademicYear),
  updateAcademicYear
);

// Delete Academic Year (Admin only)
academicYearRouter.delete(
  "/delete/:id",
  protect,
  authorize(["admin"]),
  deleteAcademicYear
);

export default academicYearRouter;
