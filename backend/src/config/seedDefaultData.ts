import User from "../models/user.ts";
import AcademicYear from "../models/academicYear.ts";
import Class from "../models/class.ts";
import Subject from "../models/subject.ts";

export async function seedDefaultData() {
  try {
    // 1. Ensure Academic Year exists
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

    // 2. Ensure Admin Account exists
    let admin = await User.findOne({ email: "admin@schoolsync.com" });
    if (!admin) {
      admin = await User.create({
        name: "School Administrator",
        email: "admin@schoolsync.com",
        password: "password123",
        role: "admin",
        isActive: true,
      });
      console.log("🌱 Seeded Admin user: admin@schoolsync.com / password123");
    }

    // 3. Ensure Teacher Account exists
    let teacher = await User.findOne({ email: "teacher@schoolsync.com" });
    if (!teacher) {
      teacher = await User.create({
        name: "Sarah Jenkins",
        email: "teacher@schoolsync.com",
        password: "password123",
        role: "teacher",
        isActive: true,
      });
      console.log("🌱 Seeded Teacher user: teacher@schoolsync.com / password123");
    }

    // 4. Ensure sample classes exist
    let class10A = await Class.findOne({ name: "Grade 10-A" });
    if (!class10A && currentYear && (admin || teacher)) {
      class10A = await Class.create({
        name: "Grade 10-A",
        capacity: 35,
        academicYear: currentYear._id,
        classTeacher: teacher ? teacher._id : admin?._id,
      });
      console.log("🌱 Seeded Class: Grade 10-A");
    }

    let class11A = await Class.findOne({ name: "Grade 11-A" });
    if (!class11A && currentYear && (admin || teacher)) {
      class11A = await Class.create({
        name: "Grade 11-A",
        capacity: 30,
        academicYear: currentYear._id,
        classTeacher: teacher ? teacher._id : admin?._id,
      });
      console.log("🌱 Seeded Class: Grade 11-A");
    }

    // 5. Ensure Student Account exists
    let student = await User.findOne({ email: "student@schoolsync.com" });
    if (!student) {
      student = await User.create({
        name: "Alex Johnson",
        email: "student@schoolsync.com",
        password: "password123",
        role: "student",
        isActive: true,
        studentClass: class10A?._id || null,
      });
      console.log("🌱 Seeded Student user: student@schoolsync.com / password123 (Grade 10-A)");
    }

    // 6. Ensure sample subjects exist
    const subjectCount = await Subject.countDocuments();
    if (subjectCount === 0 && (teacher || admin)) {
      const assignedTeacherId = teacher ? teacher._id : admin?._id;
      const subjects = await Subject.create([
        { name: "Mathematics", code: "MATH101", teacher: [assignedTeacherId], isActive: true },
        { name: "Physics", code: "PHY101", teacher: [assignedTeacherId], isActive: true },
        { name: "English Literature", code: "ENG101", teacher: [assignedTeacherId], isActive: true },
      ]);
      console.log("🌱 Seeded default Subjects: Mathematics, Physics, English Literature");

      if (teacher) {
        teacher.teacherSubject = subjects.map((s) => s._id as any);
        await teacher.save();
      }
    }
  } catch (error) {
    console.error("Warning: Automatic data seeding encountered an issue:", (error as Error).message);
  }
}
