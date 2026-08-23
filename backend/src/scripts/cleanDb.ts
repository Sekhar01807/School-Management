import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

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
    console.error("❌ MONGO_URL not defined in .env");
    process.exit(1);
  }

  console.log("==================================================");
  console.log("🧹 STARTING COMPLETE DATABASE CLEAN & FRESH RESET");
  console.log("==================================================");

  let isLocalConnection = false;
  if (mongoose.connection.readyState !== 1) {
    const conn = await mongoose.connect(mongoUrl);
    console.log(`Connected to Database: ${conn.connection.name}`);
    isLocalConnection = true;
  }

  const db = mongoose.connection.db;
  if (db) {
    const collections = await db.listCollections().toArray();
    console.log(`Found ${collections.length} collection(s) in '${mongoose.connection.name}':`, collections.map((c) => c.name));

    for (const col of collections) {
      try {
        await db.dropCollection(col.name);
        console.log(`  🗑️  Dropped collection: ${col.name}`);
      } catch (err: any) {
        console.warn(`  ⚠️  Could not drop collection ${col.name}:`, err.message);
      }
    }
  }

  console.log("\n🌱 Seeding fresh initial data...");
  await seedDefaultData();

  console.log("==================================================");
  console.log("✨ DATABASE CLEAN & FRESH RESET COMPLETE!");
  console.log("==================================================");

  if (isLocalConnection) {
    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB.");
  }
}

// If executed directly from CLI: npx tsx src/scripts/cleanDb.ts
if (process.argv[1] && process.argv[1].endsWith("cleanDb.ts")) {
  cleanAndSeedDatabase()
    .then(() => {
      process.exit(0);
    })
    .catch((err) => {
      console.error("❌ Fatal error during database clean:", err);
      process.exit(1);
    });
}
