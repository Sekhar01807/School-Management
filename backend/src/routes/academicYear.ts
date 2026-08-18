import express from "express";
import {
  createAcademicYear,
  getCurrentAcademicYear,
  updateAcademicYear,
  deleteAcademicYear,
  getAllAcademicYears,
} from "../controllers/academicYear.ts";
import { authorize, protect } from "../middleware/auth.ts";

const academicYearRouter = express.Router();

// Admin lists academic years
academicYearRouter
  .route("/")
  .get(protect, authorize(["admin"]), getAllAcademicYears);

// Admin creates academic years
academicYearRouter
  .route("/create")
  .post(protect, authorize(["admin"]), createAcademicYear);

// Protected: all authenticated users can get the current active academic year
academicYearRouter
  .route("/current")
  .get(protect, getCurrentAcademicYear);

// Admin updates academic years (supports both PUT and PATCH)
academicYearRouter
  .route("/update/:id")
  .put(protect, authorize(["admin"]), updateAcademicYear)
  .patch(protect, authorize(["admin"]), updateAcademicYear);

// Admin deletes academic years
academicYearRouter
  .route("/delete/:id")
  .delete(protect, authorize(["admin"]), deleteAcademicYear);

export default academicYearRouter;
