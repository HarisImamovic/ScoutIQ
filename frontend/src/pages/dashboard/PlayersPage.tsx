import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Search,
  Filter,
  Eye,
  Bookmark,
  BookmarkX,
  ChevronLeft,
  ChevronRight,
  Flag,
  MapPin,
  AlertCircle,
} from "lucide-react";
import { scoutApi, ScoutPlayerItem, ScoutPlayersResponse } from "@/api/scout";

const PAGE_SIZE = 6;
const POSITIONS = [
  "GK",
  "CB",
  "LB",
  "RB",
  "CDM",
  "CM",
  "AM",
  "LW",
  "RW",
  "CF",
  "ST",
];

function formatMarketValue(v: number | null): string {
  if (v == null) return "—";
  if (v >= 1_000_000) return `€${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `€${(v / 1_000).toFixed(0)}K`;
  return `€${v}`;
}

export default function PlayersPage() {
  const qc = useQueryClient();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [posFilter, setPosFilter] = useState("");
  const [searchTimer, setSearchTimer] = useState<ReturnType<
    typeof setTimeout
  > | null>(null);

  const [viewPlayer, setViewPlayer] = useState<ScoutPlayerItem | null>(null);
  const [saveConfirm, setSaveConfirm] = useState<ScoutPlayerItem | null>(null);
  const [unsaveConfirm, setUnsaveConfirm] = useState<ScoutPlayerItem | null>(
    null,
  );

  const { data, isLoading, isError } = useQuery({
    queryKey: [
      "scout-players",
      { page, search: debouncedSearch, position: posFilter },
    ],
    queryFn: () =>
      scoutApi.getPlayers({
        page,
        limit: PAGE_SIZE,
        search: debouncedSearch,
        position: posFilter,
      }),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });

  const recordViewMutation = useMutation({
    mutationFn: scoutApi.recordView,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["scout-dashboard"] }),
  });

  const patchCache = (playerId: string, isSaved: boolean) => {
    qc.setQueriesData<ScoutPlayersResponse>(
      { queryKey: ["scout-players"] },
      (old) =>
        old
          ? {
              ...old,
              items: old.items.map((p) =>
                p.id === playerId ? { ...p, is_saved: isSaved } : p,
              ),
            }
          : old,
    );
  };

  const saveMutation = useMutation({
    mutationFn: scoutApi.saveProspect,
    onMutate: (id) => patchCache(id, true),
    onSuccess: () => toast.success("Player saved."),
    onError: (_, id) => {
      patchCache(id, false);
      toast.error("Failed to save prospect. Please try again.", {
        duration: 5000,
      });
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["scout-players"] });
      qc.invalidateQueries({ queryKey: ["scout-saved-prospects"] });
      qc.invalidateQueries({ queryKey: ["scout-dashboard"] });
    },
  });

  const unsaveMutation = useMutation({
    mutationFn: scoutApi.unsaveProspect,
    onMutate: (id) => patchCache(id, false),
    onSuccess: () => toast.success("Player unsaved."),
    onError: (_, id) => {
      patchCache(id, true);
      toast.error("Failed to remove prospect. Please try again.", {
        duration: 5000,
      });
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["scout-players"] });
      qc.invalidateQueries({ queryKey: ["scout-saved-prospects"] });
      qc.invalidateQueries({ queryKey: ["scout-dashboard"] });
    },
  });

  const handleSearchChange = (value: string) => {
    setSearch(value);
    if (searchTimer) clearTimeout(searchTimer);
    const t = setTimeout(() => {
      setDebouncedSearch(value);
      setPage(1);
    }, 350);
    setSearchTimer(t);
  };

  const handleViewProfile = (player: ScoutPlayerItem) => {
    setViewPlayer(player);
    recordViewMutation.mutate(player.id);
  };

  const confirmSave = () => {
    if (!saveConfirm) return;
    const id = saveConfirm.id;
    setSaveConfirm(null);
    saveMutation.mutate(id);
  };

  const confirmUnsave = () => {
    if (!unsaveConfirm) return;
    const id = unsaveConfirm.id;
    setUnsaveConfirm(null);
    unsaveMutation.mutate(id);
  };

  const players = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.pages ?? 1;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-display font-bold">Players</h1>
        <p className="text-muted-foreground mt-1">
          Search and discover football talent
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search players..."
            className="pl-10 bg-muted/50"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>
        <Select
          value={posFilter || "all"}
          onValueChange={(v) => {
            setPosFilter(v === "all" ? "" : v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-full sm:w-48 bg-muted/50">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="All Positions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Positions</SelectItem>
            {POSITIONS.map((p) => (
              <SelectItem key={p} value={p}>
                {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Spinner size="lg" label="Loading players…" />
        </div>
      ) : isError ? (
        <div className="flex items-center justify-center h-64">
          <Alert variant="destructive" className="max-w-md">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              Failed to load players. Please try again.
            </AlertDescription>
          </Alert>
        </div>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            Showing {players.length} of {total} players
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {players.map((p) => (
              <Card key={p.id} className="hover-lift group">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center font-display font-bold text-primary text-lg">
                      {p.position}
                    </div>
                    <Badge variant="outline">{p.nationality ?? "—"}</Badge>
                  </div>
                  <h3 className="font-display font-semibold text-lg leading-tight">
                    {p.first_name} {p.last_name}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {p.club_name ?? "Free agent"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {p.age != null ? `Age ${p.age}` : "—"}
                  </p>
                  <div className="mt-3 text-sm">
                    <span className="text-muted-foreground">
                      Market value:{" "}
                    </span>
                    <span className="font-semibold text-primary">
                      {formatMarketValue(p.market_value)}
                    </span>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-xs"
                      onClick={() => handleViewProfile(p)}
                    >
                      <Eye className="w-3.5 h-3.5 mr-1.5" /> View Profile
                    </Button>
                    {p.is_saved ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
                        onClick={() => setUnsaveConfirm(p)}
                      >
                        <BookmarkX className="w-3.5 h-3.5 mr-1.5" /> Unsave
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 text-xs"
                        onClick={() => setSaveConfirm(p)}
                      >
                        <Bookmark className="w-3.5 h-3.5 mr-1.5" /> Save
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}

            {players.length === 0 && (
              <div className="col-span-full text-center py-16 text-muted-foreground">
                <Search className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No players found</p>
                <p className="text-sm">Try adjusting your filters</p>
              </div>
            )}
          </div>

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
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  const n =
                    totalPages <= 7
                      ? i + 1
                      : page <= 4
                        ? i + 1
                        : page >= totalPages - 3
                          ? totalPages - 6 + i
                          : page - 3 + i;
                  return (
                    <Button
                      key={n}
                      variant={page === n ? "default" : "outline"}
                      size="sm"
                      className={`w-8 h-8 p-0 text-xs ${page === n ? "bg-primary text-primary-foreground" : ""}`}
                      onClick={() => setPage(n)}
                    >
                      {n}
                    </Button>
                  );
                })}
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
        </>
      )}

      {/* View Profile modal — no save button */}
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
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center font-display font-bold text-primary text-xl">
                  {viewPlayer.position}
                </div>
                <div>
                  <p className="font-semibold">
                    {viewPlayer.club_name ?? "Free agent"}
                  </p>
                  <div className="flex gap-2 mt-1 flex-wrap">
                    <Badge variant="outline" className="text-xs">
                      {viewPlayer.position}
                    </Badge>
                    {viewPlayer.nationality && (
                      <Badge variant="secondary" className="text-xs bg-muted">
                        <Flag className="w-3 h-3 mr-1" />
                        {viewPlayer.nationality}
                      </Badge>
                    )}
                    {viewPlayer.age != null && (
                      <Badge variant="secondary" className="text-xs bg-muted">
                        Age {viewPlayer.age}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Details
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <div className="text-sm font-semibold">
                        {viewPlayer.position}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Position
                      </div>
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <div className="text-sm font-semibold">
                      {formatMarketValue(viewPlayer.market_value)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Market Value
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setViewPlayer(null)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>

      {/* Save confirmation modal */}
      <Dialog open={!!saveConfirm} onOpenChange={() => setSaveConfirm(null)}>
        {saveConfirm && (
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle className="font-display flex items-center gap-2">
                <Bookmark className="w-5 h-5 text-primary" /> Save Prospect
              </DialogTitle>
            </DialogHeader>
            <div className="py-2 space-y-3">
              <p className="text-sm text-muted-foreground">
                Add{" "}
                <span className="font-semibold text-foreground">
                  {saveConfirm.first_name} {saveConfirm.last_name}
                </span>{" "}
                to your saved prospects?
              </p>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center font-display font-bold text-primary text-sm">
                  {saveConfirm.position}
                </div>
                <div>
                  <p className="text-sm font-medium">
                    {saveConfirm.first_name} {saveConfirm.last_name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {saveConfirm.club_name ?? "Free agent"} ·{" "}
                    {saveConfirm.age != null ? `Age ${saveConfirm.age}` : "—"}
                  </p>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSaveConfirm(null)}>
                Cancel
              </Button>
              <Button
                variant="hero"
                onClick={confirmSave}
                disabled={saveMutation.isPending}
              >
                {saveMutation.isPending ? (
                  <span className="flex items-center gap-2">
                    <Spinner size="sm" className="text-white" /> Saving…
                  </span>
                ) : (
                  <>
                    <Bookmark className="w-4 h-4 mr-2" /> Save Prospect
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>

      {/* Unsave confirmation modal */}
      <Dialog
        open={!!unsaveConfirm}
        onOpenChange={() => setUnsaveConfirm(null)}
      >
        {unsaveConfirm && (
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle className="font-display flex items-center gap-2">
                <BookmarkX className="w-5 h-5 text-destructive" /> Remove
                Prospect
              </DialogTitle>
            </DialogHeader>
            <div className="py-2 space-y-3">
              <p className="text-sm text-muted-foreground">
                Remove{" "}
                <span className="font-semibold text-foreground">
                  {unsaveConfirm.first_name} {unsaveConfirm.last_name}
                </span>{" "}
                from your saved prospects?
              </p>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center font-display font-bold text-destructive text-sm">
                  {unsaveConfirm.position}
                </div>
                <div>
                  <p className="text-sm font-medium">
                    {unsaveConfirm.first_name} {unsaveConfirm.last_name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {unsaveConfirm.club_name ?? "Free agent"} ·{" "}
                    {unsaveConfirm.age != null
                      ? `Age ${unsaveConfirm.age}`
                      : "—"}
                  </p>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setUnsaveConfirm(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={confirmUnsave}
                disabled={unsaveMutation.isPending}
              >
                {unsaveMutation.isPending ? (
                  <span className="flex items-center gap-2">
                    <Spinner size="sm" /> Removing…
                  </span>
                ) : (
                  <>
                    <BookmarkX className="w-4 h-4 mr-2" /> Remove
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
