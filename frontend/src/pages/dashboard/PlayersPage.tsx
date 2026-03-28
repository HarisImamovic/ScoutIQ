import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Filter, Eye, Bookmark, BookmarkCheck, ChevronLeft, ChevronRight, Flag, MapPin, Ruler, Scale, Target, TrendingUp } from "lucide-react";
import { useRole } from "@/contexts/RoleContext";

interface Player {
  id: number;
  name: string;
  pos: string;
  age: number;
  country: string;
  club: string;
  league: string;
  goals: number;
  assists: number;
  rating: number;
  height: number;
  weight: number;
  xg: number;
  xa: number;
  salary: number;
}

const allPlayers: Player[] = [
  { id: 1, name: "Lamine Yamal", pos: "RW", age: 18, country: "Spain", club: "FC Barcelona", league: "La Liga", goals: 12, assists: 8, rating: 92, height: 180, weight: 72, xg: 9.8, xa: 7.1, salary: 85000 },
  { id: 2, name: "Florian Wirtz", pos: "AM", age: 20, country: "Germany", club: "B. Leverkusen", league: "Bundesliga", goals: 15, assists: 12, rating: 90, height: 176, weight: 70, xg: 11.2, xa: 9.8, salary: 95000 },
  { id: 3, name: "Endrick", pos: "ST", age: 18, country: "Brazil", club: "Real Madrid", league: "La Liga", goals: 8, assists: 3, rating: 85, height: 174, weight: 73, xg: 7.1, xa: 2.5, salary: 65000 },
  { id: 4, name: "Mathys Tel", pos: "CF", age: 19, country: "France", club: "Bayern Munich", league: "Bundesliga", goals: 6, assists: 4, rating: 84, height: 182, weight: 75, xg: 5.8, xa: 3.2, salary: 55000 },
  { id: 5, name: "Gavi", pos: "CM", age: 21, country: "Spain", club: "FC Barcelona", league: "La Liga", goals: 4, assists: 9, rating: 87, height: 173, weight: 68, xg: 3.1, xa: 7.9, salary: 120000 },
  { id: 6, name: "Jude Bellingham", pos: "AM", age: 22, country: "England", club: "Real Madrid", league: "La Liga", goals: 18, assists: 10, rating: 93, height: 186, weight: 83, xg: 14.2, xa: 8.7, salary: 350000 },
  { id: 7, name: "Bukayo Saka", pos: "RW", age: 23, country: "England", club: "Arsenal", league: "Premier League", goals: 16, assists: 11, rating: 91, height: 178, weight: 76, xg: 13.5, xa: 9.2, salary: 300000 },
  { id: 8, name: "Phil Foden", pos: "AM", age: 24, country: "England", club: "Manchester City", league: "Premier League", goals: 14, assists: 8, rating: 90, height: 171, weight: 70, xg: 11.8, xa: 7.1, salary: 280000 },
  { id: 9, name: "Pedri", pos: "CM", age: 22, country: "Spain", club: "FC Barcelona", league: "La Liga", goals: 6, assists: 11, rating: 89, height: 174, weight: 68, xg: 4.8, xa: 9.5, salary: 160000 },
  { id: 10, name: "Vinicius Jr", pos: "LW", age: 24, country: "Brazil", club: "Real Madrid", league: "La Liga", goals: 21, assists: 8, rating: 94, height: 176, weight: 73, xg: 17.2, xa: 6.8, salary: 400000 },
  { id: 11, name: "Erling Haaland", pos: "ST", age: 24, country: "Norway", club: "Manchester City", league: "Premier League", goals: 27, assists: 5, rating: 95, height: 194, weight: 88, xg: 22.4, xa: 3.9, salary: 500000 },
  { id: 12, name: "Khvicha Kvaratskhelia", pos: "LW", age: 23, country: "Georgia", club: "PSG", league: "Ligue 1", goals: 12, assists: 9, rating: 88, height: 183, weight: 75, xg: 9.7, xa: 7.8, salary: 180000 },
];

const leagues = ["All Leagues", "La Liga", "Bundesliga", "Premier League", "Ligue 1"];
const clubsByLeague: Record<string, string[]> = {
  "All Leagues": [],
  "La Liga": ["All Clubs", "FC Barcelona", "Real Madrid", "Atletico Madrid"],
  "Bundesliga": ["All Clubs", "Bayern Munich", "B. Leverkusen", "Borussia Dortmund"],
  "Premier League": ["All Clubs", "Manchester City", "Arsenal", "Liverpool"],
  "Ligue 1": ["All Clubs", "PSG", "Monaco"],
};

const PAGE_SIZE = 6;

