import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { authApi, AuthUser, RegisterPayload } from "@/api/auth";
import { setAccessToken, setStoredRefreshToken, getStoredRefreshToken, clearTokens } from "@/api/client";
import { useRole } from "@/contexts/RoleContext";
import type { UserRole } from "@/contexts/RoleContext";
import { toast } from "sonner";

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: (code: string, codeVerifier: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { setRole } = useRole();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    const restoreSession = async () => {
      const storedRefresh = getStoredRefreshToken();
      if (!storedRefresh) {
        setIsLoading(false);
        return;
      }
      try {
        // Access token is in-memory only and lost on page reload.
        // Proactively exchange the refresh token first, then fetch the user.
        const { data: tokens } = await authApi.refresh(storedRefresh);
        setAccessToken(tokens.access_token);
        setStoredRefreshToken(tokens.refresh_token);
        const { data: me } = await authApi.me();
        setUser(me);
        setRole(me.role as UserRole);
      } catch {
        clearTokens();
      } finally {
        setIsLoading(false);
      }
    };
    restoreSession();
  }, []);

  const login = async (email: string, password: string) => {
    queryClient.clear();
    const { data: tokens } = await authApi.login({ email, password });
    setAccessToken(tokens.access_token);
    setStoredRefreshToken(tokens.refresh_token);
    const { data: me } = await authApi.me();
    setUser(me);
    setRole(me.role as UserRole);
    navigate("/dashboard", { replace: true });
  };

  const loginWithGoogle = async (code: string, codeVerifier: string) => {
    queryClient.clear();
    const { data: tokens } = await authApi.googleCallback(code, codeVerifier);
    setAccessToken(tokens.access_token);
    setStoredRefreshToken(tokens.refresh_token);
    const { data: me } = await authApi.me();
    setUser(me);
    setRole(me.role as UserRole);
    toast.success("Logged in successfully.");
    navigate("/dashboard", { replace: true });
  };

  const logout = async () => {
    const storedRefresh = getStoredRefreshToken();
    if (storedRefresh) {
      try { await authApi.logout(storedRefresh); } catch {}
    }
    setUser(null);
    clearTokens();
    queryClient.clear();
    toast.success("Logged out successfully.");
    navigate("/login", { replace: true });
  };

  const register = async (payload: RegisterPayload) => {
    await authApi.register(payload);
  };

  const refreshUser = async () => {
    const { data: me } = await authApi.me();
    setUser(me);
    setRole(me.role as UserRole);
  };

  return (
    <AuthContext.Provider
      value={{ user, isAuthenticated: !!user, isLoading, login, loginWithGoogle, logout, register, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
