import express from "express";
import { authorize, protect } from "../middleware/auth.ts";
import {
  createSubject,
  getAllSubjects,
  updateSubject,
  deleteSubject,
} from "../controllers/subject.ts";

const subjectRouter = express.Router();

// Admin creates subjects
subjectRouter
  .route("/create")
  .post(protect, authorize(["admin"]), createSubject);

// Admin & Teacher can view subjects
subjectRouter
  .route("/")
  .get(protect, authorize(["admin", "teacher"]), getAllSubjects);

// Admin deletes subjects
subjectRouter
  .route("/delete/:id")
  .delete(protect, authorize(["admin"]), deleteSubject);

// Support both PUT and PATCH for updating subjects
subjectRouter
  .route("/update/:id")
  .put(protect, authorize(["admin"]), updateSubject)
  .patch(protect, authorize(["admin"]), updateSubject);

export default subjectRouter;
