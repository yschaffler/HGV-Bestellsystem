"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

type User = {
  username: string;
  name: string;
  role: string;
};

type AuthContextType = {
  user: User | null;
  loading: boolean;
  refreshUser: () => void;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  refreshUser: () => { },
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const pathname = usePathname();
  const router = useRouter();

  const fetchUser = async () => {
    try {
      const res = await fetch("/me/", {
        credentials: "include",
      });

      if (!res.ok) throw new Error();

      const data = await res.json();
      setUser({ username: data.user_username, name: data.user_name, role: data.user_role });
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  useEffect(() => {
    if (!loading) {
      const isProtected =
        pathname?.startsWith("/settings") ||
        pathname?.startsWith("/kellner") ||
        pathname?.startsWith("/bar") ||
        pathname?.startsWith("/admin");

      if (!user && isProtected) {
        if (pathname) {
          sessionStorage.setItem("redirectAfterLogin", pathname);
        }
        router.push("/login/");
      }

      const isAdminOnly = pathname?.startsWith("/settings") || pathname?.startsWith("/admin");
      if (user && isAdminOnly && user.role !== "ADMIN") {
        router.push("/");
      }

      if (user && pathname?.startsWith("/login")) {
        router.push("/");
      }
    }
  }, [user, loading, pathname, router]);

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const isProtected =
    pathname?.startsWith("/settings") ||
    pathname?.startsWith("/kellner") ||
    pathname?.startsWith("/bar") ||
    pathname?.startsWith("/admin");
  if (!user && isProtected) {
    return null;
  }

  const isAdminOnly = pathname?.startsWith("/settings") || pathname?.startsWith("/admin");
  if (user && isAdminOnly && user.role !== "ADMIN") {
    return null;
  }

  return (
    <AuthContext.Provider value={{ user, loading, refreshUser: fetchUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);