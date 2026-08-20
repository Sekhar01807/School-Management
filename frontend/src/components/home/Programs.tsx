import { Calendar, FileCheck, Users, School, ArrowRight } from "lucide-react";
import { Link } from "react-router";

const features = [
  {
    title: "Weekly Class Timetables",
    image: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&q=80&w=800",
    icon: Calendar,
    desc: "Generate complete Monday-to-Friday schedules for every class with custom period times, breaks, and zero teacher double-booking.",
    tags: ["Weekly Timetable", "Conflict-Free", "Class Schedules"],
    color: "text-[#1E40AF]",
    bg: "bg-blue-50 dark:bg-blue-950/50",
  },
  {
    title: "Quizzes & Online Tests",
    image: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&q=80&w=800",
    icon: FileCheck,
    desc: "Teachers can create custom quizzes and set deadlines. Students take tests with countdown timers, and results are scored automatically.",
    tags: ["Online Quizzes", "Live Timers", "Instant Scores"],
    color: "text-[#0F766E]",
    bg: "bg-teal-50 dark:bg-teal-950/50",
  },
  {
    title: "Student & Staff Directory",
    image: "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&q=80&w=800",
    icon: Users,
    desc: "Manage complete profiles for students, teachers, parents, and admins. Search by name, filter by role, and update details easily.",
    tags: ["Student Profiles", "Teacher Staff", "Quick Search"],
    color: "text-[#D97706]",
    bg: "bg-amber-50 dark:bg-amber-950/50",
  },
  {
    title: "Classes & Academic Years",
    image: "https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&q=80&w=800",
    icon: School,
    desc: "Set the active school year, create classes with student limits, and connect subjects directly to qualified teachers.",
    tags: ["School Years", "Class Limits", "Subject Codes"],
    color: "text-[#16A34A]",
    bg: "bg-emerald-50 dark:bg-emerald-950/50",
  },
];

const Programs = () => {
  return (
    <section id="features" className="py-20 bg-[#F8FAFC] dark:bg-[#0B0F19]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-12 space-y-2">
          <h2 className="text-[#1E40AF] dark:text-blue-400 font-bold tracking-widest uppercase text-xs">
            Platform Features
          </h2>
          <h3 className="text-3xl md:text-4xl font-bold text-[#0F172A] dark:text-white tracking-tight">
            Everything You Need to Run Your School
          </h3>
          <p className="text-[#64748B] dark:text-gray-400 max-w-2xl text-sm leading-relaxed pt-1">
            Simple, practical tools designed for teachers, students, and school administrators.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, idx) => (
            <div
              key={idx}
              className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-gray-800 rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between group"
            >
              <div>
                {/* Feature School Image */}
                <div className="relative h-44 w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
                  <img
                    src={feature.image}
                    alt={feature.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-3 left-3">
                    <div className={`${feature.bg} backdrop-blur-md p-2 rounded-xl border border-white/40 shadow-xs`}>
                      <feature.icon className={`${feature.color} w-5 h-5`} />
                    </div>
                  </div>
                </div>

                <div className="p-5">
                  <h4 className="text-lg font-bold text-[#0F172A] dark:text-white mb-2">
                    {feature.title}
                  </h4>
                  <p className="text-xs text-[#64748B] dark:text-gray-400 mb-4 leading-relaxed">
                    {feature.desc}
                  </p>
                </div>
              </div>

              <div className="px-5 pb-5">
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {feature.tags.map((tag, tIdx) => (
                    <span
                      key={tIdx}
                      className="px-2.5 py-0.5 bg-[#F1F5F9] dark:bg-[#1E293B] rounded-md text-[11px] font-medium text-[#64748B] dark:text-gray-300"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <Link
                  to="/register"
                  className="inline-flex items-center text-xs font-semibold text-[#1E40AF] dark:text-blue-400 hover:underline"
                >
                  Explore feature <ArrowRight className="ml-1 w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Programs;
