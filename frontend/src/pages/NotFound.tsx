import { useNavigate } from "react-router";
import { useAuth } from "@/hooks/AuthProvider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  LayoutDashboard,
  Home,
  ArrowLeft,
  ShieldAlert,
  HelpCircle,
  LogIn,
  School,
} from "lucide-react";

interface NotFoundProps {
  isUnauthorized?: boolean;
  message?: string;
}

export default function NotFound({
  isUnauthorized = false,
  message,
}: NotFoundProps) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const title = isUnauthorized ? "403 — Access Restricted" : "404 — Page Not Found";
  const defaultDescription = isUnauthorized
    ? "You do not have the required permissions or role to access this resource. Please contact your system administrator if you believe this is an error."
    : "Oops! The page you are looking for might have been moved, renamed, or doesn't exist.";

  const description = message || defaultDescription;

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B0F19] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Subtle Gradient Glow */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Brand Logo */}
      <div className="mb-8 flex items-center gap-2.5 font-bold text-xl text-[#0F172A] dark:text-white">
        <div className="bg-[#1E40AF] text-white flex size-9 items-center justify-center rounded-xl shadow-sm">
          <School className="size-5" />
        </div>
        <span>
          School<span className="text-[#1E40AF]">Sync</span>
        </span>
      </div>

      {/* Main Error Card */}
      <div className="w-full max-w-lg bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-gray-800 rounded-3xl p-8 sm:p-10 shadow-xl text-center relative z-10">
        {/* Error Icon Badge */}
        <div className="mx-auto mb-6 flex items-center justify-center size-20 rounded-2xl bg-blue-50 dark:bg-blue-950/50 border border-blue-100 dark:border-blue-900 text-[#1E40AF] dark:text-blue-400 shadow-inner">
          {isUnauthorized ? (
            <ShieldAlert className="size-10 text-amber-500" />
          ) : (
            <HelpCircle className="size-10 text-[#1E40AF] dark:text-blue-400" />
          )}
        </div>

        {/* Status Tag */}
        <div className="mb-3">
          <Badge
            variant={isUnauthorized ? "destructive" : "secondary"}
            className="text-xs font-semibold px-3 py-1 uppercase tracking-wider"
          >
            {isUnauthorized ? "Unauthorized Route" : "Resource Missing"}
          </Badge>
        </div>

        {/* Title & Description */}
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] dark:text-white tracking-tight mb-3">
          {title}
        </h1>
        <p className="text-sm text-[#64748B] dark:text-gray-400 leading-relaxed max-w-md mx-auto mb-8">
          {description}
        </p>

        {/* User Session Info Pill if Logged in */}
        {user && (
          <div className="mb-6 p-3 rounded-xl bg-[#F8FAFC] dark:bg-gray-900/60 border border-[#E2E8F0] dark:border-gray-800 text-xs text-[#475569] dark:text-gray-400 flex items-center justify-center gap-2">
            <span>Signed in as:</span>
            <span className="font-semibold text-[#0F172A] dark:text-white">
              {user.name}
            </span>
            <Badge variant="outline" className="capitalize text-[10px] px-1.5 py-0">
              {user.role}
            </Badge>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          {user ? (
            <>
              <Button
                onClick={() => navigate("/dashboard")}
                className="w-full sm:w-auto bg-[#1E40AF] hover:bg-blue-800 text-white font-medium px-6 shadow-md shadow-blue-500/10 flex items-center gap-2"
              >
                <LayoutDashboard className="size-4" />
                Go to Dashboard
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate(-1)}
                className="w-full sm:w-auto flex items-center gap-2 border-gray-200 dark:border-gray-700"
              >
                <ArrowLeft className="size-4" />
                Go Back
              </Button>
            </>
          ) : (
            <>
              <Button
                onClick={() => navigate("/")}
                className="w-full sm:w-auto bg-[#1E40AF] hover:bg-blue-800 text-white font-medium px-6 shadow-md shadow-blue-500/10 flex items-center gap-2"
              >
                <Home className="size-4" />
                Go to Home Page
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate("/login")}
                className="w-full sm:w-auto flex items-center gap-2 border-gray-200 dark:border-gray-700"
              >
                <LogIn className="size-4" />
                Sign In
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Footer Info */}
      <div className="mt-8 text-xs text-[#94A3B8] dark:text-gray-500 text-center">
        SchoolSync Multi-Role Academic Platform &copy; {new Date().getFullYear()}
      </div>
    </div>
  );
}
