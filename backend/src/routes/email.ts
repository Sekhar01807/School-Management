import express from "express";
import {
  getEmailStatus,
  sendTestEmail,
  triggerCronJob,
} from "../controllers/email.ts";
import { protect, authorize } from "../middleware/auth.ts";

const emailRouter = express.Router();

// Email engine status & provider health (Public health view)
emailRouter.get("/status", getEmailStatus);

// Live test email dispatch endpoint
emailRouter.post("/test", sendTestEmail);

// Manual trigger for background cron jobs (Admin only)
emailRouter.post("/trigger-cron", protect, authorize(["admin"]), triggerCronJob);

export default emailRouter;
