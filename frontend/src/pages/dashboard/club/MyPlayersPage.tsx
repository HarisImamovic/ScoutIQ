import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Search, Filter, Eye, Ruler, Scale, Flag, Target, TrendingUp,
} from "lucide-react";

interface Player {
  id: number;
  name: string;
  pos: string;
  age: number;
  country: string;
  goals: number;
  assists: number;
  rating: number;
  height: number;
  weight: number;
  xg: number;
  xa: number;
  minutesPlayed: number;
  status: "Active" | "Injured" | "On Loan";
}

const squad: Player[] = [
  { id: 1, name: "Vincenzo Grifo", pos: "LW", age: 31, country: "Germany", goals: 9, assists: 5, rating: 81, height: 176, weight: 71, xg: 7.2, xa: 4.8, minutesPlayed: 1980, status: "Active" },
  { id: 2, name: "Christian Günter", pos: "LB", age: 31, country: "Germany", goals: 1, assists: 4, rating: 78, height: 181, weight: 77, xg: 0.8, xa: 3.5, minutesPlayed: 2340, status: "Active" },
  { id: 3, name: "Lucas Höler", pos: "CF", age: 30, country: "Germany", goals: 7, assists: 3, rating: 76, height: 186, weight: 82, xg: 6.1, xa: 2.4, minutesPlayed: 1620, status: "Active" },
  { id: 4, name: "Maximilian Eggestein", pos: "CM", age: 27, country: "Germany", goals: 3, assists: 7, rating: 79, height: 182, weight: 78, xg: 2.4, xa: 5.9, minutesPlayed: 2160, status: "Active" },
  { id: 5, name: "Daniel-Kofi Kyereh", pos: "AM", age: 28, country: "Ghana", goals: 2, assists: 2, rating: 75, height: 173, weight: 70, xg: 1.8, xa: 1.9, minutesPlayed: 720, status: "Injured" },
  { id: 6, name: "Luca Waldschmidt", pos: "ST", age: 28, country: "Germany", goals: 4, assists: 1, rating: 74, height: 180, weight: 76, xg: 3.6, xa: 0.9, minutesPlayed: 900, status: "On Loan" },
];

const statusColors: Record<Player["status"], string> = {
  Active: "bg-primary/10 text-primary border-primary/20",
  Injured: "bg-destructive/10 text-destructive border-destructive/20",
  "On Loan": "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
};

export default function MyPlayersPage() {
  const [search, setSearch] = useState("");
  const [posFilter, setPosFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewPlayer, setViewPlayer] = useState<Player | null>(null);

  const filtered = squad.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchPos = posFilter === "all" || p.pos === posFilter;
    const matchStatus = statusFilter === "all" || p.status === statusFilter;
    return matchSearch && matchPos && matchStatus;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-display font-bold">My Players</h1>
        <p className="text-muted-foreground mt-1">SC Freiburg squad overview</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search players..."
            className="pl-10 bg-muted/50"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={posFilter} onValueChange={setPosFilter}>
          <SelectTrigger className="w-full sm:w-44 bg-muted/50">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Position" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Positions</SelectItem>
            {["GK", "CB", "LB", "RB", "CDM", "CM", "AM", "LW", "RW", "CF", "ST"].map((p) => (
              <SelectItem key={p} value={p}>{p}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-44 bg-muted/50">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="Active">Active</SelectItem>
            <SelectItem value="Injured">Injured</SelectItem>
            <SelectItem value="On Loan">On Loan</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <p className="text-sm text-muted-foreground">{filtered.length} players</p>

      {/* Players grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((p) => (
          <Card key={p.id} className="hover-lift group">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between mb-4">
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center font-display font-bold text-primary text-xl">
                  {p.rating}
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge variant="outline" className="text-xs">{p.pos}</Badge>
                  <Badge variant="outline" className={`text-xs ${statusColors[p.status]}`}>{p.status}</Badge>
                </div>
              </div>
              <h3 className="font-display font-semibold text-lg">{p.name}</h3>
              <p className="text-sm text-muted-foreground">{p.country} · Age {p.age}</p>
              <div className="flex gap-4 mt-4 text-sm">
                <div><span className="font-semibold text-primary">{p.goals}</span> <span className="text-muted-foreground">goals</span></div>
                <div><span className="font-semibold text-secondary">{p.assists}</span> <span className="text-muted-foreground">assists</span></div>
                <div><span className="font-semibold text-muted-foreground">{p.minutesPlayed.toLocaleString()}</span> <span className="text-muted-foreground">min</span></div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-4 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => setViewPlayer(p)}
              >
                <Eye className="w-4 h-4 mr-2" /> View Profile
              </Button>
            </CardContent>
          </Card>
        ))}

        {filtered.length === 0 && (
          <div className="col-span-full text-center py-16 text-muted-foreground">
            <Search className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>No players found</p>
          </div>
        )}
      </div>

      {/* View Profile modal */}
      <Dialog open={!!viewPlayer} onOpenChange={() => setViewPlayer(null)}>
        {viewPlayer && (
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-display text-xl">{viewPlayer.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-5 py-2">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center font-display font-bold text-primary text-2xl">
                  {viewPlayer.rating}
                </div>
                <div>
                  <p className="font-semibold">SC Freiburg</p>
                  <p className="text-sm text-muted-foreground">Bundesliga · {viewPlayer.country}</p>
                  <div className="flex gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">{viewPlayer.pos}</Badge>
                    <Badge variant="outline" className={`text-xs ${statusColors[viewPlayer.status]}`}>{viewPlayer.status}</Badge>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Physical</p>
                <div className="grid grid-cols-3 gap-3">
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                    <Ruler className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <div className="text-sm font-semibold">{viewPlayer.height} cm</div>
                      <div className="text-xs text-muted-foreground">Height</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                    <Scale className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <div className="text-sm font-semibold">{viewPlayer.weight} kg</div>
                      <div className="text-xs text-muted-foreground">Weight</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                    <Flag className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <div className="text-sm font-semibold">{viewPlayer.country}</div>
                      <div className="text-xs text-muted-foreground">Nation</div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Season Stats</p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { icon: Target, label: "Goals", value: viewPlayer.goals, color: "text-primary" },
                    { icon: TrendingUp, label: "Assists", value: viewPlayer.assists, color: "text-secondary" },
                    { icon: Target, label: "xG", value: viewPlayer.xg.toFixed(1), color: "text-yellow-500" },
                    { icon: TrendingUp, label: "xA", value: viewPlayer.xa.toFixed(1), color: "text-orange-500" },
                  ].map((s) => (
                    <div key={s.label} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                      <s.icon className={`w-4 h-4 ${s.color}`} />
                      <div>
                        <div className={`text-lg font-display font-bold ${s.color}`}>{s.value}</div>
                        <div className="text-xs text-muted-foreground">{s.label}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-3 rounded-lg bg-muted/50 flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Minutes Played</span>
                <span className="font-display font-bold">{viewPlayer.minutesPlayed.toLocaleString()}</span>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
