import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
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
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/dashboard" element={<DashboardLayout />}>
              <Route index element={<ScoutDashboard />} />
              <Route path="player" element={<PlayerDashboard />} />
              <Route path="club" element={<ClubDashboard />} />
              <Route path="admin" element={<AdminDashboard />} />
              <Route path="players" element={<PlayersPage />} />
              <Route path="reports" element={<ReportsPage />} />
              <Route path="ai" element={<AIAssistantPage />} />
              <Route path="notifications" element={<NotificationsPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
