import mongoose from "mongoose";
import User from "../models/user.ts";
import AcademicYear from "../models/academicYear.ts";
import Class from "../models/class.ts";
import Subject from "../models/subject.ts";
import Timetable from "../models/timetable.ts";
import Exam from "../models/exam.ts";
import Submission from "../models/submission.ts";
import Attendance from "../models/attendance.ts";
import Announcement from "../models/announcement.ts";
import ActivitiesLog from "../models/activitieslog.ts";
import { logger } from "../utils/logger.ts";

export interface SeedConfigValidation {
  isValid: boolean;
  error?: string;
  adminPassword?: string;
  teacherPassword?: string;
  studentPassword?: string;
}

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

  return {
    isValid: true,
    adminPassword,
    teacherPassword,
    studentPassword,
  };
}

export async function seedDefaultData() {
  const config = validateSeedConfig(process.env);
  if (!config.isValid || !config.adminPassword) {
    throw new Error(config.error || "Invalid seed configuration.");
  }

  const defaultPassword = "password123";

  // Clean up any extraneous non-target classes/subjects if present from earlier runs
  await Class.deleteMany({ name: { $nin: ["Grade 9-A", "Grade 9-B", "Grade 10-A", "Grade 10-B"] } });
  await Subject.deleteMany({ code: { $nin: ["TEL101", "ENG101", "MATH101", "PHY101", "CHEM101", "SOC101"] } });

  // =========================================================================
  // 1. ACADEMIC YEAR (2025-2026)
  // =========================================================================
  let currentYear = await AcademicYear.findOne({ isCurrent: true });
  if (!currentYear) {
    currentYear = await AcademicYear.create({
      name: "2025-2026",
      fromYear: new Date("2025-06-01"),
      toYear: new Date("2026-04-30"),
      isCurrent: true,
    });
    logger.success("Seeded Academic Year: 2025-2026", "SEED");
  }

  // =========================================================================
  // 2. PRINCIPAL / ADMINISTRATOR (Prabhas)
  // =========================================================================
  const adminEmail = process.env.DEFAULT_ADMIN_EMAIL || "admin@schoolsync.com";
  let admin = await User.findOne({ email: adminEmail });
  if (!admin) {
    admin = await User.create({
      name: "Prabhas Uppalapati",
      email: adminEmail,
      password: config.adminPassword,
      role: "admin",
      isActive: true,
      phoneNumber: "+91 98480 12345",
      address: "Jubilee Hills, Hyderabad, Telangana",
    });
    logger.success(`Seeded Principal Admin: Prabhas Uppalapati (${adminEmail})`, "SEED");
  } else {
    admin.name = "Prabhas Uppalapati";
    admin.isActive = true;
    admin.password = config.adminPassword;
    await admin.save();
    logger.info(`Synced Principal Admin: ${adminEmail}`, "SEED");
  }

  // =========================================================================
  // 3. FACULTY / TEACHERS (12 Faculty Members with Telugu Names - 2 per Subject)
  // =========================================================================
  const facultyData = [
    // Mathematics
    {
      name: "Ravi Teja Bhupathi",
      email: "teacher@schoolsync.com",
      altEmail: "raviteja@schoolsync.com",
      phone: "+91 98481 23456",
      subjectName: "Mathematics",
      subjectCode: "MATH101",
    },
    {
      name: "Brahmanandam Kanneganti",
      email: "brahmanandam@schoolsync.com",
      phone: "+91 98481 99887",
      subjectName: "Mathematics",
      subjectCode: "MATH101",
    },
    // Physics
    {
      name: "Nagarjuna Akkineni",
      email: "nagarjuna@schoolsync.com",
      phone: "+91 98482 34567",
      subjectName: "Physics",
      subjectCode: "PHY101",
    },
    {
      name: "Jagapathi Babu",
      email: "jagapathibabu@schoolsync.com",
      phone: "+91 98482 88776",
      subjectName: "Physics",
      subjectCode: "PHY101",
    },
    // Chemistry
    {
      name: "Venkatesh Daggubati",
      email: "venkatesh@schoolsync.com",
      phone: "+91 98483 45678",
      subjectName: "Chemistry",
      subjectCode: "CHEM101",
    },
    {
      name: "Prakash Raj Manjunath",
      email: "prakashraj@schoolsync.com",
      phone: "+91 98483 77665",
      subjectName: "Chemistry",
      subjectCode: "CHEM101",
    },
    // English
    {
      name: "Suhasini Maniratnam",
      email: "suhasini@schoolsync.com",
      phone: "+91 98484 56789",
      subjectName: "English",
      subjectCode: "ENG101",
    },
    {
      name: "Srihari Raghumudri",
      email: "srihari@schoolsync.com",
      phone: "+91 98484 66554",
      subjectName: "English",
      subjectCode: "ENG101",
    },
    // Telugu
    {
      name: "Ramakrishna Sastry",
      email: "ramakrishna@schoolsync.com",
      phone: "+91 98485 67890",
      subjectName: "Telugu",
      subjectCode: "TEL101",
    },
    {
      name: "Murali Mohan Maganti",
      email: "muralimohan@schoolsync.com",
      phone: "+91 98485 55443",
      subjectName: "Telugu",
      subjectCode: "TEL101",
    },
    // Social Studies
    {
      name: "Anasuya Bharadwaj",
      email: "anasuya@schoolsync.com",
      phone: "+91 98486 78901",
      subjectName: "Social Studies",
      subjectCode: "SOC101",
    },
    {
      name: "Tanikella Bharani",
      email: "tanikella@schoolsync.com",
      phone: "+91 98486 44332",
      subjectName: "Social Studies",
      subjectCode: "SOC101",
    },
  ];

  const seededTeachersByCode: Record<string, any[]> = {};
  const primaryTeachers: Record<string, any> = {};
  const seededTeachers: Record<string, any> = primaryTeachers;

  for (const f of facultyData) {
    let t = await User.findOne({ $or: [{ email: f.email }, { email: f.altEmail || f.email }] });
    if (!t) {
      t = await User.create({
        name: f.name,
        email: f.email,
        password: defaultPassword,
        role: "teacher",
        isActive: true,
        phoneNumber: f.phone,
        address: "Banjara Hills, Hyderabad, Telangana",
      });
      logger.success(`Seeded Faculty: ${f.name} (${f.email})`, "SEED");
    } else {
      t.name = f.name;
      t.isActive = true;
      t.password = defaultPassword;
      await t.save();
    }

    if (!seededTeachersByCode[f.subjectCode]) {
      seededTeachersByCode[f.subjectCode] = [];
      primaryTeachers[f.subjectCode] = t;
    }
    seededTeachersByCode[f.subjectCode].push(t);
  }

  // =========================================================================
  // 4. CORE SUBJECTS (6 Core Subjects with 2 Faculty Each)
  // =========================================================================
  const subjectsData = [
    { name: "Telugu", code: "TEL101" },
    { name: "English", code: "ENG101" },
    { name: "Mathematics", code: "MATH101" },
    { name: "Physics", code: "PHY101" },
    { name: "Chemistry", code: "CHEM101" },
    { name: "Social Studies", code: "SOC101" },
    { name: "Study Hour & Revision", code: "STD101" },
  ];

  const seededSubjects: Record<string, any> = {};
  const allSubjectIds: any[] = [];
  for (const s of subjectsData) {
    let sub = await Subject.findOne({ code: s.code });
    const teacherList = seededTeachersByCode[s.code] || [];
    const teacherIds = teacherList.map((t) => t._id);

    if (!sub) {
      sub = await Subject.create({
        name: s.name,
        code: s.code,
        teacher: teacherIds,
        isActive: true,
      });
      logger.success(`Seeded Subject: ${s.name} (${s.code}) with ${teacherIds.length} Faculty`, "SEED");
    } else {
      sub.name = s.name;
      sub.teacher = teacherIds;
      await sub.save();
    }
    seededSubjects[s.code] = sub;
    allSubjectIds.push(sub._id);

    // Link subject to teachers
    for (const teacherObj of teacherList) {
      teacherObj.teacherSubject = [sub._id];
      await teacherObj.save();
    }
  }

  // =========================================================================
  // 5. CLASSES (Total 4 Sections: Grade 9-A, Grade 9-B, Grade 10-A, Grade 10-B)
  // =========================================================================
  const classConfigs = [
    { name: "Grade 9-A", classTeacherCode: "CHEM101" }, // Venkatesh
    { name: "Grade 9-B", classTeacherCode: "ENG101" },  // Suhasini
    { name: "Grade 10-A", classTeacherCode: "MATH101" }, // Ravi Teja
    { name: "Grade 10-B", classTeacherCode: "PHY101" },  // Nagarjuna
  ];

  const seededClasses: Record<string, any> = {};
  for (const c of classConfigs) {
    let cls = await Class.findOne({ name: c.name, academicYear: currentYear._id });
    const classTeacherId = primaryTeachers[c.classTeacherCode]?._id;
    if (!cls) {
      cls = await Class.create({
        name: c.name,
        capacity: 30,
        academicYear: currentYear._id,
        classTeacher: classTeacherId || admin._id,
        students: [],
        subjects: allSubjectIds,
      });
      logger.success(`Seeded Class Section: ${c.name}`, "SEED");
    } else {
      cls.classTeacher = classTeacherId || admin._id;
      cls.subjects = allSubjectIds;
      await cls.save();
    }
    seededClasses[c.name] = cls;
  }

  // =========================================================================
  // 6. STUDENTS (15 Students per section = 60 Total, Telugu names)
  // =========================================================================
  const studentsByClass: Record<string, { name: string; email: string; gender: "M" | "F" }[]> = {
    "Grade 10-A": [
      { name: "Sekhar Reddy", email: "student@schoolsync.com", gender: "M" }, // Specified primary demo student
      { name: "Ram Charan Konidela", email: "ramcharan@schoolsync.com", gender: "M" },
      { name: "Samantha Ruth Prabhu", email: "samantha@schoolsync.com", gender: "F" },
      { name: "Allu Arjun", email: "alluarjun@schoolsync.com", gender: "M" },
      { name: "Anushka Shetty", email: "anushka@schoolsync.com", gender: "F" },
      { name: "Tarun Kumar", email: "tarun@schoolsync.com", gender: "M" },
      { name: "Keerthy Suresh", email: "keerthy@schoolsync.com", gender: "F" },
      { name: "Nani Goud", email: "nani@schoolsync.com", gender: "M" },
      { name: "Sai Pallavi", email: "saipallavi@schoolsync.com", gender: "F" },
      { name: "Vijay Devarakonda", email: "vijay@schoolsync.com", gender: "M" },
      { name: "Rashmika Mandanna", email: "rashmika@schoolsync.com", gender: "F" },
      { name: "Varun Tej", email: "varuntej@schoolsync.com", gender: "M" },
      { name: "Pooja Hegde", email: "pooja@schoolsync.com", gender: "F" },
      { name: "Akhil Akkineni", email: "akhil@schoolsync.com", gender: "M" },
      { name: "Krithi Shetty", email: "krithi@schoolsync.com", gender: "F" },
    ],
    "Grade 10-B": [
      { name: "Surya Narayana", email: "surya@schoolsync.com", gender: "M" },
      { name: "Jyothika Rao", email: "jyothika@schoolsync.com", gender: "F" },
      { name: "Karthi Sivakumar", email: "karthi@schoolsync.com", gender: "M" },
      { name: "Shruti Haasan", email: "shruti@schoolsync.com", gender: "F" },
      { name: "Dhanush Kumar", email: "dhanush@schoolsync.com", gender: "M" },
      { name: "Meenakshi Chaudhary", email: "meenakshi@schoolsync.com", gender: "F" },
      { name: "Ram Pothineni", email: "rampothineni@schoolsync.com", gender: "M" },
      { name: "Nabha Natesh", email: "nabha@schoolsync.com", gender: "F" },
      { name: "Vishwak Sen", email: "vishwak@schoolsync.com", gender: "M" },
      { name: "Ritu Varma", email: "ritu@schoolsync.com", gender: "F" },
      { name: "Adivi Sesh", email: "adivi@schoolsync.com", gender: "M" },
      { name: "Eesha Rebba", email: "eesha@schoolsync.com", gender: "F" },
      { name: "Nithiin Reddy", email: "nithiin@schoolsync.com", gender: "M" },
      { name: "Shalini Pandey", email: "shalini@schoolsync.com", gender: "F" },
      { name: "Sundeep Kishan", email: "sundeep@schoolsync.com", gender: "M" },
    ],
    "Grade 9-A": [
      { name: "Sai Kiran Reddy", email: "saikiran@schoolsync.com", gender: "M" },
      { name: "Sravani Devi", email: "sravani@schoolsync.com", gender: "F" },
      { name: "Naveen Polishetty", email: "naveen@schoolsync.com", gender: "M" },
      { name: "Harika Varma", email: "harika@schoolsync.com", gender: "F" },
      { name: "Akhil Teja", email: "akhilteja@schoolsync.com", gender: "M" },
      { name: "Bhavana Rao", email: "bhavana@schoolsync.com", gender: "F" },
      { name: "Mahesh Babu", email: "mahesh@schoolsync.com", gender: "M" },
      { name: "Namrata Shirodkar", email: "namrata@schoolsync.com", gender: "F" },
      { name: "Chaitanya Krishna", email: "chaitanya@schoolsync.com", gender: "M" },
      { name: "Divya Vani", email: "divyavani@schoolsync.com", gender: "F" },
      { name: "Suresh Naidu", email: "sureshnaidu@schoolsync.com", gender: "M" },
      { name: "Kavya Madhav", email: "kavya@schoolsync.com", gender: "F" },
      { name: "Rohit Varma", email: "rohit@schoolsync.com", gender: "M" },
      { name: "Ananya Chowdary", email: "ananya@schoolsync.com", gender: "F" },
      { name: "Kalyan Ram", email: "kalyanram@schoolsync.com", gender: "M" },
    ],
    "Grade 9-B": [
      { name: "Pavan Kalyan", email: "pavankalyan@schoolsync.com", gender: "M" },
      { name: "Swathi Reddy", email: "swathi@schoolsync.com", gender: "F" },
      { name: "Rajesh Sharma", email: "rajesh@schoolsync.com", gender: "M" },
      { name: "Lavanya Tripathi", email: "lavanya@schoolsync.com", gender: "F" },
      { name: "Praneeth Rao", email: "praneeth@schoolsync.com", gender: "M" },
      { name: "Sneha Latha", email: "sneha@schoolsync.com", gender: "F" },
      { name: "Teja Sajja", email: "tejasajja@schoolsync.com", gender: "M" },
      { name: "Faria Abdullah", email: "faria@schoolsync.com", gender: "F" },
      { name: "Sharwanand Myneni", email: "sharwanand@schoolsync.com", gender: "M" },
      { name: "Priya Bhavani", email: "priyabhavani@schoolsync.com", gender: "F" },
      { name: "Kartikeya Gummakonda", email: "kartikeya@schoolsync.com", gender: "M" },
      { name: "Payal Rajput", email: "payal@schoolsync.com", gender: "F" },
      { name: "Sandeep Varma", email: "sandeep@schoolsync.com", gender: "M" },
      { name: "Dimple Hayathi", email: "dimple@schoolsync.com", gender: "F" },
      { name: "Kiran Abbavaram", email: "kiranabbavaram@schoolsync.com", gender: "M" },
    ],
  };

  let primaryStudent: any = null;

  for (const [className, studentsList] of Object.entries(studentsByClass)) {
    const classObj = seededClasses[className];
    if (!classObj) continue;

    const studentIds: any[] = [];
    for (const s of studentsList) {
      let st = await User.findOne({ email: s.email });
      if (!st) {
        st = await User.create({
          name: s.name,
          email: s.email,
          password: defaultPassword,
          role: "student",
          isActive: true,
          studentClass: classObj._id,
          phoneNumber: "+91 99887 76655",
          address: "Gachibowli, Hyderabad, Telangana",
          emergencyContact: {
            name: `${s.name.split(" ")[0]} Guardian`,
            phone: "+91 99887 76655",
            relationship: "Parent",
          },
        });
        logger.success(`Seeded Student: ${s.name} in ${className}`, "SEED");
      } else {
        st.name = s.name;
        st.studentClass = classObj._id;
        st.password = defaultPassword;
        st.isActive = true;
        await st.save();
      }

      if (s.email === "student@schoolsync.com" || s.name === "Sekhar Reddy") {
        primaryStudent = st;
      }
      studentIds.push(st._id);
    }

    classObj.students = studentIds;
    await classObj.save();
  }

  // Delete any lingering parent role users from past seedings
  await User.deleteMany({ role: "parent" as any });

  if (primaryStudent) {
    primaryStudent.emergencyContact = {
      name: "Venkat Reddy",
      phone: "+91 98490 98765",
      relationship: "Father",
    };
    await primaryStudent.save();
  }

  // =========================================================================
  // 8. CUSTOM TIMETABLES FOR ALL 4 CLASSES (Grade 9-A, 9-B, 10-A, 10-B)
  // =========================================================================
  // Exact Schedule:
  // Slot 1: 08:50 AM - 09:40 AM (Period 1)
  // Slot 2: 09:40 AM - 10:30 AM (Period 2)
  // [10:30 AM - 10:40 AM: Short Break - 10 mins]
  // Slot 3: 10:40 AM - 11:30 AM (Period 3)
  // Slot 4: 11:30 AM - 12:20 PM (Period 4)
  // [12:20 PM - 01:20 PM: Lunch Break - 1 Hour]
  // Slot 5: 01:20 PM - 02:10 PM (Period 5)
  // Slot 6: 02:10 PM - 03:00 PM (Period 6)
  // Slot 7: 03:00 PM - 04:00 PM (1 Hour Study Hour / Guided Revision)
  // School completes by 04:00 PM!
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
  const periodSlots = [
    { startTime: "08:50", endTime: "09:40" }, // P1: 8:50 AM - 9:40 AM
    { startTime: "09:40", endTime: "10:30" }, // P2: 9:40 AM - 10:30 AM
    { startTime: "10:40", endTime: "11:30" }, // P3: 10:40 AM - 11:30 AM
    { startTime: "11:30", endTime: "12:20" }, // P4: 11:30 AM - 12:20 PM
    { startTime: "13:20", endTime: "14:10" }, // P5: 1:20 PM - 2:10 PM
    { startTime: "14:10", endTime: "15:00" }, // P6: 2:10 PM - 3:00 PM
    { startTime: "15:00", endTime: "16:00" }, // Study Hour: 3:00 PM - 4:00 PM
  ];

  // Subject rotation schedule per class with Study Hour as the final period
  const scheduleMatrix: Record<string, string[][]> = {
    "Grade 10-A": [
      ["MATH101", "PHY101", "ENG101", "TEL101", "CHEM101", "SOC101", "STD101"], // Monday
      ["PHY101", "MATH101", "CHEM101", "SOC101", "TEL101", "ENG101", "STD101"], // Tuesday
      ["CHEM101", "TEL101", "MATH101", "ENG101", "PHY101", "SOC101", "STD101"], // Wednesday
      ["SOC101", "ENG101", "PHY101", "MATH101", "CHEM101", "TEL101", "STD101"], // Thursday
      ["TEL101", "CHEM101", "SOC101", "PHY101", "MATH101", "ENG101", "STD101"], // Friday
    ],
    "Grade 10-B": [
      ["PHY101", "CHEM101", "TEL101", "MATH101", "SOC101", "ENG101", "STD101"],
      ["MATH101", "ENG101", "PHY101", "TEL101", "CHEM101", "SOC101", "STD101"],
      ["TEL101", "SOC101", "CHEM101", "PHY101", "ENG101", "MATH101", "STD101"],
      ["CHEM101", "MATH101", "SOC101", "ENG101", "TEL101", "PHY101", "STD101"],
      ["ENG101", "PHY101", "MATH101", "SOC101", "TEL101", "CHEM101", "STD101"],
    ],
    "Grade 9-A": [
      ["CHEM101", "TEL101", "MATH101", "SOC101", "ENG101", "PHY101", "STD101"],
      ["ENG101", "PHY101", "TEL101", "CHEM101", "MATH101", "SOC101", "STD101"],
      ["MATH101", "CHEM101", "SOC101", "TEL101", "PHY101", "ENG101", "STD101"],
      ["PHY101", "TEL101", "ENG101", "CHEM101", "SOC101", "MATH101", "STD101"],
      ["SOC101", "MATH101", "CHEM101", "ENG101", "PHY101", "TEL101", "STD101"],
    ],
    "Grade 9-B": [
      ["TEL101", "ENG101", "SOC101", "CHEM101", "PHY101", "MATH101", "STD101"],
      ["CHEM101", "SOC101", "MATH101", "ENG101", "PHY101", "TEL101", "STD101"],
      ["ENG101", "PHY101", "TEL101", "MATH101", "SOC101", "CHEM101", "STD101"],
      ["MATH101", "PHY101", "CHEM101", "TEL101", "ENG101", "SOC101", "STD101"],
      ["PHY101", "TEL101", "ENG101", "MATH101", "CHEM101", "SOC101", "STD101"],
    ],
  };

  for (const [className, daysSchedule] of Object.entries(scheduleMatrix)) {
    const classObj = seededClasses[className];
    if (!classObj) continue;

    const formattedSchedule = days.map((dayName, dayIndex) => {
      const periodCodes = daysSchedule[dayIndex] || daysSchedule[0];
      const periods = periodSlots.map((slot, periodIdx) => {
        const code = periodCodes[periodIdx] || "MATH101";
        const subjectObj = seededSubjects[code];
        const teacherObj =
          code === "STD101"
            ? { _id: classObj.classTeacher }
            : seededTeachers[code] || { _id: classObj.classTeacher };

        return {
          subject: subjectObj?._id,
          teacher: teacherObj?._id,
          startTime: slot.startTime,
          endTime: slot.endTime,
        };
      });
      return { day: dayName, periods };
    });

    await Timetable.findOneAndUpdate(
      { class: classObj._id, academicYear: currentYear._id },
      {
        class: classObj._id,
        academicYear: currentYear._id,
        schedule: formattedSchedule,
      },
      { upsert: true, returnDocument: "after" }
    );
    logger.success(`Seeded Custom Timetable for ${className}`, "SEED");
  }

  // =========================================================================
  // 9. ASSESSMENTS & MARKS SEEDING (3 Assessments x 6 Subjects x 4 Classes)
  // Unit Assessment (Max: 25), Mid-Term (Max: 50), Quarterly Final (Max: 100)
  // =========================================================================
  const subjectQuestionTemplates: Record<string, string[]> = {
    TEL101: [
      "తెలుగు వ్యాకరణంలో సంధులు మరియు సమాసాల లక్షణాలు వివరించండి.",
      "పోతన భాగవతంలోని పద్యం యొక్క భావాన్ని రాయండి.",
      "శతక పద్యాల యొక్క ముఖ్య ఉద్దేశ్యం మరియు నీతి ఏమిటి?",
      "తెలుగు ఆధునిక కవిత్వ విశిష్టతను విశ్లేషించండి.",
      "పద్య రచనలో ఛందస్సు మరియు యతి ప్రాసల ప్రాముఖ్యత రాయండి.",
    ],
    ENG101: [
      "Analyze the central theme and metaphor in Robert Frost's 'The Road Not Taken'.",
      "Explain the grammatical usage of active and passive voice with distinct examples.",
      "Write an analytical précis on the impact of digital literacy in modern education.",
      "Identify the figures of speech in the given passage and state their significance.",
      "Draft a formal application to the Principal requesting academic leave.",
    ],
    MATH101: [
      "Solve the quadratic equation 2x^2 - 7x + 3 = 0 using the quadratic formula.",
      "Prove that (sin theta + cos theta)^2 + (sin theta - cos theta)^2 = 2.",
      "Find the sum of the first 25 terms of an AP whose nth term is an = 3 + 4n.",
      "Calculate the curved surface area and volume of a cylinder of radius 7cm and height 10cm.",
      "Find the coordinates of the point dividing the line segment (2,3) and (6,7) in the ratio 1:3.",
    ],
    PHY101: [
      "State Newton's Second Law of Motion and derive the fundamental equation F = ma.",
      "Explain total internal reflection and describe two applications in modern fiber optics.",
      "State Ohm's Law and calculate equivalent resistance of 3 parallel resistors (2Ω, 4Ω, 6Ω).",
      "Differentiate between nuclear fission and nuclear fusion with relevant equations.",
      "Explain Archimedes' Principle and its application in hydrometers.",
    ],
    CHEM101: [
      "Explain Mendeleev's periodic law and periodic trends in electronegativity and ionization potential.",
      "Describe the formation of ionic bonds versus covalent bonds with Lewis dot structures.",
      "Define pH and calculate the pH of a 0.01M hydrochloric acid (HCl) aqueous solution.",
      "Explain the homologous series of alkanes, alkenes, and alkynes with functional groups.",
      "State Le Chatelier's principle and explain the effect of temperature on equilibrium.",
    ],
    SOC101: [
      "Explain the key preamble features of the Constitution of India (Sovereign, Socialist, Secular, Democratic Republic).",
      "Describe the factors influencing Indian monsoon patterns and climatic distribution.",
      "Analyze the economic impact of the Industrial Revolution on agrarian societies.",
      "Explain the role of the Reserve Bank of India in monetary policy and inflation control.",
      "Discuss the major causes and outcomes of the Revolt of 1857.",
    ],
  };

  const assessmentsPlan = [
    {
      title: "Unit Assessment 1",
      maxMarks: 25,
      pointsPerQ: 5,
      daysAgo: 45,
    },
    {
      title: "Mid-Term Examination",
      maxMarks: 50,
      pointsPerQ: 10,
      daysAgo: 22,
    },
    {
      title: "Quarterly Final Examination",
      maxMarks: 100,
      pointsPerQ: 20,
      daysAgo: 5,
    },
  ];

  // Helper deterministic hash for realistic random score generation per student, class & subject
  const getDeterministicHash = (seedStr: string): number => {
    let hash = 0;
    for (let i = 0; i < seedStr.length; i++) {
      hash = (hash << 5) - hash + seedStr.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  };

  // Helper to generate distinct, unique random marks for every student scaled to the assessment maxMarks
  const calculateStudentMark = (
    studentId: string,
    studentIdx: number,
    className: string,
    subjectCode: string,
    assessIdx: number,
    maxMarks: number
  ): { score: number; remarks: string } => {
    const hash = getDeterministicHash(`${studentId}_${className}_${subjectCode}_${assessIdx}`);
    const jitter = (hash % 5) - 2; // -2 to +2 variation

    const subModifiers: Record<string, number> = {
      TEL101: 1,
      ENG101: 0,
      MATH101: -1,
      PHY101: -1,
      CHEM101: 0,
      SOC101: 1,
    };
    const subMod = subModifiers[subjectCode] || 0;
    const progressBonus = assessIdx === 2 ? 1 : 0;
    const classOffset = className.includes("10-A") ? 1 : className.includes("9-A") ? 0 : className.includes("10-B") ? 0 : -1;

    // Standardized target percentage (0.0 - 1.0) based on student tier
    let targetPct = 0.72; // default 72%
    let remarks = "Good effort shown in coursework.";

    // 1. Star Students (Idx 0): High Distinction (94% - 99%)
    if (studentIdx === 0) {
      targetPct = 0.95 + ((hash % 4) * 0.01);
      remarks = "Outstanding academic mastery and analytical precision.";
    }
    // 2. High Achievers (Idx 1, 2): Distinction (85% - 94%)
    else if (studentIdx <= 2) {
      targetPct = 0.86 + ((hash % 8) * 0.01);
      const pool = [
        "Exceptional problem-solving depth and well-structured answers.",
        "Demonstrated strong conceptual grasp and active class engagement.",
        "Very thorough preparation with commendable test accuracy.",
      ];
      remarks = pool[hash % pool.length];
    }
    // 3. First Class (Idx 3, 4, 5, 6): (72% - 84%)
    else if (studentIdx <= 6) {
      targetPct = 0.74 + ((hash % 10) * 0.01);
      const pool = [
        "Proficient performance; maintains consistent test quality.",
        "Good understanding of fundamental theories; revise application problems.",
        "Clear analytical approach; continue structured revision.",
        "Solid coursework and steady progress across all modules.",
      ];
      remarks = pool[hash % pool.length];
    }
    // 4. Second Class / Average (Idx 7, 8, 9, 10): (58% - 71%)
    else if (studentIdx <= 10) {
      targetPct = 0.58 + ((hash % 13) * 0.01);
      const pool = [
        "Satisfactory pass; focus on thorough revision of complex chapters.",
        "Good theoretical knowledge; needs practice in time management.",
        "Consistent effort shown; daily problem practice recommended.",
        "Adequate grasp of fundamentals; seek clarifications when needed.",
      ];
      remarks = pool[hash % pool.length];
    }
    // 5. Pass / Borderline (Idx 11, 12): (48% - 57%)
    else if (studentIdx <= 12) {
      targetPct = 0.48 + ((hash % 9) * 0.01);
      const pool = [
        "Borderline pass; targeted tutoring and concept revision advised.",
        "Basic comprehension achieved; extra guidance recommended.",
        "Passing mark recorded; regular homework practice needed.",
      ];
      remarks = pool[hash % pool.length];
    }
    // 6. Remedial Needs (Idx 13, 14): (30% - 46% in STEM, 42% - 50% in Languages)
    else {
      if (subjectCode === "MATH101" || subjectCode === "PHY101") {
        targetPct = 0.32 + ((hash % 12) * 0.01);
        remarks = "Needs intensive remedial coaching and fundamentals reinforcement.";
      } else {
        targetPct = 0.43 + ((hash % 8) * 0.01);
        remarks = "Below passing threshold; extra faculty sessions arranged.";
      }
    }

    // Convert target percentage into actual score for this assessment's maxMarks
    let calculatedScore = Math.round(
      targetPct * maxMarks +
      jitter * (maxMarks / 25) * 0.5 +
      subMod * (maxMarks / 25) * 0.4 +
      classOffset +
      progressBonus
    );
    calculatedScore = Math.max(
      Math.round(maxMarks * 0.28),
      Math.min(maxMarks - (studentIdx === 0 ? 0 : 1), calculatedScore)
    );

    return { score: calculatedScore, remarks };
  };

  // Clean out legacy / duplicate exams and submissions before seeding fresh structured exams
  await Exam.deleteMany({});
  await Submission.deleteMany({});

  let totalExamsSeeded = 0;
  let totalSubmissionsSeeded = 0;

  for (const [className, classObj] of Object.entries(seededClasses)) {
    if (!classObj || !classObj.students || classObj.students.length === 0) continue;

    for (const [subjCode, subjObj] of Object.entries(seededSubjects)) {
      if (subjCode === "STD101") continue; // Never create exams for study hour

      // Assign different faculty specialists based on grade section
      const teachersList = seededTeachersByCode[subjCode] || [];
      const teacherObj =
        className.includes("Grade 9")
          ? teachersList[0] || primaryTeachers[subjCode] || { _id: classObj.classTeacher }
          : teachersList[1] || teachersList[0] || primaryTeachers[subjCode] || { _id: classObj.classTeacher };

      const questionTemplates = subjectQuestionTemplates[subjCode] || [
        `Core Assessment Question for ${subjObj.name}`,
        `Analytical Application Problem in ${subjObj.name}`,
        `Theory & Fundamentals of ${subjObj.name}`,
        `Comprehensive Case Study in ${subjObj.name}`,
        `Practical Problem in ${subjObj.name}`,
      ];

      for (let aIdx = 0; aIdx < assessmentsPlan.length; aIdx++) {
        const assess = assessmentsPlan[aIdx];
        const examDueDate = new Date();
        examDueDate.setDate(examDueDate.getDate() - assess.daysAgo);
        examDueDate.setHours(10, 0, 0, 0);

        const examTitle = `${assess.title} - ${subjObj.name}`;

        const examQuestions = questionTemplates.map((qText) => ({
          questionText: qText,
          type: "SHORT_ANSWER" as const,
          points: assess.pointsPerQ,
          _id: new mongoose.Types.ObjectId(),
        }));

        const examDoc = await Exam.create({
          title: examTitle,
          subject: subjObj._id,
          class: classObj._id,
          teacher: teacherObj._id,
          duration: 60,
          dueDate: examDueDate,
          isActive: true,
          questions: examQuestions,
        });
        totalExamsSeeded++;

        const qId = examDoc.questions[0]._id.toString();

        // Seed unique submissions for each student in this class
        for (let sIdx = 0; sIdx < classObj.students.length; sIdx++) {
          const studentId = classObj.students[sIdx];
          const markData = calculateStudentMark(studentId.toString(), sIdx, className, subjCode, aIdx, assess.maxMarks);

          await Submission.create({
            exam: examDoc._id,
            student: studentId,
            score: markData.score,
            submittedAt: examDueDate,
            answers: [
              {
                questionId: qId,
                answer: markData.remarks,
              },
            ],
          });
          totalSubmissionsSeeded++;
        }
      }
    }
  }
  logger.success(`Seeded ${totalExamsSeeded} Exams and ${totalSubmissionsSeeded} Graded Submissions (Unit: 25, Mid-Term: 50, Quarterly: 100) across all 4 Class Sections`, "SEED");

  // =========================================================================
  // 10. ATTENDANCE RECORDS (Past 45 School Days for all 4 Classes)
  // =========================================================================
  const pastSchoolDays: Date[] = [];
  let dayOffset = 0;
  while (pastSchoolDays.length < 45) {
    const d = new Date();
    d.setDate(d.getDate() - dayOffset);
    d.setHours(9, 0, 0, 0);
    // Exclude Sunday (0) and Saturday (6)
    if (d.getDay() !== 0 && d.getDay() !== 6) {
      pastSchoolDays.push(d);
    }
    dayOffset++;
  }

  let totalAttendanceDaysSeeded = 0;
  for (const [className, classObj] of Object.entries(seededClasses)) {
    if (!classObj || !classObj.students || classObj.students.length === 0) continue;

    for (let dayIndex = 0; dayIndex < pastSchoolDays.length; dayIndex++) {
      const date = pastSchoolDays[dayIndex];

      const records = classObj.students.map((studentId: any, idx: number) => {
        let status = "present";
        let remarks = "Present in Class";

        if (idx === 0) {
          // Sekhar Reddy (Star student: 43 present, 2 absent -> 95.6%)
          if (dayIndex === 12 || dayIndex === 31) {
            status = "absent";
            remarks = "Medical Leave (Doctor Slip Submitted)";
          }
        } else if (idx <= 3) {
          // Top tier (~95% - 98%)
          if (dayIndex % 22 === (idx * 3) % 22) {
            status = "absent";
            remarks = "Family Event";
          }
        } else if (idx <= 7) {
          // Good tier (~91% - 93%)
          if (dayIndex % 14 === (idx * 2) % 14) {
            status = "absent";
            remarks = "Sick Leave";
          } else if (dayIndex % 20 === idx) {
            status = "late";
            remarks = "Late Entry - School Bus Delay";
          }
        } else if (idx <= 10) {
          // Average tier (~82% - 87%)
          if (dayIndex % 7 === idx % 7) {
            status = "absent";
            remarks = "Medical / Personal Leave";
          }
        } else if (idx <= 12) {
          // Low Attendance (< 80%, e.g. 73% - 78%)
          if (dayIndex % 4 === idx % 4) {
            status = "absent";
            remarks = "Unexcused Absence";
          }
        } else {
          // Chronic Absenteeism (< 70%, e.g. 62% - 68%)
          if (dayIndex % 3 === idx % 3) {
            status = "absent";
            remarks = "Prolonged Illness / Uninformed";
          }
        }

        return {
          student: studentId,
          status,
          remarks,
        };
      });

      await Attendance.findOneAndUpdate(
        { class: classObj._id, date },
        {
          class: classObj._id,
          academicYear: currentYear._id,
          date,
          recordedBy: classObj.classTeacher || admin._id,
          records,
        },
        { upsert: true, returnDocument: "after" }
      );
      totalAttendanceDaysSeeded++;
    }
  }
  logger.success(`Seeded ${totalAttendanceDaysSeeded} Daily Class Attendance Registers (~45 school days per section)`, "SEED");

  // =========================================================================
  // 11. INSTITUTIONAL ANNOUNCEMENTS (Signed by Principal Prabhas)
  // =========================================================================
  const announcementsData = [
    {
      title: "Welcome to 2025-2026 Academic Session by Principal Prabhas",
      content:
        "Welcome all students and esteemed faculty to the new academic year. All daily timetables, LMS assessments, and student registers for Grades 9 and 10 are active.",
      priority: "high" as const,
      audience: ["all" as const],
    },
    {
      title: "Annual State Cultural & Science Exhibition 2025",
      content:
        "Students of Grades 9 & 10 are invited to submit their science models and cultural performance registrations to their respective class teachers by Friday.",
      priority: "medium" as const,
      audience: ["student" as const, "teacher" as const],
    },
    {
      title: "Term-1 Mid-Term Assessment Schedule Published",
      content:
        "The Term-1 Mid-Term examination schedule for Telugu, English, Mathematics, Physics, Chemistry, and Social Studies has been published on your academic portals.",
      priority: "urgent" as const,
      audience: ["student" as const],
    },
  ];

  for (const ann of announcementsData) {
    const exists = await Announcement.findOne({ title: ann.title });
    if (!exists) {
      await Announcement.create({
        title: ann.title,
        content: ann.content,
        priority: ann.priority,
        audience: ann.audience,
        createdBy: admin._id,
        isActive: true,
      });
    }
  }
  logger.success("Seeded Institutional Announcements from Principal Prabhas", "SEED");

  // =========================================================================
  // 12. INITIAL ACTIVITY LOG ENTRY
  // =========================================================================
  const activityCount = await ActivitiesLog.countDocuments();
  if (activityCount === 0) {
    await ActivitiesLog.create({
      user: admin._id,
      action: "SYSTEM_INITIALIZATION",
      details: "SchoolSync database seeded with 4 Classes (Grades 9 & 10), 60 Students, 6 Telugu Faculty, and Principal Prabhas.",
    });
  }
}
