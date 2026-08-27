import express from "express";
import {
  getEmailStatus,
  sendTestEmail,
  triggerCronJob,
} from "../controllers/email.ts";
import { protect, authorize } from "../middleware/auth.ts";
import { emailTestRateLimiter } from "../middleware/rateLimiter.ts";
import { validateBody } from "../middleware/validate.ts";
import { validateSendTestEmail } from "../validators/schemas.ts";

const emailRouter = express.Router();

// Email engine status & provider health (Public health view)
emailRouter.get("/status", getEmailStatus);

// Live test email dispatch endpoint (Admin only + Rate Limited + Validated)
emailRouter.post(
  "/test",
  protect,
  authorize(["admin"]),
  emailTestRateLimiter,
  validateBody(validateSendTestEmail),
  sendTestEmail
);

// Manual trigger for background cron jobs (Admin only)
emailRouter.post("/trigger-cron", protect, authorize(["admin"]), triggerCronJob);

export default emailRouter;

