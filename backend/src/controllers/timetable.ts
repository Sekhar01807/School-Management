import { type Response } from "express";
import { logActivity } from "../utils/activitieslog.ts";
import { inngest } from "../inngest/index.ts";
import Timetable from "../models/timetable.ts";
import type { AuthRequest } from "../middleware/auth.ts";

// @desc    Generate a Timetable using AI
// @route   POST /api/timetables/generate
// @access  Private/Admin
export const generateTimetable = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { classId, academicYearId, settings } = req.body;

    if (!classId || !academicYearId) {
      res.status(400).json({ message: "Class ID and Academic Year ID are required." });
      return;
    }

    await inngest.send({
      name: "generate/timetable",
      data: {
        classId,
        academicYearId,
        settings,
      },
    });

    if (req.user) {
      await logActivity({
        userId: req.user._id.toString(),
        action: `Requested timetable generation for class ID: ${classId}`,
      });
    }

    res.status(200).json({ message: "Timetable generation initiated" });
  } catch (error) {
    console.error("Generate timetable error:", error);
    res.status(500).json({ message: "Server error while generating timetable" });
  }
};

// @desc    Get Timetable by Class (Class-authorized for students)
// @route   GET /api/timetables/:classId
// @access  Private
export const getTimetable = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const requestedClassId = req.params.classId;
    const user = req.user;

    if (!user) {
      res.status(401).json({ message: "Not authorized" });
      return;
    }

    // RBAC: Students can only view their own class timetable
    if (user.role === "student") {
      const studentClassId = user.studentClass ? user.studentClass.toString() : "";
      if (!studentClassId || studentClassId !== requestedClassId) {
        res.status(403).json({
          message: "You are only authorized to view the timetable for your enrolled class.",
        });
        return;
      }
    }

    const timetable = await Timetable.findOne({ class: requestedClassId })
      .populate("schedule.periods.subject", "name code")
      .populate("schedule.periods.teacher", "name email");

    if (!timetable) {
      res.status(404).json({ message: "Timetable not found for this class." });
      return;
    }

    res.json(timetable);
  } catch (error: any) {
    console.error("Get timetable error:", error);
    res.status(500).json({ message: "Server error while fetching timetable" });
  }
};
