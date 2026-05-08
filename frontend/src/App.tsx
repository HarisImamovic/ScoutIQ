import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import axios from "axios";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { RoleProvider } from "@/contexts/RoleContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { useAuth } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import type { ReactNode } from "react";

import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import GoogleCallbackPage from "./pages/GoogleCallbackPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import NotFound from "./pages/NotFound";
import DashboardLayout from "./components/DashboardLayout";

import ScoutDashboard from "./pages/dashboard/ScoutDashboard";
import PlayerDashboard from "./pages/dashboard/PlayerDashboard";
import ClubDashboard from "./pages/dashboard/ClubDashboard";
import AdminDashboard from "./pages/dashboard/AdminDashboard";
import PlayersPage from "./pages/dashboard/PlayersPage";
import ReportsPage from "./pages/dashboard/ReportsPage";
import AIAssistantPage from "./pages/dashboard/AIAssistantPage";
import NotificationsPage from "./pages/dashboard/NotificationsPage";
import SettingsPage from "./pages/dashboard/SettingsPage";

import HighlightsPage from "./pages/dashboard/player/HighlightsPage";
import SavedProspectsPage from "./pages/dashboard/scout/SavedProspectsPage";
import SalariesPage from "./pages/dashboard/club/SalariesPage";
import ClubReportsPage from "./pages/dashboard/club/ClubReportsPage";
import MyPlayersPage from "./pages/dashboard/club/MyPlayersPage";

import AdminUsersPage from "./pages/dashboard/admin/AdminUsersPage";
import AdminClubsPage from "./pages/dashboard/admin/AdminClubsPage";
import AdminLeaguesPage from "./pages/dashboard/admin/AdminLeaguesPage";
import AdminPlayersPage from "./pages/dashboard/admin/AdminPlayersPage";
import AdminReportsPage from "./pages/dashboard/admin/AdminReportsPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        if (axios.isAxiosError(error) && error.response && error.response.status < 500) {
          return false;
        }
        return failureCount < 3;
      },
    },
  },
});

const dashboardByRole: Record<string, string> = {
  player: "/dashboard/player",
  scout: "/dashboard/scout",
  club_admin: "/dashboard/club",
  global_admin: "/dashboard/admin",
};

function DashboardIndex() {
  const { user } = useAuth();
  const dest = dashboardByRole[user?.role ?? ""] ?? "/dashboard/scout";
  return <Navigate to={dest} replace />;
}

function RoleRoute({ allowedRoles, children }: { allowedRoles: string[]; children: ReactNode }) {
  const { user } = useAuth();
  if (!user || !allowedRoles.includes(user.role)) {
    return <Navigate to={dashboardByRole[user?.role ?? ""] ?? "/dashboard/scout"} replace />;
  }
  return <>{children}</>;
}

const App = () => (
  <ThemeProvider>
    <QueryClientProvider client={queryClient}>
      <RoleProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AuthProvider>
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                <Route path="/auth/google/callback" element={<GoogleCallbackPage />} />
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <DashboardLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<DashboardIndex />} />

                  <Route path="scout" element={<ScoutDashboard />} />
                  <Route path="player" element={<PlayerDashboard />} />
                  <Route path="club" element={<ClubDashboard />} />
                  <Route path="admin" element={<RoleRoute allowedRoles={["global_admin"]}><AdminDashboard /></RoleRoute>} />

                  <Route path="players" element={<PlayersPage />} />
                  <Route path="saved-prospects" element={<SavedProspectsPage />} />
                  <Route path="reports" element={<ReportsPage />} />
                  <Route path="ai" element={<AIAssistantPage />} />

                  <Route path="highlights" element={<HighlightsPage />} />

                  <Route path="my-players" element={<MyPlayersPage />} />
                  <Route path="club-reports" element={<ClubReportsPage />} />
                  <Route path="salaries" element={<SalariesPage />} />

                  <Route path="admin/users" element={<RoleRoute allowedRoles={["global_admin"]}><AdminUsersPage /></RoleRoute>} />
                  <Route path="admin/clubs" element={<RoleRoute allowedRoles={["global_admin"]}><AdminClubsPage /></RoleRoute>} />
                  <Route path="admin/leagues" element={<RoleRoute allowedRoles={["global_admin"]}><AdminLeaguesPage /></RoleRoute>} />
                  <Route path="admin/players" element={<RoleRoute allowedRoles={["global_admin"]}><AdminPlayersPage /></RoleRoute>} />
                  <Route path="admin/reports" element={<RoleRoute allowedRoles={["global_admin"]}><AdminReportsPage /></RoleRoute>} />

                  <Route path="notifications" element={<NotificationsPage />} />
                  <Route path="settings" element={<SettingsPage />} />
                </Route>
                <Route path="*" element={<NotFound />} />
              </Routes>
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </RoleProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
