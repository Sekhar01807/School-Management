# 🎓 SchoolSync — Smart School Management Platform

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-404D59?style=for-the-badge)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Inngest](https://img.shields.io/badge/Inngest-Async_Jobs-blueviolet?style=for-the-badge)](https://www.inngest.com/)

**SchoolSync** is an enterprise-ready, role-based educational management system engineered with React, Express, TypeScript, MongoDB, and Inngest. It automates academic administration, timetable generation, assessment pipelines, and exam grading through Google Gemini AI.

---

## 🌟 Key Highlights & Capabilities

- **🔐 Multi-Role Access Control (RBAC):** Granular authorization barriers across 4 distinct user tiers: `admin`, `teacher`, `student`, and `parent`.
- **⚡ AI-Powered Timetable Generation:** Intelligent conflict-free weekly scheduling that maps qualified subject teachers, break slots, and period allocations using Google Gemini and Inngest background event workflows.
- **📝 Automated Quiz & Exam Engine:** AI-assisted question generation, server-side deadline enforcement, class eligibility validation, and background grading pipeline.
- **🛡️ Hardened Security Architecture:** Safe DTO responses (zero password hash leakage), JWT HttpOnly cookies with `sameSite: strict`, rate limiting, and strict input sanitization against ReDoS attacks.
- **📊 Real-Time Academic Insights:** Live metrics for student directories, active courses, examination timelines, and system-wide activity auditing.

---

## 🏗️ System Architecture

```text
                     +----------------------------------+
                     |        SchoolSync Frontend       |
                     |   (React 19 + TypeScript + Vite) |
                     +-----------------+----------------+
                                       |
                                HTTP / Cookies
                                       |
                                       v
                     +-----------------+----------------+
                     |         Express Backend          |
                     |    (TypeScript + Helmet + Auth)  |
                     +--------+----------------+--------+
                              |                |
                     Mongoose |                | Trigger Events
                              v                v
                 +------------+---+     +------+-----------+
                 |  MongoDB Atlas |     | Inngest Server   |
                 |  (schoolsync)  |     | (AI & Grading)   |
                 +----------------+     +------+-----------+
                                               |
                                               v
                                    +----------+-----------+
                                    | Google Gemini AI SDK |
                                    +----------------------+
```

---

## 👥 Role-Based Permissions (RBAC)

| Feature / Resource | Admin | Teacher | Student | Parent |
| :--- | :---: | :---: | :---: | :---: |
| **Manage Academic Years & Settings** | ✅ Full | ❌ | ❌ | ❌ |
| **User Directory Management** | ✅ All Roles | ✅ Students Only | ❌ | ❌ |
| **Create & Update Classes / Subjects** | ✅ Full | 👁️ View Only | ❌ | ❌ |
| **Trigger AI Timetable Generation** | ✅ Full | ❌ | ❌ | ❌ |
| **View Class Timetables** | ✅ All Classes | ✅ All Classes | 🔒 Enrolled Class | 🔒 Child Class |
| **Create & Manage Exams / Answer Keys**| ✅ All Exams | 🔒 Authored Exams | ❌ | ❌ |
| **Take Exams & Submit Answers** | ❌ | ❌ | ✅ Enrolled Class | ❌ |
| **View Submissions & Grades** | ✅ All Results | 🔒 Authored Exams | 🔒 Personal Grade | 🔒 Child Grade |
| **System Activity Audit Logs** | ✅ Full | ❌ | ❌ | ❌ |

---

## 📁 Repository Structure

```text
School-Management/
├── backend/                  # Express + TypeScript + Mongoose Backend
│   ├── src/
│   │   ├── config/           # MongoDB connection & system configurations
│   │   ├── controllers/      # Business logic handlers (Users, Exams, Timetables...)
│   │   ├── inngest/          # Background worker functions (AI Timetable & Exam Grading)
│   │   ├── middleware/       # JWT Auth, RBAC authorizer & Rate Limiting
│   │   ├── models/           # Mongoose schemas & data relationship models
│   │   ├── routes/           # REST API route definitions
│   │   ├── utils/            # Activity logging, token generator, regex sanitizer
│   │   └── server.ts         # Server entry point
│   ├── .env.example          # Backend environment template
│   └── package.json
├── frontend/                 # React + Vite + TypeScript Frontend
│   ├── src/
│   │   ├── components/       # Radix / shadcn-style UI primitives & widgets
│   │   ├── hooks/            # Context hooks (AuthProvider, theme)
│   │   ├── pages/            # Page layouts (Dashboard, Classes, Exams, Users...)
│   │   └── types.ts          # Shared TypeScript interfaces
│   ├── .env.example          # Frontend environment template
│   └── package.json
└── README.md                 # Project root documentation
```

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js** (v18+) or **Bun** (v1.0+)
- **MongoDB Atlas** database cluster
- **Google Gemini API Key** (for AI features)

### 2. Backend Setup
```bash
cd backend

# Install dependencies
bun install   # or: npm install

# Configure environment
cp .env.example .env
# Fill in MONGO_URL, JWT_SECRET, GOOGLE_GENERATIVE_AI_API_KEY

# Start development server
bun run dev   # or: npm run dev
```

### 3. Frontend Setup
```bash
cd frontend

# Install dependencies
bun install   # or: npm install

# Configure environment
cp .env.example .env

# Start frontend development server
bun run dev   # or: npm run dev
```

The application will be accessible at: `http://localhost:5173`.

---

## 🔒 Security Best Practices Implemented

1. **HttpOnly Cookie Authentication:** JWT tokens are transferred via secure, `HttpOnly`, `SameSite=Strict` cookies, immune to client-side XSS extraction.
2. **Defensive Password Protection:** Responses across authentication and registration endpoints explicitly strip password hashes.
3. **Strict Account Lifecycle (`isActive`):** Account suspension immediately invalidates subsequent authentication and ongoing authenticated requests.
4. **Ownership-Locked Content:** Teachers cannot access or extract answer keys for examinations authored by other faculty members.
5. **Fail-Closed Env Validation:** Server fails on boot if critical secrets (`JWT_SECRET`, `MONGO_URL`) are omitted.

---

## 📄 License
This project is licensed under the MIT License.
