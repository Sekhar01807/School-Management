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
    let isMounted = true;

    const initializeAuth = async () => {
      try {
        setLoading(true);
        // 1. Check user profile from cookie with 6 second timeout to avoid indefinite hanging
        const profileRes = await api.get("/users/profile", { timeout: 6000 }).catch(() => null);

        if (!isMounted) return;

        if (profileRes?.data?.user) {
          setUser(profileRes.data.user);

          // 2. Fetch current academic year if authenticated
          const yearRes = await api
            .get("/academic-years/current", { timeout: 6000 })
            .catch(() => null);
          if (isMounted && yearRes?.data) {
            setYear(yearRes.data);
          }
        } else {
          setUser(null);
          setYear(null);
        }
      } catch (error) {
        console.error("Auth initialization error:", error);
        if (isMounted) {
          setUser(null);
          setYear(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser, loading, year, setYear }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
