import { z } from "zod";

// ==========================================
// Generic Validation Result & Helper Types
// ==========================================
export type ValidationResult<T> = {
  success: boolean;
  data?: T;
  errors?: string[];
};

export type Validator<T> = (data: any) => ValidationResult<T>;

/**
 * Universal wrapper to transform any Zod schema into a standardized ValidationResult
 */
export function validateWithZod<T>(schema: z.ZodType<T, any, any>, data: unknown): ValidationResult<T> {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  const errors = result.error.issues.map((err: any) => {
    if (err.path && err.path.length > 0) {
      return `${err.path.join(".")}: ${err.message}`;
    }
    return err.message;
  });
  return { success: false, errors };
}

// ==========================================
// Disallowed Common / Compromised Passwords
// ==========================================
const COMMON_WEAK_PASSWORDS = new Set([
  "password",
  "password123",
  "password1234",
  "admin123",
  "admin1234",
  "12345678",
  "123456789",
  "qwerty123",
  "schoolsync123",
  "welcome123",
  "letmein123",
]);

/**
 * Standalone Password Security Validator
 */
export function validatePasswordSecurity(
  password: string,
  context?: { name?: string; email?: string }
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!password || typeof password !== "string") {
    return { valid: false, errors: ["Password is required."] };
  }

  if (password.length < 8) {
    errors.push("Password must be at least 8 characters long.");
  }
  if (password.length > 72) {
    errors.push("Password cannot exceed 72 characters.");
  }
  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter (A-Z).");
  }
  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter (a-z).");
  }
  if (!/[0-9]/.test(password)) {
    errors.push("Password must contain at least one numerical digit (0-9).");
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password)) {
    errors.push("Password must contain at least one special character (e.g. !@#$%^&*).");
  }

  const normalized = password.toLowerCase().trim();
  if (COMMON_WEAK_PASSWORDS.has(normalized)) {
    errors.push("Password is too common and easily guessable. Please choose a stronger password.");
  }

  if (context?.email) {
    const prefix = context.email.split("@")[0]?.toLowerCase().trim();
    if (prefix && prefix.length >= 3 && normalized.includes(prefix)) {
      errors.push("Password cannot contain your email prefix.");
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Reusable Zod Password Refinement Schema
 */
export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters long.")
  .max(72, "Password cannot exceed 72 characters.")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter (A-Z).")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter (a-z).")
  .regex(/[0-9]/, "Password must contain at least one numerical digit (0-9).")
  .regex(
    /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/,
    "Password must contain at least one special character (e.g. !@#$%^&*)."
  )
  .refine(
    (val) => !COMMON_WEAK_PASSWORDS.has(val.toLowerCase().trim()),
    "Password is too common and easily guessable. Please choose a stronger password."
  );

// ==========================================
// 1. User Validation Schemas
// ==========================================
export const registerSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Name must be a string of at least 2 characters."),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email("A valid email address is required."),
    password: passwordSchema,
    role: z.enum(["admin", "teacher", "student", "parent"]).default("student"),
    studentClass: z.string().optional().nullable(),
    teacherSubject: z.array(z.string()).optional(),
    teacherSubjects: z.array(z.string()).optional(),
    isActive: z.boolean().default(true),
  })
  .transform((data) => {
    const teacherSubject = data.teacherSubject || data.teacherSubjects || [];
    return {
      name: data.name,
      email: data.email,
      password: data.password,
      role: data.role,
      studentClass: data.studentClass || undefined,
      teacherSubject,
      isActive: data.isActive,
    };
  });

export type RegisterInput = z.infer<typeof registerSchema>;
export const validateRegister: Validator<RegisterInput> = (data) => validateWithZod(registerSchema, data);

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("A valid email address is required."),
  password: z
    .string()
    .min(1, "Password is required."),
});

export type LoginInput = z.infer<typeof loginSchema>;
export const validateLogin: Validator<LoginInput> = (data) => validateWithZod(loginSchema, data);

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters long.").optional(),
  phoneNumber: z.string().trim().optional(),
  address: z.string().trim().optional(),
  avatar: z.string().trim().optional(),
  emergencyContact: z
    .object({
      name: z.string().trim().optional().default(""),
      phone: z.string().trim().optional().default(""),
      relationship: z.string().trim().optional().default(""),
    })
    .optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export const validateUpdateProfile: Validator<UpdateProfileInput> = (data) =>
  validateWithZod(updateProfileSchema, data);

export const changePasswordSchema = z
  .object({
    currentPassword: z
      .string()
      .min(1, "Current password is required."),
    newPassword: passwordSchema,
  })
  .refine(
    (data) => data.currentPassword !== data.newPassword,
    {
      message: "New password must be different from current password.",
      path: ["newPassword"],
    }
  );

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export const validateChangePassword: Validator<ChangePasswordInput> = (data) =>
  validateWithZod(changePasswordSchema, data);

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("A valid email address is required."),
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export const validateForgotPassword: Validator<ForgotPasswordInput> = (data) =>
  validateWithZod(forgotPasswordSchema, data);

