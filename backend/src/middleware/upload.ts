// @ts-ignore
import multer from "multer";
import path from "path";
import fs from "fs";

const UPLOADS_DIR = path.join(process.cwd(), "uploads", "avatars");

// Ensure upload directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Configure disk storage
const storage = (multer as any).diskStorage({
  destination: (_req: any, _file: any, cb: (error: Error | null, destination: string) => void) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req: any, file: any, cb: (error: Error | null, filename: string) => void) => {
    const userId = req.user?._id?.toString() || req.user?.id || "user";
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname).toLowerCase() || ".png";
    cb(null, `avatar_${userId}_${uniqueSuffix}${ext}`);
  },
});

// Allowed image MIME types
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

export const uploadAvatarMiddleware = (multer as any)({
  storage,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2 Megabytes max limit
  },
  fileFilter: (_req: any, file: any, cb: (error: Error | null, acceptFile?: boolean) => void) => {
    if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only JPEG, PNG, and WebP images are permitted."));
    }
  },
});
