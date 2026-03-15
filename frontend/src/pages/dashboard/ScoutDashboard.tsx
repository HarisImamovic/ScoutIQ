import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Bookmark, FileText, Bot, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const recentPlayers = [
  { name: "Lamine Yamal", pos: "RW", age: 18, club: "FC Barcelona", rating: 92 },
  { name: "Florian Wirtz", pos: "AM", age: 20, club: "Bayer Leverkusen", rating: 90 },
  { name: "Mathys Tel", pos: "CF", age: 19, club: "Bayern Munich", rating: 84 },
];

const savedProspects = [
  { name: "Endrick", pos: "ST", age: 18, club: "Real Madrid" },
  { name: "Gavi", pos: "CM", age: 21, club: "FC Barcelona" },
];

export default function ScoutDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-display font-bold">Scout Dashboard</h1>
        <p className="text-muted-foreground mt-1">Discover and evaluate talent</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Players Viewed", value: "148", icon: Eye },
          { label: "Saved Prospects", value: "23", icon: Bookmark },
          { label: "Reports Written", value: "12", icon: FileText },
          { label: "AI Queries", value: "56", icon: Bot },
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
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-display">Recently Viewed</CardTitle>
            <Link to="/dashboard/players">
              <Button variant="ghost" size="sm">View All <ArrowRight className="w-4 h-4 ml-1" /></Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentPlayers.map((p) => (
              <div key={p.name} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center font-display font-bold text-primary text-sm">
                    {p.rating}
                  </div>
                  <div>
                    <div className="font-medium text-sm">{p.name}</div>
                    <div className="text-xs text-muted-foreground">{p.club}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">{p.pos}</Badge>
                  <span className="text-xs text-muted-foreground">{p.age}y</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-display flex items-center gap-2">
              <Bookmark className="w-5 h-5 text-secondary" /> Saved Prospects
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {savedProspects.map((p) => (
              <div key={p.name} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div>
                  <div className="font-medium text-sm">{p.name}</div>
                  <div className="text-xs text-muted-foreground">{p.club}</div>
                </div>
                <Badge variant="outline">{p.pos}</Badge>
              </div>
            ))}
            <Link to="/dashboard/ai">
              <Button variant="electric" size="sm" className="w-full mt-2">
                <Bot className="w-4 h-4 mr-2" /> Ask AI for Suggestions
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
