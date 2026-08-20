import User from "../models/user.ts";
import AcademicYear from "../models/academicYear.ts";
import Class from "../models/class.ts";
import Subject from "../models/subject.ts";

export async function seedDefaultData() {
  try {
    // 1. Ensure Admin Account exists
    let admin = await User.findOne({ email: "admin@schoolsync.com" });
    if (!admin) {
      admin = await User.create({
        name: "School Administrator",
        email: "admin@schoolsync.com",
        password: "password123",
        role: "admin",
        isActive: true,
      });
      console.log("🌱 Seeded initial Admin user: admin@schoolsync.com / password123");
    }

    // 2. Ensure Academic Year exists
    let currentYear = await AcademicYear.findOne({ isCurrent: true });
    if (!currentYear) {
      currentYear = await AcademicYear.create({
        name: "2025-2026",
        fromYear: new Date("2025-01-01"),
        toYear: new Date("2026-12-31"),
        isCurrent: true,
      });
      console.log("🌱 Seeded default Academic Year: 2025-2026");
    }

    // 3. Ensure sample classes exist
    const classCount = await Class.countDocuments();
    if (classCount === 0 && currentYear && admin) {
      const class10A = await Class.create({
        name: "Grade 10-A",
        capacity: 35,
        academicYear: currentYear._id,
        classTeacher: admin._id,
      });
      const class11A = await Class.create({
        name: "Grade 11-A",
        capacity: 30,
        academicYear: currentYear._id,
        classTeacher: admin._id,
      });
      console.log("🌱 Seeded default Classes: Grade 10-A, Grade 11-A");

      // 4. Ensure sample subjects exist
      await Subject.create([
        { name: "Mathematics", code: "MATH101", teacher: [admin._id], isActive: true },
        { name: "Physics", code: "PHY101", teacher: [admin._id], isActive: true },
        { name: "English Literature", code: "ENG101", teacher: [admin._id], isActive: true },
      ]);
      console.log("🌱 Seeded default Subjects: Mathematics, Physics, English Literature");
    }
  } catch (error) {
    console.error("Warning: Automatic data seeding encountered an issue:", (error as Error).message);
  }
}
