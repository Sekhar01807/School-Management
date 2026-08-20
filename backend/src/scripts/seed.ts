import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

import { User } from "../models/user";
import { AcademicYear } from "../models/academicYear";
import { Class } from "../models/class";
import { Subject } from "../models/subject";

async function testDatabaseData() {
  await mongoose.connect(process.env.MONGO_URL as string);
  console.log("Connected to DB:", mongoose.connection.name);

  // Check if admin exists
  let admin = await User.findOne({ email: "admin@schoolsync.com" });
  if (!admin) {
    admin = await User.create({
      name: "School Administrator",
      email: "admin@schoolsync.com",
      password: "password123",
      role: "admin",
      isActive: true,
    });
    console.log("✅ Created initial Admin user: admin@schoolsync.com / password123");
  } else {
    console.log("Admin user already exists:", admin.email);
  }

  // Create default Academic Year if none
  let year = await AcademicYear.findOne({ isCurrent: true });
  if (!year) {
    year = await AcademicYear.create({
      name: "2025-2026",
      from: 2025,
      to: 2026,
      isCurrent: true,
    });
    console.log("✅ Created default Academic Year: 2025-2026");
  }

  // Create sample classes if none
  const classCount = await Class.countDocuments();
  if (classCount === 0) {
    const class10A = await Class.create({
      name: "Grade 10-A",
      capacity: 35,
      academicYear: year._id,
      classTeacher: admin._id,
    });
    const class11A = await Class.create({
      name: "Grade 11-A",
      capacity: 30,
      academicYear: year._id,
      classTeacher: admin._id,
    });
    console.log("✅ Created default Classes: Grade 10-A, Grade 11-A");

    // Create sample subjects
    await Subject.create([
      { name: "Mathematics", code: "MATH101", academicYear: year._id, teacher: admin._id },
      { name: "Physics", code: "PHY101", academicYear: year._id, teacher: admin._id },
      { name: "English Literature", code: "ENG101", academicYear: year._id, teacher: admin._id },
    ]);
    console.log("✅ Created default Subjects: Mathematics, Physics, English Literature");
  }

  const userCount = await User.countDocuments();
  const classesList = await Class.find();
  console.log(`Database has ${userCount} users and ${classesList.length} classes.`);

  await mongoose.disconnect();
}

testDatabaseData().catch(console.error);
