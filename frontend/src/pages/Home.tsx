import Navbar from "@/components/home/Navbar";
import Hero from "@/components/home/Hero";
import Programs from "@/components/home/Programs";
import Stats from "@/components/home/Stats";
import Footer from "@/components/home/Footer";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";

const Home = () => {
  return (
    <div className="bg-[#F8FAFC] dark:bg-[#0B0F19] text-[#0F172A] dark:text-white min-h-screen">
      <Navbar />
      <main>
        <Hero />
        <Programs />
        <Stats />

        {/* Light-Themed Call to Action Banner */}
        <section className="py-20 relative overflow-hidden bg-white dark:bg-[#0B0F19]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-gradient-to-br from-blue-50/90 via-white to-slate-50 dark:bg-[#111827] rounded-3xl p-8 sm:p-14 text-center relative overflow-hidden shadow-lg border border-blue-100 dark:border-gray-800">
              <div className="absolute top-0 left-0 w-full h-1 bg-[#1E40AF]"></div>
              <h2 className="text-2xl sm:text-4xl font-extrabold text-[#0F172A] dark:text-white mb-3 tracking-tight">
                Start Using SchoolSync Today
              </h2>
              <p className="text-sm sm:text-base text-[#64748B] dark:text-gray-400 mb-8 max-w-xl mx-auto leading-relaxed">
                Create your account in under a minute. Organize your classes, view your weekly schedule, and take quizzes online.
              </p>
              <div className="flex flex-col sm:flex-row justify-center items-center gap-3">
                <Link to="/register">
                  <Button className="bg-[#1E40AF] hover:bg-[#1E3A8A] text-white px-8 py-6 rounded-xl font-bold text-sm sm:text-base shadow-sm">
                    Create Free Account
                  </Button>
                </Link>
                <Link to="/login">
                  <Button className="bg-white hover:bg-slate-50 text-[#0F172A] dark:text-white border border-[#CBD5E1] dark:border-gray-700 px-8 py-6 rounded-xl font-bold text-sm sm:text-base transition-colors shadow-2xs">
                    Sign In to Portal
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Home;
