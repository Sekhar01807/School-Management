import { useState, useEffect } from "react";
import { Menu, X, School } from "lucide-react";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={`fixed w-full z-50 transition-all duration-300 ${
        scrolled
          ? "bg-white/95 dark:bg-[#0F172A]/95 backdrop-blur-md py-3 shadow-xs border-b border-[#E2E8F0] dark:border-[#1E293B]"
          : "bg-transparent py-5"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          <Link to="/" className="flex items-center space-x-2.5">
            <div className="bg-[#1E40AF] p-2 rounded-xl text-white shadow-xs">
              <School className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-[#0F172A] dark:text-white">
              School<span className="text-[#1E40AF]">Sync</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center space-x-6">
            <a
              href="#features"
              className="text-[#64748B] hover:text-[#1E40AF] transition-colors font-medium text-sm"
            >
              Features
            </a>
            <a
              href="#how-it-works"
              className="text-[#64748B] hover:text-[#1E40AF] transition-colors font-medium text-sm"
            >
              How It Works
            </a>
            <a
              href="#roles"
              className="text-[#64748B] hover:text-[#1E40AF] transition-colors font-medium text-sm"
            >
              Who It's For
            </a>
            
            <div className="flex items-center space-x-3 pl-4 border-l border-[#E2E8F0] dark:border-gray-800">
              <Link to="/login">
                <Button variant="ghost" className="text-[#0F172A] dark:text-white text-sm font-semibold hover:bg-slate-100">
                  Log In
                </Button>
              </Link>
              <Link to="/register">
                <Button className="bg-[#1E40AF] hover:bg-[#1E3A8A] text-white text-sm font-semibold px-4 shadow-xs">
                  Sign Up Free
                </Button>
              </Link>
            </div>
          </div>

          {/* Mobile button */}
          <div className="md:hidden flex items-center space-x-4">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-[#0F172A] dark:text-white p-2"
            >
              {isOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden bg-white dark:bg-[#0F172A] border-b border-[#E2E8F0] dark:border-[#1E293B] px-4 pt-2 pb-6 space-y-3">
          <a
            href="#features"
            className="block text-[#64748B] hover:text-[#1E40AF] text-sm font-medium py-1"
          >
            Features
          </a>
          <a
            href="#how-it-works"
            className="block text-[#64748B] hover:text-[#1E40AF] text-sm font-medium py-1"
          >
            How It Works
          </a>
          <a
            href="#roles"
            className="block text-[#64748B] hover:text-[#1E40AF] text-sm font-medium py-1"
          >
            Who It's For
          </a>
          <div className="pt-2 grid grid-cols-2 gap-2">
            <Link to="/login" className="block">
              <Button variant="outline" className="w-full text-sm font-semibold">
                Log In
              </Button>
            </Link>
            <Link to="/register" className="block">
              <Button className="w-full bg-[#1E40AF] hover:bg-[#1E3A8A] text-white text-sm font-semibold">
                Sign Up
              </Button>
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
