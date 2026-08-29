import User from "../models/user.ts";
import AcademicYear from "../models/academicYear.ts";
import Class from "../models/class.ts";
import Subject from "../models/subject.ts";
import Announcement from "../models/announcement.ts";
import ActivitiesLog from "../models/activitieslog.ts";
import { logger } from "../utils/logger.ts";

export interface SeedConfigValidation {
  isValid: boolean;
  error?: string;
  adminPassword?: string;
  teacherPassword?: string;
  studentPassword?: string;
  parentPassword?: string;
}

/**
 * Validates database seed configuration before executing any mutations.
 * In production:
 * - Rejects missing or default "password123" for DEFAULT_ADMIN_PASSWORD.
 * - Prevents fallback "password123" on demo non-admin accounts (teacher/student/parent).
 * - Only seeds non-admin accounts if explicit passwords are provided in env or explicit demo opt-in is declared.
 */
export function validateSeedConfig(
  env: Record<string, string | undefined> = process.env
): SeedConfigValidation {
  const isProduction = env.NODE_ENV === "production";
  const allowInsecureDemo = env.ALLOW_INSECURE_DEMO_SEEDING_IN_PROD === "true";

  if (isProduction && !allowInsecureDemo) {
    const adminPassword = env.DEFAULT_ADMIN_PASSWORD?.trim();
    if (!adminPassword || adminPassword === "password123") {
      return {
        isValid: false,
        error:
          "Production security violation: DEFAULT_ADMIN_PASSWORD must be explicitly defined in environment variables and cannot be the default 'password123'.",
      };
    }
  }

  const adminPassword =
    env.DEFAULT_ADMIN_PASSWORD?.trim() ||
    (isProduction && !allowInsecureDemo ? undefined : "password123");

  if (!adminPassword) {
    return {
      isValid: false,
      error: "Missing required admin password for database seeding.",
    };
  }

  const teacherPassword =
    env.DEFAULT_TEACHER_PASSWORD?.trim() ||
    (!isProduction || allowInsecureDemo ? "password123" : undefined);
  const studentPassword =
    env.DEFAULT_STUDENT_PASSWORD?.trim() ||
    (!isProduction || allowInsecureDemo ? "password123" : undefined);
  const parentPassword =
    env.DEFAULT_PARENT_PASSWORD?.trim() ||
    (!isProduction || allowInsecureDemo ? "password123" : undefined);

  return {
    isValid: true,
    adminPassword,
    teacherPassword,
    studentPassword,
    parentPassword,
  };
}

