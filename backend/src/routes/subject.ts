import express from "express";
import {
  createSubject,
  getAllSubjects,
  updateSubject,
  deleteSubject,
} from "../controllers/subject.ts";
import { protect, authorize } from "../middleware/auth.ts";
import { validateBody } from "../middleware/validate.ts";
import {
  validateCreateSubject,
  validateUpdateSubject,
} from "../validators/schemas.ts";

const subjectRouter = express.Router();

// Create Subject (Admin only)
subjectRouter.post(
  "/create",
  protect,
  authorize(["admin"]),
  validateBody(validateCreateSubject),
  createSubject
);

// Get All Subjects
subjectRouter.get("/", getAllSubjects);

// Update Subject (Admin only, supports PUT and PATCH)
subjectRouter.put(
  "/update/:id",
  protect,
  authorize(["admin"]),
  validateBody(validateUpdateSubject),
  updateSubject
);
subjectRouter.patch(
  "/update/:id",
  protect,
  authorize(["admin"]),
  validateBody(validateUpdateSubject),
  updateSubject
);

// Delete Subject (Admin only)
subjectRouter.delete(
  "/delete/:id",
  protect,
  authorize(["admin"]),
  deleteSubject
);

export default subjectRouter;
