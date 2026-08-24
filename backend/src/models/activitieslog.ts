import mongoose, { Schema, Document } from "mongoose";

export interface IActivityLog extends Document {
  user: mongoose.Types.ObjectId | string;
  action: string;
  details?: string;
  createdAt: Date;
  updatedAt: Date;
}

const activitiesLogSchema = new Schema<IActivityLog>(
  {
    user: { type: Schema.Types.ObjectId, required: true, ref: "User" },
    action: { type: String, required: true },
    details: { type: String },
  },
  {
    timestamps: true,
  }
);

// Compound Index: Optimizes chronological audit queries per user
activitiesLogSchema.index({ user: 1, createdAt: -1 });

// Time-To-Live (TTL) Index: Automatically purges activity logs older than 90 days
activitiesLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

export const ActivitiesLog = mongoose.model<IActivityLog>(
  "ActivitiesLog",
  activitiesLogSchema
);
export default ActivitiesLog;