export async function seedDefaultData() {
  const config = validateSeedConfig(process.env);
  if (!config.isValid || !config.adminPassword) {
    throw new Error(config.error || "Invalid seed configuration.");
  }

  const isProduction = process.env.NODE_ENV === "production";
  const adminEmail = process.env.DEFAULT_ADMIN_EMAIL || "admin@schoolsync.com";
  const adminPassword = config.adminPassword;

  const teacherEmail = process.env.DEFAULT_TEACHER_EMAIL || "teacher@schoolsync.com";
  const teacherPassword = config.teacherPassword;

  const studentEmail = process.env.DEFAULT_STUDENT_EMAIL || "student@schoolsync.com";
  const studentPassword = config.studentPassword;

  const parentEmail = process.env.DEFAULT_PARENT_EMAIL || "parent@schoolsync.com";
  const parentPassword = config.parentPassword;

  // 1. Ensure Academic Year exists
  let currentYear = await AcademicYear.findOne({ isCurrent: true });
  if (!currentYear) {
    currentYear = await AcademicYear.create({
      name: "2025-2026",
      fromYear: new Date("2025-01-01"),
      toYear: new Date("2026-12-31"),
      isCurrent: true,
    });
    logger.success("Seeded default Academic Year: 2025-2026", "SEED");
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
    logger.success(`Seeded Admin user: ${adminEmail}`, "SEED");
  }

  // 3. Ensure Teacher Account exists (if explicit password configured or in dev)
  let teacher = await User.findOne({ email: teacherEmail });
  if (!teacher && teacherPassword) {
    teacher = await User.create({
      name: "Sarah Jenkins",
      email: teacherEmail,
      password: teacherPassword,
      role: "teacher",
      isActive: true,
    });
    logger.success(`Seeded Teacher user: ${teacherEmail}`, "SEED");
  } else if (!teacher && isProduction) {
    logger.info("Production mode: Demo Teacher account skipped (set DEFAULT_TEACHER_PASSWORD to seed).", "SEED");
  }

  // 4. Ensure sample classes exist
  let class10A = await Class.findOne({ name: "Grade 10-A" });
  if (!class10A && currentYear && (admin || teacher)) {
    class10A = await Class.create({
      name: "Grade 10-A",
      capacity: 35,
      academicYear: currentYear._id,
      classTeacher: teacher ? teacher._id : admin?._id,
      students: [],
      subjects: [],
    });
    logger.success("Seeded Class: Grade 10-A", "SEED");
  }

  let class11A = await Class.findOne({ name: "Grade 11-A" });
  if (!class11A && currentYear && (admin || teacher)) {
    class11A = await Class.create({
      name: "Grade 11-A",
      capacity: 30,
      academicYear: currentYear._id,
      classTeacher: teacher ? teacher._id : admin?._id,
      students: [],
      subjects: [],
    });
    logger.success("Seeded Class: Grade 11-A", "SEED");
  }

  // 5. Ensure Student Account exists (if explicit password configured or in dev)
  let student = await User.findOne({ email: studentEmail });
  if (!student && studentPassword) {
    student = await User.create({
      name: "Alex Johnson",
      email: studentEmail,
      password: studentPassword,
      role: "student",
      isActive: true,
      studentClass: class10A ? class10A._id : null,
    });
    logger.success(`Seeded Student user: ${studentEmail} (Grade 10-A)`, "SEED");
  } else if (!student && isProduction) {
    logger.info("Production mode: Demo Student account skipped (set DEFAULT_STUDENT_PASSWORD to seed).", "SEED");
  }

  // Ensure Student is included in class10A students roster
  if (student && class10A) {
    if (!class10A.students) class10A.students = [];
    const studentExistsInClass = class10A.students.some(
      (s) => s.toString() === student._id.toString()
    );
    if (!studentExistsInClass) {
      class10A.students.push(student._id as any);
      await class10A.save();
      logger.info(`Linked student ${student.email} to Class ${class10A.name}`, "SEED");
    }
  }

  // 6. Ensure Parent Account exists and link to student (if explicit password configured or in dev)
  let parent = await User.findOne({ email: parentEmail });
  if (!parent && parentPassword) {
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
    logger.success(`Seeded Parent user: ${parentEmail} (Linked to Alex Johnson)`, "SEED");
  } else if (!parent && isProduction) {
    logger.info("Production mode: Demo Parent account skipped (set DEFAULT_PARENT_PASSWORD to seed).", "SEED");
  }

  // 7. Ensure sample subjects exist
  let subjects = await Subject.find({});
  if (subjects.length === 0 && (teacher || admin)) {
    const assignedTeacherId = teacher ? teacher._id : admin?._id;
    subjects = await Subject.create([
      { name: "Mathematics", code: "MATH101", teacher: [assignedTeacherId], isActive: true },
      { name: "Physics", code: "PHY101", teacher: [assignedTeacherId], isActive: true },
      { name: "English Literature", code: "ENG101", teacher: [assignedTeacherId], isActive: true },
    ]);
    logger.success("Seeded default Subjects: Mathematics, Physics, English Literature", "SEED");

    if (teacher) {
      teacher.teacherSubject = subjects.map((s) => s._id as any);
      await teacher.save();
    }
  }

  // Ensure subjects are linked to sample classes
  if (subjects.length > 0) {
    const subjectIds = subjects.map((s) => s._id as any);
    if (class10A && (!class10A.subjects || class10A.subjects.length === 0)) {
      class10A.subjects = subjectIds;
      await class10A.save();
    }
    if (class11A && (!class11A.subjects || class11A.subjects.length === 0)) {
      class11A.subjects = subjectIds;
      await class11A.save();
    }
  }

  // 8. Ensure initial welcome announcement exists
  const announcementCount = await Announcement.countDocuments();
  if (announcementCount === 0 && admin) {
    await Announcement.create({
      title: "Welcome to SchoolSync Academic Operations",
      content: "Welcome to the 2025-2026 Academic Year. All academic schedules, LMS assessments, and student registers are active.",
      audience: ["all"],
      priority: "medium",
      createdBy: admin._id,
      isActive: true,
    });
    logger.success("Seeded default Institutional Announcement", "SEED");
  }

  // 9. Ensure initial system initialization activity log exists
  const activityCount = await ActivitiesLog.countDocuments();
  if (activityCount === 0 && admin) {
    await ActivitiesLog.create({
      user: admin._id,
      action: "SYSTEM_INITIALIZATION",
      details: "SchoolSync database initialized with fresh default records and configurations.",
    });
    logger.success("Seeded System Activity Log entry", "SEED");
  }
}