export const resetPasswordSchema = z.object({
  token: z
    .string()
    .trim()
    .min(1, "Password reset token is required."),
  newPassword: passwordSchema,
});

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export const validateResetPassword: Validator<ResetPasswordInput> = (data) =>
  validateWithZod(resetPasswordSchema, data);

export const updateUserSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters long.").optional(),
  email: z.string().trim().toLowerCase().email("Email must be a valid email address.").optional(),
  password: z.union([passwordSchema, z.literal(""), z.undefined()]).optional(),
  role: z.enum(["admin", "teacher", "student", "parent"]).optional(),
  isActive: z.boolean().optional(),
  studentClass: z.string().nullable().optional(),
  teacherSubject: z.array(z.string()).optional(),
  teacherSubjects: z.array(z.string()).optional(),
}).transform((data) => {
  const result: any = { ...data };
  if (data.teacherSubject || data.teacherSubjects) {
    result.teacherSubject = data.teacherSubject || data.teacherSubjects;
  }
  return result;
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export const validateUpdateUser: Validator<UpdateUserInput> = (data) =>
  validateWithZod(updateUserSchema, data);

// ==========================================
// 2. Class Validation Schemas
// ==========================================
export const createClassSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Class name is required."),
  academicYear: z
    .string()
    .trim()
    .min(1, "Academic Year ID is required."),
  classTeacher: z.string().nullable().optional().default(null),
  capacity: z.number().int().positive("Class capacity must be a positive integer.").default(40),
  subjects: z.array(z.string()).optional().default([]),
});

export type CreateClassInput = z.infer<typeof createClassSchema>;
export const validateCreateClass: Validator<CreateClassInput> = (data) =>
  validateWithZod(createClassSchema, data);

export const updateClassSchema = z.object({
  name: z.string().trim().min(1, "Class name cannot be empty.").optional(),
  academicYear: z.string().trim().optional(),
  classTeacher: z.string().nullable().optional(),
  capacity: z.number().int().positive("Capacity must be a positive number.").optional(),
  subjects: z.array(z.string()).optional(),
});

export type UpdateClassInput = z.infer<typeof updateClassSchema>;
export const validateUpdateClass: Validator<UpdateClassInput> = (data) =>
  validateWithZod(updateClassSchema, data);

// ==========================================
// 3. Subject Validation Schemas
// ==========================================
export const createSubjectSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Subject name is required."),
  code: z
    .string()
    .trim()
    .toUpperCase()
    .min(1, "Subject code is required."),
  teacher: z.array(z.string()).optional().default([]),
  isActive: z.boolean().default(true),
});

export type CreateSubjectInput = z.infer<typeof createSubjectSchema>;
export const validateCreateSubject: Validator<CreateSubjectInput> = (data) =>
  validateWithZod(createSubjectSchema, data);

export const updateSubjectSchema = z.object({
  name: z.string().trim().min(1, "Subject name cannot be empty.").optional(),
  code: z.string().trim().toUpperCase().min(1, "Subject code cannot be empty.").optional(),
  teacher: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});

export type UpdateSubjectInput = z.infer<typeof updateSubjectSchema>;
export const validateUpdateSubject: Validator<UpdateSubjectInput> = (data) =>
  validateWithZod(updateSubjectSchema, data);

// ==========================================
// 4. Academic Year Validation Schemas
// ==========================================
export const createAcademicYearSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Academic year name is required (e.g., '2025-2026')."),
    fromYear: z
      .string()
      .refine((val) => !isNaN(Date.parse(val)), "A valid start date (fromYear) is required."),
    toYear: z
      .string()
      .refine((val) => !isNaN(Date.parse(val)), "A valid end date (toYear) is required."),
    isCurrent: z.boolean().optional().default(false),
  })
  .refine(
    (data) => new Date(data.fromYear) < new Date(data.toYear),
    {
      message: "Academic year start date must precede the end date.",
      path: ["toYear"],
    }
  );

export type CreateAcademicYearInput = z.infer<typeof createAcademicYearSchema>;
export const validateCreateAcademicYear: Validator<CreateAcademicYearInput> = (data) =>
  validateWithZod(createAcademicYearSchema, data);

