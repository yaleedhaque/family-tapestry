"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";

export type UserRole = "admin" | "editor" | "viewer";

interface AuthUser extends User {
  role?: UserRole;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  hasRole: (...roles: UserRole[]) => boolean;
  canEdit: boolean;
  canAdmin: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  hasRole: () => true,
  canEdit: true,
  canAdmin: true,
});

export function useAuth() {
  return useContext(AuthContext);
}

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      setLoading(false);
      return;
    }

    import("@/lib/supabase/client").then(({ createClient }) => {
      const supabase = createClient();

      supabase.auth.getUser().then(({ data }) => {
        const u = data.user as AuthUser | null;
        if (u) {
          const role = (u.app_metadata as Record<string, unknown>)?.role as UserRole | undefined
            ?? (u.user_metadata as Record<string, unknown>)?.role as UserRole | undefined;
          u.role = role ?? "editor";
        }
        setUser(u);
        setLoading(false);
      });

      const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
        const u = session?.user as AuthUser | null;
        if (u) {
          const role = (u.app_metadata as Record<string, unknown>)?.role as UserRole | undefined
            ?? (u.user_metadata as Record<string, unknown>)?.role as UserRole | undefined;
          u.role = role ?? "editor";
        }
        setUser(u);
      });

      return () => listener.subscription.unsubscribe();
    });
  }, []);

  const hasRole = (...roles: UserRole[]) => {
    if (!user) return false;
    if (user.role === "admin") return true;
    return roles.includes(user.role ?? "viewer");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        hasRole,
        canEdit: hasRole("admin", "editor"),
        canAdmin: hasRole("admin"),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
