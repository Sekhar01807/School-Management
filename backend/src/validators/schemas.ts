// Centralized Validation Schemas for SchoolSync API

export type ValidationResult<T> = {
  success: boolean;
  data?: T;
  errors?: string[];
};

export type Validator<T> = (data: any) => ValidationResult<T>;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Disallowed trivial/compromised passwords
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
 * Enterprise Password Security Validation
 * Enforces:
 * - Minimum 8 characters, Maximum 72 characters
 * - At least 1 uppercase letter (A-Z)
 * - At least 1 lowercase letter (a-z)
 * - At least 1 numerical digit (0-9)
 * - At least 1 special character (!@#$%^&*...)
 * - Protection against common dictionary words & email username reuse
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

// 1. User Validation Schemas
export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  role?: "admin" | "teacher" | "student" | "parent";
  studentClass?: string;
  teacherSubject?: string[];
  teacherSubjects?: string[];
  isActive?: boolean;
}

export const validateRegister: Validator<RegisterInput> = (data: any) => {
  const errors: string[] = [];

  if (!data || typeof data !== "object") {
    return { success: false, errors: ["Request body is required."] };
  }

  if (!data.name || typeof data.name !== "string" || data.name.trim().length < 2) {
    errors.push("Name must be a string of at least 2 characters.");
  }

  if (!data.email || typeof data.email !== "string" || !EMAIL_REGEX.test(data.email.trim())) {
    errors.push("A valid email address is required.");
  }

  const passwordValidation = validatePasswordSecurity(data.password, {
    name: data.name,
    email: data.email,
  });
  if (!passwordValidation.valid) {
    errors.push(...passwordValidation.errors);
  }

  const validRoles = ["admin", "teacher", "student", "parent"];
  if (data.role && !validRoles.includes(data.role)) {
    errors.push(`Role must be one of: ${validRoles.join(", ")}.`);
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      name: data.name.trim(),
      email: data.email.trim().toLowerCase(),
      password: data.password,
      role: data.role || "student",
      studentClass: data.studentClass,
      teacherSubject: Array.isArray(data.teacherSubject)
        ? data.teacherSubject
        : Array.isArray(data.teacherSubjects)
        ? data.teacherSubjects
        : [],
      isActive: data.isActive !== undefined ? Boolean(data.isActive) : true,
    },
  };
};

export interface LoginInput {
  email: string;
  password: string;
}

export const validateLogin: Validator<LoginInput> = (data: any) => {
  const errors: string[] = [];

  if (!data || typeof data !== "object") {
    return { success: false, errors: ["Email and password are required."] };
  }

  if (!data.email || typeof data.email !== "string" || !EMAIL_REGEX.test(data.email.trim())) {
    errors.push("A valid email address is required.");
  }

  if (!data.password || typeof data.password !== "string" || data.password.length === 0) {
    errors.push("Password is required.");
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      email: data.email.trim().toLowerCase(),
      password: data.password,
    },
  };
};

export interface UpdateProfileInput {
  name?: string;
  phoneNumber?: string;
  address?: string;
  avatar?: string;
  emergencyContact?: {
    name?: string;
    phone?: string;
    relationship?: string;
  };
}

export const validateUpdateProfile: Validator<UpdateProfileInput> = (data: any) => {
  const errors: string[] = [];

  if (!data || typeof data !== "object") {
    return { success: false, errors: ["Profile update data is required."] };
  }

  if (data.name !== undefined && (typeof data.name !== "string" || data.name.trim().length < 2)) {
    errors.push("Name must be at least 2 characters long.");
  }

  if (data.phoneNumber !== undefined && typeof data.phoneNumber !== "string") {
    errors.push("Phone number must be a string.");
  }

  if (data.address !== undefined && typeof data.address !== "string") {
    errors.push("Address must be a string.");
  }

  if (data.avatar !== undefined && typeof data.avatar !== "string") {
    errors.push("Avatar must be a string URL or data URI.");
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  const normalized: UpdateProfileInput = {};
  if (data.name !== undefined) normalized.name = data.name.trim();
  if (data.phoneNumber !== undefined) normalized.phoneNumber = data.phoneNumber.trim();
  if (data.address !== undefined) normalized.address = data.address.trim();
  if (data.avatar !== undefined) normalized.avatar = data.avatar.trim();
  if (data.emergencyContact && typeof data.emergencyContact === "object") {
    normalized.emergencyContact = {
      name: typeof data.emergencyContact.name === "string" ? data.emergencyContact.name.trim() : "",
      phone: typeof data.emergencyContact.phone === "string" ? data.emergencyContact.phone.trim() : "",
      relationship: typeof data.emergencyContact.relationship === "string" ? data.emergencyContact.relationship.trim() : "",
    };
  }

  return { success: true, data: normalized };
};

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

export const validateChangePassword: Validator<ChangePasswordInput> = (data: any) => {
  const errors: string[] = [];

  if (!data || typeof data !== "object") {
    return { success: false, errors: ["Password change payload is required."] };
  }

  if (!data.currentPassword || typeof data.currentPassword !== "string") {
    errors.push("Current password is required.");
  }

  const passwordValidation = validatePasswordSecurity(data.newPassword);
  if (!passwordValidation.valid) {
    errors.push(...passwordValidation.errors);
  }

  if (data.currentPassword && data.newPassword && data.currentPassword === data.newPassword) {
    errors.push("New password must be different from current password.");
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      currentPassword: data.currentPassword,
      newPassword: data.newPassword,
    },
  };
};

