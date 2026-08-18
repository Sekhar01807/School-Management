import { type Response } from "express";
import ActivityLog from "../models/activitieslog.ts";
import type { AuthRequest } from "../middleware/auth.ts";

// @desc    Get System Activity Logs (Paginated)
// @route   GET /api/activities
// @access  Private/Admin
export const getAllActivities = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const count = await ActivityLog.countDocuments();

    const logs = await ActivityLog.find()
      .populate("user", "name email role")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      logs,
      page,
      pages: Math.ceil(count / limit) || 1,
      total: count,
    });
  } catch (error) {
    console.error("Get all activities error:", error);
    res.status(500).json({ message: "Server error while fetching activity logs" });
  }
};
