import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { logger } from "../utils/logger.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

import { User } from "../models/user.ts";
import { AcademicYear } from "../models/academicYear.ts";
import { Class } from "../models/class.ts";
import { Subject } from "../models/subject.ts";
import { Timetable } from "../models/timetable.ts";
import { Exam } from "../models/exam.ts";
import { Submission } from "../models/submission.ts";
import { Attendance } from "../models/attendance.ts";
import { Announcement } from "../models/announcement.ts";
import { ActivitiesLog } from "../models/activitieslog.ts";
import { seedDefaultData } from "../config/seedDefaultData.ts";

export async function cleanAndSeedDatabase() {
  const mongoUrl = process.env.MONGO_URL;
  if (!mongoUrl) {
    logger.error("MONGO_URL not defined in .env", "DATABASE");
    process.exit(1);
  }

  logger.info("STARTING COMPLETE DATABASE CLEAN & FRESH RESET", "DATABASE");

  let isLocalConnection = false;
  if (mongoose.connection.readyState !== 1) {
    const conn = await mongoose.connect(mongoUrl);
    logger.success(`Connected to Database: ${conn.connection.name}`, "DATABASE");
    isLocalConnection = true;
  }

  const db = mongoose.connection.db;
  if (db) {
    const collections = await db.listCollections().toArray();
    logger.info(`Found ${collections.length} collection(s) in '${mongoose.connection.name}'`, "DATABASE", {
      collections: collections.map((c) => c.name),
    });

    for (const col of collections) {
      try {
        await db.dropCollection(col.name);
        logger.info(`Dropped collection: ${col.name}`, "DATABASE");
      } catch (err: any) {
        logger.warn(`Could not drop collection ${col.name}: ${err.message}`, "DATABASE");
      }
    }
  }

  logger.info("Seeding fresh initial data...", "SEED");
  await seedDefaultData();

  logger.success("DATABASE CLEAN & FRESH RESET COMPLETE!", "DATABASE");

  if (isLocalConnection) {
    await mongoose.disconnect();
    logger.info("Disconnected from MongoDB.", "DATABASE");
  }
}

// If executed directly from CLI: npx tsx src/scripts/cleanDb.ts
if (process.argv[1] && process.argv[1].endsWith("cleanDb.ts")) {
  cleanAndSeedDatabase()
    .then(() => {
      process.exit(0);
    })
    .catch((err) => {
      logger.error("Fatal error during database clean:", "DATABASE", err);
      process.exit(1);
    });
}
