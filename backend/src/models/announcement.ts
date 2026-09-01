import mongoose, { Schema, Document } from "mongoose";

export type AnnouncementAudience = "all" | "teacher" | "student" | "class";
export type AnnouncementPriority = "low" | "medium" | "high" | "urgent";

export interface IAnnouncement extends Document {
  title: string;
  content: string;
  audience: AnnouncementAudience[];
  targetClass?: mongoose.Types.ObjectId | string | null;
  priority: AnnouncementPriority;
  createdBy: mongoose.Types.ObjectId | string;
  isActive: boolean;
  expiryDate?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const announcementSchema = new Schema<IAnnouncement>(
  {
    title: {
      type: String,
      required: [true, "Announcement title is required"],
      trim: true,
      maxlength: [200, "Title cannot exceed 200 characters"],
    },
    content: {
      type: String,
      required: [true, "Announcement content is required"],
      trim: true,
    },
    audience: {
      type: [
        {
          type: String,
          enum: ["all", "teacher", "student", "class"],
        },
      ],
      default: ["all"],
      required: true,
    },
    targetClass: {
      type: Schema.Types.ObjectId,
      ref: "Class",
      default: null,
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    expiryDate: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for audience targeting, priority filtering, and chronological sorting
announcementSchema.index({ audience: 1, isActive: 1, createdAt: -1 });
announcementSchema.index({ targetClass: 1, isActive: 1 });
announcementSchema.index({ priority: 1, createdAt: -1 });

export const Announcement = mongoose.model<IAnnouncement>("Announcement", announcementSchema);
export default Announcement;
