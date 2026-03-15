import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, Eye, Target, BarChart3, Award, Clock } from "lucide-react";

const stats = [
  { label: "Goals", value: "12", icon: Target, change: "+3" },
  { label: "Assists", value: "8", icon: TrendingUp, change: "+2" },
  { label: "Matches", value: "24", icon: BarChart3, change: "" },
  { label: "Minutes", value: "1,890", icon: Clock, change: "" },
];

export default function PlayerDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-display font-bold">Player Dashboard</h1>
        <p className="text-muted-foreground mt-1">Track your performance and profile</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Card key={s.label} className="hover-lift">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <s.icon className="w-5 h-5 text-primary" />
                {s.change && <Badge variant="secondary" className="text-xs bg-primary/10 text-primary border-0">{s.change}</Badge>}
              </div>
              <div className="text-2xl font-display font-bold">{s.value}</div>
              <div className="text-sm text-muted-foreground">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
              { label: "Videos", value: 40 },
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

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-display flex items-center gap-2">
              <Eye className="w-5 h-5 text-secondary" /> Scouting Interest
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { scout: "Marcus Weber", club: "Bayern Munich", time: "2 hours ago" },
                { scout: "Carlos Mendez", club: "Real Madrid", time: "1 day ago" },
                { scout: "James Wright", club: "Manchester City", time: "3 days ago" },
              ].map((item, i) => (
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
