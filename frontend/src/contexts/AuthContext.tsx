import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { authApi, AuthUser, RegisterPayload } from "@/api/auth";
import { setAccessToken, clearTokens } from "@/api/client";
import { useRole } from "@/contexts/RoleContext";
import type { UserRole } from "@/contexts/RoleContext";
import { toast } from "sonner";

export type LoginOutcome =
  | { status: "ok" }
  | { status: "mfa_required"; mfaToken: string; methods: string[] }
  | { status: "mfa_setup_required"; mfaToken: string; smsAvailable: boolean };

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<LoginOutcome>;
  loginWithGoogle: (code: string, codeVerifier: string) => Promise<LoginOutcome>;
  completeMfaLogin: (accessToken: string) => Promise<void>;
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
      try {
        const { data: tokens } = await authApi.refresh();
        setAccessToken(tokens.access_token);
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

  const finishLogin = async (accessToken: string) => {
    setAccessToken(accessToken);
    const { data: me } = await authApi.me();
    setUser(me);
    setRole(me.role as UserRole);
  };

  const login = async (email: string, password: string): Promise<LoginOutcome> => {
    queryClient.clear();
    const { data } = await authApi.login({ email, password });
    if (data.mfa_required && data.mfa_token) {
      return { status: "mfa_required", mfaToken: data.mfa_token, methods: data.methods };
    }
    if (data.mfa_setup_required && data.mfa_token) {
      return { status: "mfa_setup_required", mfaToken: data.mfa_token, smsAvailable: data.sms_available };
    }
    await finishLogin(data.access_token!);
    return { status: "ok" };
  };

  const loginWithGoogle = async (code: string, codeVerifier: string): Promise<LoginOutcome> => {
    queryClient.clear();
    const { data } = await authApi.googleCallback(code, codeVerifier);
    if (data.mfa_required && data.mfa_token) {
      return { status: "mfa_required", mfaToken: data.mfa_token, methods: data.methods };
    }
    if (data.mfa_setup_required && data.mfa_token) {
      return { status: "mfa_setup_required", mfaToken: data.mfa_token, smsAvailable: data.sms_available };
    }
    await finishLogin(data.access_token!);
    return { status: "ok" };
  };

  const completeMfaLogin = async (accessToken: string) => {
    queryClient.clear();
    await finishLogin(accessToken);
  };

  const logout = async () => {
    try { await authApi.logout(); } catch {}
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
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        loginWithGoogle,
        completeMfaLogin,
        logout,
        register,
        refreshUser,
      }}
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
