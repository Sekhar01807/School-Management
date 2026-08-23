import { createBrowserRouter } from "react-router";
import Home from "@/pages/Home";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import PrivateRoutes from "@/pages/routes/PrivateRoutes";
import RoleRoute from "@/pages/routes/RoleRoute";
import Dashboard from "@/pages/Dashboard";
import AcademicYear from "@/pages/settings/academic-year";
import UserManagementPage from "@/pages/users";
import Classes from "@/pages/academics/Classes";
import { Subjects } from "@/pages/academics/Subjects";
import Timetable from "@/pages/academics/Timetable";
import AttendancePage from "@/pages/academics/Attendance";
import AnnouncementsPage from "@/pages/communication/Announcements";
import ReportsPage from "@/pages/academics/Reports";
import Exams from "@/pages/lms/Exams";
import Exam from "../lms/Exam";

export const router = createBrowserRouter([
  {
    children: [
      // public routes
      { index: true, element: <Home /> },
      { path: "login", element: <Login /> },
      { path: "register", element: <Register /> },
      // protected routes
      {
        element: <PrivateRoutes />,
        children: [
          { path: "dashboard", element: <Dashboard /> },
          {
            path: "activities-log",
            element: (
              <RoleRoute roles={["admin"]}>
                <Dashboard />
              </RoleRoute>
            ),
          },
          {
            path: "settings/academic-years",
            element: (
              <RoleRoute roles={["admin"]}>
                <AcademicYear />
              </RoleRoute>
            ),
          },
          {
            path: "users/students",
            element: (
              <RoleRoute roles={["admin", "teacher"]}>
                <UserManagementPage
                  role="student"
                  title="Students"
                  description="Manage student directory and class assignments."
                />
              </RoleRoute>
            ),
          },
          {
            path: "users/teachers",
            element: (
              <RoleRoute roles={["admin"]}>
                <UserManagementPage
                  role="teacher"
                  title="Teachers"
                  description="Manage teaching staff."
                />
              </RoleRoute>
            ),
          },
          {
            path: "users/parents",
            element: (
              <RoleRoute roles={["admin"]}>
                <UserManagementPage
                  role="parent"
                  title="Parents"
                  description="Manage Parents."
                />
              </RoleRoute>
            ),
          },
          {
            path: "users/admins",
            element: (
              <RoleRoute roles={["admin"]}>
                <UserManagementPage
                  role="admin"
                  title="Admins"
                  description="Manage Admins."
                />
              </RoleRoute>
            ),
          },
          {
            path: "attendance",
            element: (
              <RoleRoute roles={["admin", "teacher", "student", "parent"]}>
                <AttendancePage />
              </RoleRoute>
            ),
          },
          {
            path: "announcements",
            element: (
              <RoleRoute roles={["admin", "teacher", "student", "parent"]}>
                <AnnouncementsPage />
              </RoleRoute>
            ),
          },
          {
            path: "reports",
            element: (
              <RoleRoute roles={["admin", "teacher", "student", "parent"]}>
                <ReportsPage />
              </RoleRoute>
            ),
          },
          {
            path: "classes",
            element: (
              <RoleRoute roles={["admin", "teacher"]}>
                <Classes />
              </RoleRoute>
            ),
          },
          {
            path: "subjects",
            element: (
              <RoleRoute roles={["admin", "teacher"]}>
                <Subjects />
              </RoleRoute>
            ),
          },
          {
            path: "timetable",
            element: (
              <RoleRoute roles={["admin", "teacher", "student", "parent"]}>
                <Timetable />
              </RoleRoute>
            ),
          },
          {
            path: "lms/exams",
            element: (
              <RoleRoute roles={["admin", "teacher", "student"]}>
                <Exams />
              </RoleRoute>
            ),
          },
          {
            path: "lms/exams/:id",
            element: (
              <RoleRoute roles={["admin", "teacher", "student"]}>
                <Exam />
              </RoleRoute>
            ),
          },
        ],
      },
    ],
  },
]);
