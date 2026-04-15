import { Outlet, Link, useLocation } from "react-router-dom";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  LayoutDashboard, Users, FileText, Bot, Bell, Settings,
  Shield, Menu, X, ChevronLeft, Bookmark, Video,
  DollarSign, Star, Building2, CheckSquare, LogOut
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { UserRole } from "@/contexts/RoleContext";
import { useAuth } from "@/contexts/AuthContext";

type NavItem = { icon: React.ElementType; label: string; path: string };

const navByRole: Record<UserRole, NavItem[]> = {
  player: [
    { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard/player" },
    { icon: Video, label: "Highlights", path: "/dashboard/highlights" },
    { icon: Bell, label: "Notifications", path: "/dashboard/notifications" },
    { icon: Settings, label: "Settings", path: "/dashboard/settings" },
  ],
  scout: [
    { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard/scout" },
    { icon: Users, label: "Players", path: "/dashboard/players" },
    { icon: Bookmark, label: "Saved Prospects", path: "/dashboard/saved-prospects" },
    { icon: FileText, label: "Reports", path: "/dashboard/reports" },
    { icon: Bot, label: "AI Assistant", path: "/dashboard/ai" },
    { icon: Bell, label: "Notifications", path: "/dashboard/notifications" },
    { icon: Settings, label: "Settings", path: "/dashboard/settings" },
  ],
  club_admin: [
    { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard/club" },
    { icon: Users, label: "Players", path: "/dashboard/players" },
    { icon: Star, label: "My Players", path: "/dashboard/my-players" },
    { icon: CheckSquare, label: "Reports", path: "/dashboard/club-reports" },
    { icon: DollarSign, label: "Salaries", path: "/dashboard/salaries" },
    { icon: Bell, label: "Notifications", path: "/dashboard/notifications" },
    { icon: Settings, label: "Settings", path: "/dashboard/settings" },
  ],
  global_admin: [
    { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard/admin" },
    { icon: Users, label: "Users", path: "/dashboard/admin/users" },
    { icon: Building2, label: "Clubs", path: "/dashboard/admin/clubs" },
    { icon: Star, label: "Players", path: "/dashboard/admin/players" },
    { icon: FileText, label: "Reports", path: "/dashboard/admin/reports" },
    { icon: Settings, label: "Settings", path: "/dashboard/settings" },
  ],
};

const roleLabels: Record<UserRole, string> = {
  player: "Player",
  scout: "Scout",
  club_admin: "Club Admin",
  global_admin: "Global Admin",
};

const roleInitials: Record<UserRole, string> = {
  player: "PL",
  scout: "SC",
  club_admin: "CA",
  global_admin: "GA",
};

const dashboardByRole: Record<UserRole, string> = {
  player: "/dashboard/player",
  scout: "/dashboard/scout",
  club_admin: "/dashboard/club",
  global_admin: "/dashboard/admin",
};

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { user, logout } = useAuth();

  const role = (user?.role as UserRole) ?? "scout";
  const userInitials = user
    ? `${user.first_name[0]}${user.last_name[0]}`.toUpperCase()
    : roleInitials[role];

  const navItems = navByRole[role];

  const isActive = (path: string) => {
    if (path === "/dashboard/scout" || path === "/dashboard/player" || path === "/dashboard/club" || path === "/dashboard/admin") {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Desktop sidebar */}
      <aside className={cn(
        "hidden md:flex flex-col border-r border-border bg-card transition-all duration-300 fixed top-0 left-0 h-full z-30",
        sidebarOpen ? "w-64" : "w-16"
      )}>
        <div className="h-16 flex items-center justify-between px-4 border-b border-border">
          {sidebarOpen && (
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <Shield className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-display font-bold">ScoutIQ</span>
            </Link>
          )}
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)} className="shrink-0">
            <ChevronLeft className={cn("w-4 h-4 transition-transform", !sidebarOpen && "rotate-180")} />
          </Button>
        </div>

        <nav className="flex-1 py-4 px-2 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                isActive(item.path)
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {sidebarOpen && <span>{item.label}</span>}
            </Link>
          ))}
        </nav>

      </aside>

      {/* Mobile bottom nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-card border-t border-border flex justify-around py-2">
        {navItems.slice(0, 5).map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={cn(
              "flex flex-col items-center gap-0.5 p-2 rounded-lg text-xs transition-colors",
              isActive(item.path) ? "text-primary" : "text-muted-foreground"
            )}
          >
            <item.icon className="w-5 h-5" />
            <span className="hidden xs:block">{item.label}</span>
          </Link>
        ))}
      </div>

      {/* Main content */}
      <div className={cn("flex-1 flex flex-col transition-all duration-300", sidebarOpen ? "md:ml-64" : "md:ml-16")}>
        <header className="h-16 border-b border-border bg-card/80 backdrop-blur-sm flex items-center justify-between px-4 md:px-6 sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileOpen(!mobileOpen)}>
              <Menu className="w-5 h-5" />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
              <Shield className="w-3.5 h-3.5" />
              {roleLabels[role]}
            </div>
            <ThemeToggle />
            <Link to="/dashboard/notifications">
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full" />
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => logout()}
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </Button>
            <Link to="/dashboard/settings" title="Settings">
              <Avatar className="w-8 h-8 cursor-pointer">
                <AvatarFallback className="bg-primary/20 text-primary text-sm font-semibold">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
            </Link>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 pb-20 md:pb-6">
          <Outlet />
        </main>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-64 bg-card border-r border-border p-4 animate-slide-in-left flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                  <Shield className="w-5 h-5 text-primary-foreground" />
                </div>
                <span className="font-display font-bold">ScoutIQ</span>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setMobileOpen(false)}>
                <X className="w-5 h-5" />
              </Button>
            </div>
            <nav className="space-y-1 flex-1">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                    isActive(item.path)
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </Link>
              ))}
            </nav>
          </aside>
        </div>
      )}
    </div>
  );
}