export interface ForgotPasswordInput {
  email: string;
}

export const validateForgotPassword: Validator<ForgotPasswordInput> = (data: any) => {
  const errors: string[] = [];

  if (!data || typeof data !== "object") {
    return { success: false, errors: ["Email is required."] };
  }

  if (!data.email || typeof data.email !== "string" || !EMAIL_REGEX.test(data.email.trim())) {
    errors.push("A valid email address is required.");
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      email: data.email.trim().toLowerCase(),
    },
  };
};

export interface ResetPasswordInput {
  token: string;
  newPassword: string;
}

export const validateResetPassword: Validator<ResetPasswordInput> = (data: any) => {
  const errors: string[] = [];

  if (!data || typeof data !== "object") {
    return { success: false, errors: ["Token and new password are required."] };
  }

  if (!data.token || typeof data.token !== "string" || data.token.trim().length === 0) {
    errors.push("Password reset token is required.");
  }

  const passwordValidation = validatePasswordSecurity(data.newPassword);
  if (!passwordValidation.valid) {
    errors.push(...passwordValidation.errors);
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      token: data.token.trim(),
      newPassword: data.newPassword,
    },
  };
};

export interface UpdateUserInput {
  name?: string;
  email?: string;
  password?: string;
  role?: "admin" | "teacher" | "student" | "parent";
  isActive?: boolean;
  studentClass?: string | null;
  teacherSubject?: string[];
  teacherSubjects?: string[];
}

export const validateUpdateUser: Validator<UpdateUserInput> = (data: any) => {
  const errors: string[] = [];

  if (!data || typeof data !== "object") {
    return { success: false, errors: ["Update payload is required."] };
  }

  if (data.name !== undefined && (typeof data.name !== "string" || data.name.trim().length < 2)) {
    errors.push("Name must be at least 2 characters long.");
  }

  if (data.email !== undefined && (typeof data.email !== "string" || !EMAIL_REGEX.test(data.email.trim()))) {
    errors.push("Email must be a valid email address.");
  }

  if (data.password !== undefined && data.password !== "") {
    const passwordValidation = validatePasswordSecurity(data.password, {
      name: data.name,
      email: data.email,
    });
    if (!passwordValidation.valid) {
      errors.push(...passwordValidation.errors);
    }
  }

  const validRoles = ["admin", "teacher", "student", "parent"];
  if (data.role !== undefined && !validRoles.includes(data.role)) {
    errors.push(`Role must be one of: ${validRoles.join(", ")}.`);
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  const normalized: UpdateUserInput = {};
  if (data.name !== undefined) normalized.name = data.name.trim();
  if (data.email !== undefined) normalized.email = data.email.trim().toLowerCase();
  if (data.password !== undefined) normalized.password = data.password;
  if (data.role !== undefined) normalized.role = data.role;
  if (data.isActive !== undefined) normalized.isActive = Boolean(data.isActive);
  if (data.studentClass !== undefined) normalized.studentClass = data.studentClass;
  if (data.teacherSubject !== undefined || data.teacherSubjects !== undefined) {
    normalized.teacherSubject = Array.isArray(data.teacherSubject)
      ? data.teacherSubject
      : Array.isArray(data.teacherSubjects)
      ? data.teacherSubjects
      : [];
  }

  return { success: true, data: normalized };
};

// 2. Class Validation Schemas
export interface CreateClassInput {
  name: string;
  academicYear: string;
  classTeacher?: string | null;
  capacity?: number;
  subjects?: string[];
}

export const validateCreateClass: Validator<CreateClassInput> = (data: any) => {
  const errors: string[] = [];

  if (!data || typeof data !== "object") {
    return { success: false, errors: ["Class data is required."] };
  }

  if (!data.name || typeof data.name !== "string" || data.name.trim().length === 0) {
    errors.push("Class name is required.");
  }

  if (!data.academicYear || typeof data.academicYear !== "string" || data.academicYear.trim().length === 0) {
    errors.push("Academic Year ID is required.");
  }

  if (data.capacity !== undefined && (typeof data.capacity !== "number" || data.capacity < 1)) {
    errors.push("Class capacity must be a positive integer.");
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      name: data.name.trim(),
      academicYear: data.academicYear.trim(),
      classTeacher: data.classTeacher || null,
      capacity: data.capacity || 40,
      subjects: Array.isArray(data.subjects) ? data.subjects : [],
    },
  };
};

