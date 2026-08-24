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
      maxPoolSize: 20, // Maintain up to 20 socket connections under peak load
      minPoolSize: 5, // Keep at least 5 connections open to prevent cold starts
      serverSelectionTimeoutMS: 5000, // Timeout fast after 5 seconds if primary server is unreachable
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      autoIndex: process.env.NODE_ENV !== "production", // Disable costly auto-indexing in production
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
