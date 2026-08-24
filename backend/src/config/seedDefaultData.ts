import User from "../models/user.ts";
import AcademicYear from "../models/academicYear.ts";
import Class from "../models/class.ts";
import Subject from "../models/subject.ts";

export async function seedDefaultData() {
  try {
    const isProduction = process.env.NODE_ENV === "production";

    const adminEmail = process.env.DEFAULT_ADMIN_EMAIL || "admin@schoolsync.com";
    const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD || "password123";

    const teacherEmail = process.env.DEFAULT_TEACHER_EMAIL || "teacher@schoolsync.com";
    const teacherPassword = process.env.DEFAULT_TEACHER_PASSWORD || "password123";

    const studentEmail = process.env.DEFAULT_STUDENT_EMAIL || "student@schoolsync.com";
    const studentPassword = process.env.DEFAULT_STUDENT_PASSWORD || "password123";

    const parentEmail = process.env.DEFAULT_PARENT_EMAIL || "parent@schoolsync.com";
    const parentPassword = process.env.DEFAULT_PARENT_PASSWORD || "password123";

    if (isProduction && (!process.env.DEFAULT_ADMIN_PASSWORD || process.env.DEFAULT_ADMIN_PASSWORD === "password123")) {
      console.warn("⚠️  SECURITY WARNING: Seeding default demo credentials in a production environment. Set DEFAULT_ADMIN_PASSWORD in environment variables.");
    }

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
    let admin = await User.findOne({ email: adminEmail });
    if (!admin) {
      admin = await User.create({
        name: "School Administrator",
        email: adminEmail,
        password: adminPassword,
        role: "admin",
        isActive: true,
      });
      console.log(`🌱 Seeded Admin user: ${adminEmail}`);
    }

    // 3. Ensure Teacher Account exists
    let teacher = await User.findOne({ email: teacherEmail });
    if (!teacher) {
      teacher = await User.create({
        name: "Sarah Jenkins",
        email: teacherEmail,
        password: teacherPassword,
        role: "teacher",
        isActive: true,
      });
      console.log(`🌱 Seeded Teacher user: ${teacherEmail}`);
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
    let student = await User.findOne({ email: studentEmail });
    if (!student) {
      student = await User.create({
        name: "Alex Johnson",
        email: studentEmail,
        password: studentPassword,
        role: "student",
        isActive: true,
        studentClass: class10A?._id || null,
      });
      console.log(`🌱 Seeded Student user: ${studentEmail} (Grade 10-A)`);
    }

    // 6. Ensure Parent Account exists and link to student
    let parent = await User.findOne({ email: parentEmail });
    if (!parent) {
      parent = await User.create({
        name: "Robert Johnson",
        email: parentEmail,
        password: parentPassword,
        role: "parent",
        isActive: true,
        children: student ? [student._id] : [],
      });
      if (student) {
        student.parentId = parent._id as any;
        await student.save();
      }
      console.log(`🌱 Seeded Parent user: ${parentEmail} (Linked to Alex Johnson)`);
    }

    // 7. Ensure sample subjects exist
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
