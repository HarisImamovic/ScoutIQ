import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Search, Filter, Eye, Flag, AlertCircle, Video, ExternalLink, ChevronLeft, ChevronRight, BarChart3 } from "lucide-react";
import { clubAdminApi, isNoClubError, type ClubPlayerItem } from "@/api/clubAdmin";
import { scoutApi } from "@/api/scout";
import type { HighlightItem, PlayerStats } from "@/api/player";
import { NoClubState } from "@/components/NoClubState";
import { formatMarketValue } from "@/lib/formatters";

const STATUS_COLORS: Record<string, string> = {
  active: "bg-primary/10 text-primary border-primary/20",
  injured: "bg-destructive/10 text-destructive border-destructive/20",
  on_loan: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  inactive: "bg-muted text-muted-foreground border-border",
};

function capitalizeStatus(s: string): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

type StatKey = keyof PlayerStats;

const statFields: { key: StatKey; label: string }[] = [
  { key: "minutes_played", label: "Minutes Played" },
  { key: "goals", label: "Goals" },
  { key: "assists", label: "Assists" },
  { key: "saves", label: "Saves" },
  { key: "defensive_contributions", label: "Defensive Contributions" },
  { key: "chances_created", label: "Chances Created" },
  { key: "dribbles", label: "Dribbles" },
];

const emptyStatsForm: Record<StatKey, string> = {
  minutes_played: "",
  goals: "",
  assists: "",
  saves: "",
  defensive_contributions: "",
  chances_created: "",
  dribbles: "",
};

