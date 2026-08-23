import { ReactNode } from "react";
import { Navigate } from "react-router";
import { useAuth } from "@/hooks/AuthProvider";
import type { UserRole } from "@/types";
import NotFound from "@/pages/NotFound";

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
    // If user's role is not permitted, show clean 403 Unauthorized page
    return (
      <NotFound
        isUnauthorized={true}
        message={`Your account role (${user.role.toUpperCase()}) is not authorized to access this section.`}
      />
    );
  }

  return <>{children}</>;
};

export default RoleRoute;
