import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

import { User } from "../models/user.ts";
import { AcademicYear } from "../models/academicYear.ts";
import { Class } from "../models/class.ts";
import { Subject } from "../models/subject.ts";
import { Timetable } from "../models/timetable.ts";
import { Exam } from "../models/exam.ts";
import { Submission } from "../models/submission.ts";
import { ActivitiesLog } from "../models/activitieslog.ts";


async function initializeDatabase() {
  const mongoUrl = process.env.MONGO_URL;
  if (!mongoUrl) {
    console.error("❌ MONGO_URL not defined in .env");
    process.exit(1);
  }

  console.log("Connecting to MongoDB Atlas Cluster with database: school_management ...");
  const conn = await mongoose.connect(mongoUrl);
  console.log(`✅ Connected successfully to: ${conn.connection.name}`);

  // Ensure collection creation and index synchronization
  console.log("Initializing collections and indexes in 'school_management' database...");
  await User.init();
  await AcademicYear.init();
  await Class.init();
  await Subject.init();
  await Timetable.init();
  await Exam.init();
  await Submission.init();
  await ActivitiesLog.init();

  const collections = await conn.connection.db?.listCollections().toArray();
  console.log("Active collections in database:", collections?.map((c) => c.name));

  console.log("🎉 Database 'school_management' is successfully created and initialized in your MongoDB Atlas cluster!");
  await mongoose.disconnect();
  process.exit(0);
}

initializeDatabase().catch((err) => {
  console.error("❌ Error initializing database:", err);
  process.exit(1);
});
