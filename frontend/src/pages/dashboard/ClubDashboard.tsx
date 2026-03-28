import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, FileText, Star, Trophy, XCircle, Building2, UserCheck, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const clubInfo = {
  name: "SC Freiburg",
  short: "SCF",
  color: "#CC0000",
  league: "Bundesliga",
  country: "Germany",
  founded: 1904,
  stadiumName: "Europa-Park Stadion",
  stadiumCapacity: 34700,
};

const stats = [
  { label: "Wins", value: "18", icon: Trophy, color: "text-primary" },
  { label: "Draws", value: "8", icon: Star, color: "text-yellow-500" },
  { label: "Losses", value: "6", icon: XCircle, color: "text-destructive" },
  { label: "Stadium Capacity", value: "34,700", icon: Building2, color: "text-secondary" },
  { label: "Squad Players", value: "28", icon: Users, color: "text-primary" },
  { label: "Active Scouts", value: "5", icon: UserCheck, color: "text-purple-500" },
];

const scouts = [
  { name: "Marcus Weber", reports: 12, rating: 4.8 },
  { name: "Carlos Mendez", reports: 9, rating: 4.5 },
  { name: "James Wright", reports: 7, rating: 4.2 },
];

const pendingReports = [
  { player: "Lamine Yamal", scout: "M. Weber", status: "Submitted", rating: 92 },
  { player: "Florian Wirtz", scout: "C. Mendez", status: "Submitted", rating: 90 },
  { player: "Endrick", scout: "J. Wright", status: "Draft", rating: 85 },
];

export default function ClubDashboard() {
  return (
    <div className="space-y-6">
      {/* Club header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center text-white font-display font-bold text-xl shadow-lg flex-shrink-0"
          style={{ backgroundColor: clubInfo.color }}
        >
          {clubInfo.short}
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold">{clubInfo.name}</h1>
          <p className="text-muted-foreground mt-0.5">
            {clubInfo.league} · {clubInfo.country} · Est. {clubInfo.founded}
          </p>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {stats.map((s) => (
          <Card key={s.label} className="hover-lift">
            <CardContent className="pt-5 pb-4">
              <s.icon className={`w-4 h-4 ${s.color} mb-2`} />
              <div className="text-xl font-display font-bold">{s.value}</div>
              <div className="text-xs text-muted-foreground mt-0.5 leading-tight">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Scout performance */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-lg font-display">Scout Performance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {scouts.map((s) => (
              <div key={s.name} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div>
                  <div className="font-medium text-sm">{s.name}</div>
                  <div className="text-xs text-muted-foreground">{s.reports} reports this season</div>
                </div>
                <Badge variant="secondary" className="bg-primary/10 text-primary border-0">
                  ★ {s.rating}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Pending reports */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-lg font-display">Pending Reports</CardTitle>
            <Link to="/dashboard/club-reports">
              <Button variant="ghost" size="sm" className="text-xs">
                View All <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingReports.map((r, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div>
                  <div className="font-medium text-sm">{r.player}</div>
                  <div className="text-xs text-muted-foreground">by {r.scout} · Rating: <span className="text-primary font-bold">{r.rating}</span></div>
                </div>
                <Badge
                  variant={r.status === "Submitted" ? "default" : "outline"}
                  className={r.status === "Submitted" ? "bg-secondary/10 text-secondary border-secondary/20" : ""}
                >
                  {r.status}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Stadium info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-display flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" /> Stadium
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1">
              <p className="font-semibold">{clubInfo.stadiumName}</p>
              <p className="text-sm text-muted-foreground mt-0.5">Capacity: {clubInfo.stadiumCapacity.toLocaleString()} seats</p>
            </div>
            <div className="flex gap-3">
              <div className="text-center p-3 rounded-lg bg-primary/10">
                <div className="font-display font-bold text-primary">76%</div>
                <div className="text-xs text-muted-foreground">Avg. Attendance</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <div className="font-display font-bold">26,400</div>
                <div className="text-xs text-muted-foreground">Avg. Fans</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
