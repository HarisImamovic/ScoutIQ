import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Users, Shield, BarChart3 } from "lucide-react";

export default function AdminDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-display font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-1">Platform overview and management</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Clubs", value: "42", icon: Building2 },
          { label: "Total Users", value: "1,284", icon: Users },
          { label: "Active Scouts", value: "186", icon: Shield },
          { label: "Reports/Month", value: "324", icon: BarChart3 },
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

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-display">Clubs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-2 text-muted-foreground font-medium">Club</th>
                  <th className="text-left py-3 px-2 text-muted-foreground font-medium">Country</th>
                  <th className="text-left py-3 px-2 text-muted-foreground font-medium">Scouts</th>
                  <th className="text-left py-3 px-2 text-muted-foreground font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { name: "Bayern Munich", country: "Germany", scouts: 12, status: "Active" },
                  { name: "FC Barcelona", country: "Spain", scouts: 15, status: "Active" },
                  { name: "Manchester City", country: "England", scouts: 10, status: "Active" },
                  { name: "PSG", country: "France", scouts: 8, status: "Pending" },
                ].map((c) => (
                  <tr key={c.name} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-2 font-medium">{c.name}</td>
                    <td className="py-3 px-2 text-muted-foreground">{c.country}</td>
                    <td className="py-3 px-2">{c.scouts}</td>
                    <td className="py-3 px-2">
                      <Badge variant={c.status === "Active" ? "default" : "outline"}
                        className={c.status === "Active" ? "bg-primary/10 text-primary border-0" : ""}>
                        {c.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
