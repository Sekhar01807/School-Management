import express from "express";
import { protect, authorize } from "../middleware/auth.ts";
import { getAllActivities } from "../controllers/activitieslog.ts";

const LogsRouter = express.Router();

// System Activity Logs are strictly accessible to Admins
LogsRouter.get("/", protect, authorize(["admin"]), getAllActivities);

export default LogsRouter;
