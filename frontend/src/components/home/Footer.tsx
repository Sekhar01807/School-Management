import {
  School,
  ArrowUp,
} from "lucide-react";
import { Link } from "react-router";

const Footer = () => {
  return (
    <footer className="pt-16 pb-10 border-t border-[#E2E8F0] dark:border-gray-800 bg-white dark:bg-[#0B0F19] transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
          <div className="space-y-3">
            <div className="flex items-center space-x-2.5">
              <div className="bg-[#1E40AF] p-2 rounded-xl text-white shadow-xs">
                <School className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold tracking-tight text-[#0F172A] dark:text-white">
                School<span className="text-[#1E40AF]">Sync</span>
              </span>
            </div>
            <p className="text-xs text-[#64748B] dark:text-gray-400 leading-relaxed">
              Simple, reliable school management for classes, timetables, and attendance.
            </p>
            <p className="text-xs text-[#94A3B8] dark:text-gray-500 pt-1">
              © 2026 SchoolSync. Institutional Academic Management.
            </p>
          </div>

          <div>
            <h4 className="text-[#0F172A] dark:text-white font-bold mb-4 text-sm">
              Features
            </h4>
            <ul className="space-y-2.5 text-xs text-[#64748B] dark:text-gray-400">
              <li>
                <Link to="/register" className="hover:text-[#1E40AF] transition-colors">
                  Class Timetables
                </Link>
              </li>
              <li>
                <Link to="/register" className="hover:text-[#1E40AF] transition-colors">
                  Daily Attendance Registers
                </Link>
              </li>
              <li>
                <Link to="/register" className="hover:text-[#1E40AF] transition-colors">
                  Student & Teacher Directory
                </Link>
              </li>
              <li>
                <Link to="/register" className="hover:text-[#1E40AF] transition-colors">
                  School Year & Class Settings
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-[#0F172A] dark:text-white font-bold mb-4 text-sm">
              Portals
            </h4>
            <ul className="space-y-2.5 text-xs text-[#64748B] dark:text-gray-400">
              <li>
                <Link to="/login" className="hover:text-[#1E40AF] transition-colors">
                  Admin Dashboard
                </Link>
              </li>
              <li>
                <Link to="/login" className="hover:text-[#1E40AF] transition-colors">
                  Teacher Portal
                </Link>
              </li>
              <li>
                <Link to="/login" className="hover:text-[#1E40AF] transition-colors">
                  Student Portal
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-[#0F172A] dark:text-white font-bold mb-4 text-sm">
              Get Started
            </h4>
            <p className="text-xs text-[#64748B] dark:text-gray-400 mb-4 leading-relaxed">
              Create an account or sign in to access your school's dashboard.
            </p>
            <div className="flex gap-2">
              <Link to="/register" className="flex-1">
                <button className="w-full bg-[#1E40AF] text-white text-xs font-semibold px-3 py-2 rounded-lg hover:bg-[#1E3A8A] transition-colors shadow-xs">
                  Sign Up
                </button>
              </Link>
              <Link to="/login" className="flex-1">
                <button className="w-full border border-[#E2E8F0] dark:border-gray-700 text-[#0F172A] dark:text-white text-xs font-semibold px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors">
                  Log In
                </button>
              </Link>
            </div>
          </div>
        </div>

        <div className="border-t border-[#E2E8F0] dark:border-gray-800 pt-6 flex items-center justify-end text-xs text-[#64748B]">
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="p-2 rounded-lg bg-[#F8FAFC] dark:bg-[#111827] border border-[#E2E8F0] dark:border-gray-800 hover:border-[#1E40AF] text-[#64748B] hover:text-[#1E40AF] transition-all shadow-2xs"
            aria-label="Back to top"
          >
            <ArrowUp className="w-4 h-4" />
          </button>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
