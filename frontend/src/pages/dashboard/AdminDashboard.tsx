import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import {
  Building2, Users, FileText, Search, ChevronLeft, ChevronRight, Star, Shield, AlertCircle,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import client from "@/api/client";
import { calcAge, capitalize, formatDate, formatMarketValue } from "@/lib/formatters";

// ─── Types ────────────────────────────────────────────────────────────────────
interface ApiClub {
  id: string; name: string; country: string; league: string;
  scout_count: number; player_count: number; status: string; created_at: string;
}
interface ApiUser {
  id: string; email: string; first_name: string; last_name: string;
  role: string; club_name: string | null; status: string; created_at: string;
}
interface ApiPlayer {
  id: string; first_name: string; last_name: string; date_of_birth: string | null;
  nationality: string | null; position: string | null; club_name: string | null;
  market_value: number | null; status: string; created_at: string;
}
interface ApiReport {
  id: string; player_name: string; position: string; scout_name: string;
  rating: number; status: string; notes: string | null; created_at: string;
}

const PAGE_SIZE = 10;
const POSITIONS = ["GK", "CB", "LB", "RB", "CDM", "CM", "AM", "CAM", "LW", "RW", "CF", "ST"];

const STATUS_BADGE: Record<string, string> = {
  active:    "bg-primary/10 text-primary border-primary/20",
  pending:   "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  suspended: "bg-destructive/10 text-destructive border-destructive/20",
  inactive:  "bg-muted text-muted-foreground border-muted-foreground/20",
  injured:   "bg-destructive/10 text-destructive border-destructive/20",
};

const REPORT_BADGE: Record<string, string> = {
  draft:     "bg-muted text-muted-foreground",
  submitted: "bg-blue-500/20 text-blue-400",
  approved:  "bg-emerald-500/20 text-emerald-400",
  rejected:  "bg-destructive/20 text-destructive",
};

const ROLE_LABELS: Record<string, string> = {
  player: "Player", scout: "Scout", club_admin: "Club Admin", global_admin: "Global Admin",
};

const ROLE_COLORS: Record<string, string> = {
  player:       "bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400",
  scout:        "bg-purple-500/10 text-purple-600 border-purple-500/20 dark:text-purple-400",
  club_admin:   "bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400",
  global_admin: "bg-primary/10 text-primary border-primary/20",
};

// ─── Pager ────────────────────────────────────────────────────────────────────
function Pager({ page, total, onChange }: { page: number; total: number; onChange: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const from  = total === 0 ? 0 : page * PAGE_SIZE + 1;
  const to    = Math.min((page + 1) * PAGE_SIZE, total);
  return (
    <div className="flex items-center justify-between pt-3 border-t border-border mt-2">
      <p className="text-xs text-muted-foreground">
        {total === 0 ? "No results" : `${from}–${to} of ${total}`}
      </p>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => onChange(page - 1)} disabled={page === 0}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <span className="text-xs px-1">{page + 1} / {pages}</span>
        <Button variant="outline" size="sm" onClick={() => onChange(page + 1)} disabled={page >= pages - 1}>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

// ─── Chart config ─────────────────────────────────────────────────────────────
const chartConfig = {
  count: { label: "Reports", color: "hsl(var(--primary))" },
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const [clubs,   setClubs]   = useState<ApiClub[]>([]);
  const [users,   setUsers]   = useState<ApiUser[]>([]);
  const [players, setPlayers] = useState<ApiPlayer[]>([]);
  const [reports, setReports] = useState<ApiReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    Promise.all([
      client.get<{ items: ApiClub[];   total: number }>("/admin/clubs"),
      client.get<{ items: ApiUser[];   total: number }>("/admin/users"),
      client.get<{ items: ApiPlayer[]; total: number }>("/admin/players"),
      client.get<{ items: ApiReport[]; total: number }>("/admin/reports"),
    ])
      .then(([c, u, p, r]) => {
        setClubs(c.data.items);
        setUsers(u.data.items);
        setPlayers(p.data.items);
        setReports(r.data.items);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  // ── Summary ───────────────────────────────────────────────────────────────
  const activeScouts = useMemo(
    () => users.filter(u => u.role === "scout" && u.status === "active").length,
    [users],
  );

  // ── Chart: reports per month (last 12 months) ─────────────────────────────
  const chartData = useMemo(() => {
    const slots: { month: string; key: string; count: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - i);
      slots.push({
        month: d.toLocaleDateString("en-US", { month: "short" }),
        key:   `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
        count: 0,
      });
    }
    for (const r of reports) {
      const d = new Date(r.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const slot = slots.find(s => s.key === key);
      if (slot) slot.count++;
    }
    return slots;
  }, [reports]);

  // ── Clubs tab ─────────────────────────────────────────────────────────────
  const [clubSearch, setClubSearch] = useState("");
  const [clubStatus, setClubStatus] = useState("all");
  const [clubPage,   setClubPage]   = useState(0);
  const filteredClubs = useMemo(() =>
    clubs.filter(c => {
      const q = clubSearch.toLowerCase();
      return (
        (!q || c.name.toLowerCase().includes(q) || c.country.toLowerCase().includes(q)) &&
        (clubStatus === "all" || c.status === clubStatus)
      );
    }), [clubs, clubSearch, clubStatus]);
  useEffect(() => setClubPage(0), [clubSearch, clubStatus]);
  const pagedClubs = filteredClubs.slice(clubPage * PAGE_SIZE, (clubPage + 1) * PAGE_SIZE);

  // ── Users tab ─────────────────────────────────────────────────────────────
  const [userSearch, setUserSearch] = useState("");
  const [userRole,   setUserRole]   = useState("all");
  const [userStatus, setUserStatus] = useState("all");
  const [userPage,   setUserPage]   = useState(0);
  const filteredUsers = useMemo(() =>
    users.filter(u => {
      const q    = userSearch.toLowerCase();
      const name = `${u.first_name} ${u.last_name}`.toLowerCase();
      return (
        (!q || name.includes(q) || u.email.toLowerCase().includes(q)) &&
        (userRole   === "all" || u.role   === userRole) &&
        (userStatus === "all" || u.status === userStatus)
      );
    }), [users, userSearch, userRole, userStatus]);
  useEffect(() => setUserPage(0), [userSearch, userRole, userStatus]);
  const pagedUsers = filteredUsers.slice(userPage * PAGE_SIZE, (userPage + 1) * PAGE_SIZE);

  // ── Players tab ───────────────────────────────────────────────────────────
  const [playerSearch, setPlayerSearch] = useState("");
  const [playerPos,    setPlayerPos]    = useState("all");
  const [playerStatus, setPlayerStatus] = useState("all");
  const [playerPage,   setPlayerPage]   = useState(0);
  const filteredPlayers = useMemo(() =>
    players.filter(p => {
      const q    = playerSearch.toLowerCase();
      const name = `${p.first_name} ${p.last_name}`.toLowerCase();
      return (
        (!q || name.includes(q) || (p.club_name ?? "").toLowerCase().includes(q) || (p.nationality ?? "").toLowerCase().includes(q)) &&
        (playerPos    === "all" || p.position === playerPos) &&
        (playerStatus === "all" || p.status   === playerStatus)
      );
    }), [players, playerSearch, playerPos, playerStatus]);
  useEffect(() => setPlayerPage(0), [playerSearch, playerPos, playerStatus]);
  const pagedPlayers = filteredPlayers.slice(playerPage * PAGE_SIZE, (playerPage + 1) * PAGE_SIZE);

  // ── Reports tab ───────────────────────────────────────────────────────────
  const [reportSearch, setReportSearch] = useState("");
  const [reportStatus, setReportStatus] = useState("all");
  const [reportPage,   setReportPage]   = useState(0);
  const filteredReports = useMemo(() =>
    reports.filter(r => {
      const q = reportSearch.toLowerCase();
      return (
        (!q || r.player_name.toLowerCase().includes(q) || r.scout_name.toLowerCase().includes(q)) &&
        (reportStatus === "all" || r.status === reportStatus)
      );
    }), [reports, reportSearch, reportStatus]);
  useEffect(() => setReportPage(0), [reportSearch, reportStatus]);
  const pagedReports = filteredReports.slice(reportPage * PAGE_SIZE, (reportPage + 1) * PAGE_SIZE);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Spinner size="lg" label="Loading dashboard…" />
    </div>
  );
  if (error) return (
    <div className="flex items-center justify-center h-64">
      <Alert variant="destructive" className="max-w-md">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>Failed to load dashboard. Please refresh the page.</AlertDescription>
      </Alert>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-display font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-1">Platform overview and analytics</p>
      </div>

      {/* ── Summary cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Clubs",   value: clubs.length,   icon: Building2 },
          { label: "Total Users",   value: users.length,   icon: Users },
          { label: "Active Scouts", value: activeScouts,   icon: Shield },
          { label: "Total Reports", value: reports.length, icon: FileText },
        ].map((s) => (
          <Card key={s.label} className="hover-lift">
            <CardContent className="pt-6">
              <s.icon className="w-5 h-5 text-primary mb-2" />
              <div className="text-2xl font-display font-bold">{s.value}</div>
              <div className="text-sm text-muted-foreground">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Reports per month chart ── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Reports per Month</CardTitle>
          <CardDescription>Scouting reports submitted over the last 12 months</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[220px] w-full">
            <AreaChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="fillCount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="var(--color-count)" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="var(--color-count)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
              <XAxis
                dataKey="month"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area
                type="monotone"
                dataKey="count"
                stroke="var(--color-count)"
                fill="url(#fillCount)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* ── Data tables ── */}
      <Tabs defaultValue="clubs">
        <TabsList>
          <TabsTrigger value="clubs">Clubs ({clubs.length})</TabsTrigger>
          <TabsTrigger value="users">Users ({users.length})</TabsTrigger>
          <TabsTrigger value="players">Players ({players.length})</TabsTrigger>
          <TabsTrigger value="reports">Reports ({reports.length})</TabsTrigger>
        </TabsList>

        {/* ─ Clubs ─ */}
        <TabsContent value="clubs" className="space-y-3 mt-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={clubSearch} onChange={e => setClubSearch(e.target.value)}
                placeholder="Search by name or country…" className="pl-10 bg-muted/50"
              />
            </div>
            <Select value={clubStatus} onValueChange={setClubStatus}>
              <SelectTrigger className="w-full sm:w-40 bg-muted/50"><SelectValue placeholder="All Statuses" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Card><CardContent className="pt-4">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-border">
                  {["Club", "Country", "League", "Scouts", "Players", "Status"].map(h => (
                    <th key={h} className="text-left py-3 px-2 text-muted-foreground font-medium whitespace-nowrap">{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {pagedClubs.length === 0
                    ? <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">No clubs found</td></tr>
                    : pagedClubs.map(c => (
                      <tr key={c.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-2 font-medium">{c.name}</td>
                        <td className="py-3 px-2 text-muted-foreground">{c.country}</td>
                        <td className="py-3 px-2 text-muted-foreground">{c.league || "—"}</td>
                        <td className="py-3 px-2">{c.scout_count}</td>
                        <td className="py-3 px-2">{c.player_count}</td>
                        <td className="py-3 px-2">
                          <Badge variant="outline" className={STATUS_BADGE[c.status] ?? ""}>{capitalize(c.status)}</Badge>
                        </td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>
            </div>
            <Pager page={clubPage} total={filteredClubs.length} onChange={setClubPage} />
          </CardContent></Card>
        </TabsContent>

        {/* ─ Users ─ */}
        <TabsContent value="users" className="space-y-3 mt-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={userSearch} onChange={e => setUserSearch(e.target.value)}
                placeholder="Search by name or email…" className="pl-10 bg-muted/50"
              />
            </div>
            <Select value={userRole} onValueChange={setUserRole}>
              <SelectTrigger className="w-full sm:w-44 bg-muted/50"><SelectValue placeholder="All Roles" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="scout">Scout</SelectItem>
                <SelectItem value="player">Player</SelectItem>
                <SelectItem value="club_admin">Club Admin</SelectItem>
                <SelectItem value="global_admin">Global Admin</SelectItem>
              </SelectContent>
            </Select>
            <Select value={userStatus} onValueChange={setUserStatus}>
              <SelectTrigger className="w-full sm:w-40 bg-muted/50"><SelectValue placeholder="All Statuses" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Card><CardContent className="pt-4">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-border">
                  {["Name", "Email", "Role", "Club", "Status"].map(h => (
                    <th key={h} className="text-left py-3 px-2 text-muted-foreground font-medium whitespace-nowrap">{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {pagedUsers.length === 0
                    ? <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">No users found</td></tr>
                    : pagedUsers.map(u => (
                      <tr key={u.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-2 font-medium">{u.first_name} {u.last_name}</td>
                        <td className="py-3 px-2 text-muted-foreground">{u.email}</td>
                        <td className="py-3 px-2">
                          <Badge variant="outline" className={`text-xs ${ROLE_COLORS[u.role] ?? ""}`}>{ROLE_LABELS[u.role] ?? u.role}</Badge>
                        </td>
                        <td className="py-3 px-2 text-muted-foreground">{u.club_name ?? "—"}</td>
                        <td className="py-3 px-2">
                          <Badge variant="outline" className={STATUS_BADGE[u.status] ?? ""}>{capitalize(u.status)}</Badge>
                        </td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>
            </div>
            <Pager page={userPage} total={filteredUsers.length} onChange={setUserPage} />
          </CardContent></Card>
        </TabsContent>

        {/* ─ Players ─ */}
        <TabsContent value="players" className="space-y-3 mt-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={playerSearch} onChange={e => setPlayerSearch(e.target.value)}
                placeholder="Search by name, club or nationality…" className="pl-10 bg-muted/50"
              />
            </div>
            <Select value={playerPos} onValueChange={setPlayerPos}>
              <SelectTrigger className="w-full sm:w-40 bg-muted/50"><SelectValue placeholder="All Positions" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Positions</SelectItem>
                {POSITIONS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={playerStatus} onValueChange={setPlayerStatus}>
              <SelectTrigger className="w-full sm:w-40 bg-muted/50"><SelectValue placeholder="All Statuses" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="injured">Injured</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Card><CardContent className="pt-4">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-border">
                  {["Player", "Pos", "Age", "Club", "Value", "Status"].map(h => (
                    <th key={h} className="text-left py-3 px-2 text-muted-foreground font-medium whitespace-nowrap">{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {pagedPlayers.length === 0
                    ? <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">No players found</td></tr>
                    : pagedPlayers.map(p => (
                      <tr key={p.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-2">
                          <div className="font-medium">{p.first_name} {p.last_name}</div>
                          <div className="text-xs text-muted-foreground">{p.nationality ?? "—"}</div>
                        </td>
                        <td className="py-3 px-2"><Badge variant="outline" className="text-xs">{p.position ?? "—"}</Badge></td>
                        <td className="py-3 px-2 text-muted-foreground">{calcAge(p.date_of_birth) ?? "—"}</td>
                        <td className="py-3 px-2 text-muted-foreground">{p.club_name ?? "—"}</td>
                        <td className="py-3 px-2 font-display font-bold text-primary text-xs">{formatMarketValue(p.market_value, 0)}</td>
                        <td className="py-3 px-2">
                          <Badge variant="outline" className={STATUS_BADGE[p.status] ?? ""}>{capitalize(p.status)}</Badge>
                        </td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>
            </div>
            <Pager page={playerPage} total={filteredPlayers.length} onChange={setPlayerPage} />
          </CardContent></Card>
        </TabsContent>

        {/* ─ Reports ─ */}
        <TabsContent value="reports" className="space-y-3 mt-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={reportSearch} onChange={e => setReportSearch(e.target.value)}
                placeholder="Search by player or scout…" className="pl-10 bg-muted/50"
              />
            </div>
            <Select value={reportStatus} onValueChange={setReportStatus}>
              <SelectTrigger className="w-full sm:w-44 bg-muted/50"><SelectValue placeholder="All Statuses" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="submitted">Submitted</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Card><CardContent className="pt-4">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-border">
                  {["Player", "Pos", "Scout", "Rating", "Status", "Date"].map(h => (
                    <th key={h} className="text-left py-3 px-2 text-muted-foreground font-medium whitespace-nowrap">{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {pagedReports.length === 0
                    ? <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">No reports found</td></tr>
                    : pagedReports.map(r => (
                      <tr key={r.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-2 font-medium">{r.player_name}</td>
                        <td className="py-3 px-2"><Badge variant="outline" className="text-xs">{r.position}</Badge></td>
                        <td className="py-3 px-2 text-muted-foreground">{r.scout_name}</td>
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-1">
                            <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                            <span className="font-semibold text-primary">{r.rating}</span>
                          </div>
                        </td>
                        <td className="py-3 px-2">
                          <Badge className={`text-xs ${REPORT_BADGE[r.status] ?? ""}`}>{capitalize(r.status)}</Badge>
                        </td>
                        <td className="py-3 px-2 text-muted-foreground whitespace-nowrap">{formatDate(r.created_at)}</td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>
            </div>
            <Pager page={reportPage} total={filteredReports.length} onChange={setReportPage} />
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
