import mongoose from "mongoose";
import { logger } from "../utils/logger.ts";

/**
 * Connect to MongoDB with enterprise connection pooling and timeout configurations
 */
export const connectDB = async () => {
  try {
    const mongoUrl = process.env.MONGO_URL as string;
    if (!mongoUrl) {
      throw new Error("MONGO_URL environment variable is not defined.");
    }

    const conn = await mongoose.connect(mongoUrl, {
      maxPoolSize: 10, // Maintain sufficient connection pool
      minPoolSize: 1, // Connect instantly with 1 socket instead of waiting for 5
      serverSelectionTimeoutMS: 5000, // Timeout fast after 5 seconds if primary server is unreachable
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      autoIndex: false, // Disable costly index rebuilds on startup
    });

    logger.success(
      `MongoDB Connected: ${conn.connection.host} | Database: ${conn.connection.name}`,
      "DATABASE"
    );
  } catch (error) {
    logger.error(`MongoDB Connection Error: ${(error as Error).message}`, "DATABASE", error);
    process.exit(1); // Exit process with failure
  }
};
