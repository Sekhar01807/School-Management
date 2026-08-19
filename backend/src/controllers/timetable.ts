import { type Response } from "express";
import { TimetableService } from "../services/timetableService.ts";
import type { AuthRequest } from "../middleware/auth.ts";

// @desc    Generate a Timetable using AI
// @route   POST /api/timetables/generate
// @access  Private/Admin
export const generateTimetable = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const result = await TimetableService.generateTimetable(
      req.body,
      req.user?._id?.toString()
    );
    res.status(result.status).json(result.data);
  } catch (error) {
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
    if (!req.user) {
      res.status(401).json({ message: "Not authorized" });
      return;
    }
    const result = await TimetableService.getTimetable(
      req.params.classId,
      req.user
    );
    res.status(result.status).json(result.data);
  } catch (error) {
    res.status(500).json({ message: "Server error while fetching timetable" });
  }
};