export default function MyPlayersPage() {
  const [search, setSearch] = useState("");
  const [posFilter, setPosFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewPlayer, setViewPlayer] = useState<ClubPlayerItem | null>(null);
  const [highlightsPlayer, setHighlightsPlayer] = useState<ClubPlayerItem | null>(null);
  const [highlightsData, setHighlightsData] = useState<HighlightItem[]>([]);
  const [highlightsLoading, setHighlightsLoading] = useState(false);
  const [highlightsIndex, setHighlightsIndex] = useState(0);
  const [statsPlayer, setStatsPlayer] = useState<ClubPlayerItem | null>(null);
  const [statsForm, setStatsForm] = useState<Record<StatKey, string>>(emptyStatsForm);
  const [savingStats, setSavingStats] = useState(false);
  const queryClient = useQueryClient();

  const openStats = (player: ClubPlayerItem) => {
    setStatsPlayer(player);
    setStatsForm({
      minutes_played: player.stats.minutes_played != null ? String(player.stats.minutes_played) : "",
      goals: player.stats.goals != null ? String(player.stats.goals) : "",
      assists: player.stats.assists != null ? String(player.stats.assists) : "",
      saves: player.stats.saves != null ? String(player.stats.saves) : "",
      defensive_contributions: player.stats.defensive_contributions != null ? String(player.stats.defensive_contributions) : "",
      chances_created: player.stats.chances_created != null ? String(player.stats.chances_created) : "",
      dribbles: player.stats.dribbles != null ? String(player.stats.dribbles) : "",
    });
  };

  const statsInvalid = statFields.some(({ key }) => {
    const v = statsForm[key];
    return v !== "" && !/^\d+$/.test(v);
  });

  const handleSaveStats = async () => {
    if (!statsPlayer) return;
    setSavingStats(true);
    try {
      const toNum = (v: string) => (v === "" ? null : parseInt(v, 10));
      const data = await clubAdminApi.updatePlayerStats(statsPlayer.id, {
        minutes_played: toNum(statsForm.minutes_played),
        goals: toNum(statsForm.goals),
        assists: toNum(statsForm.assists),
        saves: toNum(statsForm.saves),
        defensive_contributions: toNum(statsForm.defensive_contributions),
        chances_created: toNum(statsForm.chances_created),
        dribbles: toNum(statsForm.dribbles),
      });
      queryClient.setQueryData<ClubPlayerItem[]>(["club-squad"], (old) =>
        old?.map((p) => (p.id === statsPlayer.id ? { ...p, stats: data } : p)),
      );
      setStatsPlayer(null);
      toast.success("Player stats updated successfully.");
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      toast.error(
        typeof detail === "string" ? detail : "Failed to update player stats.",
      );
    } finally {
      setSavingStats(false);
    }
  };

  const openHighlights = async (player: ClubPlayerItem) => {
    setHighlightsPlayer(player);
    setHighlightsIndex(0);
    setHighlightsData([]);
    setHighlightsLoading(true);
    try {
      const data = await scoutApi.getPlayerHighlights(player.id);
      setHighlightsData(data);
    } catch {
      setHighlightsData([]);
    } finally {
      setHighlightsLoading(false);
    }
  };

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
                  <div className="flex flex-col gap-2 mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => setViewPlayer(p)}
                    >
                      <Eye className="w-4 h-4 mr-2" /> View Profile
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs"
                      onClick={() => openHighlights(p)}
                    >
                      <Video className="w-3.5 h-3.5 mr-1.5" /> View Highlights
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs"
                      onClick={() => openStats(p)}
                    >
                      <BarChart3 className="w-3.5 h-3.5 mr-1.5" /> Edit Stats
                    </Button>
                  </div>
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

      <Dialog
        open={!!highlightsPlayer}
        onOpenChange={() => { setHighlightsPlayer(null); setHighlightsData([]); setHighlightsIndex(0); }}
      >
        {highlightsPlayer && (
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle className="font-display flex items-center gap-2">
                <Video className="w-5 h-5 text-primary" />
                {highlightsPlayer.first_name} {highlightsPlayer.last_name} — Highlights
              </DialogTitle>
            </DialogHeader>

            {highlightsLoading ? (
              <div className="flex items-center justify-center h-48">
                <Spinner size="lg" label="Loading highlights…" />
              </div>
            ) : highlightsData.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 text-center gap-3">
                <Video className="w-10 h-10 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">This player has not added any highlights yet.</p>
              </div>
            ) : (
              <div className="space-y-4 py-2">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">
                      {highlightsData[highlightsIndex].title ?? "Untitled highlight"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {highlightsIndex + 1} of {highlightsData.length}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <a
                      href={highlightsData[highlightsIndex].url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Button>
                    </a>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setHighlightsIndex((i) => Math.max(0, i - 1))}
                      disabled={highlightsIndex === 0}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setHighlightsIndex((i) => Math.min(highlightsData.length - 1, i + 1))}
                      disabled={highlightsIndex === highlightsData.length - 1}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
                  <iframe
                    key={highlightsData[highlightsIndex].id}
                    src={highlightsData[highlightsIndex].embed_url}
                    title={highlightsData[highlightsIndex].title ?? "Player highlight"}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    referrerPolicy="strict-origin-when-cross-origin"
                    loading="lazy"
                    className="absolute inset-0 w-full h-full rounded-lg border-0"
                  />
                </div>
                {highlightsData.length > 1 && (
                  <div className="flex justify-center gap-1.5">
                    {highlightsData.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setHighlightsIndex(i)}
                        className={`w-2 h-2 rounded-full transition-colors ${
                          i === highlightsIndex ? "bg-primary" : "bg-muted-foreground/30"
                        }`}
                        aria-label={`Go to highlight ${i + 1}`}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => { setHighlightsPlayer(null); setHighlightsData([]); setHighlightsIndex(0); }}
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>

      <Dialog open={!!statsPlayer} onOpenChange={(open) => !open && setStatsPlayer(null)}>
        {statsPlayer && (
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="font-display">
                Edit Stats — {statsPlayer.first_name} {statsPlayer.last_name}
              </DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-3 py-2">
              {statFields.map(({ key, label }) => {
                const v = statsForm[key];
                const invalid = v !== "" && !/^\d+$/.test(v);
                return (
                  <div key={key} className="space-y-2">
                    <Label>{label}</Label>
                    <Input
                      type="number"
                      min={0}
                      step={1}
                      value={v}
                      onChange={(e) =>
                        setStatsForm({ ...statsForm, [key]: e.target.value })
                      }
                      className={`bg-muted/50 ${invalid ? "border-destructive focus-visible:ring-destructive" : ""}`}
                    />
                    {invalid && (
                      <p className="text-xs text-destructive">Must be a non-negative whole number</p>
                    )}
                  </div>
                );
              })}
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setStatsPlayer(null)}>
                Cancel
              </Button>
              <Button
                variant="hero"
                onClick={handleSaveStats}
                disabled={savingStats || statsInvalid}
              >
                {savingStats ? "Saving…" : "Save Changes"}
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