export interface UpdateClassInput {
  name?: string;
  academicYear?: string;
  classTeacher?: string | null;
  capacity?: number;
  subjects?: string[];
}

export const validateUpdateClass: Validator<UpdateClassInput> = (data: any) => {
  const errors: string[] = [];

  if (!data || typeof data !== "object") {
    return { success: false, errors: ["Update payload is required."] };
  }

  if (data.name !== undefined && (typeof data.name !== "string" || data.name.trim().length === 0)) {
    errors.push("Class name cannot be empty.");
  }

  if (data.capacity !== undefined && (typeof data.capacity !== "number" || data.capacity < 1)) {
    errors.push("Capacity must be a positive number.");
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  const normalized: UpdateClassInput = {};
  if (data.name !== undefined) normalized.name = data.name.trim();
  if (data.academicYear !== undefined) normalized.academicYear = data.academicYear;
  if (data.classTeacher !== undefined) normalized.classTeacher = data.classTeacher || null;
  if (data.capacity !== undefined) normalized.capacity = data.capacity;
  if (data.subjects !== undefined) normalized.subjects = Array.isArray(data.subjects) ? data.subjects : [];

  return { success: true, data: normalized };
};

// 3. Subject Validation Schemas
export interface CreateSubjectInput {
  name: string;
  code: string;
  teacher?: string[];
  isActive?: boolean;
}

export const validateCreateSubject: Validator<CreateSubjectInput> = (data: any) => {
  const errors: string[] = [];

  if (!data || typeof data !== "object") {
    return { success: false, errors: ["Subject data is required."] };
  }

  if (!data.name || typeof data.name !== "string" || data.name.trim().length === 0) {
    errors.push("Subject name is required.");
  }

  if (!data.code || typeof data.code !== "string" || data.code.trim().length === 0) {
    errors.push("Subject code is required.");
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      name: data.name.trim(),
      code: data.code.trim().toUpperCase(),
      teacher: Array.isArray(data.teacher) ? data.teacher : [],
      isActive: data.isActive !== undefined ? Boolean(data.isActive) : true,
    },
  };
};

export interface UpdateSubjectInput {
  name?: string;
  code?: string;
  teacher?: string[];
  isActive?: boolean;
}

export const validateUpdateSubject: Validator<UpdateSubjectInput> = (data: any) => {
  const errors: string[] = [];

  if (!data || typeof data !== "object") {
    return { success: false, errors: ["Update payload is required."] };
  }

  if (data.name !== undefined && (typeof data.name !== "string" || data.name.trim().length === 0)) {
    errors.push("Subject name cannot be empty.");
  }

  if (data.code !== undefined && (typeof data.code !== "string" || data.code.trim().length === 0)) {
    errors.push("Subject code cannot be empty.");
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  const normalized: UpdateSubjectInput = {};
  if (data.name !== undefined) normalized.name = data.name.trim();
  if (data.code !== undefined) normalized.code = data.code.trim().toUpperCase();
  if (data.teacher !== undefined) normalized.teacher = Array.isArray(data.teacher) ? data.teacher : [];
  if (data.isActive !== undefined) normalized.isActive = Boolean(data.isActive);

  return { success: true, data: normalized };
};

// 4. Academic Year Validation Schemas
export interface CreateAcademicYearInput {
  name: string;
  fromYear: string;
  toYear: string;
  isCurrent?: boolean;
}

export const validateCreateAcademicYear: Validator<CreateAcademicYearInput> = (data: any) => {
  const errors: string[] = [];

  if (!data || typeof data !== "object") {
    return { success: false, errors: ["Academic year data is required."] };
  }

  if (!data.name || typeof data.name !== "string" || data.name.trim().length === 0) {
    errors.push("Academic year name is required (e.g., '2025-2026').");
  }

  if (!data.fromYear || isNaN(Date.parse(data.fromYear))) {
    errors.push("A valid start date (fromYear) is required.");
  }

  if (!data.toYear || isNaN(Date.parse(data.toYear))) {
    errors.push("A valid end date (toYear) is required.");
  }

  if (data.fromYear && data.toYear && new Date(data.fromYear) >= new Date(data.toYear)) {
    errors.push("Academic year start date must precede the end date.");
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      name: data.name.trim(),
      fromYear: data.fromYear,
      toYear: data.toYear,
      isCurrent: Boolean(data.isCurrent),
    },
  };
};

export interface UpdateAcademicYearInput {
  name?: string;
  fromYear?: string;
  toYear?: string;
  isCurrent?: boolean;
}

