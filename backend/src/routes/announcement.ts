import express from "express";
import {
  getAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
} from "../controllers/announcement.ts";
import { protect, authorize } from "../middleware/auth.ts";

const router = express.Router();

// Get announcements for the current user
router.get("/", protect, getAnnouncements);

// Create announcement (Admin, Teacher)
router.post("/", protect, authorize(["admin", "teacher"]), createAnnouncement);

// Update announcement (Admin, Author)
router.put("/:id", protect, authorize(["admin", "teacher"]), updateAnnouncement);

// Delete announcement (Admin, Author)
router.delete("/:id", protect, authorize(["admin", "teacher"]), deleteAnnouncement);

export default router;
