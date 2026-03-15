import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, FileText, Star, TrendingUp } from "lucide-react";

export default function ClubDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-display font-bold">Club Dashboard</h1>
        <p className="text-muted-foreground mt-1">Manage your scouting department</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Active Scouts", value: "8", icon: Users },
          { label: "Pending Reports", value: "5", icon: FileText },
          { label: "Top Prospects", value: "14", icon: Star },
          { label: "Pipeline Growth", value: "+23%", icon: TrendingUp },
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-display">Scout Performance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { name: "Marcus Weber", reports: 12, rating: 4.8 },
              { name: "Carlos Mendez", reports: 9, rating: 4.5 },
              { name: "James Wright", reports: 7, rating: 4.2 },
            ].map((s) => (
              <div key={s.name} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div>
                  <div className="font-medium text-sm">{s.name}</div>
                  <div className="text-xs text-muted-foreground">{s.reports} reports</div>
                </div>
                <Badge variant="secondary" className="bg-primary/10 text-primary border-0">
                  ★ {s.rating}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-display">Pending Reports</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { player: "Lamine Yamal", scout: "M. Weber", status: "Submitted" },
              { player: "Endrick", scout: "C. Mendez", status: "Draft" },
              { player: "Gavi", scout: "J. Wright", status: "Submitted" },
            ].map((r, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div>
                  <div className="font-medium text-sm">{r.player}</div>
                  <div className="text-xs text-muted-foreground">by {r.scout}</div>
                </div>
                <Badge variant={r.status === "Submitted" ? "default" : "outline"} className={r.status === "Submitted" ? "bg-secondary text-secondary-foreground" : ""}>
                  {r.status}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
