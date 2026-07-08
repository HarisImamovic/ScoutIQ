import { useState, useMemo, useEffect } from "react";
import { toast } from "sonner";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  ColumnDef,
  SortingState,
  RowSelectionState,
} from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "@/components/ui/date-picker";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus,
  Eye,
  Edit2,
  Trash2,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  Users,
  AlertCircle,
  FileUp,
  CheckCircle,
  Building2,
  BarChart3,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import client from "@/api/client";
import { BulkImportModal } from "@/components/BulkImportModal";
import type { PlayerStats } from "@/api/player";

interface Player {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string | null;
  nationality: string | null;
  position: string;
  club_name: string | null;
  market_value: number | null;
  status: string;
  stats: PlayerStats;
  created_at: string;
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

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const calcAge = (dob: string | null): number | null => {
  if (!dob) return null;
  const birth = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  if (now < new Date(now.getFullYear(), birth.getMonth(), birth.getDate()))
    age--;
  return age;
};

const formatValue = (v: number | null): string => {
  if (v == null) return "—";
  if (v >= 1_000_000) return `€${(v / 1_000_000).toFixed(0)}M`;
  if (v >= 1_000) return `€${(v / 1_000).toFixed(0)}K`;
  return `€${v}`;
};

const statusColors: Record<string, string> = {
  Active: "bg-primary/10 text-primary border-primary/20",
  Injured: "bg-destructive/10 text-destructive border-destructive/20",
};

function SortIcon({ d }: { d: "asc" | "desc" | false }) {
  if (!d) return <ArrowUpDown className="w-3.5 h-3.5 ml-1 opacity-40" />;
  return d === "asc" ? (
    <ArrowUp className="w-3.5 h-3.5 ml-1 text-primary" />
  ) : (
    <ArrowDown className="w-3.5 h-3.5 ml-1 text-primary" />
  );
}

function CharCount({ value, max }: { value: string; max: number }) {
  const len = value.length;
  const pct = len / max;
  const color =
    pct >= 1
      ? "text-destructive"
      : pct >= 0.8
        ? "text-yellow-500"
        : "text-muted-foreground";
  return (
    <span className={`text-xs leading-none ${color}`}>
      {len}/{max}
    </span>
  );
}

const positions = [
  "GK",
  "CB",
  "LB",
  "RB",
  "CDM",
  "CM",
  "AM",
  "CAM",
  "LW",
  "RW",
  "CF",
  "ST",
];
const emptyForm = {
  first_name: "",
  last_name: "",
  position: "ST",
  nationality: "",
  club_id: "none",
  status: "active",
  date_of_birth: "",
  market_value: "",
};

export default function AdminPlayersPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [clubs, setClubs] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [posFilter, setPosFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Player | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [viewTarget, setViewTarget] = useState<Player | null>(null);
  const [statsTarget, setStatsTarget] = useState<Player | null>(null);
  const [statsForm, setStatsForm] = useState<Record<StatKey, string>>(emptyStatsForm);
  const [savingStats, setSavingStats] = useState(false);

  useEffect(() => {
    client
      .get<{ items: Player[]; total: number }>("/admin/players")
      .then(({ data }) => setPlayers(data.items))
      .catch(() => setError("Failed to load players."))
      .finally(() => setLoading(false));
    client
      .get<{
        items: { id: string; name: string; country: string }[];
        total: number;
      }>("/admin/clubs")
      .then(({ data }) =>
        setClubs(data.items.map((c) => ({ id: c.id, name: c.name }))),
      );
  }, []);

  const marketValueNum = form.market_value !== "" ? parseFloat(form.market_value) : null;
  const marketValueInvalid = form.market_value !== "" && (isNaN(marketValueNum!) || marketValueNum! < 0);

  const hasErrors =
    !form.first_name.trim() ||
    form.first_name.length > 100 ||
    !form.last_name.trim() ||
    form.last_name.length > 100 ||
    form.nationality.length > 100 ||
    marketValueInvalid;

  const filtered = useMemo(
    () =>
      players.filter((p) => {
        const q = globalFilter.toLowerCase();
        const name = `${p.first_name} ${p.last_name}`.toLowerCase();
        const matchSearch =
          !q ||
          name.includes(q) ||
          (p.club_name ?? "").toLowerCase().includes(q) ||
          (p.nationality ?? "").toLowerCase().includes(q);
        const matchPos = posFilter === "all" || p.position === posFilter;
        const matchStatus = statusFilter === "all" || p.status === statusFilter;
        return matchSearch && matchPos && matchStatus;
      }),
    [players, globalFilter, posFilter, statusFilter],
  );

  const openView = (p: Player) => setViewTarget(p);
  const openCreate = () => {
    setEditTarget(null);
    setForm(emptyForm);
    setModalOpen(true);
  };
  const openEdit = (p: Player) => {
    setEditTarget(p);
    const matchedClub = clubs.find((c) => c.name === p.club_name);
    setForm({
      first_name: p.first_name,
      last_name: p.last_name,
      position: p.position,
      nationality: p.nationality ?? "",
      club_id: matchedClub?.id ?? "none",
      status: p.status,
      date_of_birth: p.date_of_birth ?? "",
      market_value: p.market_value != null ? String(p.market_value / 1_000_000) : "",
    });
    setModalOpen(true);
  };
  const openStats = (p: Player) => {
    setStatsTarget(p);
    setStatsForm({
      minutes_played: p.stats.minutes_played != null ? String(p.stats.minutes_played) : "",
      goals: p.stats.goals != null ? String(p.stats.goals) : "",
      assists: p.stats.assists != null ? String(p.stats.assists) : "",
      saves: p.stats.saves != null ? String(p.stats.saves) : "",
      defensive_contributions: p.stats.defensive_contributions != null ? String(p.stats.defensive_contributions) : "",
      chances_created: p.stats.chances_created != null ? String(p.stats.chances_created) : "",
      dribbles: p.stats.dribbles != null ? String(p.stats.dribbles) : "",
    });
  };

  const columns: ColumnDef<Player>[] = useMemo(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllRowsSelected() || (table.getIsSomeRowsSelected() && "indeterminate")}
            onCheckedChange={(v) => table.toggleAllRowsSelected(!!v)}
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(v) => row.toggleSelected(!!v)}
            onClick={(e) => e.stopPropagation()}
          />
        ),
        enableSorting: false,
      },
      {
        id: "name",
        accessorFn: (p) => `${p.first_name} ${p.last_name}`,
        header: ({ column }) => (
          <button
            className="flex items-center font-medium hover:text-foreground"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Player <SortIcon d={column.getIsSorted()} />
          </button>
        ),
        cell: ({ row }) => (
          <div>
            <div className="font-medium">
              {row.original.first_name} {row.original.last_name}
            </div>
            <div className="text-xs text-muted-foreground">
              {row.original.nationality ?? "—"}
            </div>
          </div>
        ),
      },
      {
        accessorKey: "position",
        header: "Pos",
        cell: ({ getValue }) => (
          <Badge variant="outline" className="text-xs">
            {getValue() as string}
          </Badge>
        ),
      },
      {
        id: "age",
        accessorFn: (p) => calcAge(p.date_of_birth),
        header: ({ column }) => (
          <button
            className="flex items-center font-medium hover:text-foreground"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Age <SortIcon d={column.getIsSorted()} />
          </button>
        ),
        cell: ({ getValue }) => (
          <span>{(getValue() as number | null) ?? "—"}</span>
        ),
      },
      {
        accessorKey: "club_name",
        header: ({ column }) => (
          <button
            className="flex items-center font-medium hover:text-foreground"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Club <SortIcon d={column.getIsSorted()} />
          </button>
        ),
        cell: ({ getValue }) => (
          <span>{(getValue() as string | null) ?? "—"}</span>
        ),
      },
      {
        accessorKey: "market_value",
        header: ({ column }) => (
          <button
            className="flex items-center font-medium hover:text-foreground"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Value <SortIcon d={column.getIsSorted()} />
          </button>
        ),
        cell: ({ getValue }) => (
          <span className="font-display font-bold text-primary">
            {formatValue(getValue() as number | null)}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ getValue }) => {
          const v = capitalize(getValue() as string);
          return (
            <Badge
              variant="outline"
              className={statusColors[v] ?? "bg-muted text-muted-foreground"}
            >
              {v}
            </Badge>
          );
        },
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <div className="flex gap-1">
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openView(row.original)}><Eye className="w-4 h-4" /></Button>
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(row.original)}><Edit2 className="w-4 h-4" /></Button>
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openStats(row.original)}><BarChart3 className="w-4 h-4" /></Button>
            <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteId(row.original.id)} disabled={Object.keys(rowSelection).length > 0}><Trash2 className="w-4 h-4" /></Button>
          </div>
        ),
      },
    ],
    [clubs, rowSelection],
  );

  const selectedIds = Object.keys(rowSelection);

  const handleBulkDelete = async () => {
    setBulkDeleteOpen(false);
    const ids = table.getSelectedRowModel().rows.map((r) => r.original.id);
    setPlayers((prev) => prev.filter((p) => !ids.includes(p.id)));
    setRowSelection({});
    try {
      await client.post("/admin/players/bulk-delete", { ids });
      toast.success(`${ids.length} player${ids.length !== 1 ? "s" : ""} deleted successfully.`);
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      toast.error(typeof detail === "string" ? detail : "Failed to delete selected players.");
    }
  };

  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting, rowSelection },
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    enableRowSelection: true,
    getRowId: (row) => row.id,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      const mvAbsolute = form.market_value !== "" ? Math.round(parseFloat(form.market_value) * 1_000_000) : null;

      if (editTarget) {
        const { data } = await client.put<Player>(
          `/admin/players/${editTarget.id}`,
          {
            first_name: form.first_name,
            last_name: form.last_name,
            position: form.position,
            nationality: form.nationality || null,
            club_id: form.club_id === "none" ? null : form.club_id || null,
            status: form.status,
            date_of_birth: form.date_of_birth || null,
            market_value: mvAbsolute,
          },
        );
        setPlayers((prev) =>
          prev.map((p) => (p.id === editTarget.id ? data : p)),
        );
        setModalOpen(false);
        toast.success("Player updated successfully.");
      } else {
        const { data } = await client.post<Player>("/admin/players", {
          first_name: form.first_name,
          last_name: form.last_name,
          position: form.position,
          nationality: form.nationality || null,
          club_id: form.club_id === "none" ? null : form.club_id || null,
          status: form.status,
          date_of_birth: form.date_of_birth || null,
          market_value: mvAbsolute,
        });
        setPlayers((prev) => [data, ...prev]);
        setModalOpen(false);
        toast.success("Player created successfully.");
      }
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      toast.error(
        typeof detail === "string"
          ? detail
          : editTarget
            ? "Failed to update player."
            : "Failed to create player.",
      );
    } finally {
      setSaving(false);
    }
  };

  const statsInvalid = statFields.some(({ key }) => {
    const v = statsForm[key];
    return v !== "" && !/^\d+$/.test(v);
  });

  const handleSaveStats = async () => {
    if (!statsTarget) return;
    setSavingStats(true);
    try {
      const toNum = (v: string) => (v === "" ? null : parseInt(v, 10));
      const { data } = await client.patch<PlayerStats>(
        `/admin/players/${statsTarget.id}/stats`,
        {
          minutes_played: toNum(statsForm.minutes_played),
          goals: toNum(statsForm.goals),
          assists: toNum(statsForm.assists),
          saves: toNum(statsForm.saves),
          defensive_contributions: toNum(statsForm.defensive_contributions),
          chances_created: toNum(statsForm.chances_created),
          dribbles: toNum(statsForm.dribbles),
        },
      );
      setPlayers((prev) =>
        prev.map((p) => (p.id === statsTarget.id ? { ...p, stats: data } : p)),
      );
      setStatsTarget(null);
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

  const handleDelete = async () => {
    if (!deleteId) return;
    const id = deleteId;
    setDeleteId(null);
    setPlayers((prev) => prev.filter((pl) => pl.id !== id));
    try {
      await client.delete(`/admin/players/${id}`);
      toast.success("Player deleted successfully.");
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      toast.error(
        typeof detail === "string" ? detail : "Failed to delete player.",
      );
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Spinner size="lg" label="Loading players…" />
    </div>
  );
  if (error) return (
    <div className="flex items-center justify-center h-64">
      <Alert variant="destructive" className="max-w-md">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold">
            Players
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage all registered players on the platform
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setBulkOpen(true)}>
            <FileUp className="w-4 h-4 mr-2" /> Bulk Import
          </Button>
          <Button variant="hero" size="sm" onClick={openCreate}>
            <Plus className="w-4 h-4 mr-2" /> Add Player
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total",   value: players.length,                                          icon: Users,       color: "text-primary" },
          { label: "Active",  value: players.filter((p) => p.status === "active").length,     icon: CheckCircle, color: "text-emerald-400" },
          { label: "Injured", value: players.filter((p) => p.status === "injured").length,    icon: AlertCircle, color: "text-destructive" },
          { label: "Clubs",   value: new Set(players.map((p) => p.club_name).filter(Boolean)).size, icon: Building2, color: "text-amber-400" },
        ].map((card) => (
          <div key={card.label} className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
            <div className={`p-2 rounded-lg bg-muted ${card.color}`}>
              <card.icon className="w-5 h-5" />
            </div>
            <div>
              <div className="text-2xl font-bold">{card.value}</div>
              <div className="text-xs text-muted-foreground">{card.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, club or nationality..."
            className="pl-10 bg-muted/50"
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
          />
        </div>
        <Select value={posFilter} onValueChange={setPosFilter}>
          <SelectTrigger className="w-full sm:w-44 bg-muted/50">
            <SelectValue placeholder="All Positions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Positions</SelectItem>
            {positions.map((p) => (
              <SelectItem key={p} value={p}>
                {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40 bg-muted/50">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="injured">Injured</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {selectedIds.length > 0 && (
        <div className="flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-2">
          <span className="text-sm font-medium">{selectedIds.length} row{selectedIds.length !== 1 ? "s" : ""} selected</span>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setRowSelection({})}>Clear</Button>
            <Button variant="destructive" size="sm" onClick={() => setBulkDeleteOpen(true)}>
              <Trash2 className="w-4 h-4 mr-2" /> Delete {selectedIds.length} selected
            </Button>
          </div>
        </div>
      )}

      <div className="text-sm text-muted-foreground">
        {filtered.length} player{filtered.length !== 1 ? "s" : ""}
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {table.getRowModel().rows.length === 0 ? (
          <p className="text-center py-12 text-muted-foreground">No players found</p>
        ) : table.getRowModel().rows.map((row) => {
          const p = row.original;
          const age = calcAge(p.date_of_birth);
          return (
            <div key={p.id} className="bg-card border border-border rounded-xl p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-sm">{p.first_name} {p.last_name}</p>
                  <p className="text-xs text-muted-foreground">{p.position}{p.nationality ? ` · ${p.nationality}` : ""}{age != null ? ` · Age ${age}` : ""}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openView(p)}><Eye className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(p)}><Edit2 className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openStats(p)}><BarChart3 className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteId(p.id)} disabled={selectedIds.length > 0}><Trash2 className="w-4 h-4" /></Button>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className={`text-xs ${statusColors[capitalize(p.status)]}`}>{capitalize(p.status)}</Badge>
                <span className="text-xs text-muted-foreground">{p.club_name ?? "Free agent"}</span>
                <span className="text-xs font-semibold text-primary ml-auto">{formatValue(p.market_value)}</span>
              </div>
            </div>
          );
        })}
        <div className="flex items-center justify-between pt-2">
          <span className="text-sm text-muted-foreground">Page {table.getState().pagination.pageIndex + 1} of {Math.max(1, table.getPageCount())}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}><ChevronLeft className="w-4 h-4" /></Button>
            <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}><ChevronRight className="w-4 h-4" /></Button>
          </div>
        </div>
      </div>

      <Card className="hidden md:block">
        <CardContent className="pt-4">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((hg) => (
                  <TableRow key={hg.id}>
                    {hg.headers.map((h) => (
                      <TableHead
                        key={h.id}
                        className="text-muted-foreground font-medium whitespace-nowrap"
                      >
                        {flexRender(h.column.columnDef.header, h.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id} className="hover:bg-muted/30">
                      {row.getVisibleCells().map((cell) => (
                        <TableCell
                          key={cell.id}
                          className="py-3 whitespace-nowrap"
                        >
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext(),
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      className="text-center py-10 text-muted-foreground"
                    >
                      No players found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
            <p className="text-sm text-muted-foreground">
              Page {table.getState().pagination.pageIndex + 1} of{" "}
              {Math.max(1, table.getPageCount())}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={viewTarget !== null} onOpenChange={() => setViewTarget(null)}>
        {viewTarget && (
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="font-display">Player Details</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">First Name</p>
                  <p className="font-medium text-sm">{viewTarget.first_name}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Last Name</p>
                  <p className="font-medium text-sm">{viewTarget.last_name}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Position</p>
                  <Badge variant="outline" className="mt-1 text-xs">{viewTarget.position}</Badge>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Age</p>
                  <p className="font-medium text-sm">{calcAge(viewTarget.date_of_birth) ?? "—"}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Nationality</p>
                  <p className="font-medium text-sm">{viewTarget.nationality ?? "—"}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Club</p>
                  <p className="font-medium text-sm">{viewTarget.club_name ?? "Free agent"}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Market Value</p>
                  <p className="font-display font-bold text-primary text-sm">{formatValue(viewTarget.market_value)}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Status</p>
                  <Badge variant="outline" className={`mt-1 ${statusColors[capitalize(viewTarget.status)] ?? "bg-muted text-muted-foreground"}`}>
                    {capitalize(viewTarget.status)}
                  </Badge>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setViewTarget(null)}>Close</Button>
              <Button variant="hero" onClick={() => { setViewTarget(null); setTimeout(() => openEdit(viewTarget), 50); }}>
                <Edit2 className="w-4 h-4 mr-2" /> Edit
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>

      {/* Create / Edit modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">
              {editTarget ? "Edit Player" : "Add Player"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>First Name *</Label>
                  <CharCount value={form.first_name} max={100} />
                </div>
                <Input
                  value={form.first_name}
                  onChange={(e) =>
                    setForm({ ...form, first_name: e.target.value })
                  }
                  className={`bg-muted/50 ${form.first_name.length > 100 ? "border-destructive focus-visible:ring-destructive" : ""}`}
                />
                {form.first_name.length > 100
                  ? <p className="text-xs text-destructive">Exceeds 100 character limit</p>
                  : form.last_name.length > 100 ? <div className="h-4" /> : null}
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Last Name *</Label>
                  <CharCount value={form.last_name} max={100} />
                </div>
                <Input
                  value={form.last_name}
                  onChange={(e) =>
                    setForm({ ...form, last_name: e.target.value })
                  }
                  className={`bg-muted/50 ${form.last_name.length > 100 ? "border-destructive focus-visible:ring-destructive" : ""}`}
                />
                {form.last_name.length > 100
                  ? <p className="text-xs text-destructive">Exceeds 100 character limit</p>
                  : form.first_name.length > 100 ? <div className="h-4" /> : null}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Position</Label>
                <Select
                  value={form.position}
                  onValueChange={(v) => setForm({ ...form, position: v })}
                >
                  <SelectTrigger className="bg-muted/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {positions.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => setForm({ ...form, status: v })}
                >
                  <SelectTrigger className="bg-muted/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="injured">Injured</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Club</Label>
                </div>
                <Select
                  value={form.club_id}
                  onValueChange={(v) => setForm({ ...form, club_id: v })}
                >
                  <SelectTrigger className="bg-muted/50">
                    <SelectValue placeholder="No club" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No club</SelectItem>
                    {clubs.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Nationality</Label>
                  <CharCount value={form.nationality} max={100} />
                </div>
                <Input
                  value={form.nationality}
                  onChange={(e) =>
                    setForm({ ...form, nationality: e.target.value })
                  }
                  className={`bg-muted/50 ${form.nationality.length > 100 ? "border-destructive focus-visible:ring-destructive" : ""}`}
                />
                {form.nationality.length > 100 && (
                  <p className="text-xs text-destructive">Exceeds 100 character limit</p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Date of Birth</Label>
                <DatePicker
                  value={form.date_of_birth}
                  onChange={(v) => setForm({ ...form, date_of_birth: v })}
                  placeholder="Select date of birth"
                  disabled={(date) => date > new Date()}
                />
              </div>
              <div className="space-y-2">
                <Label>Market Value (M€)</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.1}
                  placeholder="e.g. 50"
                  value={form.market_value}
                  onChange={(e) => setForm({ ...form, market_value: e.target.value })}
                  className={`bg-muted/50 ${marketValueInvalid ? "border-destructive focus-visible:ring-destructive" : ""}`}
                />
                {marketValueInvalid && (
                  <p className="text-xs text-destructive">Must be a non-negative number</p>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="hero"
              onClick={handleSave}
              disabled={saving || hasErrors}
            >
              {saving ? "Saving…" : editTarget ? "Save Changes" : "Add Player"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!statsTarget} onOpenChange={(open) => !open && setStatsTarget(null)}>
        {statsTarget && (
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="font-display">
                Edit Stats — {statsTarget.first_name} {statsTarget.last_name}
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
              <Button variant="ghost" onClick={() => setStatsTarget(null)}>
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

      <AlertDialog
        open={deleteId !== null}
        onOpenChange={() => setDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Player</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this player from the platform. This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.length} player{selectedIds.length !== 1 ? "s" : ""}?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently remove {selectedIds.length} selected player{selectedIds.length !== 1 ? "s" : ""} from the platform. This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BulkImportModal
        type="players"
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        onSuccess={() => {
          client
            .get<{ items: Player[]; total: number }>("/admin/players")
            .then(({ data }) => setPlayers(data.items))
            .catch(() => {});
        }}
      />
    </div>
  );
}
