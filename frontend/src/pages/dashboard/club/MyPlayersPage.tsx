import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Search, Filter, Eye, Flag, AlertCircle } from "lucide-react";
import { clubAdminApi, isNoClubError, type ClubPlayerItem } from "@/api/clubAdmin";
import { NoClubState } from "@/components/NoClubState";

const STATUS_COLORS: Record<string, string> = {
  active: "bg-primary/10 text-primary border-primary/20",
  injured: "bg-destructive/10 text-destructive border-destructive/20",
  on_loan: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  inactive: "bg-muted text-muted-foreground border-border",
};

function formatMarketValue(v: number | null): string {
  if (v == null) return "—";
  if (v >= 1_000_000) return `€${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `€${(v / 1_000).toFixed(0)}K`;
  return `€${v}`;
}

function capitalizeStatus(s: string): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function MyPlayersPage() {
  const [search, setSearch] = useState("");
  const [posFilter, setPosFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewPlayer, setViewPlayer] = useState<ClubPlayerItem | null>(null);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["club-squad"],
    queryFn: clubAdminApi.getSquad,
    staleTime: 30_000,
  });

  const players = data ?? [];

  const filtered = players.filter((p) => {
    const name = `${p.first_name} ${p.last_name}`.toLowerCase();
    const matchSearch = name.includes(search.toLowerCase());
    const matchPos = posFilter === "all" || p.position === posFilter;
    const matchStatus = statusFilter === "all" || p.status === statusFilter;
    return matchSearch && matchPos && matchStatus;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-display font-bold">My Players</h1>
        <p className="text-muted-foreground mt-1">Squad overview</p>
      </div>

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
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="injured">Injured</SelectItem>
            <SelectItem value="on_loan">On Loan</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Spinner size="lg" label="Loading squad…" />
        </div>
      ) : isError ? (
        isNoClubError(error) ? <NoClubState page="players" /> : (
        <div className="flex items-center justify-center h-64">
          <Alert variant="destructive" className="max-w-md">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>Failed to load players. Please try again.</AlertDescription>
          </Alert>
        </div>
        )
      ) : (
        <>
          <p className="text-sm text-muted-foreground">{filtered.length} player{filtered.length !== 1 ? "s" : ""}</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((p) => (
              <Card key={p.id} className="hover-lift group">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center font-display font-bold text-primary text-xl">
                      {p.position}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge variant="outline" className={`text-xs ${STATUS_COLORS[p.status] ?? ""}`}>
                        {capitalizeStatus(p.status)}
                      </Badge>
                    </div>
                  </div>
                  <h3 className="font-display font-semibold text-lg">{p.first_name} {p.last_name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {p.nationality ?? "—"}{p.age != null ? ` · Age ${p.age}` : ""}
                  </p>
                  <div className="mt-3 text-sm">
                    <span className="text-muted-foreground">Market value: </span>
                    <span className="font-semibold text-primary">{formatMarketValue(p.market_value)}</span>
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
                <p>{players.length === 0 ? "No players assigned to your club yet." : "No players match your filters."}</p>
              </div>
            )}
          </div>
        </>
      )}

      <Dialog open={!!viewPlayer} onOpenChange={() => setViewPlayer(null)}>
        {viewPlayer && (
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="font-display text-xl">
                {viewPlayer.first_name} {viewPlayer.last_name}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-5 py-2">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center font-display font-bold text-primary text-2xl">
                  {viewPlayer.position}
                </div>
                <div>
                  <div className="flex gap-2 mt-1 flex-wrap">
                    <Badge variant="outline" className="text-xs">{viewPlayer.position}</Badge>
                    <Badge variant="outline" className={`text-xs ${STATUS_COLORS[viewPlayer.status] ?? ""}`}>
                      {capitalizeStatus(viewPlayer.status)}
                    </Badge>
                    {viewPlayer.nationality && (
                      <Badge variant="secondary" className="text-xs bg-muted">
                        <Flag className="w-3 h-3 mr-1" />{viewPlayer.nationality}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-muted/50">
                  <div className="text-sm font-semibold">{viewPlayer.age ?? "—"}</div>
                  <div className="text-xs text-muted-foreground">Age</div>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <div className="text-sm font-semibold">{formatMarketValue(viewPlayer.market_value)}</div>
                  <div className="text-xs text-muted-foreground">Market Value</div>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <div className="text-sm font-semibold">{viewPlayer.nationality ?? "—"}</div>
                  <div className="text-xs text-muted-foreground">Nationality</div>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <div className="text-sm font-semibold">{capitalizeStatus(viewPlayer.status)}</div>
                  <div className="text-xs text-muted-foreground">Status</div>
                </div>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
