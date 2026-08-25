import express, { type Request, type Response, type NextFunction } from "express";
import { uploadAvatar } from "../controllers/upload.ts";
import { protect } from "../middleware/auth.ts";
import { uploadAvatarMiddleware } from "../middleware/upload.ts";

const uploadRouter = express.Router();

// Handle multer upload with custom error interceptor for file size/MIME errors
const handleAvatarUpload = (req: Request, res: Response, next: NextFunction) => {
  uploadAvatarMiddleware.single("avatar")(req, res, (err: any) => {
    if (err) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ message: "Image size exceeds the maximum permitted limit of 2MB." });
      }
      return res.status(400).json({ message: err.message || "Failed to process image upload." });
    }
    next();
  });
};

// POST /api/upload/avatar (Authenticated)
uploadRouter.post("/avatar", protect, handleAvatarUpload, uploadAvatar as any);

export default uploadRouter;
