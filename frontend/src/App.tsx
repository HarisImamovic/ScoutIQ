import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { RoleProvider } from "@/contexts/RoleContext";

import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
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
import AdminPlayersPage from "./pages/dashboard/admin/AdminPlayersPage";
import AdminReportsPage from "./pages/dashboard/admin/AdminReportsPage";

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider>
    <QueryClientProvider client={queryClient}>
      <RoleProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/dashboard" element={<DashboardLayout />}>
                {/* Default redirect to scout dashboard */}
                <Route index element={<Navigate to="/dashboard/scout" replace />} />

                {/* Role dashboards */}
                <Route path="scout" element={<ScoutDashboard />} />
                <Route path="player" element={<PlayerDashboard />} />
                <Route path="club" element={<ClubDashboard />} />
                <Route path="admin" element={<AdminDashboard />} />

                {/* Scout pages */}
                <Route path="players" element={<PlayersPage />} />
                <Route path="saved-prospects" element={<SavedProspectsPage />} />
                <Route path="reports" element={<ReportsPage />} />
                <Route path="ai" element={<AIAssistantPage />} />

                {/* Player pages */}
                <Route path="highlights" element={<HighlightsPage />} />

                {/* Club Admin pages */}
                <Route path="my-players" element={<MyPlayersPage />} />
                <Route path="club-reports" element={<ClubReportsPage />} />
                <Route path="salaries" element={<SalariesPage />} />

                {/* Global Admin pages */}
                <Route path="admin/users" element={<AdminUsersPage />} />
                <Route path="admin/clubs" element={<AdminClubsPage />} />
                <Route path="admin/players" element={<AdminPlayersPage />} />
                <Route path="admin/reports" element={<AdminReportsPage />} />

                {/* Shared pages */}
                <Route path="notifications" element={<NotificationsPage />} />
                <Route path="settings" element={<SettingsPage />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </RoleProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
