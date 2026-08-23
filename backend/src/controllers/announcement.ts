import { type Response } from "express";
import { type AuthRequest } from "../middleware/auth.ts";
import * as announcementService from "../services/announcementService.ts";

// @desc    Get all announcements relevant to logged-in user
// @route   GET /api/announcements
// @access  Private
export const getAnnouncements = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const announcements = await announcementService.getAnnouncementsForUser(req.user!);
    res.json(announcements);
  } catch (error: any) {
    console.error("Get announcements error:", error);
    res.status(500).json({ message: error.message || "Failed to fetch announcements" });
  }
};

// @desc    Create a new announcement
// @route   POST /api/announcements
// @access  Private (Admin, Teacher)
export const createAnnouncement = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { title, content, audience, targetClass, priority, expiryDate } = req.body;

    if (!title || !content) {
      res.status(400).json({ message: "Title and content are required" });
      return;
    }

    const announcement = await announcementService.createAnnouncement(
      {
        title,
        content,
        audience,
        targetClass,
        priority,
        expiryDate,
      },
      req.user!
    );

    res.status(201).json({
      message: "Announcement published successfully",
      announcement,
    });
  } catch (error: any) {
    console.error("Create announcement error:", error);
    res.status(400).json({ message: error.message || "Failed to create announcement" });
  }
};

// @desc    Update an announcement
// @route   PUT /api/announcements/:id
// @access  Private (Admin, Author)
export const updateAnnouncement = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updated = await announcementService.updateAnnouncement(id, req.body, req.user!);
    res.json({
      message: "Announcement updated successfully",
      announcement: updated,
    });
  } catch (error: any) {
    console.error("Update announcement error:", error);
    res.status(400).json({ message: error.message || "Failed to update announcement" });
  }
};

// @desc    Delete an announcement
// @route   DELETE /api/announcements/:id
// @access  Private (Admin, Author)
export const deleteAnnouncement = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await announcementService.deleteAnnouncement(id, req.user!);
    res.json(result);
  } catch (error: any) {
    console.error("Delete announcement error:", error);
    res.status(400).json({ message: error.message || "Failed to delete announcement" });
  }
};
