import UniversalUserForm from "@/components/auth/UniversalUserForm";
import { useAuth } from "@/hooks/AuthProvider";
import { School, CheckCircle2 } from "lucide-react";
import { Link, Navigate } from "react-router";

const Login = () => {
  const { user, loading } = useAuth();
  if (user && !loading) {
    return <Navigate to="/dashboard" />;
  }
  return (
    <div className="grid min-h-svh lg:grid-cols-2 bg-[#F8FAFC] dark:bg-[#0B0F19]">
      <div className="flex flex-col justify-between p-6 md:p-12">
        <div className="flex justify-center md:justify-start">
          <Link to="/" className="flex items-center gap-2.5 font-bold text-lg text-[#0F172A] dark:text-white">
            <div className="bg-[#1E40AF] text-white flex size-8 items-center justify-center rounded-xl shadow-xs">
              <School className="size-4.5" />
            </div>
            School<span className="text-[#1E40AF]">Sync</span>
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center my-6">
          <div className="w-full max-w-sm bg-white dark:bg-[#111827] p-8 rounded-2xl border border-[#E2E8F0] dark:border-gray-800 shadow-sm">
            <div className="mb-6 text-center md:text-left">
              <h2 className="text-2xl font-bold text-[#0F172A] dark:text-white tracking-tight">Welcome Back</h2>
              <p className="text-xs text-[#64748B] dark:text-gray-400 mt-1">
                Sign in to your account to view your classes, timetable, and attendance.
              </p>
            </div>
            
            <UniversalUserForm type="login" />

            <div className="mt-6 pt-4 border-t border-[#F1F5F9] dark:border-gray-800 text-center text-xs text-[#64748B]">
              Don't have an account?{" "}
              <Link to="/register" className="font-semibold text-[#1E40AF] hover:underline">
                Sign Up
              </Link>
            </div>
          </div>
        </div>
        <div>{/* Clean empty bottom spacer */}</div>
      </div>

      {/* Right Side School Image & Info */}
      <div className="relative hidden lg:flex flex-col justify-between p-12 text-white overflow-hidden bg-slate-900">
        <img
          src="https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&q=80&w=1200"
          alt="School students in classroom"
          className="absolute inset-0 h-full w-full object-cover opacity-45"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/80 to-slate-900/50"></div>
        
        <div className="relative z-10 flex items-center gap-2 text-xs font-semibold text-[#CBD5E1]">
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          <span>SchoolSync Portal</span>
        </div>
        
        <div className="relative z-10 space-y-4 max-w-md">
          <h3 className="text-2xl font-bold leading-snug text-white">
            Everything your school needs, in one simple place.
          </h3>
          <ul className="space-y-2.5 text-sm text-[#CBD5E1]">
            <li className="flex items-center gap-2.5">
              <CheckCircle2 className="size-4 text-blue-400 shrink-0" />
              <span>Conflict-free weekly class timetables</span>
            </li>
            <li className="flex items-center gap-2.5">
              <CheckCircle2 className="size-4 text-blue-400 shrink-0" />
              <span>Instant daily roll call registers</span>
            </li>
            <li className="flex items-center gap-2.5">
              <CheckCircle2 className="size-4 text-blue-400 shrink-0" />
              <span>Student, teacher, and class directories</span>
            </li>
          </ul>
        </div>

        <div className="relative z-10 text-xs text-[#94A3B8]">
          School Management & Academic Operations
        </div>
      </div>
    </div>
  );
};

export default Login;
