import express from "express";
import {
  createClass,
  getAllClasses,
  getClassById,
  updateClass,
  deleteClass,
} from "../controllers/class.ts";
import { protect, authorize } from "../middleware/auth.ts";
import { validateBody } from "../middleware/validate.ts";
import {
  validateCreateClass,
  validateUpdateClass,
} from "../validators/schemas.ts";

const classRouter = express.Router();

// Create Class (Admin only)
classRouter.post(
  "/create",
  protect,
  authorize(["admin"]),
  validateBody(validateCreateClass),
  createClass
);

// Get All Classes (Authenticated Users)
classRouter.get(
  "/",
  protect,
  authorize(["admin", "teacher", "student"]),
  getAllClasses
);

// Get Class Details by ID (Authenticated Users)
classRouter.get(
  "/:id",
  protect,
  authorize(["admin", "teacher", "student"]),
  getClassById
);

// Update Class (Admin only, supports PUT and PATCH)
classRouter.put(
  "/update/:id",
  protect,
  authorize(["admin"]),
  validateBody(validateUpdateClass),
  updateClass
);
classRouter.patch(
  "/update/:id",
  protect,
  authorize(["admin"]),
  validateBody(validateUpdateClass),
  updateClass
);

// Delete Class (Admin only)
classRouter.delete("/delete/:id", protect, authorize(["admin"]), deleteClass);

export default classRouter;
