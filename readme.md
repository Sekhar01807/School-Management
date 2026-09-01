# SchoolSync — Enterprise Academic Operations & Management Platform

<div align="center">

![SchoolSync Architecture Banner](https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&q=80&w=1400)

<br/>

[![TypeScript](https://img.shields.io/badge/TypeScript-5.9.3-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.2.0-222222?style=flat-square&logo=react&logoColor=61DAFB)](https://react.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-v20+-339933?style=flat-square&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express-5.2.1-000000?style=flat-square&logo=express&logoColor=white)](https://expressjs.com/)
[![Zod](https://img.shields.io/badge/Zod-4.4.3-3E67B1?style=flat-square&logo=zod&logoColor=white)](https://zod.dev/)
[![MongoDB Atlas](https://img.shields.io/badge/MongoDB-Atlas_v7.5-13AA52?style=flat-square&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4.1-38B2AC?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=flat-square&logo=docker&logoColor=white)](https://www.docker.com/)
[![CI/CD](https://img.shields.io/badge/CI%2FCD-GitHub_Actions-2088FF?style=flat-square&logo=githubactions&logoColor=white)](https://github.com/Sekhar01807/School-Management/actions)
[![Google Gemini](https://img.shields.io/badge/Google_Gemini-1.5_Flash-1A73E8?style=flat-square&logo=google&logoColor=white)](https://ai.google.dev/)
[![Inngest](https://img.shields.io/badge/Inngest-Event_Driven_Workflows-5E43F3?style=flat-square&logo=inngest&logoColor=white)](https://www.inngest.com/)
[![License](https://img.shields.io/badge/License-MIT-gray?style=flat-square)](https://opensource.org/licenses/MIT)

<br/>

**SchoolSync** is an enterprise-grade, multi-role academic management and institution operations platform. Engineered with a strict 3-tier Service Architecture, AI timetable scheduling engines, multi-tiered institutional assessment matrix (Unit: 25, Mid-Term: 50, Quarterly: 100), dynamic cumulative CGPA (10.0 scale) and GPA (4.0 scale) analytics, faculty gradebook rosters, real-time daily attendance operations, automated low attendance email cron notifications, declarative Zod request validation, and multi-tenant resource isolation (IDOR protection).

[Overview](#executive-summary) • [UI Showcase](#application-ui-showcase--screenshots) • [Assessment Architecture](#institutional-assessment-matrix--grading-system) • [Architecture](#system-architecture) • [RBAC Matrix](#role-based-access-control-rbac) • [REST API Reference](#rest-api-specification) • [Deployment](#production-deployment-guide) • [Tests](#automated-testing--quality-assurance) • [Deployment Manual (DEPLOYMENT.md)](DEPLOYMENT.md)

</div>

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Application UI Showcase & Screenshots](#application-ui-showcase--screenshots)
3. [Institutional Assessment Matrix & Grading System](#institutional-assessment-matrix--grading-system)
4. [Core Subsystems & Technical Capabilities](#core-subsystems--technical-capabilities)
5. [Verified Seed Credentials](#verified-seed-credentials)
6. [System Architecture & Data Flow](#system-architecture)
7. [Database Relational Architecture](#database-relational-architecture)
8. [Role-Based Access Control (RBAC)](#role-based-access-control-rbac)
9. [REST API Specification](#rest-api-specification)
10. [Security Engineering & IDOR Hardening](#security-engineering--idor-hardening)
11. [Technology Stack](#technology-stack)
12. [Repository Structure](#repository-structure)
13. [Environment Variables](#environment-variables)
14. [Quickstart & Launch Options](#quickstart--launch-options)
15. [Automated Testing & Quality Assurance](#automated-testing--quality-assurance)
16. [Production Deployment Guide](#production-deployment-guide)
17. [License & Maintainers](#license--maintainers)

---

## Executive Summary

Modern educational institutions often grapple with fragmented software stacks: manual timetable collisions, disparate quiz tools, unverified attendance records, rigid assessment workflows, and broken object-level authorization (IDOR).

**SchoolSync** solves these challenges through a unified, 100% dynamic platform built on modern web standards:
- **Multi-Tiered Assessment Matrix:** Standardized institutional grading tiers configured for **Unit Assessment (25 Marks)**, **Mid-Term Examination (50 Marks)**, and **Quarterly Final Examination (100 Marks)** across all classes and core curriculum subjects.
- **Dynamic Cumulative CGPA & GPA:** Calculates exact weighted cumulative CGPA on a standard **10.0 scale** and GPA on a **4.0 scale** with instant letter-grade classifications (`A+` through `F`).
- **Teacher Gradebook & Quick Grading Portal:** Spacious, responsive roster interface with dynamic boundary enforcement, real-time score badges, live student search, and batch persistence.
- **Automated Low Attendance Alerts:** Background cron worker monitoring student attendance with automated threshold warnings (< 75%) and multi-tier email fallback (Resend API $\rightarrow$ Gmail SMTP).
- **Zero-Trust Access Control:** Cryptographically signed HS512 JWTs stored in `HttpOnly`, `SameSite=none`, `secure=true` cookies with role-based access guards.
- **Conflict-Free AI Scheduling:** Offloads complex weekly timetable optimization to asynchronous Inngest worker pipelines powered by Google Gemini 1.5 Flash.

---

## Application UI Showcase & Screenshots

### 1. Public Marketing Portal & User Personas

| Landing Page & Hero Showcase | Multi-Role Community Architecture |
| :---: | :---: |
| ![SchoolSync Landing Page](frontend/public/Screenshot%202026-08-31%20102853.png) | ![SchoolSync User Roles](frontend/public/Screenshot%202026-08-31%20102929.png) |
| *Modern responsive marketing hero with instant onboarding CTAs* | *Role-segregated feature suites for Admins, Teachers, Students & Parents* |

<br/>

### 2. Authentication & Student Registration

| Enterprise Secure Sign-In | Student Onboarding & Registration |
| :---: | :---: |
| ![SchoolSync Sign In](frontend/public/Screenshot%202026-08-31%20103512.png) | ![SchoolSync Registration](frontend/public/Screenshot%202026-08-31%20103549.png) |
| *Session authentication with JWT cookies & password recovery* | *Real-time input validation, password strength meter & class selection* |

<br/>

### 3. Role-Adaptive Enterprise Dashboards

#### 🛠️ System Administrator Operations Hub
![Administrator Dashboard](frontend/public/Screenshot%202026-08-31%20130456.png)
*Real-time institutional oversight: campus-wide attendance %, faculty/student body metrics, active exams, live audit logs, and quick administrative management triggers.*

<br/>

#### 👨‍🏫 Faculty & Teacher Management Portal
![Faculty Portal](frontend/public/Screenshot%202026-08-31%20130406.png)
*Assigned classroom sections, today's lecture schedule, student marks entry & quick grading widget, active exams count, and direct roll-call attendance shortcuts.*

<br/>

#### 🎓 Enrolled Student Academic Hub
![Student Hub](frontend/public/Screenshot%202026-08-31%20130256.png)
*Personal attendance metrics, cumulative CGPA & GPA cards, live countdown for upcoming tests, daily period schedule, report cards, and interactive testing portals.*

<br/>

#### 👨‍👩‍👧 Guardian & Parent Monitoring Portal
![Guardian Portal](frontend/public/Screenshot%202026-08-31%20125936.png)
*Direct visibility into child academic standing, cumulative CGPA, live attendance records, completed exams tracking, and school circulars & alerts.*

---

## Institutional Assessment Matrix & Grading System

SchoolSync establishes a standardized 3-tier institutional examination framework across all core curriculum subjects (*Telugu, English, Mathematics, Physics, Chemistry, Social Studies*). Non-academic activities such as Study Hours (`STD101`) are strictly excluded from grading and analytics.

### 1. Standard Assessment Tiers

| Assessment Tier | Max Marks | Question Structure | Typical Score Range | Evaluation Focus |
| :--- | :---: | :--- | :---: | :--- |
| **Unit Assessment 1** | **25 Marks** | 5 questions $\times$ 5 points each | `8 – 25 / 25` | Formative concept comprehension |
| **Mid-Term Examination** | **50 Marks** | 5 questions $\times$ 10 points each | `18 – 50 / 50` | Mid-semester cumulative depth |
| **Quarterly Final Examination** | **100 Marks** | 5 questions $\times$ 20 points each | `36 – 100 / 100` | Comprehensive summative evaluation |

### 2. Cumulative CGPA & GPA Calculation Formulas

Overall student academic performance is computed dynamically based on total earned marks across all attempted examinations:

$$\text{Overall Percentage (\%)} = \left(\frac{\sum \text{Marks Scored}}{\sum \text{Maximum Possible Marks}}\right) \times 100$$

$$\text{Cumulative CGPA (10.0 Scale)} = \left(\frac{\text{Overall Percentage}}{100}\right) \times 10.0$$

$$\text{Cumulative GPA (4.0 Scale)} = \left(\frac{\text{Overall Percentage}}{100}\right) \times 4.0$$

### 3. Official Letter Grade & Standing Scale

| Score Percentage | Letter Grade | CGPA (10.0) | GPA (4.0) | Academic Standing |
| :---: | :---: | :---: | :---: | :--- |
| **90% – 100%** | `A+` | 9.00 – 10.00 | 3.60 – 4.00 | Distinction / Highest Honors |
| **80% – 89%** | `A` | 8.00 – 8.99 | 3.20 – 3.59 | Excellent / First Class |
| **70% – 79%** | `B` | 7.00 – 7.99 | 2.80 – 3.19 | Good / Second Class |
| **60% – 69%** | `C` | 6.00 – 6.99 | 2.40 – 2.79 | Satisfactory |
| **50% – 59%** | `D` | 5.00 – 5.99 | 2.00 – 2.39 | Pass Threshold |
| **Below 50%** | `F` | < 5.00 | < 2.00 | Remedial Coaching Required |

---

## Core Subsystems & Technical Capabilities

### 1. Role-Adaptive Dynamic Dashboard
- **Admin Hub:** Campus metrics including total active student body, faculty directory count, ongoing exams, campus-wide daily attendance rate, and real-time audit logs.
- **Teacher Hub:** Assigned classroom count, daily lecture agenda, active quiz tracking, and an integrated **Student Marks Entry & Quick Grading** widget.
- **Student Hub:** Today's lecture timetable, cumulative CGPA & GPA scorecards, attendance percentage tracker with threshold warnings, and upcoming assessment deadlines.
- **Parent Hub:** Direct visibility into linked children's daily attendance records, cumulative report card, upcoming test schedule, and school announcements.

### 2. Faculty Gradebook & Quick Marks Entry Portal
- **Spacious 2-Row Form Architecture:** Clean, ergonomic dropdowns with dedicated selectors for Class Section, Subject, and Assessment.
- **Dynamic Boundary Clamping:** Score input dynamically validates against active assessment max marks (`/ 25`, `/ 50`, `/ 100`).
- **Complete Class Roster:** Displays all enrolled students per class section with a real-time search filter and instant score-to-grade badge calculation (`A+`, `A`, `B`, `F`).
- **Batch Persistence:** Saves grades in a single transactional request to MongoDB with qualitative teacher remarks.

### 3. Conflict-Free AI Timetable Generator
- **Engine:** Inngest serverless step functions paired with Google Gemini 1.5 Flash structured output schemas.
- **Constraint Solver Enforces:**
  - Zero double-booking across faculty schedules during identical time periods.
  - Zero classroom space collisions across overlapping academic sections.
  - Teacher-subject qualification alignment (`MATH101`, `PHY101`, `CHEM101`, `TEL101`, `ENG101`, `SOC101`).
  - Configurable periods per day, custom period durations (30–60 mins), and automated lunch breaks.

### 4. Online Assessment & LMS Exam Engine
- **AI Question Synthesis:** Faculty input topic, subject, difficulty, and question count; Gemini AI produces structured questions with validated answers.
- **Automated Deadline Guardrails:** Draft exams cannot be published without questions or with expired due dates.
- **Answer Key Defense:** Correct answers are sanitized and stripped from all student-facing endpoints; exposed strictly to the authoring faculty member or administrators.
- **Automated Grading:** Student answers are evaluated against server-side keys with immediate percentage and grade computation.

### 5. Campus Daily Attendance Operations & Email Alerts
- **Daily Register:** Teachers and administrators record attendance per class with distinct status flags: `Present`, `Absent`, `Late`, `Excused`.
- **Institutional Analytics:** Real-time campus-wide attendance percentage, class-level distribution, and historical logs.
- **Automated Low Attendance Cron:** Automated background job checking student attendance rates every 24 hours. Automatically sends warning emails to students and parents when attendance falls below 75%.
- **Multi-Tier Email Fallback:** Seamless delivery via Resend API with automated fallback to Gmail SMTP.

### 6. Institutional Announcements & Broadcasts
- **Targeted Audience Routing:** Broadcast notices institution-wide (`All`), to faculty (`Teachers`), to learners (`Students`), or to specific grade sections.
- **Priority Categorization:** Flagged with urgency tiers: `Urgent`, `High`, `Medium`, and `Low`.
- **Author Scoping:** Authors and administrators maintain full edit/delete privileges with instantaneous broadcast updates.

### 7. Universal Directory & User Management
- **Directory Management:** Role-segregated views for Students, Teachers, Parents, and Administrators.
- **ReDoS-Safe Search & Pagination:** All search queries are filtered through regex metacharacter escapers prior to database execution.
- **Privilege Boundary Enforcement:** Faculty can create and update student accounts, but are strictly barred from modifying other faculty or elevating roles.

### 8. Institutional CSV Data Exports
- **Attendance Register Export:** Streams monthly class attendance matrices in RFC-4180 Excel-compatible CSV.
- **Report Card Export:** Exports full student academic transcripts with subject points, percentages, letter grades, and cumulative CGPA.
- **Student Roster Export:** Exports searchable student directory with emergency contact details.

---

## Verified Development & Demo Credentials

> [!WARNING]
> **DEVELOPMENT & DEMO SANDBOX ONLY**: The following accounts are pre-seeded solely for local development, automated testing, and evaluation sandboxes. In production deployments, default credentials are strictly blocked by the seed validator; administrators must supply unique, cryptographically strong passwords via environment variables (`DEFAULT_ADMIN_PASSWORD`).

The database includes pre-configured demo credentials initialized on boot (in development) or explicitly via `npm run db:seed`:

| Account Role | Email | Demo Password (Dev Only) | Pre-Assigned Context |
| :--- | :--- | :--- | :--- |
| **System Administrator** | `admin@schoolsync.com` | `password123` | Full institutional access across all modules |
| **Faculty Member** | `teacher@schoolsync.com` | `password123` | Assigned to Grade 10-A (Mathematics, Physics, English) |
| **Enrolled Student** | `student@schoolsync.com` | `password123` | Enrolled in **Grade 10-A** (Linked to Robert Johnson) |
| **Parent / Guardian** | `parent@schoolsync.com` | `password123` | Linked to **Alex Johnson** (Grade 10-A) |

> [!NOTE]
> Seed credentials and startup auto-seeding are fully configurable via environment variables (`DEFAULT_ADMIN_EMAIL`, `DEFAULT_ADMIN_PASSWORD`, `SEED_DEFAULT_DATA=true`). In production environments, database seeding strictly requires custom credentials (`DEFAULT_ADMIN_PASSWORD`) and will reject insecure defaults (`password123`).

---

## System Architecture

```mermaid
flowchart TD
    subgraph ClientTier ["Client Tier (React 19 + TypeScript + Vite + Tailwind CSS v4)"]
        UI["SPA Client Routes
- /dashboard, /attendance, /lms/exams, /reports"]
        RoleGuard["RoleRoute Guard
- Client-Side RBAC Enforcement"]
        AxiosClient["Axios API Client
- withCredentials: true, baseURL"]
        UI --> RoleGuard --> AxiosClient
    end

    subgraph SecurityTransport ["Transport & Security Layer (Express 5)"]
        HelmetMid["Helmet Security Headers
- Content-Security-Policy, HSTS"]
        RateLimiter["In-Memory Rate Limiter
- 10 req / 15 min per IP"]
        CookieParser["Cookie-Parser
- HttpOnly, SameSite, HS512 JWT"]
        AuthMiddleware["protect & authorize Middleware
- Session & Account Deactivation Checks"]
        ValidationPipe["Declarative Validator Middleware
- Fail-Closed Schema Rejection"]
        
        AxiosClient -->|"HTTPS + Cookies"| HelmetMid
        HelmetMid --> RateLimiter --> CookieParser --> AuthMiddleware --> ValidationPipe
    end

    subgraph ServiceLayer ["3-Tier Service Architecture"]
        Controllers["API Controllers
- User, Exam, Attendance, Report, Class"]
        Services["Business Logic Services
- UserService, ExamService, AttendanceService, ReportService"]
        MongooseModels["Mongoose ODM Models
- User, Class, Exam, Submission, Attendance"]
        
        ValidationPipe --> Controllers --> Services --> MongooseModels
    end

    subgraph DataAndAI ["Database & Background Worker Layer"]
        MongoDB[("MongoDB Atlas Cluster
- Database: school_management")]
        InngestWorker["Inngest Background Event Bus
- Serverless Step Functions"]
        GeminiAI["Google Gemini 1.5 Flash SDK
- Prompt-to-JSON Pipeline"]
        EmailService["Transactional Email Service
- Resend / Gmail SMTP Fallback"]
        
        MongooseModels <-->|"Read / Write"| MongoDB
        Controllers -->|"Dispatch Event"| InngestWorker
        InngestWorker -->|"Prompt & Context Payload"| GeminiAI
        GeminiAI -->|"Structured JSON Output"| InngestWorker
        InngestWorker -->|"Persist Schedule & Exam"| MongoDB
        Services -->|"Dispatch Alerts"| EmailService
    end
```

---

## Database Relational Architecture

```mermaid
flowchart TD
    classDef userNode fill:#1E40AF,stroke:#3B82F6,stroke-width:2px,color:#fff;
    classDef academicNode fill:#0F766E,stroke:#14B8A6,stroke-width:2px,color:#fff;
    classDef lmsNode fill:#7C3AED,stroke:#A78BFA,stroke-width:2px,color:#fff;
    classDef opsNode fill:#C2410C,stroke:#FB923C,stroke-width:2px,color:#fff;
    classDef logNode fill:#334155,stroke:#64748B,stroke-width:2px,color:#fff;

    subgraph UserManagement ["Identity & Access Management"]
        User["User Account
- ID: ObjectId (PK)
- Email: string (Unique)
- Password: Bcrypt Hash
- Role: Admin | Teacher | Student | Parent
- Status: Active / Deactivated"]:::userNode
    end

    subgraph AcademicCore ["Academic Structure & Scheduling"]
        AcademicYear["Academic Year
- ID: ObjectId (PK)
- Name: 2025-2026
- Status: isCurrent"]:::academicNode
        ClassSection["Class Section
- ID: ObjectId (PK)
- Name: Grade 10-A
- Capacity: number"]:::academicNode
        Subject["Subject Curriculum
- ID: ObjectId (PK)
- Code: MATH101
- Name: string"]:::academicNode
        Timetable["AI Timetable
- ID: ObjectId (PK)
- Schedule: Mon-Fri Period Slots"]:::academicNode
    end

    subgraph LMSModule ["LMS & Assessments"]
        Exam["Exam / Assessment
- ID: ObjectId (PK)
- Title: Unit Assessment 1 / Mid-Term / Quarterly
- Questions: Array (Points: 5, 10, or 20)
- DueDate: Date"]:::lmsNode
        Submission["Exam Submission
- ID: ObjectId (PK)
- Score: number (out of 25, 50, or 100)
- Answers: Array (with teacher remarks)"]:::lmsNode
    end

    subgraph OperationsModule ["Operations & Communication"]
        Attendance["Daily Attendance
- ID: ObjectId (PK)
- Records: Array (Present / Absent / Late / Excused)"]:::opsNode
        Announcement["Announcement
- ID: ObjectId (PK)
- Priority: Urgent / High / Normal
- Audience: Targeted Role"]:::opsNode
        ActivitiesLog["Audit Log
- ID: ObjectId (PK)
- Action: CRUD Operation"]:::logNode
    end

    %% Relational Connections
    AcademicYear -->|"1 to N (Defines)"| ClassSection
    AcademicYear -->|"1 to N (Schedules)"| Timetable
    
    User -->|"1 to N (Class Teacher)"| ClassSection
    User -->|"N to M (Enrolled Students)"| ClassSection
    User -->|"N to M (Faculty)"| Subject
    User -->|"1 to N (Authors)"| Exam
    User -->|"1 to N (Submits)"| Submission
    User -->|"1 to N (Records)"| Attendance
    User -->|"1 to N (Broadcasts)"| Announcement
    User -->|"1 to N (Audit Action)"| ActivitiesLog

    ClassSection -->|"N to M (Curriculum)"| Subject
    ClassSection -->|"1 to 1 (Weekly Grid)"| Timetable
    ClassSection -->|"1 to N (Assigned Exams)"| Exam
    ClassSection -->|"1 to N (Daily Records)"| Attendance
    ClassSection -.->|"Target Scope"| Announcement

    Exam -->|"1 to N (Evaluates)"| Submission
```

---

## Role-Based Access Control (RBAC)

| Functional Domain | Resource / Operation | Administrator | Faculty (Teacher) | Learner (Student) | Guardian (Parent) |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **System Settings** | Academic Years CRUD | Full Access | View Active | View Active | View Active |
| **Self-Service** | Personal Profile Update | Self Profile | Self Profile | Self Profile | Self Profile |
| | Password Change & Reset | Self Account | Self Account | Self Account | Self Account |
| **Security & Logs** | System Activity Audit Log | Full Access | No Access | No Access | No Access |
| **User Directory** | Manage Faculty & Parents | Full Access | No Access | No Access | No Access |
| | Manage Students | Full Access | Manage Assigned | No Access | No Access |
| **Academic Setup** | Classes & Subject Curriculums | Full Access | View / Assign | View Enrolled | View Enrolled |
| **AI Scheduling** | Generate Weekly Timetables | Full Access | View Schedules | View Enrolled Class | View Child Class |
| **LMS & Exams** | Generate & Author Quizzes | Full Access | Manage Authored | No Access | No Access |
| | Take Quizzes & Submit Answers | Restricted (Staff) | Restricted (Staff) | Enrolled Class Only | No Access |
| **Gradebook** | Enter & Save Assessment Marks | Full Access | Assigned Classes | View Own Grades | View Child Grades |
| **Attendance** | Mark Daily Attendance Register | Full Access | Assigned Classes | No Access | No Access |
| | View Attendance Analytics | Campus Overview | Class Statistics | Personal Record | Child Record |
| **Communication** | Broadcast Announcements | Full Access | Manage Authored | View Targeted | View Targeted |
| **Performance** | Academic Reports & GPA Cards | School-wide | Class Analytics | Personal Report | Child Report |

---

## REST API Specification

### 1. Authentication & Users (`/api/users`)
| Method | Endpoint | Authorization | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/users/login` | Public (Rate Limited) | Authenticates credentials and issues secure HS512 JWT cookie |
| `POST` | `/api/users/register` | Public / Admin / Teacher | Registers new user (Public/Teachers strictly restricted to `student` role) |
| `POST` | `/api/users/logout` | Public | Clears and expires authentication cookie |
| `GET` | `/api/users/profile` | Authenticated | Retrieves current authenticated session object |
| `PUT` | `/api/users/profile` | Authenticated | Self-service profile updates (Name, phone, address, emergency contact, avatar) |
| `PUT` | `/api/users/change-password` | Authenticated | Self-service password change with current password verification |
| `POST` | `/api/users/forgot-password` | Public | Dispatches cryptographic 15-minute password reset link to registered email |
| `POST` | `/api/users/reset-password` | Public | Validates SHA-256 token and resets account password |
| `GET` | `/api/users` | Admin / Teacher | Searchable & paginated user directory |
| `PUT` | `/api/users/update/:id` | Admin / Teacher | Updates user attributes (IDOR & role escalation protected) |
| `DELETE` | `/api/users/delete/:id` | Admin / Teacher | Removes user (Protected against self-deletion) |

### 2. Academics (`/api/classes`, `/api/subjects`, `/api/academic-years`)
| Method | Endpoint | Authorization | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/academic-years` | Admin / Teacher | Retrieves all academic years with current active flag |
| `POST` | `/api/academic-years/create`| Admin | Creates new academic year with single-active constraint |
| `GET` | `/api/classes` | Authenticated | Paginated list of classes with enrolled students & subjects |
| `POST` | `/api/classes/create` | Admin | Registers new class section with capacity and teacher assignment |
| `PUT` | `/api/classes/update/:id` | Admin | Modifies class configuration and curriculum |
| `GET` | `/api/subjects` | Authenticated | Paginated list of academic subjects |
| `POST` | `/api/subjects/create` | Admin | Registers new subject with unique code verification |

### 3. Timetable Scheduling (`/api/timetables`)
| Method | Endpoint | Authorization | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/timetables/generate` | Admin | Generates conflict-free weekly schedule with teacher qualification matching |
| `GET` | `/api/timetables/:classId` | Authenticated | Retrieves weekly schedule (Students & Parents restricted to enrolled/linked class) |

### 4. LMS & Assessments (`/api/exams`)
| Method | Endpoint | Authorization | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/exams/generate` | Admin / Teacher | Dispatches AI quiz generation with topic and difficulty |
| `GET` | `/api/exams` | Authenticated | Lists exams (Role filtered: student enrolled, teacher authored) |
| `GET` | `/api/exams/:id` | Authenticated | Exam details (Answer keys stripped for students) |
| `PATCH`| `/api/exams/:id/status` | Admin / Teacher | Toggles draft/published state (Validates deadline & question count) |
| `POST` | `/api/exams/:id/submit` | Student | Submits exam answers for automated grading queue |
| `GET` | `/api/exams/:id/result` | Authenticated | Returns score breakdown, percentage, and grade letter (IDOR guarded) |
| `DELETE`| `/api/exams/:id` | Admin / Teacher | Cascades deletion of exam and associated student submissions |

### 5. Attendance Operations (`/api/attendance`)
| Method | Endpoint | Authorization | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/attendance` | Admin / Teacher | Records class attendance (Restricted to assigned teachers) |
| `GET` | `/api/attendance/overview` | Admin / Teacher | Campus-wide attendance summary & rates |
| `GET` | `/api/attendance/student/me`| Student / Parent | Retrieves student personal attendance record |
| `GET` | `/api/attendance/student/:studentId`| Admin / Teacher / Parent | IDOR-protected attendance summary for a student |
| `GET` | `/api/attendance/class/:classId`| Admin / Teacher | Class attendance by date or range (Restricted to assigned classes) |

### 6. Announcements (`/api/announcements`)
| Method | Endpoint | Authorization | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/announcements` | Authenticated | Retrieves announcements targeted to the caller's role |
| `POST` | `/api/announcements` | Admin / Teacher | Publishes announcement with audience and priority tags |
| `PUT` | `/api/announcements/:id` | Admin / Author | Updates announcement content or pinned status |
| `DELETE`| `/api/announcements/:id` | Admin / Author | Deletes announcement |

### 7. Performance & Marks Gradebook (`/api/reports`)
| Method | Endpoint | Authorization | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/reports/student/me` | Student / Parent | Generates student report card with cumulative CGPA (10.0 scale) & GPA (4.0 scale) |
| `GET` | `/api/reports/student/:studentId` | Admin / Teacher / Parent | IDOR-protected student report card |
| `GET` | `/api/reports/marks/class/:classId/subject/:subjectId` | Admin / Teacher | Retrieves batch assessment marks and student rosters |
| `POST` | `/api/reports/marks/batch` | Admin / Teacher | Batch saves marks and remarks for class assessment |
| `GET` | `/api/reports/class/:classId` | Admin / Teacher | Computes class GPA averages and subject pass rates |
| `GET` | `/api/reports/school` | Admin / Teacher | Campus-wide metrics and institutional scorecard |

### 8. Institutional Exports (`/api/export`)
| Method | Endpoint | Authorization | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/export/attendance/:classId` | Admin / Teacher (Assigned) | Streams monthly class attendance matrix in Excel-compatible CSV |
| `GET` | `/api/export/report-card/:studentId` | Admin / Teacher (Assigned) / Student [Self] / Parent [Child] | Streams student GPA transcript & assessment report card in CSV |
| `GET` | `/api/export/students` | Admin / Teacher (Assigned Class) | Streams searchable student directory roster with emergency contacts in CSV |

### 9. Media & File Uploads (`/api/upload`)
| Method | Endpoint | Authorization | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/upload/avatar` | Authenticated | Uploads user profile image (Max 2MB, JPEG/PNG/WebP) and updates avatar URL |

### 10. Transactional Email & Engine Health (`/api/email`)
| Method | Endpoint | Authorization | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/email/status` | Public / Admin | Health & connection status of Resend / SMTP email delivery tiers |
| `POST` | `/api/email/test` | Admin (Protected) | Dispatches live real-time test verification email (Rate limited & schema validated) |
| `POST` | `/api/email/trigger-cron` | Admin (Protected) | Manually triggers background cron tasks (exam reminders & attendance health checks) |

### 11. Dashboard Analytics (`/api/dashboard`)
| Method | Endpoint | Authorization | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/dashboard/stats` | Authenticated | Retrieves dynamic role-adaptive metrics (Admin campus stats, Teacher grading widgets, Student CGPA/schedule, Parent overview) |

### 12. Audit & Security Activity Logs (`/api/activities`)
| Method | Endpoint | Authorization | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/activities` | Admin | Retrieves chronological administrative mutation and security audit logs |

---

## Security Engineering & IDOR Hardening

1. **Strict CORS Policy & Origin Isolation:**
   - Cross-origin requests are strictly validated against explicitly configured whitelist domains (`CLIENT_URL`), rejecting generic wildcard (`*.vercel.app`) domains. Disallowed origins immediately fail closed with `Not allowed by CORS`, preventing unauthorized cross-origin credentialed access.
2. **Multi-Tenant Export Authorization & IDOR Defense:**
   - Attendance and report card CSV export endpoints (`/api/export/*`) enforce strict multi-tenant boundary checks (`canAccessClassData` and `canAccessStudentData`). Unassigned teachers are blocked from retrieving data for classes or students outside their assignment.
3. **Password Reset Host Header Poisoning Mitigation:**
   - Password recovery emails construct reset URLs strictly from configured environment domains (`CLIENT_URL`), preventing token leakage through poisoned request headers.
4. **Public Registration Role Escalation Defense:**
   - Public unauthenticated registration (`POST /api/users/register`) strictly forces `role = "student"`. Requests requesting `admin`, `teacher`, or `parent` roles without admin authentication are rejected with `403 Forbidden`.
5. **Attendance Authorization Enforcement:**
   - Class attendance recording (`POST /api/attendance`) and inspection (`GET /api/attendance/class/:classId`) require teachers to be assigned as either the class teacher or subject teacher for the target section.
6. **Student Record IDOR Protection:**
   - Access to `/api/attendance/student/:studentId` and `/api/reports/student/:studentId` enforces centralized tenant boundaries (`canAccessStudentData`). Parents can only view their registered children; teachers can only view students in classes they teach; students can only view themselves.
7. **Environment-Controlled Seeding & Production Credential Hardening:**
   - Automatic database seeding is disabled by default in `production` environments.
   - When explicitly invoked in production, the seed pipeline validates that `DEFAULT_ADMIN_PASSWORD` is supplied, non-empty, and distinct from the demo default (`password123`), halting execution if insecure defaults are detected.
8. **NoSQL Query & Parameter Sanitization:**
   - Global recursive sanitization middleware ([`sanitize.ts`](backend/src/middleware/sanitize.ts)) strips MongoDB injection keys (`$where`, `$gt`, `$ne`, and dot-notation paths) from all incoming request bodies, query strings, and route parameters.
9. **Multi-Tier Rate Limiting Defense:**
   - Dedicated in-memory rate limiters protect authentication (`/login`), password recovery (`/forgot-password`), new account registration (`/register`), report export streams (`/export/*`), and live email dispatch testing (`/email/test`).
10. **HttpOnly Cross-Origin Cookie Security:**
    - Tokens are cryptographically signed using **HS512** with a 30-day lifecycle.
    - Delivered via `HttpOnly`, `SameSite=none`, `secure=true` cookies in production, eliminating browser-based XSS token theft.

---

## Technology Stack

```
FRONTEND LAYER                          BACKEND LAYER                           DATABASE & AI / DEVOPS
├── React 19.2.0                        ├── Express.js 5.2.1                   ├── MongoDB Atlas (v7.5)
├── TypeScript 5.9.3                    ├── TypeScript 5.9                     ├── Mongoose ODM 9.1.1
├── Vite 7.2.5 (Rolldown)               ├── Zod 4.4.3 (Validation Schemas)     ├── Google Gemini 1.5 Flash
├── Tailwind CSS v4.1.18                ├── TSX 4.19.3 (Runtime)               ├── Inngest Event Bus (3.48)
├── Radix UI Primitives                 ├── JSONWebToken (HS512)               ├── Resend API & Gmail SMTP
├── Lucide React 0.562.0                ├── BcryptJS 3.0.3                     ├── Docker & Docker Compose
├── React Router v7.11.0                ├── Helmet 8.1.0 (CORP Configured)     ├── Nginx 1.27 Alpine
└── Recharts 2.15.4                     ├── Cookie-Parser 1.4.7                └── GitHub Actions CI/CD
```

---

## Repository Structure

```text
School-Management/
├── .github/
│   └── workflows/
│       ├── ci.yml               # Automated multi-matrix Node 20/22 test & build pipeline
│       └── docker.yml           # Docker container build & compose validation workflow
├── package.json                 # Monorepo root workspace scripts (npm test, npm run dev...)
├── backend/
│   ├── src/
│   │   ├── config/              # MongoDB connection & system bootstrap (seedDefaultData.ts)
│   │   ├── controllers/         # HTTP Transport controllers (User, Exam, Attendance, Report...)
│   │   ├── services/            # Business Logic layer (UserService, ExamService, ReportService...)
│   │   ├── validators/          # Declarative, type-safe Zod validation schemas (schemas.ts)
│   │   ├── inngest/             # AI event workflows (Timetable & Quiz generators)
│   │   ├── middleware/          # JWT Protect, Role Authorizer, Rate Limiter, Validate (Zod)
│   │   ├── models/              # Mongoose schemas (User, Class, Exam, Submission, Attendance...)
│   │   ├── routes/              # Express API route declarations
│   │   ├── tests/               # 20 Automated Node.js native test suites (node:test | 170 tests)
│   │   ├── scripts/             # Database seed & cleanup utilities (cleanDb.ts, seed.ts)
│   │   ├── utils/               # Structured logger, token generators, email dispatchers
│   │   └── server.ts            # Entrypoint, reverse-proxy trust, CORS, & health checks
│   ├── Dockerfile               # Production Node 20 Alpine container
│   ├── tsconfig.json
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/          # Reusable UI widgets, forms, dialogs, sidebars
│   │   ├── hooks/               # Authentication & theme context providers
│   │   ├── lib/                 # Axios client instance & distributed avatar URL resolver
│   │   ├── pages/               # Application routes
│   │   │   ├── Dashboard.tsx    # Multi-role dashboard with Teacher Quick Marks Widget
│   │   │   ├── NotFound.tsx     # 404 / 403 Smart Error Page
│   │   │   ├── academics/       # Classes, Subjects, Timetable, Attendance, Reports
│   │   │   ├── communication/   # Announcements
│   │   │   ├── lms/             # Quiz taking & Exam Generator
│   │   │   └── users/           # Students, Teachers, Parents, Admins
│   │   ├── types.ts             # Global TypeScript interface definitions
│   │   ├── index.css            # Tailwind CSS design system configuration
│   │   └── main.tsx             # React application DOM entrypoint
│   ├── Dockerfile               # Multi-stage build with Nginx runner
│   ├── nginx.conf               # Production Nginx SPA routing & gzip configuration
│   ├── vercel.json              # SPA rewrite rules for Vercel
│   ├── tsconfig.app.json
│   ├── package.json
│   └── .env.example
├── docker-compose.yml           # Full-stack container orchestration
├── render.yaml                  # 1-click cloud infrastructure Blueprint for Render
├── DEPLOYMENT.md                # Complete production deployment manual
└── README.md                    # Project master documentation
```

---

## Environment Variables

### Backend Configuration (`backend/.env`)

```env
# Server & Port
PORT=5000
NODE_ENV=production
STAGE=production

# Database Connection (MongoDB Atlas)
MONGO_URL=mongodb+srv://<username>:<password>@cluster0.b872qiu.mongodb.net/school_management?retryWrites=true&w=majority
RESET_DB=false
SEED_DEFAULT_DATA=true
DEFAULT_ADMIN_EMAIL=admin@schoolsync.com
DEFAULT_ADMIN_PASSWORD=SuperStrongAdminPassword123!

# Authentication & Security
JWT_SECRET=your_super_secret_jwt_key_at_least_32_characters_long
COOKIE_SAME_SITE=none

# AI Integrations (Google Gemini)
GOOGLE_GENERATIVE_AI_API_KEY=your_gemini_api_key

# CORS Frontend Origin (supports comma-separated origins)
CLIENT_URL=https://schoolsync.vercel.app,http://localhost:5173

# Transactional Email Notification Service (Resend / SMTP / Gmail)
EMAIL_FROM="SchoolSync Notifications" <notifications@schoolsync.com>
RESEND_API_KEY=re_123456789
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_gmail_app_password
SMTP_SECURE=false
```

### Frontend Configuration (`frontend/.env`)

```env
# In Development:
VITE_API_BASE_URL=http://localhost:5000/api

# In Production:
# VITE_API_BASE_URL=https://your-backend-api.onrender.com/api
```

---

## Quickstart & Launch Options

### Option A: 1-Click Docker Compose (Fastest Full-Stack Launch)

```bash
git clone https://github.com/Sekhar01807/School-Management.git
cd School-Management

# Build and launch MongoDB, Backend API, and Frontend web services
docker compose up -d --build
```
- **Web App:** `http://localhost:80`
- **Backend API:** `http://localhost:5000` (Health Check: `http://localhost:5000/health`)

---

### Option B: Local Node.js Development

#### 1. Setup Backend
```bash
cd backend
npm install
cp .env.example .env
# Configure your MONGO_URL, JWT_SECRET, and Gemini API Key in .env

# Start development server
npm run dev
```

#### 2. Setup Frontend
```bash
# In a new terminal window
cd frontend
npm install
cp .env.example .env

# Start Vite dev server
npm run dev
```

#### 3. Access Portal
Open **`http://localhost:5173`** and sign in with any of the [Seed Demo Credentials](#verified-seed-credentials).

---

### Database Clean, Reset & Seeding CLI

To ensure a clean environment or completely wipe and re-seed the MongoDB database:

```bash
# Option 1: Complete Database Wipe & Fresh Seed (CLI)
# Drops all collections in MongoDB and reseeds 72 exams, 1080 submissions, 180 attendance registers, classes & users:
npm run db:clean

# Option 2: Explicit Database Seed (Without Dropping Existing Collections)
npm run db:seed

# Option 3: Auto-Reset on Boot via .env
# In backend/.env, set RESET_DB=true and start the server:
RESET_DB=true
```

---

## Automated Testing & Quality Assurance

SchoolSync incorporates **20 automated test suites (`node:test`) with 170 unit & integration tests** covering business logic, validation schemas, security layers, defensive LLM pipelines, and data-integrity rules:

```bash
# Run from repository root:
npm test

# Or from backend directory:
cd backend && npm test
```

### Verified Test Suites:
```text
▶ SchoolSync Inngest Resilience & LLM Defensive Parsing Test Suite
  ✔ should safely parse raw valid JSON without markdown fences (1.0ms)
  ✔ should strip markdown code blocks with ```json fences (0.2ms)
  ✔ should extract JSON embedded within conversational LLM text preamble (0.2ms)
  ✔ should generate a complete 5-day school week timetable (Monday to Friday) (1.1ms)
  ✔ should assign qualified teachers matching their subject qualifications (0.6ms)

▶ SchoolSync Inngest Exam Resilience & LLM Question Sanitizer Suite
  ✔ should extract a clean JSON array of exam questions with markdown fences (1.2ms)
  ✔ should parse multiple choice questions with preamble and trailing text (0.3ms)
  ✔ should automatically fall back to option 0 if the LLM hallucinated an answer (0.3ms)
  ✔ should correctly grade 100% when all answers match (0.3ms)

▶ SchoolSync Data Export & CSV Generation Test Suite
  ✔ should escape commas and double quotes with RFC-4180 compliance (0.3ms)
  ✔ should format a standard attendance register row array with UTF-8 BOM (0.3ms)

▶ SchoolSync Email Notification Engine & Template Suite
  ✔ should generate and simulate dispatch of student welcome onboarding email (115ms)
  ✔ should dispatch student absence notification with formatted date and class info (22ms)
  ✔ should dispatch low attendance alert when rate drops below 75% (1.4ms)

▶ SchoolSync Academic Reports & Performance Analytics Test Suite
  ✔ should calculate correct weighted cumulative CGPA across 25, 50, and 100 mark exams (1.0ms)
  ✔ should generate valid escaped RFC-4180 CSV strings for download (0.4ms)

▶ SchoolSync Middleware Pipeline & Security Guardrails
  ✔ should recursively strip prohibited MongoDB operator keys ($gt, $where) from req.body (0.5ms)
  ✔ should enforce role-based access control and tenant isolation (1.2ms)
  ✔ verified HS512 JWT verification, expiry, and HttpOnly cookies (6.6ms)
  ✔ verified password hashing and bcrypt security (433ms)

ℹ 20 test suites | 170 automated test assertions passing | 100% success rate
```

---

## Production Deployment Guide

For complete, detailed instructions on cloud infrastructure provisioning, see our dedicated **[Production Deployment Manual (DEPLOYMENT.md)](DEPLOYMENT.md)**.

### Quick Deployment Summaries:

#### 1. Backend Deployment (Render / Railway / Koyeb)
- **1-Click Render Blueprint:** Deploy automatically using the included [`render.yaml`](render.yaml) file.
- **Manual Setup:** Connect GitHub repo to Render/Railway, set root directory to `backend`, build command `npm install`, start command `npm start`, and health check `/health`.
- Configure `CLIENT_URL=https://your-frontend.vercel.app` and `COOKIE_SAME_SITE=none`.

#### 2. Frontend Deployment (Vercel / Netlify / Cloudflare Pages)
- Connect GitHub repo to Vercel, set root directory to `frontend`, framework preset `Vite`, output directory `dist`.
- Set `VITE_API_BASE_URL=https://your-backend-api.onrender.com/api`.
- Client routing is automatically handled by [`frontend/vercel.json`](frontend/vercel.json).

#### 3. Containerized VPS Deployment (Docker Compose)
- Run `docker compose up -d --build` on any Linux VPS (Ubuntu, Debian, EC2, DigitalOcean).

---

## License & Maintainers

Distributed under the **MIT License**. See `LICENSE` for more information.

Developed and maintained by **Soma Sekhar** ([@Sekhar01807](https://github.com/Sekhar01807)) — engineered for educational institutions worldwide.
