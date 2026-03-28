import { useState, useMemo } from "react";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  FileText, Eye, Trash2, ArrowUpDown, ArrowUp, ArrowDown,
  ChevronLeft, ChevronRight, Search, CheckCircle, Clock, XCircle, Star
} from "lucide-react";

type ReportStatus = "Draft" | "Submitted" | "Approved" | "Rejected";

interface Report {
  id: number;
  player: string;
  position: string;
  club: string;
  scout: string;
  scoutClub: string;
  rating: number;
  status: ReportStatus;
  date: string;
  notes: string;
}

const initialReports: Report[] = [
  { id: 1, player: "Lamine Yamal", position: "RW", club: "FC Barcelona", scout: "Carlos Mendez", scoutClub: "Real Madrid", rating: 91, status: "Approved", date: "2025-03-10", notes: "Exceptional dribbling and vision. Strong candidate for next season." },
  { id: 2, player: "Kobbie Mainoo", position: "CM", club: "Man United", scout: "James Harrison", scoutClub: "Arsenal FC", rating: 82, status: "Submitted", date: "2025-03-14", notes: "Composed under pressure, good passing range. Worth monitoring closely." },
  { id: 3, player: "Florian Wirtz", position: "AM", club: "Bayer Leverkusen", scout: "Hans Müller", scoutClub: "Bayern Munich", rating: 89, status: "Approved", date: "2025-03-05", notes: "World-class technical ability. Contract situation needs watching." },
  { id: 4, player: "Gavi", position: "CM", club: "FC Barcelona", scout: "Carlos Mendez", scoutClub: "Real Madrid", rating: 85, status: "Draft", date: "2025-03-18", notes: "Still recovering from injury. Talent undeniable but fitness concerns remain." },
  { id: 5, player: "Pedri", position: "CM", club: "FC Barcelona", scout: "Marco Rossi", scoutClub: "Juventus FC", rating: 88, status: "Approved", date: "2025-02-28", notes: "Full recovery from injury. Back to best form and leading midfield." },
  { id: 6, player: "Bukayo Saka", position: "RW", club: "Arsenal FC", scout: "James Harrison", scoutClub: "Arsenal FC", rating: 90, status: "Approved", date: "2025-02-20", notes: "Consistent performer across all metrics. Key player for the season." },
  { id: 7, player: "Jude Bellingham", position: "AM", club: "Real Madrid", scout: "Carlos Mendez", scoutClub: "Real Madrid", rating: 93, status: "Submitted", date: "2025-03-20", notes: "Dominant in all phases. Goals and assists at a historic rate for position." },
  { id: 8, player: "Warren Zaïre-Emery", position: "CM", club: "PSG", scout: "Pierre Dupont", scoutClub: "Olympique Lyon", rating: 83, status: "Draft", date: "2025-03-22", notes: "Promising young midfielder. Needs consistent minutes to develop further." },
  { id: 9, player: "Endrick", position: "ST", club: "Real Madrid", scout: "Carlos Mendez", scoutClub: "Real Madrid", rating: 80, status: "Rejected", date: "2025-03-01", notes: "Needs more adaptation time to the European game. Revisit in six months." },
  { id: 10, player: "Alejandro Garnacho", position: "LW", club: "Man United", scout: "James Harrison", scoutClub: "Arsenal FC", rating: 81, status: "Submitted", date: "2025-03-16", notes: "Creative and direct. Transfer window interest expected from top clubs." },
  { id: 11, player: "Mathys Tel", position: "ST", club: "Bayern Munich", scout: "Hans Müller", scoutClub: "Bayern Munich", rating: 79, status: "Draft", date: "2025-03-25", notes: "Rotation role limiting development. Loan move could accelerate growth." },
  { id: 12, player: "Bradley Barcola", position: "LW", club: "PSG", scout: "Pierre Dupont", scoutClub: "Olympique Lyon", rating: 84, status: "Approved", date: "2025-03-08", notes: "Pace and directness a constant threat. Improving final-third decision-making." },
  { id: 13, player: "Savinho", position: "RW", club: "Man City", scout: "James Harrison", scoutClub: "Arsenal FC", rating: 83, status: "Submitted", date: "2025-03-19", notes: "Dynamic winger with excellent ball carrying. Defensive work rate improving." },
  { id: 14, player: "Manu Koné", position: "CM", club: "Roma", scout: "Marco Rossi", scoutClub: "Juventus FC", rating: 80, status: "Rejected", date: "2025-02-15", notes: "Good athleticism but not the profile we need. Reported for completeness." },
  { id: 15, player: "Antonio Silva", position: "CB", club: "Benfica", scout: "Carlos Mendez", scoutClub: "Real Madrid", rating: 85, status: "Approved", date: "2025-03-12", notes: "Dominant in the air and strong in duels. Potential elite CB for next decade." },
];

