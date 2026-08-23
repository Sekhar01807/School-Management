import { ReactNode } from "react";
import { Navigate } from "react-router";
import { useAuth } from "@/hooks/AuthProvider";
import type { UserRole } from "@/types";

interface RoleRouteProps {
  roles: UserRole[];
  children: ReactNode;
}

export const RoleRoute = ({ roles, children }: RoleRouteProps) => {
  const { user, loading } = useAuth();

  if (loading) {
    return null;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!roles.includes(user.role)) {
    // If user's role is not permitted, redirect safely to dashboard
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default RoleRoute;