export const validateUpdateAcademicYear: Validator<UpdateAcademicYearInput> = (data: any) => {
  const errors: string[] = [];

  if (!data || typeof data !== "object") {
    return { success: false, errors: ["Update payload is required."] };
  }

  if (data.name !== undefined && (typeof data.name !== "string" || data.name.trim().length === 0)) {
    errors.push("Academic year name cannot be empty.");
  }

  if (data.fromYear !== undefined && isNaN(Date.parse(data.fromYear))) {
    errors.push("fromYear must be a valid date.");
  }

  if (data.toYear !== undefined && isNaN(Date.parse(data.toYear))) {
    errors.push("toYear must be a valid date.");
  }

  if (data.fromYear && data.toYear && new Date(data.fromYear) >= new Date(data.toYear)) {
    errors.push("Start date must be before end date.");
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  const normalized: UpdateAcademicYearInput = {};
  if (data.name !== undefined) normalized.name = data.name.trim();
  if (data.fromYear !== undefined) normalized.fromYear = data.fromYear;
  if (data.toYear !== undefined) normalized.toYear = data.toYear;
  if (data.isCurrent !== undefined) normalized.isCurrent = Boolean(data.isCurrent);

  return { success: true, data: normalized };
};

// 5. Exam Validation Schemas
export interface GenerateExamInput {
  title?: string;
  subject: string;
  class: string;
  duration?: number;
  dueDate?: string;
  topic: string;
  difficulty?: "Easy" | "Medium" | "Hard";
  count?: number;
}

export const validateGenerateExam: Validator<GenerateExamInput> = (data: any) => {
  const errors: string[] = [];

  if (!data || typeof data !== "object") {
    return { success: false, errors: ["Exam configuration is required."] };
  }

  if (!data.subject || typeof data.subject !== "string") {
    errors.push("Subject ID is required.");
  }

  if (!data.class || typeof data.class !== "string") {
    errors.push("Class ID is required.");
  }

  if (!data.topic || typeof data.topic !== "string" || data.topic.trim().length === 0) {
    errors.push("Assessment topic is required.");
  }

  if (data.count !== undefined && (typeof data.count !== "number" || data.count < 1 || data.count > 50)) {
    errors.push("Question count must be between 1 and 50.");
  }

  if (data.duration !== undefined && (typeof data.duration !== "number" || data.duration < 5)) {
    errors.push("Duration must be at least 5 minutes.");
  }

  if (data.dueDate !== undefined && (isNaN(Date.parse(data.dueDate)) || new Date(data.dueDate) <= new Date())) {
    errors.push("Due date must be a valid date in the future.");
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      title: data.title ? data.title.trim() : undefined,
      subject: data.subject.trim(),
      class: data.class.trim(),
      duration: data.duration || 60,
      dueDate: data.dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      topic: data.topic.trim(),
      difficulty: data.difficulty || "Medium",
      count: data.count || 10,
    },
  };
};

export interface SubmitExamInput {
  answers: { questionId: string; answer: string }[];
}

export const validateSubmitExam: Validator<SubmitExamInput> = (data: any) => {
  const errors: string[] = [];

  if (!data || typeof data !== "object") {
    return { success: false, errors: ["Submission data is required."] };
  }

  if (!Array.isArray(data.answers) || data.answers.length === 0) {
    errors.push("Answers must be a non-empty array of questions and responses.");
  } else {
    for (let i = 0; i < data.answers.length; i++) {
      const a = data.answers[i];
      if (!a || typeof a !== "object" || !a.questionId || typeof a.answer !== "string") {
        errors.push(`Answer at index ${i} must contain a valid questionId and answer string.`);
        break;
      }
    }
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      answers: data.answers.map((a: any) => ({
        questionId: String(a.questionId).trim(),
        answer: String(a.answer).trim(),
      })),
    },
  };
};

// 6. Timetable Validation Schemas
export interface GenerateTimetableInput {
  classId: string;
  academicYearId: string;
  settings?: {
    startTime?: string;
    endTime?: string;
    periods?: number;
  };
}

export const validateGenerateTimetable: Validator<GenerateTimetableInput> = (data: any) => {
  const errors: string[] = [];

  if (!data || typeof data !== "object") {
    return { success: false, errors: ["Timetable parameters are required."] };
  }

  if (!data.classId || typeof data.classId !== "string" || data.classId.trim().length === 0) {
    errors.push("Class ID is required.");
  }

  if (!data.academicYearId || typeof data.academicYearId !== "string" || data.academicYearId.trim().length === 0) {
    errors.push("Academic Year ID is required.");
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      classId: data.classId.trim(),
      academicYearId: data.academicYearId.trim(),
      settings: {
        startTime: data.settings?.startTime || "08:00",
        endTime: data.settings?.endTime || "15:00",
        periods: data.settings?.periods || 6,
      },
    },
  };
};
