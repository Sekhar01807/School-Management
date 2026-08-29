import { useRouteError, isRouteErrorResponse, useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Home, RefreshCw, School } from "lucide-react";

export default function ErrorPage() {
  const error = useRouteError();
  const navigate = useNavigate();

  let errorMessage = "An unexpected error occurred while loading this page.";
  let errorStatus = "Application Error";

  if (isRouteErrorResponse(error)) {
    errorStatus = `${error.status} ${error.statusText}`;
    errorMessage = error.data?.message || error.statusText || errorMessage;
  } else if (error instanceof Error) {
    errorMessage = error.message;
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B0F19] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Subtle Gradient Glow */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-red-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

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
        <div className="mx-auto mb-6 flex items-center justify-center size-20 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-100 dark:border-amber-900 text-amber-600 dark:text-amber-400 shadow-inner">
          <AlertTriangle className="size-10" />
        </div>

        <span className="inline-block text-xs font-semibold px-3 py-1 uppercase tracking-wider bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 rounded-full mb-3">
          {errorStatus}
        </span>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] dark:text-white tracking-tight mb-3">
          Something went wrong
        </h1>
        <p className="text-sm text-[#64748B] dark:text-gray-400 leading-relaxed max-w-md mx-auto mb-8">
          {errorMessage}
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button
            onClick={() => window.location.reload()}
            className="w-full sm:w-auto bg-[#1E40AF] hover:bg-blue-800 text-white font-medium px-6 shadow-md shadow-blue-500/10 flex items-center gap-2"
          >
            <RefreshCw className="size-4" />
            Reload Page
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate("/")}
            className="w-full sm:w-auto flex items-center gap-2 border-gray-200 dark:border-gray-700"
          >
            <Home className="size-4" />
            Go to Home
          </Button>
        </div>
      </div>

      <div className="mt-8 text-xs text-[#94A3B8] dark:text-gray-500 text-center">
        SchoolSync Multi-Role Academic Platform &copy; {new Date().getFullYear()}
      </div>
    </div>
  );
}
