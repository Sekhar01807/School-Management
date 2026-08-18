import { createContext, useState, useEffect, useContext } from "react";
import { api } from "@/lib/api";
import type { academicYear, user } from "@/types";

// 1. Create Context
const AuthContext = createContext<{
  user: user | null;
  setUser: React.Dispatch<React.SetStateAction<user | null>>;
  loading: boolean;
  year: academicYear | null;
  setYear: React.Dispatch<React.SetStateAction<academicYear | null>>;
}>({
  user: null,
  setUser: () => {},
  loading: true,
  year: null,
  setYear: () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<user | null>(null);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState<academicYear | null>(null);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        setLoading(true);
        // 1. Check user profile from cookie
        const profileRes = await api.get("/users/profile").catch(() => null);

        if (profileRes?.data?.user) {
          setUser(profileRes.data.user);

          // 2. Fetch current academic year if authenticated
          const yearRes = await api.get("/academic-years/current").catch(() => null);
          if (yearRes?.data) {
            setYear(yearRes.data);
          }
        } else {
          setUser(null);
          setYear(null);
        }
      } catch (error) {
        console.error("Auth initialization error:", error);
        setUser(null);
        setYear(null);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser, loading, year, setYear }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
