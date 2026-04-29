import { useState, useMemo, useEffect } from "react";
import { toast } from "sonner";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  getFilteredRowModel,
  flexRender,
  createColumnHelper,
  SortingState,
} from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  FileText, Eye, Edit2, Trash2, ArrowUpDown, ArrowUp, ArrowDown,
  ChevronLeft, ChevronRight, Search, CheckCircle, Clock, XCircle, Star, AlertCircle,
  ChevronsUpDown, Check,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import client from "@/api/client";

type ReportStatus = "draft" | "submitted" | "approved" | "rejected";

interface Report {
  id: string;
  player_id?: string | null;
  player_name: string;
  position: string;
  scout_name: string;
  rating: number;
  status: ReportStatus;
  notes: string | null;
  created_at: string;
}

interface PlayerOption {
  id: string;
  first_name: string;
  last_name: string;
  position: string;
}

const POSITIONS = ["GK", "CB", "LB", "RB", "CDM", "CM", "AM", "CAM", "LW", "RW", "CF", "ST"];

const formatDate = (dt: string) =>
  new Date(dt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

const statusConfig: Record<ReportStatus, { label: string; className: string; icon: React.ElementType }> = {
  draft:     { label: "Draft",     className: "bg-muted text-muted-foreground",      icon: Clock },
  submitted: { label: "Submitted", className: "bg-blue-500/20 text-blue-400",        icon: FileText },
  approved:  { label: "Approved",  className: "bg-emerald-500/20 text-emerald-400",  icon: CheckCircle },
  rejected:  { label: "Rejected",  className: "bg-destructive/20 text-destructive",  icon: XCircle },
};

function StatusBadge({ status }: { status: ReportStatus }) {
  const cfg = statusConfig[status] ?? statusConfig.draft;
  return <Badge className={`gap-1 ${cfg.className}`}><cfg.icon className="w-3 h-3" />{cfg.label}</Badge>;
}

function SortIcon({ column }: { column: any }) {
  const sorted = column.getIsSorted();
  if (sorted === "asc") return <ArrowUp className="w-3.5 h-3.5 ml-1 inline" />;
  if (sorted === "desc") return <ArrowDown className="w-3.5 h-3.5 ml-1 inline" />;
  return <ArrowUpDown className="w-3.5 h-3.5 ml-1 inline opacity-40" />;
}

function CharCount({ value, max }: { value: string; max: number }) {
  const len = value.length;
  const pct = len / max;
  const color = pct >= 1 ? "text-destructive" : pct >= 0.8 ? "text-yellow-500" : "text-muted-foreground";
  return <span className={`text-xs ${color}`}>{len}/{max}</span>;
}

const columnHelper = createColumnHelper<Report>();

export default function AdminReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [positionFilter, setPositionFilter] = useState("all");

  const [scouts, setScouts] = useState<{ id: string; name: string }[]>([]);
  const [players, setPlayers] = useState<PlayerOption[]>([]);
  const [playerOpen, setPlayerOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [viewOpen, setViewOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Report | null>(null);
  const [form, setForm] = useState<Partial<Report> & { scout_id?: string }>({});
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    client.get<{ id: string; name: string }[]>("/admin/scouts")
      .then(({ data }) => setScouts(data))
      .catch(() => {});
    client.get<{ items: PlayerOption[]; total: number }>("/admin/players")
      .then(({ data }) => setPlayers(data.items))
      .catch(() => {});
  }, []);

  useEffect(() => {
    client.get<{ items: Report[]; total: number }>("/admin/reports")
      .then(({ data }) => setReports(data.items))
      .catch(() => setError("Failed to load reports."))
      .finally(() => setLoading(false));
  }, []);

  const positions = useMemo(() => Array.from(new Set(reports.map(r => r.position))).sort(), [reports]);

  const filtered = useMemo(() => reports.filter(r => {
    const q = globalFilter.toLowerCase();
    const matchSearch = !q || r.player_name.toLowerCase().includes(q) || r.scout_name.toLowerCase().includes(q);
    const matchStatus = statusFilter === "all" || r.status === statusFilter;
    const matchPos = positionFilter === "all" || r.position === positionFilter;
    return matchSearch && matchStatus && matchPos;
  }), [reports, globalFilter, statusFilter, positionFilter]);

  const openCreate = () => {
    setForm({ player_id: "", player_name: "", position: "ST", scout_id: "none", rating: 75, status: "draft", notes: "" });
    setIsCreating(true);
    setEditOpen(true);
  };

  const openEdit = (report: Report) => {
    setForm({ ...report, player_id: report.player_id ?? "" });
    setIsCreating(false);
    setEditOpen(true);
  };

  const notesLen = form.notes?.length ?? 0;
  const hasErrors =
    !form.player_id?.trim() ||
    !form.position?.trim() ||
    (isCreating && (!form.scout_id || form.scout_id === "none")) ||
    notesLen > 2000 ||
    !form.rating || (form.rating as number) < 1 || (form.rating as number) > 100;

  const columns = useMemo(() => [
    columnHelper.accessor("player_name", {
      header: ({ column }) => <button onClick={() => column.toggleSorting()} className="flex items-center">Player <SortIcon column={column} /></button>,
      cell: info => (
        <div>
          <div className="font-medium text-sm">{info.getValue()}</div>
          <div className="text-xs text-muted-foreground">{info.row.original.position}</div>
        </div>
      ),
    }),
    columnHelper.accessor("scout_name", {
      header: ({ column }) => <button onClick={() => column.toggleSorting()} className="flex items-center">Scout <SortIcon column={column} /></button>,
      cell: info => <span className="text-sm">{info.getValue()}</span>,
    }),
    columnHelper.accessor("rating", {
      header: ({ column }) => <button onClick={() => column.toggleSorting()} className="flex items-center">Rating <SortIcon column={column} /></button>,
      cell: info => (
        <div className="flex items-center gap-1">
          <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
          <span className="font-semibold text-primary">{info.getValue()}</span>
          <span className="text-xs text-muted-foreground">/100</span>
        </div>
      ),
    }),
    columnHelper.accessor("status", {
      header: "Status",
      cell: info => <StatusBadge status={info.getValue()} />,
    }),
    columnHelper.accessor("created_at", {
      header: ({ column }) => <button onClick={() => column.toggleSorting()} className="flex items-center">Date <SortIcon column={column} /></button>,
      cell: info => <span className="text-sm text-muted-foreground">{formatDate(info.getValue())}</span>,
    }),
    columnHelper.display({
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex gap-1">
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setSelected(row.original); setViewOpen(true); }}>
            <Eye className="w-4 h-4" />
          </Button>
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(row.original)}>
            <Edit2 className="w-4 h-4" />
          </Button>
          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteId(row.original.id)}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ),
    }),
  ], []);

  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  });

  const saveReport = async () => {
    setSaving(true);
    try {
      if (!isCreating) {
        const { data } = await client.put<Report>(`/admin/reports/${form.id}`, {
          player_id: form.player_id || null,
          player_name: form.player_name,
          position: form.position,
          rating: form.rating,
          status: form.status,
          notes: form.notes || null,
        });
        setReports(prev => prev.map(r => r.id === form.id ? data : r));
        setEditOpen(false);
        toast.success("Report updated successfully.");
      } else {
        const { data } = await client.post<Report>("/admin/reports", {
          scout_id: form.scout_id === "none" ? null : form.scout_id,
          player_id: form.player_id || null,
          player_name: form.player_name,
          position: form.position,
          rating: form.rating,
          status: form.status,
          notes: form.notes || null,
        });
        setReports(prev => [data, ...prev]);
        setEditOpen(false);
        toast.success("Report created.");
      }
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      if (err.response?.status === 404) toast.error(typeof detail === "string" ? detail : "Scout not found.");
      else toast.error(typeof detail === "string" ? detail : isCreating ? "Failed to create report." : "Failed to update report.");
    } finally {
      setSaving(false);
    }
  };

  const deleteReport = async (id: string) => {
    setDeleteId(null);
    setReports(prev => prev.filter(r => r.id !== id));
    try {
      await client.delete(`/admin/reports/${id}`);
      toast.success("Report deleted.");
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      toast.error(typeof detail === "string" ? detail : "Failed to delete report.");
    }
  };

  const counts = useMemo(() => ({
    total:     reports.length,
    submitted: reports.filter(r => r.status === "submitted").length,
    approved:  reports.filter(r => r.status === "approved").length,
    rejected:  reports.filter(r => r.status === "rejected").length,
  }), [reports]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Spinner size="lg" label="Loading reports…" />
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
          <h1 className="text-2xl font-display font-bold">Reports</h1>
          <p className="text-muted-foreground text-sm">Manage all scouting reports across the platform</p>
        </div>
        <Button onClick={openCreate} className="gap-2"><FileText className="w-4 h-4" />Add Report</Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Reports",  value: counts.total,     icon: FileText,    color: "text-primary" },
          { label: "Pending Review", value: counts.submitted, icon: Clock,       color: "text-blue-400" },
          { label: "Approved",       value: counts.approved,  icon: CheckCircle, color: "text-emerald-400" },
          { label: "Rejected",       value: counts.rejected,  icon: XCircle,     color: "text-destructive" },
        ].map(card => (
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
          <Input placeholder="Search player or scout..." className="pl-10" value={globalFilter} onChange={e => setGlobalFilter(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="All Statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="submitted">Submitted</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
        <Select value={positionFilter} onValueChange={setPositionFilter}>
          <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="All Positions" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Positions</SelectItem>
            {positions.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/30">
              {table.getHeaderGroups().map(hg => (
                <tr key={hg.id}>
                  {hg.headers.map(header => (
                    <th key={header.id} className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.length === 0 ? (
                <tr><td colSpan={columns.length} className="text-center py-12 text-muted-foreground">No reports found</td></tr>
              ) : table.getRowModel().rows.map(row => (
                <tr key={row.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id} className="px-4 py-3">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-border">
          <span className="text-sm text-muted-foreground">
            Page {table.getState().pagination.pageIndex + 1} of {Math.max(1, table.getPageCount())} · {filtered.length} reports
          </span>
          <div className="flex gap-1">
            <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            {Array.from({ length: table.getPageCount() }, (_, i) => (
              <Button key={i} size="icon" variant={table.getState().pagination.pageIndex === i ? "default" : "outline"} className="h-8 w-8 text-xs" onClick={() => table.setPageIndex(i)}>
                {i + 1}
              </Button>
            ))}
            <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* View modal */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Scouting Report
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4 overflow-y-auto max-h-[70vh]">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-lg">{selected.player_name}</h3>
                  <p className="text-sm text-muted-foreground">{selected.position}</p>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1 justify-end">
                    <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                    <span className="text-xl font-bold text-primary">{selected.rating}</span>
                    <span className="text-sm text-muted-foreground">/100</span>
                  </div>
                  <StatusBadge status={selected.status} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-muted/30 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground mb-1">Scout</p>
                  <p className="font-medium">{selected.scout_name}</p>
                </div>
                <div className="bg-muted/30 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground mb-1">Date</p>
                  <p className="font-medium">{formatDate(selected.created_at)}</p>
                </div>
              </div>
              {selected.notes && (
                <div className="bg-muted/30 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground mb-1">Scout Notes</p>
                  <p className="text-sm break-words">{selected.notes}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            {selected && (
              <Button variant="outline" onClick={() => { setViewOpen(false); openEdit(selected); }}>Edit Report</Button>
            )}
            <Button onClick={() => setViewOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit / Create modal */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{isCreating ? "Add Report" : "Edit Report"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 overflow-y-auto max-h-[70vh]">
            <div className="space-y-1.5">
              <Label>Player *</Label>
              <Popover open={playerOpen} onOpenChange={setPlayerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between font-normal"
                  >
                    {form.player_id ? form.player_name : "Select player…"}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="p-0" style={{ width: "var(--radix-popover-trigger-width)" }}>
                  <Command>
                    <CommandInput placeholder="Search players…" />
                    <CommandList>
                      <CommandEmpty>No players found.</CommandEmpty>
                      <CommandGroup>
                        {players.map((p) => (
                          <CommandItem
                            key={p.id}
                            value={`${p.first_name} ${p.last_name} ${p.position}`}
                            onSelect={() => {
                              setForm(f => ({
                                ...f,
                                player_id: p.id,
                                player_name: `${p.first_name} ${p.last_name}`,
                                position: p.position,
                              }));
                              setPlayerOpen(false);
                            }}
                          >
                            <Check className={`mr-2 h-4 w-4 ${form.player_id === p.id ? "opacity-100" : "opacity-0"}`} />
                            <span>{p.first_name} {p.last_name}</span>
                            <span className="ml-auto text-xs text-muted-foreground">{p.position}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Position</Label>
                <Select value={form.position ?? "ST"} onValueChange={v => setForm(f => ({ ...f, position: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {POSITIONS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Rating (1–100)</Label>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={form.rating ?? ""}
                  onChange={e => {
                    const raw = e.target.value;
                    if (raw === "") {
                      setForm(f => ({ ...f, rating: undefined as any }));
                    } else {
                      const parsed = parseInt(raw, 10);
                      if (!isNaN(parsed)) {
                        e.target.value = String(parsed);
                        setForm(f => ({ ...f, rating: parsed }));
                      }
                    }
                  }}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>{isCreating ? "Scout *" : "Scout"}</Label>
                {isCreating ? (
                  <Select value={form.scout_id ?? "none"} onValueChange={v => setForm(f => ({ ...f, scout_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select scout" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Select scout…</SelectItem>
                      {scouts.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input value={form.scout_name ?? ""} readOnly className="bg-muted/50 opacity-70" />
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={form.status ?? "draft"} onValueChange={v => setForm(f => ({ ...f, status: v as ReportStatus }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="submitted">Submitted</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>Notes</Label>
                <CharCount value={form.notes ?? ""} max={2000} />
              </div>
              <Textarea
                rows={6}
                value={form.notes ?? ""}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Scout observations and analysis..."
                className={notesLen > 2000 ? "border-destructive focus-visible:ring-destructive" : ""}
              />
              {notesLen > 2000 && <p className="text-xs text-destructive">Exceeds 2000 character limit</p>}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={saveReport} disabled={saving || hasErrors}>
              {saving ? "Saving…" : isCreating ? "Add Report" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={deleteId !== null} onOpenChange={open => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Report?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently remove the report. This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId !== null && deleteReport(deleteId)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
