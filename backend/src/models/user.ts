import mongoose, { Document, Schema } from "mongoose";
import bcrypt from "bcryptjs";

export enum UserRole {
  ADMIN = "admin",
  TEACHER = "teacher",
  STUDENT = "student",
}

export type userRoles = "admin" | "teacher" | "student";

export interface IEmergencyContact {
  name?: string;
  phone?: string;
  relationship?: string;
}

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: userRoles;
  isActive: boolean;
  phoneNumber?: string;
  address?: string;
  emergencyContact?: IEmergencyContact;
  avatar?: string;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  studentClass?: mongoose.Types.ObjectId | string | null;
  teacherSubject?: (mongoose.Types.ObjectId | string)[] | null;
  parentId?: mongoose.Types.ObjectId | string | null;
  children?: (mongoose.Types.ObjectId | string)[] | null;
  matchPassword: (enteredPassword: string) => Promise<boolean>;
}

const userSchema: Schema<IUser> = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: Object.values(UserRole),
      required: true,
      default: UserRole.STUDENT,
    },
    isActive: { type: Boolean, default: true },
    phoneNumber: { type: String, trim: true, default: "" },
    address: { type: String, trim: true, default: "" },
    emergencyContact: {
      name: { type: String, trim: true, default: "" },
      phone: { type: String, trim: true, default: "" },
      relationship: { type: String, trim: true, default: "" },
    },
    avatar: { type: String, default: "" },
    resetPasswordToken: { type: String, select: false },
    resetPasswordExpires: { type: Date, select: false },
    studentClass: { type: mongoose.Schema.Types.ObjectId, ref: "Class" },
    teacherSubject: [{ type: mongoose.Schema.Types.ObjectId, ref: "Subject" }],
    parentId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    children: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  {
    timestamps: true,
  }
);

// Compound Indexes for fast directory, parent-child, and class lookups
userSchema.index({ role: 1, isActive: 1 });
userSchema.index({ studentClass: 1 });
userSchema.index({ parentId: 1 });
userSchema.index({ resetPasswordToken: 1 });

// pre-save middleware to hash password
userSchema.pre<IUser>("save", async function () {
  if (!this.isModified("password")) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// method to match entered password with hashed password
userSchema.methods.matchPassword = async function (enteredPassword: string) {
  return await bcrypt.compare(enteredPassword, this.password);
};

export const User = mongoose.model<IUser>("User", userSchema);
export default User;
