import { useState, useMemo, useEffect } from "react";
import { toast } from "sonner";
import {
  useReactTable, getCoreRowModel, getSortedRowModel,
  getFilteredRowModel, getPaginationRowModel,
  flexRender, ColumnDef, SortingState, RowSelectionState,
} from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { Plus, Eye, Edit2, Trash2, Search, ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, Building2, AlertCircle, FileUp, CheckCircle, Clock, XCircle } from "lucide-react";
import client from "@/api/client";
import { BulkImportModal } from "@/components/BulkImportModal";
import { ClubLogo } from "@/components/ClubLogo";

interface Club {
  id: string;
  name: string;
  country: string;
  league: string;
  league_id: string | null;
  logo_url: string | null;
  scout_count: number;
  player_count: number;
  status: string;
  created_at: string;
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const formatDate = (dt: string) =>
  new Date(dt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

const statusColors: Record<string, string> = {
  Active:    "bg-primary/10 text-primary border-primary/20",
  Pending:   "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  Suspended: "bg-destructive/10 text-destructive border-destructive/20",
};

function SortIcon({ d }: { d: "asc" | "desc" | false }) {
  if (!d) return <ArrowUpDown className="w-3.5 h-3.5 ml-1 opacity-40" />;
  return d === "asc" ? <ArrowUp className="w-3.5 h-3.5 ml-1 text-primary" /> : <ArrowDown className="w-3.5 h-3.5 ml-1 text-primary" />;
}

function CharCount({ value, max }: { value: string; max: number }) {
  const n = value.length;
  if (n === 0) return null;
  const over = n > max;
  const warn = !over && n > max * 0.8;
  return (
    <span className={`text-xs tabular-nums ${over ? "text-destructive font-medium" : warn ? "text-yellow-500" : "text-muted-foreground"}`}>
      {n}/{max}
    </span>
  );
}

const emptyForm = { name: "", country: "", league_id: "none", status: "active" };

export default function AdminClubsPage() {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [leagues, setLeagues] = useState<{ id: string; name: string; country: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [leagueFilter, setLeagueFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Club | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [viewTarget, setViewTarget] = useState<Club | null>(null);

  useEffect(() => {
    client.get<{ items: Club[]; total: number }>("/admin/clubs")
      .then(({ data }) => setClubs(data.items))
      .catch(() => setError("Failed to load clubs."))
      .finally(() => setLoading(false));
    client.get<{ items: { id: string; name: string; country: string }[]; total: number }>("/admin/leagues")
      .then(({ data }) => setLeagues(data.items));
  }, []);

  const leagueNames = useMemo(() => Array.from(new Set(clubs.map((c) => c.league).filter(Boolean))).sort(), [clubs]);

  const countries = useMemo(() => Array.from(new Set(leagues.map((l) => l.country))).sort(), [leagues]);

  const filteredLeagues = useMemo(
    () => (form.country ? leagues.filter((l) => l.country === form.country) : []),
    [leagues, form.country],
  );

  const filtered = useMemo(() => clubs.filter((c) => {
    const q = globalFilter.toLowerCase();
    const matchSearch = !q || c.name.toLowerCase().includes(q) || c.country.toLowerCase().includes(q);
    const matchStatus = statusFilter === "all" || c.status === statusFilter;
    const matchLeague = leagueFilter === "all" || c.league === leagueFilter;
    return matchSearch && matchStatus && matchLeague;
  }), [clubs, globalFilter, statusFilter, leagueFilter]);

  const columns: ColumnDef<Club>[] = useMemo(() => [
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
      accessorKey: "name",
      header: ({ column }) => (
        <button className="flex items-center font-medium hover:text-foreground" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Club <SortIcon d={column.getIsSorted()} />
        </button>
      ),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <ClubLogo name={row.original.name} logoUrl={row.original.logo_url} size="sm" />
          <div>
            <div className="font-medium">{row.original.name}</div>
            <div className="text-xs text-muted-foreground">{row.original.country}</div>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "league",
      header: "League",
      cell: ({ getValue }) => <span className="text-sm">{(getValue() as string) || "—"}</span>,
    },
    {
      accessorKey: "scout_count",
      header: ({ column }) => (
        <button className="flex items-center font-medium hover:text-foreground" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Scouts <SortIcon d={column.getIsSorted()} />
        </button>
      ),
    },
    {
      accessorKey: "player_count",
      header: ({ column }) => (
        <button className="flex items-center font-medium hover:text-foreground" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Players <SortIcon d={column.getIsSorted()} />
        </button>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ getValue }) => {
        const v = capitalize(getValue() as string);
        return <Badge variant="outline" className={statusColors[v] ?? ""}>{v}</Badge>;
      },
    },
    {
      accessorKey: "created_at",
      header: ({ column }) => (
        <button className="flex items-center font-medium hover:text-foreground" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Joined <SortIcon d={column.getIsSorted()} />
        </button>
      ),
      cell: ({ getValue }) => <span className="text-muted-foreground text-xs">{formatDate(getValue() as string)}</span>,
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex gap-1">
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openView(row.original)}><Eye className="w-4 h-4" /></Button>
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(row.original)}><Edit2 className="w-4 h-4" /></Button>
          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteId(row.original.id)} disabled={Object.keys(rowSelection).length > 0}><Trash2 className="w-4 h-4" /></Button>
        </div>
      ),
    },
  ], [rowSelection]);

  const selectedIds = Object.keys(rowSelection);

  const handleBulkDelete = async () => {
    setBulkDeleteOpen(false);
    const ids = table.getSelectedRowModel().rows.map((r) => r.original.id);
    setClubs((prev) => prev.filter((c) => !ids.includes(c.id)));
    setRowSelection({});
    try {
      await client.post("/admin/clubs/bulk-delete", { ids });
      toast.success(`${ids.length} club${ids.length !== 1 ? "s" : ""} deleted successfully.`);
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      toast.error(typeof detail === "string" ? detail : "Failed to delete selected clubs.");
    }
  };

  const table = useReactTable({
    data: filtered, columns,
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

  const uploadLogo = async (clubId: string, file: File): Promise<Club> => {
    const fd = new FormData();
    fd.append("file", file);
    const { data } = await client.post<Club>(`/admin/clubs/${clubId}/logo`, fd, {
      headers: { "Content-Type": undefined },
    });
    return data;
  };

  const openView = (c: Club) => setViewTarget(c);
  const openCreate = () => { setEditTarget(null); setForm(emptyForm); setLogoFile(null); setModalOpen(true); };
  const openEdit = (c: Club) => {
    setEditTarget(c);
    const currentLeague = leagues.find((l) => l.id === c.league_id);
    setForm({ name: c.name, country: currentLeague?.country ?? c.country, league_id: c.league_id ?? "none", status: c.status });
    setLogoFile(null);
    setModalOpen(true);
  };

  const hasErrors =
    !form.name.trim() || form.name.length > 200 ||
    !form.country.trim();

  const handleSave = async () => {
    if (editTarget) {
      try {
        setSaving(true);
        let updated = (await client.put<Club>(`/admin/clubs/${editTarget.id}`, {
          name: form.name,
          country: form.country,
          league_id: form.league_id === "none" ? null : form.league_id || null,
          status: form.status,
        })).data;
        if (logoFile) {
          try {
            updated = await uploadLogo(editTarget.id, logoFile);
          } catch (logoErr: any) {
            const detail = logoErr.response?.data?.detail;
            const msg = typeof detail === "string" ? detail : "Logo upload failed. Please try a PNG, JPEG, or WebP under 2 MB.";
            toast.error(msg);
          }
        }
        setClubs(prev => prev.map(c => c.id === editTarget.id ? updated : c));
        setModalOpen(false);
        toast.success("Club updated successfully.");
      } catch (err: any) {
        const detail = err.response?.data?.detail;
        toast.error(typeof detail === "string" ? detail : "Failed to update club.");
      } finally {
        setSaving(false);
      }
      return;
    }
    try {
      setSaving(true);
      let created = (await client.post<Club>("/admin/clubs", { ...form, league_id: form.league_id === "none" ? null : form.league_id || null })).data;
      if (logoFile) {
        try {
          created = await uploadLogo(created.id, logoFile);
        } catch (logoErr: any) {
          const detail = logoErr.response?.data?.detail;
          const msg = typeof detail === "string" ? detail : "Logo upload failed. Please try a PNG, JPEG, or WebP under 2 MB.";
          toast.error(msg);
        }
      }
      setClubs((p) => [created, ...p]);
      setModalOpen(false);
      toast.success("Club created successfully.");
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      toast.error(typeof detail === "string" ? detail : "Failed to create club.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const id = deleteId;
    setDeleteId(null);
    setClubs(prev => prev.filter(c => c.id !== id));
    try {
      await client.delete(`/admin/clubs/${id}`);
      toast.success("Club deleted successfully.");
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      toast.error(typeof detail === "string" ? detail : "Failed to delete club.");
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Spinner size="lg" label="Loading clubs…" />
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
          <h1 className="text-2xl md:text-3xl font-display font-bold">Clubs</h1>
          <p className="text-muted-foreground mt-1">Manage all registered clubs</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setBulkOpen(true)}>
            <FileUp className="w-4 h-4 mr-2" /> Bulk Import
          </Button>
          <Button variant="hero" size="sm" onClick={openCreate}><Plus className="w-4 h-4 mr-2" /> Add Club</Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total",     value: clubs.length,                                          icon: Building2,   color: "text-primary" },
          { label: "Active",    value: clubs.filter((c) => c.status === "active").length,     icon: CheckCircle, color: "text-emerald-400" },
          { label: "Pending",   value: clubs.filter((c) => c.status === "pending").length,    icon: Clock,       color: "text-yellow-400" },
          { label: "Suspended", value: clubs.filter((c) => c.status === "suspended").length,  icon: XCircle,     color: "text-destructive" },
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
          <Input placeholder="Search by name or country..." className="pl-10 bg-muted/50" value={globalFilter} onChange={(e) => setGlobalFilter(e.target.value)} />
        </div>
        <Select value={leagueFilter} onValueChange={setLeagueFilter}>
          <SelectTrigger className="w-full sm:w-48 bg-muted/50"><SelectValue placeholder="All Leagues" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Leagues</SelectItem>
            {leagueNames.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-36 bg-muted/50"><SelectValue placeholder="All Statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
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

      <div className="text-sm text-muted-foreground">{filtered.length} club{filtered.length !== 1 ? "s" : ""}</div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {table.getRowModel().rows.length === 0 ? (
          <p className="text-center py-12 text-muted-foreground">No clubs found</p>
        ) : table.getRowModel().rows.map((row) => {
          const c = row.original;
          return (
            <div key={c.id} className="bg-card border border-border rounded-xl p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <ClubLogo name={c.name} logoUrl={c.logo_url} size="sm" />
                  <div>
                    <p className="font-medium text-sm">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.country}{c.league ? ` · ${c.league}` : ""}</p>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openView(c)}><Eye className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(c)}><Edit2 className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteId(c.id)} disabled={selectedIds.length > 0}><Trash2 className="w-4 h-4" /></Button>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className={`text-xs ${statusColors[capitalize(c.status)]}`}>{capitalize(c.status)}</Badge>
                <span className="text-xs text-muted-foreground">{c.scout_count} scout{c.scout_count !== 1 ? "s" : ""} · {c.player_count} player{c.player_count !== 1 ? "s" : ""}</span>
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
                      <TableHead key={h.id} className="text-muted-foreground font-medium whitespace-nowrap">
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
                        <TableCell key={cell.id} className="py-3 whitespace-nowrap">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow><TableCell colSpan={columns.length} className="text-center py-10 text-muted-foreground">No clubs found</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
            <p className="text-sm text-muted-foreground">Page {table.getState().pagination.pageIndex + 1} of {Math.max(1, table.getPageCount())}</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}><ChevronLeft className="w-4 h-4" /></Button>
              <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}><ChevronRight className="w-4 h-4" /></Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={viewTarget !== null} onOpenChange={() => setViewTarget(null)}>
        {viewTarget && (
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="font-display">Club Details</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <ClubLogo name={viewTarget.name} logoUrl={viewTarget.logo_url} size="md" />
                <div>
                  <p className="font-medium">{viewTarget.name}</p>
                  <p className="text-xs text-muted-foreground">{viewTarget.country}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">League</p>
                  <p className="font-medium text-sm">{viewTarget.league || "—"}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Status</p>
                  <Badge variant="outline" className={`mt-1 ${statusColors[capitalize(viewTarget.status)] ?? ""}`}>
                    {capitalize(viewTarget.status)}
                  </Badge>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Scouts</p>
                  <p className="font-medium text-sm">{viewTarget.scout_count}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Players</p>
                  <p className="font-medium text-sm">{viewTarget.player_count}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50 col-span-2">
                  <p className="text-xs text-muted-foreground">Joined</p>
                  <p className="font-medium text-sm">{formatDate(viewTarget.created_at)}</p>
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
          <DialogHeader><DialogTitle className="font-display">{editTarget ? "Edit Club" : "Add Club"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>Club Name *</Label>
                <CharCount value={form.name} max={200} />
              </div>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className={`bg-muted/50 ${form.name.length > 200 ? "border-destructive focus-visible:ring-destructive" : ""}`}
              />
              {form.name.length > 200 && <p className="text-xs text-destructive">Must not exceed 200 characters</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Country</Label>
                <Select
                  value={form.country}
                  onValueChange={(v) => setForm({ ...form, country: v, league_id: "none" })}
                >
                  <SelectTrigger className="bg-muted/50"><SelectValue placeholder="Select country" /></SelectTrigger>
                  <SelectContent>
                    {countries.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>League</Label>
                <Select
                  value={form.league_id}
                  onValueChange={(v) => setForm({ ...form, league_id: v })}
                  disabled={!form.country}
                >
                  <SelectTrigger className="bg-muted/50"><SelectValue placeholder={form.country ? "No league" : "Select country first"} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No league</SelectItem>
                    {filteredLeagues.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5"><Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger className="bg-muted/50"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Club Logo</Label>
              <div className="flex items-center gap-3">
                {(logoFile || editTarget?.logo_url) && (
                  <ClubLogo
                    name={form.name || "Club"}
                    logoUrl={logoFile ? URL.createObjectURL(logoFile) : editTarget?.logo_url}
                    size="md"
                  />
                )}
                <div className="flex-1">
                  <Input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="bg-muted/50 cursor-pointer"
                    onChange={(e) => {
                      const f = e.target.files?.[0] ?? null;
                      if (f && !["image/png", "image/jpeg", "image/webp"].includes(f.type)) {
                        toast.error("Only PNG, JPEG, and WebP images are accepted.");
                        e.target.value = "";
                        return;
                      }
                      setLogoFile(f);
                    }}
                  />
                  <p className="text-xs text-muted-foreground mt-1">PNG, JPEG, or WebP · Max 2 MB</p>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button variant="hero" onClick={handleSave} disabled={saving || hasErrors}>{saving ? "Saving…" : editTarget ? "Save Changes" : "Add Club"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete Club</AlertDialogTitle><AlertDialogDescription>This will permanently remove this club and all associated data. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.length} club{selectedIds.length !== 1 ? "s" : ""}?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently remove {selectedIds.length} selected club{selectedIds.length !== 1 ? "s" : ""} and all associated data. This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BulkImportModal
        type="clubs"
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        onSuccess={(count) => {
          client.get<{ items: Club[]; total: number }>("/admin/clubs")
            .then(({ data }) => setClubs(data.items))
            .catch(() => {});
        }}
      />
    </div>
  );
}
