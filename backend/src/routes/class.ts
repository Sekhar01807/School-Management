import express from "express";
import {
  createClass,
  updateClass,
  deleteClass,
  getAllClasses,
} from "../controllers/class.ts";
import { authorize, protect } from "../middleware/auth.ts";

const classRouter = express.Router();

// Admin creates classes
classRouter.post("/create", protect, authorize(["admin"]), createClass);

// Admin & Teacher can view classes (needed for teachers when generating exams)
classRouter.get("/", protect, authorize(["admin", "teacher"]), getAllClasses);

// Support both PUT and PATCH for updating classes
classRouter.put("/update/:id", protect, authorize(["admin"]), updateClass);
classRouter.patch("/update/:id", protect, authorize(["admin"]), updateClass);

// Admin deletes classes
classRouter.delete("/delete/:id", protect, authorize(["admin"]), deleteClass);

export default classRouter;
