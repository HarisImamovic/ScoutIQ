import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

const reports = [
  { player: "Lamine Yamal", scout: "Marcus Weber", status: "Approved", date: "2026-03-12", rating: 92 },
  { player: "Florian Wirtz", scout: "Carlos Mendez", status: "Submitted", date: "2026-03-10", rating: 90 },
  { player: "Endrick", scout: "James Wright", status: "Draft", date: "2026-03-08", rating: 85 },
  { player: "Gavi", scout: "Marcus Weber", status: "Submitted", date: "2026-03-05", rating: 87 },
];

const statusColors: Record<string, string> = {
  Draft: "",
  Submitted: "bg-secondary text-secondary-foreground",
  Approved: "bg-primary/10 text-primary border-0",
};

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold">Scouting Reports</h1>
          <p className="text-muted-foreground mt-1">Create and manage scouting reports</p>
        </div>
        <Button variant="hero" size="sm"><Plus className="w-4 h-4 mr-2" /> New Report</Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-2 text-muted-foreground font-medium">Player</th>
                  <th className="text-left py-3 px-2 text-muted-foreground font-medium hidden sm:table-cell">Scout</th>
                  <th className="text-left py-3 px-2 text-muted-foreground font-medium">Rating</th>
                  <th className="text-left py-3 px-2 text-muted-foreground font-medium">Status</th>
                  <th className="text-left py-3 px-2 text-muted-foreground font-medium hidden md:table-cell">Date</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((r, i) => (
                  <tr key={i} className="border-b border-border/50 hover:bg-muted/30 transition-colors cursor-pointer">
                    <td className="py-3 px-2 font-medium">{r.player}</td>
                    <td className="py-3 px-2 text-muted-foreground hidden sm:table-cell">{r.scout}</td>
                    <td className="py-3 px-2">
                      <span className="font-display font-bold text-primary">{r.rating}</span>
                    </td>
                    <td className="py-3 px-2">
                      <Badge variant={r.status === "Draft" ? "outline" : "default"} className={statusColors[r.status]}>
                        {r.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-2 text-muted-foreground hidden md:table-cell">{r.date}</td>
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
