# SchoolSync Frontend

Responsive, Multi-Role Academic Management Single Page Application (SPA).

Built with **React 19**, **TypeScript**, **Vite**, **Tailwind CSS v4**, **Lucide Icons**, and **Radix UI**.

---

## Table of Contents
- [Overview & User Experience](#overview--user-experience)
- [Key Portals & Features](#key-portals--features)
- [Architecture & State Management](#architecture--state-management)
- [Role-Based Access Control Routing](#role-based-access-control-routing)
- [Environment Setup & Quickstart](#environment-setup--quickstart)
- [Production Optimization](#production-optimization)

---

## Overview & User Experience

SchoolSync provides a synchronized frontend interface designed for 4 distinct institutional stakeholders: **Administrators**, **Teachers**, **Students**, and **Parents**.

- **Modern Aesthetic**: Clean dashboard design utilizing dark/light theme support, glassmorphism cards, dynamic data tables, and interactive analytics charts.
- **Zero-Token Client Leakage**: Authentication relies on secure `HttpOnly` cookie exchanges via Axios credentials, ensuring JWTs are never stored in `localStorage` or exposed to XSS vectors.
- **Real-Time Responsiveness**: Optimized with optimistic UI updates and instant client-side validation for maximum fluidity.

---

## Key Portals & Features

### 1. Administrator Command Center
- **Institutional Overview**: Real-time campus KPI counters (Total Students, Active Classes, Teacher Count, Daily Attendance Rate).
- **User Directory Management**: Paginated table with instant search, role filters, user status toggles, and secure account creation.
- **Academic Setup**: Interactive workflows to configure Academic Years, Classes, and Subjects.
- **Timetable AI Dispatcher**: Trigger automatic weekly scheduling optimization with conflict resolution.

### 2. Teacher Classroom Portal
- **Daily Attendance Register**: Interactive student roster with one-click status marking (Present, Absent, Late, Excused) and real-time attendance stats.
- **AI Assessment Studio**: Dynamic exam authoring tool powered by Google Gemini 1.5 Flash with custom question generation, point assignments, and answer key configuration.
- **Classroom Performance Analytics**: Visual grade distributions, subject averages, and submission tracking.

### 3. Student Assessment & Learning Center
- **Academic Report Card**: Instant visual performance reports displaying subject grades, GPA calculations, exam scores, and attendance percentage.
- **Active Exam Portal**: Timed exam interface with question navigation, countdown timers, and immediate automated grading feedback.
- **Class Timetable Viewer**: Visual weekly period schedule with subject and instructor indicators.

### 4. Parent Guardian Portal
- **Child Academic Monitoring**: Single-pane access to registered children's report cards, exam submission scores, and attendance summaries.
- **Campus Announcements**: Targeted institutional broadcast viewer.

### 5. Self-Service Profile & Password Recovery Portal
- **Unified Profile Settings (`/settings/profile`)**: Manage personal details, phone numbers, addresses, custom/preset avatars, and emergency contacts for students/parents.
- **Interactive Security & Strength Meter**: Live visual checklist ensuring compliance with enterprise password complexity rules.
- **Self-Service Password Recovery (`/reset-password`)**: Standalone workflow for resetting forgotten passwords via 15-minute cryptographic email links.
- **Interactive User Avatar Navigation (`nav-user.tsx`)**: Quick access menu in the sidebar footer for profile settings, password changes, and immediate logout.

---

## Architecture & State Management

```
frontend/src/
├── components/          # Reusable UI primitives & compound components
│   ├── global/          # App-wide modals, headers, sidebars, theme toggles
│   ├── sidebar/         # Dynamic role-filtered sidebar navigation
│   └── ui/              # Accessible primitives (Radix UI + Tailwind CSS)
├── pages/               # Routed view components
│   ├── routes/          # Protected & Role-gated route guards
│   ├── Admin/           # Administrator management pages
│   ├── Teacher/         # Teacher attendance, grading, and exam pages
│   ├── Student/         # Student report cards, exams, and timetables
│   └── Parent/          # Parent guardian monitoring views
├── context/             # Global React contexts (Auth, Theme, Toast)
├── hooks/               # Custom React hooks
├── services/            # Axios HTTP client configured with withCredentials
└── types/               # Shared TypeScript models and interfaces
```

---

## Role-Based Access Control Routing

Access to protected routes is guarded by higher-order components in `pages/routes/`:
- **`ProtectedRoute`**: Verifies authenticated user session via `/api/users/profile`.
- **`RoleRoute`**: Enforces strict role whitelist barriers. Unauthorized users are smoothly redirected to their authorized dashboard rather than encountering broken states.

```tsx
// Example Role Route Protection
<Route
  path="/admin/*"
  element={
    <RoleRoute roles={["admin"]}>
      <AdminLayout />
    </RoleRoute>
  }
/>
```

---

## Environment Setup & Quickstart

Create a `.env` file in the `frontend/` directory:

```env
VITE_API_BASE_URL=http://localhost:5000/api
```

### Installation & Run

```bash
# Install dependencies
npm install

# Start local development server (Vite)
npm run dev

# Compile TypeScript and build production bundle
npm run build

# Preview production build locally
npm run preview
```

---

## Production Optimization

- **Bundle Chunking**: Code-split routes ensure rapid initial page load speeds.
- **Tree-Shaking**: Optimized Lucide icon imports and lightweight CSS delivery via Tailwind CSS v4 compiler.
- **Safe DTO Binding**: All API response payloads are validated and typed via TypeScript interfaces to avoid runtime rendering exceptions.
