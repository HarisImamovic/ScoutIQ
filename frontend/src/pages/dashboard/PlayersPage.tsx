import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter, Eye } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

const players = [
  { name: "Lamine Yamal", pos: "RW", age: 18, country: "Spain", club: "FC Barcelona", goals: 12, assists: 8, rating: 92 },
  { name: "Florian Wirtz", pos: "AM", age: 20, country: "Germany", club: "B. Leverkusen", goals: 15, assists: 12, rating: 90 },
  { name: "Endrick", pos: "ST", age: 18, country: "Brazil", club: "Real Madrid", goals: 8, assists: 3, rating: 85 },
  { name: "Mathys Tel", pos: "CF", age: 19, country: "France", club: "Bayern Munich", goals: 6, assists: 4, rating: 84 },
  { name: "Gavi", pos: "CM", age: 21, country: "Spain", club: "FC Barcelona", goals: 4, assists: 9, rating: 87 },
  { name: "Jude Bellingham", pos: "AM", age: 22, country: "England", club: "Real Madrid", goals: 18, assists: 10, rating: 93 },
];

export default function PlayersPage() {
  const [search, setSearch] = useState("");
  const [posFilter, setPosFilter] = useState("all");

  const filtered = players.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchPos = posFilter === "all" || p.pos === posFilter;
    return matchSearch && matchPos;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-display font-bold">Players</h1>
        <p className="text-muted-foreground mt-1">Search and discover football talent</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search players..." className="pl-10 bg-muted/50" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={posFilter} onValueChange={setPosFilter}>
          <SelectTrigger className="w-full sm:w-40 bg-muted/50">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Position" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Positions</SelectItem>
            <SelectItem value="ST">Striker</SelectItem>
            <SelectItem value="CF">Center Forward</SelectItem>
            <SelectItem value="RW">Right Wing</SelectItem>
            <SelectItem value="AM">Att. Midfielder</SelectItem>
            <SelectItem value="CM">Cent. Midfielder</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((p) => (
          <Card key={p.name} className="hover-lift group">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between mb-4">
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center font-display font-bold text-primary text-xl">
                  {p.rating}
                </div>
                <Badge variant="outline">{p.pos}</Badge>
              </div>
              <h3 className="font-display font-semibold text-lg">{p.name}</h3>
              <p className="text-sm text-muted-foreground">{p.club} · {p.country}</p>
              <p className="text-xs text-muted-foreground mt-1">Age: {p.age}</p>
              <div className="flex gap-4 mt-4 text-sm">
                <div><span className="font-semibold text-primary">{p.goals}</span> <span className="text-muted-foreground">goals</span></div>
                <div><span className="font-semibold text-secondary">{p.assists}</span> <span className="text-muted-foreground">assists</span></div>
              </div>
              <Button variant="outline" size="sm" className="w-full mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <Eye className="w-4 h-4 mr-2" /> View Profile
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
