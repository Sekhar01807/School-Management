import type { Request, Response } from "express";
import User from "../models/user.ts";

/**
 * Upload User Avatar
 * Route: POST /api/upload/avatar
 * Access: Authenticated User
 */
export const uploadAvatar = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ message: "No image file provided for upload." });
      return;
    }

    const relativeUrl = `/uploads/avatars/${req.file.filename}`;
    const userId = req.user?.id;

    if (userId) {
      // Automatically update user document with the new avatar URL
      await User.findByIdAndUpdate(userId, { avatar: relativeUrl });
    }

    res.status(200).json({
      success: true,
      message: "Avatar uploaded and updated successfully.",
      avatarUrl: relativeUrl,
    });
  } catch (err: any) {
    console.error("Avatar upload error:", err.message);
    res.status(500).json({ message: "Failed to upload avatar image." });
  }
};
