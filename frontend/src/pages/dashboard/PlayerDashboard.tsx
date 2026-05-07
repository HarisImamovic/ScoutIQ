import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import {
  Target, TrendingUp, Clock, Eye, AlertCircle,
  Shield, Activity, Zap, Search,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { playerApi, type PlayerStats } from "@/api/player";
import { ClubLogo } from "@/components/ClubLogo";

const GK_POS = new Set(["GK"]);
const DEF_POS = new Set(["CB", "LB", "RB", "LWB", "RWB", "SW", "CDM"]);
const MID_POS = new Set(["CM", "CAM", "AM", "LM", "RM"]);

function get4thStat(position: string | null, stats: PlayerStats | null) {
  const pos = (position ?? "").toUpperCase();
  if (GK_POS.has(pos)) {
    return { icon: Shield, label: "Saves", value: stats?.saves ?? "—", color: "text-emerald-500" };
  }
  if (DEF_POS.has(pos)) {
    return { icon: Shield, label: "Def. Contribs", value: stats?.defensive_contributions ?? "—", color: "text-blue-500" };
  }
  if (MID_POS.has(pos)) {
    return { icon: Activity, label: "Chances Created", value: stats?.chances_created ?? "—", color: "text-orange-500" };
  }
  return { icon: Zap, label: "Dribbles", value: stats?.dribbles ?? "—", color: "text-yellow-500" };
}

function formatValue(v: number): string {
  if (v >= 1_000_000) return `€${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `€${(v / 1_000).toFixed(0)}K`;
  return `€${v}`;
}

function formatMonth(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diff / 3_600_000);
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export default function PlayerDashboard() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["player-dashboard"],
    queryFn: playerApi.getDashboard,
    staleTime: 30_000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" label="Loading dashboard…" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>Failed to load dashboard. Please refresh the page.</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!data.has_club) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold">Player Dashboard</h1>
          <p className="text-muted-foreground mt-1">Your scouting profile and statistics</p>
        </div>

        <div className="flex items-center justify-center py-16">
          <div className="text-center max-w-sm space-y-4">
            <div className="mx-auto w-20 h-20 rounded-2xl bg-muted flex items-center justify-center">
              <Search className="w-10 h-10 text-muted-foreground" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-display font-bold">Not assigned to a club yet</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                You haven't been assigned to a club. Your profile is still visible to scouts —
                they can discover and save you as a prospect at any time.
              </p>
            </div>
            <div className="pt-2">
              <Badge variant="outline" className="text-xs">
                {data.first_name} {data.last_name} · Free Agent
              </Badge>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const { club, stats, position, nationality, age, market_value, market_value_history, scouting_interest } = data;
  const fourth = get4thStat(position, stats);

  const chartData = market_value_history.map((h) => ({
    month: formatMonth(h.recorded_at),
    value: h.value,
  }));

  const statCards = [
    { icon: Clock, label: "Minutes", value: stats?.minutes_played?.toLocaleString() ?? "—", color: "text-primary" },
    { icon: Target, label: "Goals", value: stats?.goals ?? "—", color: "text-primary" },
    { icon: TrendingUp, label: "Assists", value: stats?.assists ?? "—", color: "text-secondary" },
    { icon: fourth.icon, label: fourth.label, value: fourth.value, color: fourth.color },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold">Player Dashboard</h1>
          <p className="text-muted-foreground mt-1">Your scouting profile and statistics</p>
        </div>
        {position && (
          <Badge variant="outline" className="self-start sm:self-auto text-sm px-3 py-1">
            {position}{nationality ? ` · ${nationality}` : ""}
          </Badge>
        )}
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <div className="flex-shrink-0">
              {club ? (
                <ClubLogo
                  name={club.name}
                  shortName={club.short_name}
                  logoUrl={club.logo_url}
                  primaryColor={club.primary_color}
                  size="xl"
                  className="shadow-lg"
                />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-muted flex items-center justify-center font-display font-bold text-muted-foreground text-xl">
                  —
                </div>
              )}
            </div>
            <div className="flex-1 text-center sm:text-left">
              <h2 className="text-xl font-display font-bold">{data.first_name} {data.last_name}</h2>
              <p className="text-muted-foreground text-sm mt-0.5">{club?.name}</p>
              {club?.league_name && (
                <p className="text-xs text-muted-foreground">{club.league_name} · {club.country}</p>
              )}
              <div className="flex flex-wrap justify-center sm:justify-start gap-4 mt-4">
                {age != null && (
                  <div className="text-sm text-muted-foreground">{age} years old</div>
                )}
                {market_value != null && (
                  <div className="text-sm font-medium">{formatValue(market_value)}</div>
                )}
                <Badge variant="secondary" className="text-xs capitalize">{data.status}</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {statCards.map((s) => (
          <Card key={s.label} className="hover-lift">
            <CardContent className="pt-5 pb-4">
              <s.icon className={`w-4 h-4 ${s.color} mb-1.5`} />
              <div className="text-2xl font-display font-bold">{s.value}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-display">Market Value Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
                No market value history available yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={192}>
                <LineChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={formatValue}
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={false}
                    tickLine={false}
                    width={56}
                  />
                  <Tooltip
                    formatter={(v: number) => [formatValue(v), "Market Value"]}
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    labelStyle={{ color: "hsl(var(--muted-foreground))" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-display flex items-center gap-2">
              <Eye className="w-5 h-5 text-secondary" /> Scouting Interest
            </CardTitle>
          </CardHeader>
          <CardContent>
            {scouting_interest.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-36 text-center gap-2">
                <Eye className="w-8 h-8 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">
                  No scout activity yet. Scouts who save or report on you will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {scouting_interest.map((item) => (
                  <div
                    key={item.scout_id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div>
                      <div className="font-medium text-sm">{item.scout_name}</div>
                      <div className="text-xs text-muted-foreground capitalize">{item.activity}</div>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0 ml-2">
                      {timeAgo(item.timestamp)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