export default function PlayersPage() {
  const { role } = useRole();
  const [search, setSearch] = useState("");
  const [posFilter, setPosFilter] = useState("all");
  const [leagueFilter, setLeagueFilter] = useState("All Leagues");
  const [clubFilter, setClubFilter] = useState("All Clubs");
  const [page, setPage] = useState(1);
  const [savedIds, setSavedIds] = useState<Set<number>>(new Set([3, 5]));
  const [viewPlayer, setViewPlayer] = useState<Player | null>(null);

  const clubs = leagueFilter === "All Leagues" ? [] : clubsByLeague[leagueFilter] ?? [];

  const filtered = allPlayers.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchPos = posFilter === "all" || p.pos === posFilter;
    const matchLeague = leagueFilter === "All Leagues" || p.league === leagueFilter;
    const matchClub = clubFilter === "All Clubs" || !clubs.length || p.club === clubFilter;
    return matchSearch && matchPos && matchLeague && matchClub;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleLeagueChange = (v: string) => {
    setLeagueFilter(v);
    setClubFilter("All Clubs");
    setPage(1);
  };

  const toggleSave = (id: number) => {
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const isSaved = (id: number) => savedIds.has(id);

  const saveLabel = role === "club_admin" ? "Suggest to Scout" : "Save";
  const savedLabel = role === "club_admin" ? "Suggested" : "Saved";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-display font-bold">Players</h1>
        <p className="text-muted-foreground mt-1">Search and discover football talent</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search players..."
              className="pl-10 bg-muted/50"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <Select value={posFilter} onValueChange={(v) => { setPosFilter(v); setPage(1); }}>
            <SelectTrigger className="w-full sm:w-44 bg-muted/50">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Position" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Positions</SelectItem>
              <SelectItem value="ST">Striker</SelectItem>
              <SelectItem value="CF">Center Forward</SelectItem>
              <SelectItem value="RW">Right Wing</SelectItem>
              <SelectItem value="LW">Left Wing</SelectItem>
              <SelectItem value="AM">Att. Midfielder</SelectItem>
              <SelectItem value="CM">Cent. Midfielder</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Select value={leagueFilter} onValueChange={handleLeagueChange}>
            <SelectTrigger className="w-full sm:w-52 bg-muted/50">
              <Flag className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {leagues.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select
            value={clubFilter}
            onValueChange={(v) => { setClubFilter(v); setPage(1); }}
            disabled={leagueFilter === "All Leagues"}
          >
            <SelectTrigger className="w-full sm:w-52 bg-muted/50">
              <MapPin className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(clubs.length ? clubs : ["All Clubs"]).map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Results count */}
      <p className="text-sm text-muted-foreground">
        Showing {paginated.length} of {filtered.length} players
      </p>

      {/* Player grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {paginated.map((p) => (
          <Card key={p.id} className="hover-lift group">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between mb-4">
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center font-display font-bold text-primary text-xl">
                  {p.rating}
                </div>
                <Badge variant="outline">{p.pos}</Badge>
              </div>
              <h3 className="font-display font-semibold text-lg">{p.name}</h3>
              <p className="text-sm text-muted-foreground">{p.club} · {p.country}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{p.league} · Age: {p.age}</p>
              <div className="flex gap-4 mt-4 text-sm">
                <div><span className="font-semibold text-primary">{p.goals}</span> <span className="text-muted-foreground">goals</span></div>
                <div><span className="font-semibold text-secondary">{p.assists}</span> <span className="text-muted-foreground">assists</span></div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs"
                  onClick={() => setViewPlayer(p)}
                >
                  <Eye className="w-3.5 h-3.5 mr-1.5" /> View Profile
                </Button>
                <Button
                  variant={isSaved(p.id) ? "default" : "outline"}
                  size="sm"
                  className={`flex-1 text-xs ${isSaved(p.id) ? "bg-primary/10 text-primary hover:bg-primary/20 border-primary/30" : ""}`}
                  onClick={() => toggleSave(p.id)}
                >
                  {isSaved(p.id)
                    ? <><BookmarkCheck className="w-3.5 h-3.5 mr-1.5" />{savedLabel}</>
                    : <><Bookmark className="w-3.5 h-3.5 mr-1.5" />{saveLabel}</>
                  }
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {paginated.length === 0 && (
          <div className="col-span-full text-center py-16 text-muted-foreground">
            <Search className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No players found</p>
            <p className="text-sm">Try adjusting your filters</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="flex gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
              <Button
                key={n}
                variant={page === n ? "default" : "outline"}
                size="sm"
                className={`w-8 h-8 p-0 text-xs ${page === n ? "bg-primary text-primary-foreground" : ""}`}
                onClick={() => setPage(n)}
              >
                {n}
              </Button>
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* View Profile modal */}
      <Dialog open={!!viewPlayer} onOpenChange={() => setViewPlayer(null)}>
        {viewPlayer && (
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-display text-xl">{viewPlayer.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-5 py-2">
              {/* Identity */}
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center font-display font-bold text-primary text-2xl">
                  {viewPlayer.rating}
                </div>
                <div>
                  <p className="font-semibold">{viewPlayer.club}</p>
                  <p className="text-sm text-muted-foreground">{viewPlayer.league} · {viewPlayer.country}</p>
                  <div className="flex gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">{viewPlayer.pos}</Badge>
                    <Badge variant="secondary" className="text-xs bg-muted">Age {viewPlayer.age}</Badge>
                  </div>
                </div>
              </div>

              {/* Physical */}
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

              {/* Stats */}
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

              {/* Salary */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <span className="text-sm text-muted-foreground">Weekly Salary</span>
                <span className="font-display font-bold">€{viewPlayer.salary.toLocaleString()}</span>
              </div>

              {/* Save / Suggest */}
              <Button
                variant={isSaved(viewPlayer.id) ? "outline" : "hero"}
                className="w-full"
                onClick={() => toggleSave(viewPlayer.id)}
              >
                {isSaved(viewPlayer.id)
                  ? <><BookmarkCheck className="w-4 h-4 mr-2" />{savedLabel}</>
                  : <><Bookmark className="w-4 h-4 mr-2" />{saveLabel}</>
                }
              </Button>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
