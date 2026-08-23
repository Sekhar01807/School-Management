import mongoose, { Schema, Document } from "mongoose";

export type AttendanceStatus = "present" | "absent" | "late" | "excused";

export interface IAttendanceRecord {
  student: mongoose.Types.ObjectId | string;
  status: AttendanceStatus;
  remarks?: string;
}

export interface IAttendance extends Document {
  class: mongoose.Types.ObjectId | string;
  academicYear: mongoose.Types.ObjectId | string;
  date: Date;
  recordedBy: mongoose.Types.ObjectId | string;
  records: IAttendanceRecord[];
  createdAt: Date;
  updatedAt: Date;
}

const attendanceRecordSchema = new Schema(
  {
    student: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["present", "absent", "late", "excused"],
      default: "present",
      required: true,
    },
    remarks: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { _id: false }
);

const attendanceSchema = new Schema<IAttendance>(
  {
    class: {
      type: Schema.Types.ObjectId,
      ref: "Class",
      required: [true, "Class ID is required"],
      index: true,
    },
    academicYear: {
      type: Schema.Types.ObjectId,
      ref: "AcademicYear",
      required: [true, "Academic Year is required"],
      index: true,
    },
    date: {
      type: Date,
      required: [true, "Attendance date is required"],
      index: true,
    },
    recordedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    records: [attendanceRecordSchema],
  },
  {
    timestamps: true,
  }
);

// One attendance record per class per calendar date
attendanceSchema.index({ class: 1, date: 1 }, { unique: true });
// Fast lookup for student attendance history
attendanceSchema.index({ "records.student": 1, date: -1 });

export const Attendance = mongoose.model<IAttendance>("Attendance", attendanceSchema);
export default Attendance;
