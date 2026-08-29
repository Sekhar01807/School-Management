import { ReactNode } from "react";
import { Navigate } from "react-router";
import { useAuth } from "@/hooks/AuthProvider";
import type { UserRole } from "@/types";
import NotFound from "@/pages/NotFound";

import { Loader2 } from "lucide-react";

interface RoleRouteProps {
  roles: UserRole[];
  children: ReactNode;
}

export const RoleRoute = ({ roles, children }: RoleRouteProps) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#F8FAFC] dark:bg-[#0B0F19]">
        <Loader2 className="h-8 w-8 animate-spin text-[#1E40AF]" />
      </div>
    );
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
