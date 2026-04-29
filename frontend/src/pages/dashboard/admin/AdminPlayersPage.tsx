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
} from "@tanstack/react-table";
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
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import client from "@/api/client";

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
  created_at: string;
}

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
    <span className={`text-xs ${color}`}>
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

  const hasErrors =
    !form.first_name.trim() ||
    form.first_name.length > 100 ||
    !form.last_name.trim() ||
    form.last_name.length > 100 ||
    form.nationality.length > 100;

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
    });
    setModalOpen(true);
  };

  const columns: ColumnDef<Player>[] = useMemo(
    () => [
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
        header: "",
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => openEdit(row.original)}
            >
              <Edit2 className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={() => setDeleteId(row.original.id)}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        ),
      },
    ],
    [clubs],
  );

  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  });

  const handleSave = async () => {
    setSaving(true);
    try {
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
            date_of_birth: editTarget.date_of_birth || null,
            market_value: editTarget.market_value,
          },
        );
        setPlayers((prev) =>
          prev.map((p) => (p.id === editTarget.id ? data : p)),
        );
        setModalOpen(false);
        toast.success("Player updated successfully.");
      } else {
        const { data } = await client.post<Player>("/admin/players", {
          ...form,
          club_id: form.club_id === "none" ? null : form.club_id || null,
        });
        setPlayers((prev) => [data, ...prev]);
        setModalOpen(false);
        toast.success("Player created.");
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

  const handleDelete = async () => {
    if (!deleteId) return;
    const id = deleteId;
    setDeleteId(null);
    setPlayers((prev) => prev.filter((pl) => pl.id !== id));
    try {
      await client.delete(`/admin/players/${id}`);
      toast.success("Player deleted.");
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
        <Button variant="hero" size="sm" onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" /> Add Player
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total", value: players.length },
          {
            label: "Active",
            value: players.filter((p) => p.status === "active").length,
          },
          {
            label: "Injured",
            value: players.filter((p) => p.status === "injured").length,
          },
          {
            label: "Clubs",
            value: new Set(players.map((p) => p.club_name).filter(Boolean))
              .size,
          },
        ].map((s) => (
          <Card key={s.label} className="hover-lift">
            <CardContent className="pt-4 pb-3">
              <Users className="w-4 h-4 text-primary mb-1" />
              <div className="text-xl font-display font-bold">{s.value}</div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </CardContent>
          </Card>
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

      <div className="text-sm text-muted-foreground">
        {filtered.length} player{filtered.length !== 1 ? "s" : ""}
      </div>

      <Card>
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
                {form.first_name.length > 100 && (
                  <p className="text-xs text-destructive">
                    Exceeds 100 character limit
                  </p>
                )}
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
                {form.last_name.length > 100 && (
                  <p className="text-xs text-destructive">
                    Exceeds 100 character limit
                  </p>
                )}
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
                <Label>Club</Label>
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
                  <p className="text-xs text-destructive">
                    Exceeds 100 character limit
                  </p>
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
    </div>
  );
}
