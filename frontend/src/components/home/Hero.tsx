import { ArrowRight, GraduationCap } from "lucide-react";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";

const Hero = () => {
  return (
    <section
      id="overview"
      className="relative pt-32 pb-20 overflow-hidden min-h-[85vh] flex items-center bg-[#F8FAFC] dark:bg-[#0B0F19]"
    >
      {/* Background Decor */}
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-blue-500/10 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-96 h-96 bg-teal-500/10 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center space-x-2 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 px-3.5 py-1.5 rounded-full text-[#1E40AF] dark:text-blue-300 text-xs font-semibold">
              <GraduationCap className="w-4 h-4 text-[#1E40AF]" />
              <span>School Management Portal</span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-[#0F172A] dark:text-white leading-tight tracking-tight">
              Simple School Management for <span className="text-[#1E40AF]">Everyone</span>.
            </h1>

            <p className="text-base sm:text-lg text-[#64748B] dark:text-gray-400 max-w-xl leading-relaxed">
              Manage classes, organize weekly timetables, record roll call attendance, and keep students, faculty, and administrators in sync.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <Link to="/register" className="w-full sm:w-auto">
                <Button className="w-full sm:w-auto flex items-center justify-center space-x-2 bg-[#1E40AF] hover:bg-[#1E3A8A] text-white px-7 py-6 rounded-xl font-semibold shadow-xs transition-all text-sm sm:text-base">
                  <span>Create Free Account</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
              <Link to="/login" className="w-full sm:w-auto">
                <Button variant="outline" className="w-full sm:w-auto border-[#E2E8F0] dark:border-gray-800 text-[#0F172A] dark:text-white hover:bg-slate-50 px-7 py-6 rounded-xl font-semibold text-sm sm:text-base">
                  <span>Sign In</span>
                </Button>
              </Link>
            </div>
          </div>

          {/* Right School Visual */}
          <div className="relative">
            <div className="relative rounded-3xl overflow-hidden border border-[#E2E8F0] dark:border-gray-800 shadow-2xl bg-white dark:bg-[#111827] h-[380px] sm:h-[420px] w-full group">
              <img
                src="https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&q=80&w=1200"
                alt="School classroom and students"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
