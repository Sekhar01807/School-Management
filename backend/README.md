# SchoolSync Backend API

Enterprise Grade Academic Operations, RBAC-Hardened Management Platform, & Asynchronous Event Engine.

Built with **Node.js / Bun**, **Express 5**, **TypeScript**, **MongoDB Atlas (Mongoose 9)**, **Inngest**, and **Google Gemini 1.5 Flash**.

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
- [Automated Testing Matrix](#automated-testing-matrix)

---

## Architecture & Design Principles

The SchoolSync backend adopts a strict **Controller-Service-Data Access (Layered 3-Tier)** architecture:

```
                  ┌──────────────────────────────┐
                  │      Express 5 HTTP Layer    │
                  │  (Helmet, CORS, Cookies, IP) │
                  └──────────────┬───────────────┘
                                 │
                 ┌───────────────▼───────────────┐
                 │    Security & Auth Pipelines  │
                 │ (JWT Auth, RBAC, Rate Limiter)│
                 └───────────────┬───────────────┘
                                 │
                 ┌───────────────▼───────────────┐
                 │  Input Validation (Fail-Close)│
                 │  (Declarative Custom Schemas) │
                 └───────────────┬───────────────┘
                                 │
                 ┌───────────────▼───────────────┐
                 │       Service Layer (Core)    │
                 │  (Business Logic & Validation)│
                 └───────┬───────────────┬───────┘
                         │               │
      ┌──────────────────▼──┐         ┌──▼──────────────────┐
      │ MongoDB Atlas / ODM │         │ Inngest Event Engine│
      │   (Mongoose Schema) │         │ (AI Exam/Timetable) │
      └─────────────────────┘         └─────────────────────┘
```

1. **Fail-Closed Validation**: Every write request is intercepted by middleware that verifies schema types, strings, email formats, and object bounds prior to controller invocation.
2. **Resource Isolation (IDOR Defense)**: Handlers perform strict tenant/relationship validation. Teachers cannot view/alter classes or students they are not assigned to; parents can only access records for their linked children.
3. **Stateless JWT with HttpOnly Cookie Storage**: Tokens are stored in tamper-proof, browser-inaccessible cookies with `SameSite`, `HttpOnly`, and `Secure` attributes.
4. **Audit Logging**: Sensitive mutations (user registration, status changes, attendance updates) automatically generate structured logs in `ActivitiesLog`.

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

### 4. Production-Guarded Seeding & Enforced Strong Credentials
- **Vulnerability Solved**: Hardcoded demo credentials (`password123`) and unintended auto-seeding in production deployments.
- **Enforcement**:
  - Automatic startup seeding is disabled by default in `production` environments unless `SEED_DEFAULT_DATA=true` is explicitly declared.
  - When seeding in production, `DEFAULT_ADMIN_PASSWORD` is strictly required and cannot equal `password123` or be omitted.
  - Non-admin demo accounts (Teacher, Student, Parent) are omitted in production unless custom non-default credentials are provided in environment variables or `ALLOW_INSECURE_DEMO_SEEDING_IN_PROD=true` is declared.

---

## Role-Based Access Control (RBAC) Matrix

| Resource / Action | Admin | Teacher | Student | Parent | Public |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Self Registration** | — | — | Yes (Student role) | — | Yes (Student only) |
| **Create Teacher/Admin Accounts** | Yes | No | No | No | No |
| **Create Student Accounts** | Yes | Yes | No | No | No |
| **View User Directory** | Yes (All) | Yes (Students only)| No | No | No |
| **Mark Class Attendance** | Yes | Yes (Assigned only)| No | No | No |
| **View Class Attendance** | Yes | Yes (Assigned only)| No | No | No |
| **View Student Attendance Summary** | Yes | Yes (Assigned only)| Yes (Self only) | Yes (Linked child) | No |
| **View Student Report Card** | Yes | Yes (Assigned only)| Yes (Self only) | Yes (Linked child) | No |
| **Class Performance Analytics** | Yes | Yes (Assigned only)| No | No | No |
| **Campus-Wide Analytics** | Yes | Yes | No | No | No |
| **Generate AI Exam** | Yes | Yes | No | No | No |
| **Submit Exam** | No | No | Yes (Enrolled class)| No | No |
| **View Exam Results** | Yes | Yes (Exam author) | Yes (Self only) | Yes (Linked child) | No |
| **Generate AI Timetable** | Yes | Yes | No | No | No |
| **Manage Announcements** | Yes | Yes (Class audience)| No | No | No |

---

## Data Models & Entity Relationships

- **`User`**: Account identity with role (`admin`, `teacher`, `student`, `parent`), status (`isActive`), class link (`studentClass`), subject specialties (`teacherSubject`), and parent-child association (`parentId`, `children`).
- **`AcademicYear`**: School calendar year bounds (e.g. `2025-2026`, `fromYear`, `toYear`, `isCurrent`).
- **`Class`**: Academic grouping with name, `academicYear`, assigned `classTeacher`, subject list (`subjects`), student list (`students`), and capacity.
- **`Subject`**: Course definition with name, code, assigned teacher(s), and active status.
- **`Attendance`**: Date-indexed records of student presence/absence per class with remarks and recording user reference.
- **`Exam`**: Assessment entity containing title, questions (multiple-choice options, points, correct answers), duration, due date, status, and class/subject association.
- **`Submission`**: Student exam responses, autograded score, calculated percentage, feedback, and submission timestamp.
- **`Timetable`**: Weekly schedule matrix per class with periods, days, subject associations, and teacher assignments.
- **`Announcement`**: Institution notices targeting audience segments (`all`, `teacher`, `student`, `parent`, `class`).
- **`ActivitiesLog`**: Immutable audit logs capturing administrative mutations, user registrations, and attendance operations.

---

## REST API Specification

### Authentication & Users
- `POST /api/users/register` — Register a user (Public = Student; Teacher = Student; Admin = All).
- `POST /api/users/login` — Authenticate and issue secure HttpOnly JWT cookie.
- `POST /api/users/logout` — Clear JWT session cookie.
- `GET /api/users/profile` — Fetch active authenticated user profile.
- `GET /api/users` — Paginated user directory with search and role filters.
- `PUT /api/users/update/:id` — Update user record with role guardrails.
- `DELETE /api/users/delete/:id` — Delete user account (prevents self-deletion).

### Attendance
- `POST /api/attendance` — Record or update attendance for a class on a specific date.
- `GET /api/attendance/overview` — Campus-wide attendance overview and 7-day trend.
- `GET /api/attendance/class/:classId` — Attendance records for a class on date / date range.
- `GET /api/attendance/student/me` — Student self-attendance summary and history.
- `GET /api/attendance/student/:studentId` — IDOR-protected attendance summary for a student.

### Academic Reports & Analytics
- `GET /api/reports/student/me` — Student self-report card with subject breakdown and GPA.
- `GET /api/reports/student/:studentId` — IDOR-protected report card for a student.
- `GET /api/reports/class/:classId` — Class performance analytics and subject averages.
- `GET /api/reports/school` — School-wide analytics overview.

### Academic Operations & AI
- `GET /api/academic-years` | `POST /api/academic-years` — Academic year lifecycle.
- `GET /api/classes` | `POST /api/classes` — Class configuration and enrollment.
- `GET /api/subjects` | `POST /api/subjects` — Subject catalog management.
- `GET /api/timetables/class/:classId` | `POST /api/timetables/generate` — Timetable scheduling & AI generator.
- `GET /api/exams` | `POST /api/exams/generate` | `POST /api/exams/:id/submit` — AI exam authoring, publication, & submission.
- `GET /api/announcements` | `POST /api/announcements` — Targeted campus broadcast system.

---

## Asynchronous Event Processing (Inngest)

SchoolSync uses **Inngest** for resilient, non-blocking background workflows:
1. `generateTimeTable`: Distributes periods evenly across school days, enforcing teacher conflict avoidance and room allocations.
2. `generateExam`: Prompts Google Gemini 1.5 Flash to synthesize subject-specific, multi-difficulty questions with balanced distractors.
3. `handleExamSubmission`: Autogrades student submissions against answer keys and generates personalized learning feedback.

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

# Seeding & Security Defaults (Optional in development)
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

## Automated Testing Matrix

Run the comprehensive 5-suite security, RBAC, and business logic test matrix:

```bash
npm test
```

Test suites verify:
1. `security_rbac.test.ts`: Public registration role escalation prevention, regex sanitization, in-memory rate limiting, exam guardrails, and production seed credential security.
2. `resource_authorization.test.ts`: Teacher resource isolation, class boundary enforcement, teacher attendance authorization, and parent/teacher student IDOR defense.
3. `auth_token.test.ts`: HS512 JWT generation, tamper detection, expiration validation, and cookie attributes.
4. `request_validation.test.ts`: Fail-closed payload validation schemas for registration, classes, exams, and submissions.
5. `business_logic.test.ts`: Automated exam grading engine and attendance percentage aggregations.
