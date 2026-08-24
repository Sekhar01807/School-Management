import multer from "multer";
import path from "path";
import fs from "fs";

const UPLOADS_DIR = path.join(process.cwd(), "uploads", "avatars");

// Ensure upload directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Configure disk storage
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req: any, file, cb) => {
    const userId = req.user?.id || "user";
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

export const uploadAvatarMiddleware = multer({
  storage,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2 Megabytes max limit
  },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only JPEG, PNG, and WebP images are permitted."));
    }
  },
});
