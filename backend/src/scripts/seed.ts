import dotenv from "dotenv";
import { connectDB } from "../config/db.ts";
import { seedDefaultData } from "../config/seedDefaultData.ts";
import mongoose from "mongoose";

dotenv.config();

async function runSeed() {
  console.log("🌱 Starting SchoolSync explicit database seed...");
  try {
    await connectDB();
    await seedDefaultData();
    console.log("✅ Database seeding completed successfully.");
  } catch (error) {
    console.error("❌ Error during database seeding:", error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log("🔒 MongoDB connection closed.");
    process.exit(0);
  }
}

runSeed();