export const updateAcademicYearSchema = z
  .object({
    name: z.string().trim().min(1, "Academic year name cannot be empty.").optional(),
    fromYear: z
      .string()
      .refine((val) => !isNaN(Date.parse(val)), "fromYear must be a valid date.")
      .optional(),
    toYear: z
      .string()
      .refine((val) => !isNaN(Date.parse(val)), "toYear must be a valid date.")
      .optional(),
    isCurrent: z.boolean().optional(),
  })
  .refine(
    (data) => {
      if (data.fromYear && data.toYear) {
        return new Date(data.fromYear) < new Date(data.toYear);
      }
      return true;
    },
    {
      message: "Start date must be before end date.",
      path: ["toYear"],
    }
  );

export type UpdateAcademicYearInput = z.infer<typeof updateAcademicYearSchema>;
export const validateUpdateAcademicYear: Validator<UpdateAcademicYearInput> = (data) =>
  validateWithZod(updateAcademicYearSchema, data);

// ==========================================
// 5. Exam Validation Schemas
// ==========================================
export const questionSchema = z.object({
  question: z.string().trim().min(1, "Question text is required."),
  options: z
    .array(z.string().trim().min(1))
    .min(2, "At least 2 options are required for multiple-choice questions."),
  correctAnswer: z.string().trim().min(1, "Correct answer is required."),
  explanation: z.string().trim().optional(),
});

export const generateExamSchema = z.object({
  title: z.string().trim().optional(),
  subject: z.string().trim().min(1, "Subject ID is required."),
  class: z.string().trim().min(1, "Class ID is required."),
  duration: z.number().int().min(5, "Duration must be at least 5 minutes.").default(60),
  dueDate: z
    .string()
    .optional()
    .refine(
      (val) => !val || (!isNaN(Date.parse(val)) && new Date(val) > new Date()),
      "Due date must be a valid date in the future."
    )
    .default(() => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()),
  topic: z.string().trim().min(1, "Assessment topic is required."),
  difficulty: z.enum(["Easy", "Medium", "Hard"]).default("Medium"),
  count: z.number().int().min(1, "Question count must be between 1 and 50.").max(50, "Question count must be between 1 and 50.").default(10),
});

export type GenerateExamInput = z.infer<typeof generateExamSchema>;
export const validateGenerateExam: Validator<GenerateExamInput> = (data) =>
  validateWithZod(generateExamSchema, data);

export const submitExamSchema = z.object({
  answers: z
    .array(
      z.object({
        questionId: z.string().trim().min(1, "questionId is required."),
        answer: z.string().trim(),
      })
    )
    .min(1, "Answers must be a non-empty array of questions and responses."),
});

export type SubmitExamInput = z.infer<typeof submitExamSchema>;
export const validateSubmitExam: Validator<SubmitExamInput> = (data) =>
  validateWithZod(submitExamSchema, data);

// ==========================================
// 6. Timetable Validation Schemas
// ==========================================
export const generateTimetableSchema = z.object({
  classId: z.string().trim().min(1, "Class ID is required."),
  academicYearId: z
    .string()
    .trim()
    .min(1, "Academic Year ID is required."),
  settings: z
    .object({
      startTime: z.string().trim().default("08:00"),
      endTime: z.string().trim().default("15:00"),
      periods: z.number().int().positive().default(6),
    })
    .optional()
    .default({ startTime: "08:00", endTime: "15:00", periods: 6 }),
});

export type GenerateTimetableInput = z.infer<typeof generateTimetableSchema>;
export const validateGenerateTimetable: Validator<GenerateTimetableInput> = (data) =>
  validateWithZod(generateTimetableSchema, data);

// ==========================================
// 7. Attendance Validation Schemas
// ==========================================
export const attendanceRecordSchema = z.object({
  student: z.string().trim().min(1, "Student ID is required."),
  status: z.enum(["present", "absent", "late", "excused"]),
  remarks: z.string().trim().optional(),
});

export const bulkAttendanceSchema = z.object({
  classId: z.string().trim().min(1, "Class ID is required."),
  date: z.string().refine((val) => !isNaN(Date.parse(val)), "Valid date is required."),
  records: z.array(attendanceRecordSchema).min(1, "At least one attendance record is required."),
});

export type BulkAttendanceInput = z.infer<typeof bulkAttendanceSchema>;
export const validateBulkAttendance: Validator<BulkAttendanceInput> = (data) =>
  validateWithZod(bulkAttendanceSchema, data);

// ==========================================
// 8. Announcement Validation Schemas
// ==========================================
export const createAnnouncementSchema = z.object({
  title: z.string().trim().min(3, "Title must be at least 3 characters long."),
  content: z.string().trim().min(5, "Content must be at least 5 characters long."),
  targetAudience: z.enum(["all", "teacher", "student", "parent", "class"]).default("all"),
  targetClass: z.string().optional().nullable(),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
});

export type CreateAnnouncementInput = z.infer<typeof createAnnouncementSchema>;
export const validateCreateAnnouncement: Validator<CreateAnnouncementInput> = (data) =>
  validateWithZod(createAnnouncementSchema, data);