const statusConfig: Record<ReportStatus, { label: string; className: string; icon: React.ElementType }> = {
  Draft:     { label: "Draft",     className: "bg-muted text-muted-foreground",           icon: Clock },
  Submitted: { label: "Submitted", className: "bg-blue-500/20 text-blue-400",             icon: FileText },
  Approved:  { label: "Approved",  className: "bg-emerald-500/20 text-emerald-400",       icon: CheckCircle },
  Rejected:  { label: "Rejected",  className: "bg-destructive/20 text-destructive",       icon: XCircle },
};

function StatusBadge({ status }: { status: ReportStatus }) {
  const cfg = statusConfig[status];
  return <Badge className={`gap-1 ${cfg.className}`}><cfg.icon className="w-3 h-3" />{cfg.label}</Badge>;
}

function SortIcon({ column }: { column: any }) {
  const sorted = column.getIsSorted();
  if (sorted === "asc") return <ArrowUp className="w-3.5 h-3.5 ml-1 inline" />;
  if (sorted === "desc") return <ArrowDown className="w-3.5 h-3.5 ml-1 inline" />;
  return <ArrowUpDown className="w-3.5 h-3.5 ml-1 inline opacity-40" />;
}

const columnHelper = createColumnHelper<Report>();

export default function AdminReportsPage() {
  const [reports, setReports] = useState<Report[]>(initialReports);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [positionFilter, setPositionFilter] = useState("all");

  const [viewOpen, setViewOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [selected, setSelected] = useState<Report | null>(null);

  const [form, setForm] = useState<Partial<Report>>({});
  const [isCreating, setIsCreating] = useState(false);

  const positions = useMemo(() => Array.from(new Set(reports.map(r => r.position))).sort(), [reports]);

  const filtered = useMemo(() => reports.filter(r => {
    const q = globalFilter.toLowerCase();
    const matchSearch = !q || r.player.toLowerCase().includes(q) || r.scout.toLowerCase().includes(q) || r.club.toLowerCase().includes(q) || r.scoutClub.toLowerCase().includes(q);
    const matchStatus = statusFilter === "all" || r.status === statusFilter;
    const matchPos = positionFilter === "all" || r.position === positionFilter;
    return matchSearch && matchStatus && matchPos;
  }), [reports, globalFilter, statusFilter, positionFilter]);

  const columns = useMemo(() => [
    columnHelper.accessor("player", {
      header: ({ column }) => <button onClick={() => column.toggleSorting()} className="flex items-center">Player <SortIcon column={column} /></button>,
      cell: info => (
        <div>
          <div className="font-medium text-sm">{info.getValue()}</div>
          <div className="text-xs text-muted-foreground">{info.row.original.position} · {info.row.original.club}</div>
        </div>
      ),
    }),
    columnHelper.accessor("scout", {
      header: ({ column }) => <button onClick={() => column.toggleSorting()} className="flex items-center">Scout <SortIcon column={column} /></button>,
      cell: info => (
        <div>
          <div className="text-sm">{info.getValue()}</div>
          <div className="text-xs text-muted-foreground">{info.row.original.scoutClub}</div>
        </div>
      ),
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
    columnHelper.accessor("date", {
      header: ({ column }) => <button onClick={() => column.toggleSorting()} className="flex items-center">Date <SortIcon column={column} /></button>,
      cell: info => <span className="text-sm text-muted-foreground">{new Date(info.getValue()).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</span>,
    }),
    columnHelper.display({
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex gap-1">
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setSelected(row.original); setViewOpen(true); }}>
            <Eye className="w-4 h-4" />
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

  const openCreate = () => {
    setForm({ player: "", position: "", club: "", scout: "", scoutClub: "", rating: 75, status: "Draft", date: new Date().toISOString().split("T")[0], notes: "" });
    setIsCreating(true);
    setEditOpen(true);
  };

  const openEdit = (report: Report) => {
    setForm({ ...report });
    setIsCreating(false);
    setEditOpen(true);
  };

  const saveReport = () => {
    if (isCreating) {
      const newReport = { ...form, id: Date.now() } as Report;
      setReports(prev => [newReport, ...prev]);
    } else {
      setReports(prev => prev.map(r => r.id === form.id ? { ...r, ...form } as Report : r));
    }
    setEditOpen(false);
  };

  const deleteReport = (id: number) => {
    setReports(prev => prev.filter(r => r.id !== id));
    setDeleteId(null);
  };

  const counts = useMemo(() => ({
    total: reports.length,
    submitted: reports.filter(r => r.status === "Submitted").length,
    approved: reports.filter(r => r.status === "Approved").length,
    rejected: reports.filter(r => r.status === "Rejected").length,
  }), [reports]);

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
          { label: "Total Reports", value: counts.total, icon: FileText, color: "text-primary" },
          { label: "Pending Review", value: counts.submitted, icon: Clock, color: "text-blue-400" },
          { label: "Approved", value: counts.approved, icon: CheckCircle, color: "text-emerald-400" },
          { label: "Rejected", value: counts.rejected, icon: XCircle, color: "text-destructive" },
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
          <Input placeholder="Search player, scout, club..." className="pl-10" value={globalFilter} onChange={e => setGlobalFilter(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="All Statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="Draft">Draft</SelectItem>
            <SelectItem value="Submitted">Submitted</SelectItem>
            <SelectItem value="Approved">Approved</SelectItem>
            <SelectItem value="Rejected">Rejected</SelectItem>
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
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()} · {filtered.length} reports
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Scouting Report
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-lg">{selected.player}</h3>
                  <p className="text-sm text-muted-foreground">{selected.position} · {selected.club}</p>
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
                  <p className="font-medium">{selected.scout}</p>
                  <p className="text-xs text-muted-foreground">{selected.scoutClub}</p>
                </div>
                <div className="bg-muted/30 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground mb-1">Date Submitted</p>
                  <p className="font-medium">{new Date(selected.date).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}</p>
                </div>
              </div>
              <div className="bg-muted/30 rounded-lg p-3">
                <p className="text-xs text-muted-foreground mb-1">Scout Notes</p>
                <p className="text-sm">{selected.notes}</p>
              </div>
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{isCreating ? "Add Report" : "Edit Report"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Player Name</Label>
                <Input value={form.player ?? ""} onChange={e => setForm(f => ({ ...f, player: e.target.value }))} placeholder="Player name" />
              </div>
              <div className="space-y-1.5">
                <Label>Position</Label>
                <Input value={form.position ?? ""} onChange={e => setForm(f => ({ ...f, position: e.target.value }))} placeholder="e.g. CM, ST, CB" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Player Club</Label>
                <Input value={form.club ?? ""} onChange={e => setForm(f => ({ ...f, club: e.target.value }))} placeholder="Current club" />
              </div>
              <div className="space-y-1.5">
                <Label>Scout Name</Label>
                <Input value={form.scout ?? ""} onChange={e => setForm(f => ({ ...f, scout: e.target.value }))} placeholder="Scout name" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Scout Club</Label>
                <Input value={form.scoutClub ?? ""} onChange={e => setForm(f => ({ ...f, scoutClub: e.target.value }))} placeholder="Scout's club" />
              </div>
              <div className="space-y-1.5">
                <Label>Rating (1–100)</Label>
                <Input type="number" min={1} max={100} value={form.rating ?? ""} onChange={e => setForm(f => ({ ...f, rating: Number(e.target.value) }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={form.status ?? "Draft"} onValueChange={v => setForm(f => ({ ...f, status: v as ReportStatus }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Draft">Draft</SelectItem>
                    <SelectItem value="Submitted">Submitted</SelectItem>
                    <SelectItem value="Approved">Approved</SelectItem>
                    <SelectItem value="Rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Date</Label>
                <Input type="date" value={form.date ?? ""} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea rows={4} value={form.notes ?? ""} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Scout observations and analysis..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={saveReport}>{isCreating ? "Add Report" : "Save Changes"}</Button>
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
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => deleteId !== null && deleteReport(deleteId)}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
