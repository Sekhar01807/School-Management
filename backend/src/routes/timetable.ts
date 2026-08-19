import express from "express";
import {
  generateTimetable,
  getTimetable,
} from "../controllers/timetable.ts";
import { protect, authorize } from "../middleware/auth.ts";
import { validateBody } from "../middleware/validate.ts";
import { validateGenerateTimetable } from "../validators/schemas.ts";

const timeRouter = express.Router();

// Generate Timetable (Admin only)
timeRouter.post(
  "/generate",
  protect,
  authorize(["admin"]),
  validateBody(validateGenerateTimetable),
  generateTimetable
);

// Get Timetable for a specific class (Students authorized for their class only, Teachers/Admins all)
timeRouter.get(
  "/:classId",
  protect,
  authorize(["admin", "teacher", "student", "parent"]),
  getTimetable
);

export default timeRouter;
