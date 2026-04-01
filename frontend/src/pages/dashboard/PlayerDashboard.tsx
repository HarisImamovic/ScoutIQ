import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  TrendingUp, Eye, Target, BarChart3, Clock, Award,
  Ruler, Weight, Calendar, Zap, Shield, Activity, X
} from "lucide-react";

const player = {
  name: "Alex Johnson",
  age: 23,
  height: 183,
  weight: 77,
  position: "CAM",
  nationality: "England",
  club: "SC Freiburg",
  clubShort: "SCF",
  clubColor: "#CC0000",
  isGoalkeeper: false,
  hasClub: true,
  stats: {
    goals: 12,
    assists: 8,
    minutesPlayed: 1890,
    xg: 9.3,
    xa: 6.8,
    defensiveContributions: 24,
    tackles: 38,
    saves: 0,
    cleansheets: 0,
  },
};

const scoutingInterest = [
  { scout: "Marcus Weber", club: "Bayern Munich", time: "2 hours ago" },
  { scout: "Carlos Mendez", club: "Real Madrid", time: "1 day ago" },
  { scout: "James Wright", club: "Manchester City", time: "3 days ago" },
];

export default function PlayerDashboard() {
  const { stats, isGoalkeeper, hasClub } = player;

  const coreStats = [
    { label: "Goals", value: stats.goals, icon: Target, color: "text-primary", change: "+3" },
    { label: "Assists", value: stats.assists, icon: TrendingUp, color: "text-secondary", change: "+2" },
    { label: "Minutes", value: stats.minutesPlayed.toLocaleString(), icon: Clock, color: "text-primary", change: "" },
    { label: "xG", value: stats.xg.toFixed(1), icon: Zap, color: "text-yellow-500", change: "" },
    { label: "xA", value: stats.xa.toFixed(1), icon: Activity, color: "text-orange-500", change: "" },
    { label: "Def. Contribs.", value: stats.defensiveContributions, icon: Shield, color: "text-blue-500", change: "" },
    { label: "Tackles", value: stats.tackles, icon: BarChart3, color: "text-purple-500", change: "" },
    ...(isGoalkeeper
      ? [
          { label: "Saves", value: stats.saves, icon: Shield, color: "text-emerald-500", change: "" },
          { label: "Cleansheets", value: stats.cleansheets, icon: Award, color: "text-primary", change: "" },
        ]
      : []),
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold">Player Dashboard</h1>
          <p className="text-muted-foreground mt-1">Track your performance and profile</p>
        </div>
        <Badge variant="outline" className="self-start sm:self-auto text-sm px-3 py-1">
          {player.position} · {player.nationality}
        </Badge>
      </div>

      {/* Player identity */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            {/* Club logo or no-club placeholder */}
            <div className="flex-shrink-0">
              {hasClub ? (
                <div
                  className="w-20 h-20 rounded-2xl flex items-center justify-center text-white font-display font-bold text-xl shadow-lg"
                  style={{ backgroundColor: player.clubColor }}
                >
                  {player.clubShort}
                </div>
              ) : (
                <div className="relative w-20 h-20 rounded-2xl bg-muted/60 border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
                  <svg className="w-10 h-10 text-muted-foreground/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <X className="w-12 h-12 text-destructive/60 stroke-[1.5]" />
                  </div>
                </div>
              )}
            </div>

            <div className="flex-1 text-center sm:text-left">
              <h2 className="text-xl font-display font-bold">{player.name}</h2>
              <p className="text-muted-foreground text-sm mt-0.5">
                {hasClub ? player.club : "No Club — Free Agent"}
              </p>
              <div className="flex flex-wrap justify-center sm:justify-start gap-4 mt-4">
                <div className="flex items-center gap-1.5 text-sm">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span>{player.age} years old</span>
                </div>
                <div className="flex items-center gap-1.5 text-sm">
                  <Ruler className="w-4 h-4 text-muted-foreground" />
                  <span>{player.height} cm</span>
                </div>
                <div className="flex items-center gap-1.5 text-sm">
                  <Weight className="w-4 h-4 text-muted-foreground" />
                  <span>{player.weight} kg</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats grid */}
      <div>
        <h2 className="text-lg font-display font-semibold mb-3">Season Statistics</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {coreStats.map((s) => (
            <Card key={s.label} className="hover-lift">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center justify-between mb-1.5">
                  <s.icon className={`w-4 h-4 ${s.color}`} />
                  {s.change && (
                    <Badge variant="secondary" className="text-xs bg-primary/10 text-primary border-0">
                      {s.change}
                    </Badge>
                  )}
                </div>
                <div className="text-2xl font-display font-bold">{s.value}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile Completion */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-display flex items-center gap-2">
              <Award className="w-5 h-5 text-primary" /> Profile Completion
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Overall</span>
                <span className="font-semibold text-primary">72%</span>
              </div>
              <Progress value={72} className="h-2" />
            </div>
            {[
              { label: "Personal Info", value: 100 },
              { label: "Stats", value: 80 },
              { label: "Highlights", value: 40 },
              { label: "Documents", value: 60 },
            ].map((item) => (
              <div key={item.label}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">{item.label}</span>
                  <span>{item.value}%</span>
                </div>
                <Progress value={item.value} className="h-1.5" />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Scouting Interest */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-display flex items-center gap-2">
              <Eye className="w-5 h-5 text-secondary" /> Scouting Interest
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {scoutingInterest.map((item, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div>
                    <div className="font-medium text-sm">{item.scout}</div>
                    <div className="text-xs text-muted-foreground">{item.club}</div>
                  </div>
                  <span className="text-xs text-muted-foreground">{item.time}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
