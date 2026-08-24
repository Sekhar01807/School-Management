import dotenv from "dotenv";
import { connectDB } from "../config/db.ts";
import { seedDefaultData } from "../config/seedDefaultData.ts";
import { logger } from "../utils/logger.ts";
import mongoose from "mongoose";

dotenv.config();

async function runSeed() {
  logger.info("Starting SchoolSync explicit database seed...", "SEED");
  try {
    await connectDB();
    await seedDefaultData();
    logger.success("Database seeding completed successfully.", "SEED");
  } catch (error) {
    logger.error("Error during database seeding:", "SEED", error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    logger.info("MongoDB connection closed.", "DATABASE");
    process.exit(0);
  }
}

runSeed();
