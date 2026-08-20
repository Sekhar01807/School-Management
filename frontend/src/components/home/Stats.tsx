import { ShieldCheck, BookOpen, GraduationCap, Users, CheckCircle2 } from "lucide-react";

const Stats = () => {
  return (
    <section id="how-it-works" className="py-20 bg-white dark:bg-[#0B0F19] border-t border-[#E2E8F0] dark:border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14 space-y-2">
          <h2 className="text-[#1E40AF] dark:text-blue-400 font-bold tracking-widest uppercase text-xs">
            User Roles & Portals
          </h2>
          <h3 className="text-3xl md:text-4xl font-bold text-[#0F172A] dark:text-white tracking-tight">
            Designed for Your Whole School Community
          </h3>
          <p className="text-[#64748B] dark:text-gray-400 max-w-xl mx-auto text-sm">
            Each role gets a dedicated dashboard with the exact tools they need.
          </p>
        </div>

        {/* 4 Roles Grid */}
        <div id="roles" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-6 rounded-2xl bg-[#F8FAFC] dark:bg-[#111827] border border-[#E2E8F0] dark:border-gray-800 space-y-3 hover:border-blue-200 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-[#1E40AF] flex items-center justify-center shadow-2xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h4 className="text-base font-bold text-[#0F172A] dark:text-white">School Admins</h4>
            <p className="text-xs text-[#64748B] leading-relaxed">
              Create school years, assign teachers to subjects, manage all student records, and generate weekly timetables.
            </p>
            <ul className="text-[11px] text-[#64748B] space-y-1.5 pt-2 border-t border-[#E2E8F0] dark:border-gray-800">
              <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" /> Full student & staff directory</li>
              <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" /> Automated timetable builder</li>
            </ul>
          </div>

          <div className="p-6 rounded-2xl bg-[#F8FAFC] dark:bg-[#111827] border border-[#E2E8F0] dark:border-gray-800 space-y-3 hover:border-teal-200 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-teal-100 dark:bg-teal-950/60 text-[#0F766E] flex items-center justify-center shadow-2xs">
              <BookOpen className="w-5 h-5" />
            </div>
            <h4 className="text-base font-bold text-[#0F172A] dark:text-white">Teachers</h4>
            <p className="text-xs text-[#64748B] leading-relaxed">
              Check your daily lecture timetable, create multiple-choice quizzes, set deadlines, and review student grades.
            </p>
            <ul className="text-[11px] text-[#64748B] space-y-1.5 pt-2 border-t border-[#E2E8F0] dark:border-gray-800">
              <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-teal-600 shrink-0" /> Assigned classroom schedule</li>
              <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-teal-600 shrink-0" /> Quiz builder & grade review</li>
            </ul>
          </div>

          <div className="p-6 rounded-2xl bg-[#F8FAFC] dark:bg-[#111827] border border-[#E2E8F0] dark:border-gray-800 space-y-3 hover:border-emerald-200 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-[#16A34A] flex items-center justify-center shadow-2xs">
              <GraduationCap className="w-5 h-5" />
            </div>
            <h4 className="text-base font-bold text-[#0F172A] dark:text-white">Students</h4>
            <p className="text-xs text-[#64748B] leading-relaxed">
              See your class schedule, take quizzes online before deadlines with live timers, and check your test scores instantly.
            </p>
            <ul className="text-[11px] text-[#64748B] space-y-1.5 pt-2 border-t border-[#E2E8F0] dark:border-gray-800">
              <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> Live class schedule</li>
              <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> Timed online quizzes</li>
            </ul>
          </div>

          <div className="p-6 rounded-2xl bg-[#F8FAFC] dark:bg-[#111827] border border-[#E2E8F0] dark:border-gray-800 space-y-3 hover:border-amber-200 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-[#D97706] flex items-center justify-center shadow-2xs">
              <Users className="w-5 h-5" />
            </div>
            <h4 className="text-base font-bold text-[#0F172A] dark:text-white">Parents</h4>
            <p className="text-xs text-[#64748B] leading-relaxed">
              Stay connected with your child's class schedule, review exam results, and monitor attendance metrics.
            </p>
            <ul className="text-[11px] text-[#64748B] space-y-1.5 pt-2 border-t border-[#E2E8F0] dark:border-gray-800">
              <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-amber-600 shrink-0" /> Child class tracking</li>
              <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-amber-600 shrink-0" /> Attendance overview</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Stats;
