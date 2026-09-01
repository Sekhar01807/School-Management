# SchoolSync Backend API

Enterprise Grade Academic Operations, RBAC-Hardened Management Platform, & Asynchronous Event Engine.

Built with **Node.js 20+ / Bun**, **Express 5**, **TypeScript**, **Zod (Validation Engine)**, **MongoDB Atlas (Mongoose 9)**, **Inngest**, **Structured Logger**, and **Google Gemini 1.5 Flash**.

---

## Table of Contents
- [Architecture & Design Principles](#architecture--design-principles)
- [Security Engineering & Vulnerability Hardening](#security-engineering--vulnerability-hardening)
- [Role-Based Access Control (RBAC) Matrix](#role-based-access-control-rbac-matrix)
- [Data Models & Entity Relationships](#data-models--entity-relationships)
- [REST API Specification](#rest-api-specification)
- [Asynchronous Event Processing (Inngest)](#asynchronous-event-processing-inngest)
- [Environment Variables & Configuration](#environment-variables--configuration)
- [Database Seeding & CLI Commands](#database-seeding--cli-commands)
- [Automated Testing Matrix (14 Test Suites)](#automated-testing-matrix)

---

## Architecture & Design Principles

The SchoolSync backend adopts a strict **Controller-Service-Data Access (Layered 3-Tier)** architecture:

```
                  ┌──────────────────────────────┐
                  │      Express 5 HTTP Layer    │
                  │ (Helmet, CORS, Cookies, Proxy│
                  └──────────────┬───────────────┘
                                 │
                 ┌───────────────▼───────────────┐
                 │    Security & Auth Pipelines  │
                 │ (JWT Auth, Bearer, RBAC, Rate)│
                 └───────────────┬───────────────┘
                                 │
                 ┌───────────────▼───────────────┐
                 │  Input Validation (Fail-Close)│
                 │   (Type-Safe Zod Schemas)     │
                 └───────────────┬───────────────┘
                                 │
                 ┌───────────────▼───────────────┐
                 │       Service Layer (Core)    │
                 │ (Business Logic & Struct Logs)│
                 └───────┬───────────────┬───────┘
                         │               │
      ┌──────────────────▼──┐         ┌──▼──────────────────┐
      │ MongoDB Atlas / ODM │         │ Inngest Event Engine│
      │   (Mongoose Schema) │         │ (AI Exam/Timetable) │
      └─────────────────────┘         └─────────────────────┘
```

1. **Declarative Zod Validation**: Every write request is intercepted by middleware that executes `schema.safeParse()`, verifying schema types, email formats, array bounds, and password complexities before controller invocation.
2. **Resource Isolation (IDOR Defense)**: Handlers perform strict tenant/relationship validation. Teachers cannot view/alter classes or students they are not assigned to; parents can only access records for their linked children.
3. **Stateless JWT with Dual Storage**: Tokens are delivered via `HttpOnly`, `SameSite=none`, `secure=true` cookies and accepted via `Authorization: Bearer <token>` headers.
4. **Structured JSON Logging**: In production, all logs are streamed as structured JSON with ISO timestamps (`backend/src/utils/logger.ts`) for log aggregators (Datadog, Render, CloudWatch).
5. **Audit Logging**: Sensitive mutations (user registration, status changes, attendance updates) automatically generate structured audit records in `ActivitiesLog`.

---

## Security Engineering & Vulnerability Hardening

SchoolSync was subjected to comprehensive multi-role security audits and hardened against critical vulnerability vectors:

### 1. Zero Privilege-Escalation on Public Registration
- **Vulnerability Solved**: Public callers cannot pass `role: "admin"` or `role: "teacher"` to elevate their privileges.
- **Enforcement**:
  - Unauthenticated registration (`POST /api/users/register`) strictly forces `role = "student"`. Any attempt to supply unauthorized roles is rejected with `403 Forbidden`.
  - Teachers are restricted to creating `student` accounts only.
  - Administrators are the only role authorized to provision `teacher`, `admin`, or `parent` accounts.

### 2. Verified Class Assignment for Attendance
- **Vulnerability Solved**: Prevent unauthorized teachers from viewing or recording attendance for unassigned classes.
- **Enforcement**: Handlers query class assignments (`classTeacher` or `subjects` teacher match) and reject unauthorized teachers with `403 Forbidden`.

### 3. Student Report Card & Attendance IDOR Protection
- **Vulnerability Solved**: Broken Object-Level Authorization (IDOR) on `/student/:studentId` endpoints.
- **Enforcement**: Centralized `canAccessStudentData` guard ensures:
  - **Student**: Allowed access to their own record only.
  - **Parent**: Allowed access only to their registered children (`parentId` / `children` link).
  - **Teacher**: Allowed access only to students enrolled in classes assigned to that teacher.
  - **Admin**: Full institution-wide visibility.

### 4. Strict CORS Policy & Origin Isolation
- **Vulnerability Solved**: Arbitrary origins issuing credentialed requests with HttpOnly cookies.
- **Enforcement**: Middleware matches incoming origins strictly against the explicit `CLIENT_URL` whitelist (rejecting wildcard `*.vercel.app` domains). Disallowed origins fail closed with `Not allowed by CORS`.

### 5. Multi-Tenant Export Authorization & IDOR Defense
- **Vulnerability Solved**: IDOR data leakage across classes or students via attendance, report card, and roster CSV export endpoints.
- **Enforcement**: `/api/export/*` endpoints verify `canAccessClassData` and `canAccessStudentData` before streaming reports.

### 6. Password Reset Host Header Poisoning Mitigation
- **Vulnerability Solved**: Attacker spoofing `Origin`/`Referer` headers to capture reset tokens in email links.
- **Enforcement**: Reset URL base domain is derived strictly from validated environment configuration (`CLIENT_URL`).

### 7. Protected Email Infrastructure & Test Dispatch Guard
- **Vulnerability Solved**: Unauthenticated abuse of transactional email endpoints (`/api/email/test`) for spam generation or API quota exhaustion.
- **Enforcement**: `POST /api/email/test` is protected with admin-only authorization (`protect`, `authorize(["admin"])`), rate limiting (5 requests per 15 min), and Zod input schema validation.

### 8. Production-Guarded Seeding & Enforced Strong Credentials
- **Vulnerability Solved**: Hardcoded demo credentials (`password123`) and unintended auto-seeding in production deployments.
- **Enforcement**:
  - Automatic startup seeding is disabled by default in `production` environments unless `SEED_DEFAULT_DATA=true` is explicitly declared.
  - When seeding in production, `DEFAULT_ADMIN_PASSWORD` is strictly required and cannot equal `password123` or be omitted.
  - Non-admin demo accounts (Teacher, Student, Parent) are omitted in production unless custom non-default credentials are provided in environment variables or `ALLOW_INSECURE_DEMO_SEEDING_IN_PROD=true` is declared.

---

## Role-Based Access Control (RBAC) Matrix

| Functional Domain | Resource / Operation | System Administrator (`admin`) | Faculty Member (`teacher`) | Enrolled Student (`student`) | IDOR & Multi-Tenant Boundary Guard |
| :--- | :--- | :---: | :---: | :---: | :--- |
| **Authentication & Sessions** | Sign In (`/api/users/login`) | Full Access | Full Access | Full Access | Rate-limited (10 req / 15m), HttpOnly JWT cookie |
| | Public Sign Up (`/api/users/register`) | Any Role | Student Role Only | Student Role Only | Public registration locked to `student` role |
| | Sign Out (`/api/users/logout`) | Full Access | Full Access | Full Access | Clears session cookie |
| **Self-Service & Profile** | View & Update Profile (`/api/users/profile`) | Own Profile | Own Profile | Own Profile | Strictly scoped to caller's `req.user._id` |
| | Change Password (`/api/users/change-password`) | Own Account | Own Account | Own Account | Requires current password validation |
| | Forgot/Reset Password (`/api/users/*password`) | Full Access | Full Access | Full Access | 15-min SHA-256 token, host-header poison defense |
| | Avatar Upload (`/api/upload/avatar`) | Full Access | Full Access | Full Access | Max 2MB (JPEG/PNG/WebP), updates user profile |
| **System Settings** | Manage Academic Years (CRUD) | Full Access | View All | View Active | Only Admin can create, modify, or activate years |
| **Academic Structure** | Manage Classes (Create/Edit/Delete) | Full Access | View All & Assigned | View Enrolled | Capacity clamping & assigned class teacher link |
| | Manage Subjects (Create/Edit/Delete) | Full Access | View All & Assigned | View Enrolled | Unique uppercase subject codes (`MATH101`, etc.) |
| **User Directory** | View Directory (`GET /api/users`) | All Accounts | Enrolled Students | No Access | Teachers restricted to student body; Students barred |
| | Manage Faculty & Admins | Full Access | No Access | No Access | Privilege escalation & self-deletion protection |
| | Manage Students | Full Access | Assigned Classes | No Access | Faculty can register/update enrolled students |
| **AI Timetable Engine** | Generate AI Timetable (Gemini AI) | Full Access | No Access | No Access | Inngest worker solves faculty/room collisions |
| | Manual Timetable Override/Save | Full Access | No Access | No Access | Direct grid persistence by Admin |
| | View Class Timetable | All Classes | Assigned Classes | Enrolled Class Only | Students restricted to their enrolled class |
| **LMS & Assessments** | AI Quiz Synthesis (Gemini AI) | Full Access | Authored Subjects | No Access | Structured 25 / 50 / 100 mark exam templates |
| | Exam Publish / Draft Toggle | Full Access | Authored Exams | No Access | Requires >= 1 question and non-expired due date |
| | View Questions & Answer Keys | Full Access | Authored Exams | Keys Sanitized | Answer keys stripped server-side for students |
| | Take Exam & Submit Answers | Blocked (Staff) | Blocked (Staff) | Enrolled Class Only | 1 submission per student per exam, auto-graded |
| | View Exam Results & Feedback | All Results | Authored/Class | Own Results Only | IDOR protected via `canAccessStudentData` |
| | Delete Exam & Submissions | Full Access | Authored Exams | No Access | Cascades deletion of all associated submissions |
| **Faculty Gradebook** | Batch Marks Entry (`/reports/marks/batch`) | Full Access | Assigned Classes | No Access | Bound to 25, 50, 100 max marks with letter grades |
| | Fetch Class Marks Roster | All Classes | Assigned Classes | No Access | Scoped to assigned class & subject |
| **Daily Attendance** | Mark Roll Call (`POST /attendance`) | All Classes | Assigned Classes | No Access | Validates teacher is assigned to class section |
| | Campus Attendance Overview | Campus-wide | Campus Overview | No Access | Aggregated percentage and class completion rates |
| | Student Attendance Summary | All Students | Assigned Students | Own Record Only | IDOR protected (`/attendance/student/me` vs `:id`) |
| | Class Attendance Register | All Classes | Assigned Classes | No Access | Date-filtered daily roll call records |
| | Low Attendance Auto-Alerts | Automated Cron | Automated Cron | Email Alerts | Automated alerts for attendance < 75% |
| **Announcements** | Publish Announcement | All Audiences | Targeted Audiences | No Access | Urgency tiers (Urgent, High, Medium, Low) |
| | Edit / Delete Announcement | All Broadcasts | Authored Only | No Access | Author scoping with Admin override |
| | View Broadcast Notices | All Notices | Teacher/All | Student/All/Class | Filtered by caller role and enrolled class |
| **Performance Reports** | Official Student Report Card | All Students | Assigned Students | Own Report Card | 10.0 CGPA & 4.0 GPA with subject breakdowns |
| | Class Performance Analytics | All Classes | Assigned Classes | No Access | Score distribution, pass rates, and class averages |
| | Campus Performance Scorecard | Campus-wide | Campus-wide | No Access | Institution-wide academic performance overview |
| **Data Export (CSV)** | Export Attendance CSV | All Classes | Assigned Classes | No Access | RFC-4180 Excel CSV with UTF-8 BOM |
| | Export Student Report Card CSV | All Students | Assigned Students | Own Report Card | Streams student GPA transcript in CSV format |
| | Export Student Directory CSV | All Students | Assigned Classes | No Access | Searchable directory export with emergency contacts |
| **System Operations** | Activity Audit Logs (`/activities`) | Full Access | No Access | No Access | Immutable audit logs of administrative actions |
| | Live Test Email Dispatch (`/email/test`) | Full Access | No Access | No Access | Rate-limited (5 req / 15m), schema validated |
| | Trigger Background Cron (`/email/trigger-cron`)| Full Access | No Access | No Access | Manual trigger for exam & attendance workers |
| | Email Provider Health (`/email/status`)| Public / Health | Public / Health | Public / Health | Resend & Gmail SMTP connectivity check |

---

## Data Models & Entity Relationships

- **`User`**: Account identity with role (`admin`, `teacher`, `student`), status (`isActive`), class link (`studentClass`), subject specialties (`teacherSubject`), and parent-guardian metadata (`emergencyContact`, `parentId`, `children`).
- **`AcademicYear`**: School calendar year bounds (e.g. `2025-2026`, `fromYear`, `toYear`, `isCurrent`).
- **`Class`**: Academic grouping with name, `academicYear`, assigned `classTeacher`, subject list (`subjects`), student list (`students`), and capacity.
- **`Subject`**: Course definition with name, code, assigned teacher(s), and active status.
- **`Attendance`**: Date-indexed records of student presence/absence per class with remarks and recording user reference.
- **`Exam`**: Assessment entity containing title, questions (multiple-choice options, points, correct answers), duration, due date, status, and class/subject association.
- **`Submission`**: Student exam responses, autograded score, calculated percentage, feedback, and submission timestamp.
- **`Timetable`**: Weekly schedule matrix per class with periods, days, subject associations, and teacher assignments.
- **`Announcement`**: Institution notices targeting audience segments (`all`, `teacher`, `student`, `class`).
- **`ActivitiesLog`**: Immutable audit logs capturing administrative mutations, user registrations, and attendance operations.

---

## REST API Specification

### 1. Authentication & User Management (`/api/users`)
- `POST /api/users/register` — Register a user (Public = Student; Teacher = Student; Admin = All).
- `POST /api/users/login` — Authenticate and issue secure HttpOnly JWT cookie.
- `POST /api/users/logout` — Clear JWT session cookie.
- `GET /api/users/profile` — Fetch active authenticated user profile.
- `PUT /api/users/profile` — Self-service profile updates (phone, address, avatar, emergency contacts).
- `PUT /api/users/change-password` — Self-service password change with current password verification.
- `POST /api/users/forgot-password` — Request password reset email with secure 15-minute token.
- `POST /api/users/reset-password` — Reset account password using token verification.
- `GET /api/users` — Paginated user directory with search and role filters (Teachers restricted to students).
- `PUT /api/users/update/:id` — Update user record with role guardrails (Admin only, supports PUT & PATCH).
- `DELETE /api/users/delete/:id` — Delete user account (prevents self-deletion, Admin only).

### 2. Academic Years (`/api/academic-years`)
- `GET /api/academic-years/current` — Retrieves active academic year (Authenticated).
- `GET /api/academic-years` — Retrieves all academic years (Admin / Teacher).
- `POST /api/academic-years/create` — Creates new academic year (Admin only).
- `PUT /api/academic-years/update/:id` — Updates academic year details (Admin only, PUT & PATCH).
- `DELETE /api/academic-years/delete/:id` — Removes academic year record (Admin only).

### 3. Classes & Sections (`/api/classes`)
- `GET /api/classes` — Paginated list of classes with enrolled students & subjects (Authenticated).
- `GET /api/classes/:id` — Detailed class view with teacher assignments & enrolled students (Authenticated).
- `POST /api/classes/create` — Registers new class section with capacity and class teacher (Admin only).
- `PUT /api/classes/update/:id` — Modifies class configuration and curriculum (Admin only, PUT & PATCH).
- `DELETE /api/classes/delete/:id` — Removes class section (Admin only).

### 4. Subject Curriculums (`/api/subjects`)
- `GET /api/subjects` — Paginated list of academic subjects (Authenticated).
- `POST /api/subjects/create` — Registers new subject with uppercase code validation (`MATH101`, Admin only).
- `PUT /api/subjects/update/:id` — Modifies subject details and teacher allocations (Admin only, PUT & PATCH).
- `DELETE /api/subjects/delete/:id` — Removes subject from curriculum (Admin only).

### 5. AI Timetable Scheduling (`/api/timetables`)
- `POST /api/timetables/generate` — Dispatches AI timetable optimization (Gemini AI / Inngest worker, Admin only).
- `POST /api/timetables/manual` — Saves or overrides weekly timetable grid manually (Admin only).
- `GET /api/timetables/:classId` — Retrieves weekly schedule (Students restricted to enrolled class).

### 6. LMS & AI Assessment Engine (`/api/exams`)
- `POST /api/exams/generate` — Dispatches AI quiz synthesis (Gemini AI, Admin / Teacher).
- `GET /api/exams` — Lists exams (Role-filtered: student enrolled class, teacher authored).
- `GET /api/exams/:id` — Retrieves exam details (Answer keys stripped server-side for students).
- `PATCH /api/exams/:id/status` — Toggles draft/published state (Validates deadline & question count).
- `POST /api/exams/:id/submit` — Submits exam answers for automated grading and instant feedback (Student only).
- `GET /api/exams/:id/result` — Returns score breakdown, percentage, and grade letter (IDOR guarded).
- `DELETE /api/exams/:id` — Cascades deletion of exam and associated student submissions (Admin / Teacher).

### 7. Daily Attendance Operations (`/api/attendance`)
- `POST /api/attendance` — Records class roll call: Present, Absent, Late, Excused (Assigned teachers / Admin).
- `GET /api/attendance/overview` — Campus-wide attendance summary, daily rates, and 7-day trend (Admin / Teacher).
- `GET /api/attendance/student/me` — Student personal attendance record and statutory threshold status (Student).
- `GET /api/attendance/student/:studentId` — IDOR-protected attendance summary for a student (Admin / Teacher).
- `GET /api/attendance/class/:classId` — Class attendance register by date or date range (Admin / Teacher).

### 8. Institutional Announcements (`/api/announcements`)
- `GET /api/announcements` — Retrieves announcements targeted to the caller's role / class (Authenticated).
- `POST /api/announcements` — Publishes announcement with audience (`all`, `teacher`, `student`, `class`) & priority (Admin / Teacher).
- `PUT /api/announcements/:id` — Updates announcement content, priority, or expiration (Admin / Author).
- `DELETE /api/announcements/:id` — Deletes announcement broadcast (Admin / Author).

### 9. Performance Reports & Marks Gradebook (`/api/reports`)
- `GET /api/reports/student/me` — Official student report card with cumulative CGPA (10.0) & GPA (4.0) (Student).
- `GET /api/reports/student/:studentId` — IDOR-protected student report card and academic transcript (Admin / Teacher).
- `GET /api/reports/marks/class/:classId/subject/:subjectId` — Retrieves batch assessment marks and roster (Admin / Teacher).
- `POST /api/reports/marks/batch` — Batch saves assessment marks and remarks for 25, 50, 100 mark exams (Admin / Teacher).
- `GET /api/reports/class/:classId` — Computes class averages, score distribution brackets, and pass rates (Admin / Teacher).
- `GET /api/reports/school` — Campus-wide academic metrics and institutional scorecard (Admin / Teacher).

### 10. Institutional CSV Exports (`/api/export`)
- `GET /api/export/attendance/:classId` — Streams monthly class attendance matrix in Excel RFC-4180 CSV (Assigned teachers / Admin).
- `GET /api/export/report-card/:studentId` — Streams student GPA transcript & assessment report card in CSV (Admin / Teacher / Student [Self]).
- `GET /api/export/students` — Streams searchable student directory roster with emergency contacts in CSV (Assigned teachers / Admin).

### 11. Media & Profile Uploads (`/api/upload`)
- `POST /api/upload/avatar` — Uploads user profile image (Max 2MB, JPEG/PNG/WebP) and updates avatar URL (Authenticated).

### 12. Transactional Email & Automation (`/api/email`)
- `GET /api/email/status` — Inspect transactional email provider status & health (Resend / Gmail SMTP / Sandbox, Public/Admin).
- `POST /api/email/test` — Dispatch live real-time test verification email (Admin only + Rate Limited + Validated).
- `POST /api/email/trigger-cron` — Manually trigger background cron tasks (exam reminders & attendance health checks, Admin only).

### 13. Dashboard Analytics (`/api/dashboard`)
- `GET /api/dashboard/stats` — Dynamic role-adaptive metrics (Admin campus stats, Teacher grading widgets, Student CGPA/schedule, Authenticated).

### 14. Audit & Security Activity Logs (`/api/activities`)
- `GET /api/activities` — Retrieves chronological administrative mutation and security audit logs (Admin only).

---

## Asynchronous Event Processing (Inngest)

SchoolSync uses **Inngest** for resilient, non-blocking background workflows:
1. `generateExam`: Prompts Google Gemini 1.5 Flash to synthesize subject-specific, multi-difficulty questions with balanced distractors.
2. `handleExamSubmission`: Autogrades student submissions against answer keys and generates personalized learning feedback.

---

## Environment Variables & Configuration

Create a `.env` file in the `backend/` directory:

```env
# Server & Environment
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173

# Database & Authentication
MONGO_URL=mongodb+srv://<username>:<password>@cluster.mongodb.net/school_management
JWT_SECRET=your_super_secret_jwt_key_at_least_32_characters_long

# Seeding & Security Defaults (Development / Demo Sandbox only)
# WARNING: In production, DEFAULT_ADMIN_PASSWORD must be a strong unique secret and cannot be "password123".
SEED_DEFAULT_DATA=true
DEFAULT_ADMIN_EMAIL=admin@schoolsync.com
DEFAULT_ADMIN_PASSWORD=password123
DEFAULT_TEACHER_EMAIL=teacher@schoolsync.com
DEFAULT_TEACHER_PASSWORD=password123
DEFAULT_STUDENT_EMAIL=student@schoolsync.com
DEFAULT_STUDENT_PASSWORD=password123
DEFAULT_PARENT_EMAIL=parent@schoolsync.com
DEFAULT_PARENT_PASSWORD=password123

# AI & Background Workers
GEMINI_API_KEY=AIzaSy...
INNGEST_EVENT_KEY=your_inngest_event_key
INNGEST_SIGNING_KEY=your_inngest_signing_key
```

---

## Database Seeding & CLI Commands

```bash
# Install dependencies
npm install

# Start local development server with hot-reload
npm run dev

# Explicit on-demand database seed
npm run db:seed

# Wipe and freshly re-seed the database
npm run db:clean

# Run automated test suites
npm test

# Start production server
npm start
```

---

## Automated Testing Matrix (20 Test Suites | 207 Tests)

Run the comprehensive 20-suite security, RBAC, Zod validation, defensive AI scheduling, and transactional services test matrix (93 suites / 207 tests passing with 100% success rate):

```bash
npm test
```

Test suites verify:
1. `inngest_resilience.test.ts`: Defensive JSON extraction (`safeExtractJSON`), conversational preamble stripping, and deterministic conflict-free schedule fallback engine.
2. `inngest_exam_resilience.test.ts`: AI MCQ extraction, answer key normalization, missing choice sanitization, and auto-scoring.
3. `export_service.test.ts`: RFC-4180 CSV escaping, UTF-8 BOM compatibility, attendance registers, and grade transcripts.
4. `email_service.test.ts`: Transactional email templates, role onboarding, password reset token links, and absence alerts.
5. `class_and_subject_service.test.ts`: Subject code uppercase normalization, capacity boundaries, and academic year date constraints.
6. `zod_validation.test.ts`: Exhaustive Zod schema validations, password heuristics, and payload transformations.
7. `exam_service.test.ts`: Exam answer key sanitization, deadline validations, auto-grading, and GPA calculation.
8. `attendance_service.test.ts`: Daily attendance rates, threshold alerts (<75%), and UTC date normalization.
9. `timetable_service.test.ts`: Schedule collision avoidance, teacher double-booking prevention, and lunch intervals.
10. `announcement_service.test.ts`: Target audience routing (`all`, `teacher`, `student`, `parent`, `class`) and author permissions.
11. `report_service.test.ts`: GPA calculations, class analytics aggregation, and RFC-4180 CSV export generation.
12. `middleware_pipeline.test.ts`: `validateBody` Zod integration, NoSQL injection stripping, and role authorization guards.
13. `logger.test.ts`: Structured JSON logging in production vs formatted terminal output in development.
14. `auth_token.test.ts`: HS512 JWT generation, tamper detection, expiration validation, and cookie attributes.
15. `resource_authorization.test.ts`: Teacher resource isolation, class boundary enforcement, and parent/teacher student IDOR defense.
16. `security_rbac.test.ts`: Public registration role escalation prevention, regex sanitization, in-memory rate limiting, and production seed security.
17. `business_logic.test.ts`: Exam scoring, grade mapping, and bcrypt password hashing.
18. `profile_and_notifications.test.ts`: Profile schemas, SHA-256 tokens, welcome cards, and transactional email formatting.
19. `academic_services.test.ts`: Academic entity lifecycle and cross-model constraints.
20. `request_validation.test.ts`: Regression validation for core controllers.
