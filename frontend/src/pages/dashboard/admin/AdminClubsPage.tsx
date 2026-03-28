import { useState, useMemo } from "react";
import {
  useReactTable, getCoreRowModel, getSortedRowModel,
  getFilteredRowModel, getPaginationRowModel,
  flexRender, ColumnDef, SortingState,
} from "@tanstack/react-table";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Edit2, Trash2, Search, ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, Building2 } from "lucide-react";

interface Club {
  id: number;
  name: string;
  country: string;
  league: string;
  scouts: number;
  players: number;
  status: "Active" | "Pending" | "Suspended";
  joinedAt: string;
}

const initialClubs: Club[] = [
  { id: 1,  name: "Bayern Munich",      country: "Germany",  league: "Bundesliga",     scouts: 12, players: 28, status: "Active",    joinedAt: "2025-08-01" },
  { id: 2,  name: "FC Barcelona",       country: "Spain",    league: "La Liga",        scouts: 15, players: 26, status: "Active",    joinedAt: "2025-08-05" },
  { id: 3,  name: "Manchester City",    country: "England",  league: "Premier League", scouts: 10, players: 27, status: "Active",    joinedAt: "2025-08-10" },
  { id: 4,  name: "PSG",               country: "France",   league: "Ligue 1",        scouts: 8,  players: 25, status: "Pending",   joinedAt: "2025-09-01" },
  { id: 5,  name: "SC Freiburg",        country: "Germany",  league: "Bundesliga",     scouts: 5,  players: 28, status: "Active",    joinedAt: "2025-09-10" },
  { id: 6,  name: "Arsenal",            country: "England",  league: "Premier League", scouts: 9,  players: 26, status: "Active",    joinedAt: "2025-09-15" },
  { id: 7,  name: "Real Madrid",        country: "Spain",    league: "La Liga",        scouts: 14, players: 27, status: "Active",    joinedAt: "2025-09-20" },
  { id: 8,  name: "B. Leverkusen",      country: "Germany",  league: "Bundesliga",     scouts: 7,  players: 24, status: "Active",    joinedAt: "2025-10-01" },
  { id: 9,  name: "Liverpool",          country: "England",  league: "Premier League", scouts: 11, players: 26, status: "Active",    joinedAt: "2025-10-05" },
  { id: 10, name: "Atletico Madrid",    country: "Spain",    league: "La Liga",        scouts: 8,  players: 25, status: "Active",    joinedAt: "2025-10-10" },
  { id: 11, name: "Borussia Dortmund",  country: "Germany",  league: "Bundesliga",     scouts: 6,  players: 27, status: "Active",    joinedAt: "2025-10-15" },
  { id: 12, name: "Juventus",           country: "Italy",    league: "Serie A",        scouts: 7,  players: 26, status: "Pending",   joinedAt: "2025-11-01" },
  { id: 13, name: "AC Milan",           country: "Italy",    league: "Serie A",        scouts: 6,  players: 25, status: "Active",    joinedAt: "2025-11-05" },
  { id: 14, name: "Monaco",             country: "France",   league: "Ligue 1",        scouts: 4,  players: 23, status: "Active",    joinedAt: "2025-11-10" },
  { id: 15, name: "Ajax",               country: "Netherlands", league: "Eredivisie",  scouts: 5,  players: 25, status: "Suspended", joinedAt: "2025-08-20" },
];

const leagues = ["Bundesliga", "La Liga", "Premier League", "Ligue 1", "Serie A", "Eredivisie", "Other"];
const statusColors: Record<Club["status"], string> = {
  Active:    "bg-primary/10 text-primary border-primary/20",
  Pending:   "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  Suspended: "bg-destructive/10 text-destructive border-destructive/20",
};

function SortIcon({ d }: { d: "asc" | "desc" | false }) {
  if (!d) return <ArrowUpDown className="w-3.5 h-3.5 ml-1 opacity-40" />;
  return d === "asc" ? <ArrowUp className="w-3.5 h-3.5 ml-1 text-primary" /> : <ArrowDown className="w-3.5 h-3.5 ml-1 text-primary" />;
}

const emptyForm = { name: "", country: "", league: "Bundesliga", scouts: "", players: "", status: "Active" as Club["status"] };

export default function AdminClubsPage() {
  const [clubs, setClubs] = useState<Club[]>(initialClubs);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [leagueFilter, setLeagueFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Club | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const filtered = useMemo(() => clubs.filter((c) => {
    const q = globalFilter.toLowerCase();
    const matchSearch = !q || c.name.toLowerCase().includes(q) || c.country.toLowerCase().includes(q);
    const matchStatus = statusFilter === "all" || c.status === statusFilter;
    const matchLeague = leagueFilter === "all" || c.league === leagueFilter;
    return matchSearch && matchStatus && matchLeague;
  }), [clubs, globalFilter, statusFilter, leagueFilter]);

  const columns: ColumnDef<Club>[] = useMemo(() => [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <button className="flex items-center font-medium hover:text-foreground" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Club <SortIcon d={column.getIsSorted()} />
        </button>
      ),
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.name}</div>
          <div className="text-xs text-muted-foreground">{row.original.country}</div>
        </div>
      ),
    },
    {
      accessorKey: "league",
      header: "League",
      cell: ({ getValue }) => <span className="text-sm">{getValue() as string}</span>,
    },
    {
      accessorKey: "scouts",
      header: ({ column }) => (
        <button className="flex items-center font-medium hover:text-foreground" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Scouts <SortIcon d={column.getIsSorted()} />
        </button>
      ),
    },
    {
      accessorKey: "players",
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
        const v = getValue() as Club["status"];
        return <Badge variant="outline" className={statusColors[v]}>{v}</Badge>;
      },
    },
    {
      accessorKey: "joinedAt",
      header: ({ column }) => (
        <button className="flex items-center font-medium hover:text-foreground" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Joined <SortIcon d={column.getIsSorted()} />
        </button>
      ),
      cell: ({ getValue }) => <span className="text-muted-foreground text-xs">{getValue() as string}</span>,
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(row.original)}><Edit2 className="w-3.5 h-3.5" /></Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteId(row.original.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
        </div>
      ),
    },
  ], []);

  const table = useReactTable({
    data: filtered, columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  });

  const openCreate = () => { setEditTarget(null); setForm(emptyForm); setModalOpen(true); };
  const openEdit = (c: Club) => {
    setEditTarget(c);
    setForm({ name: c.name, country: c.country, league: c.league, scouts: String(c.scouts), players: String(c.players), status: c.status });
    setModalOpen(true);
  };
  const handleSave = () => {
    const entry = { name: form.name, country: form.country, league: form.league, scouts: Number(form.scouts), players: Number(form.players), status: form.status };
    if (editTarget) {
      setClubs((p) => p.map((c) => c.id === editTarget.id ? { ...c, ...entry } : c));
    } else {
      setClubs((p) => [...p, { id: Date.now(), ...entry, joinedAt: new Date().toISOString().slice(0, 10) }]);
    }
    setModalOpen(false);
  };
  const handleDelete = () => {
    if (deleteId !== null) { setClubs((p) => p.filter((c) => c.id !== deleteId)); setDeleteId(null); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold">Clubs</h1>
          <p className="text-muted-foreground mt-1">Manage all registered clubs</p>
        </div>
        <Button variant="hero" size="sm" onClick={openCreate}><Plus className="w-4 h-4 mr-2" /> Add Club</Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total", value: clubs.length },
          { label: "Active", value: clubs.filter((c) => c.status === "Active").length },
          { label: "Pending", value: clubs.filter((c) => c.status === "Pending").length },
          { label: "Suspended", value: clubs.filter((c) => c.status === "Suspended").length },
        ].map((s) => (
          <Card key={s.label} className="hover-lift">
            <CardContent className="pt-4 pb-3">
              <Building2 className="w-4 h-4 text-primary mb-1" />
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
          <Input placeholder="Search by name or country..." className="pl-10 bg-muted/50" value={globalFilter} onChange={(e) => setGlobalFilter(e.target.value)} />
        </div>
        <Select value={leagueFilter} onValueChange={setLeagueFilter}>
          <SelectTrigger className="w-full sm:w-48 bg-muted/50"><SelectValue placeholder="All Leagues" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Leagues</SelectItem>
            {leagues.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-36 bg-muted/50"><SelectValue placeholder="All Statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="Active">Active</SelectItem>
            <SelectItem value="Pending">Pending</SelectItem>
            <SelectItem value="Suspended">Suspended</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="text-sm text-muted-foreground">{filtered.length} club{filtered.length !== 1 ? "s" : ""}</div>

      <Card>
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

      {/* Create / Edit modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle className="font-display">{editTarget ? "Edit Club" : "Add Club"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2"><Label>Club Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="bg-muted/50" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Country</Label><Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} className="bg-muted/50" /></div>
              <div className="space-y-2"><Label>League</Label>
                <Select value={form.league} onValueChange={(v) => setForm({ ...form, league: v })}>
                  <SelectTrigger className="bg-muted/50"><SelectValue /></SelectTrigger>
                  <SelectContent>{leagues.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2"><Label>Scouts</Label><Input type="number" min={0} value={form.scouts} onChange={(e) => setForm({ ...form, scouts: e.target.value })} className="bg-muted/50" /></div>
              <div className="space-y-2"><Label>Players</Label><Input type="number" min={0} value={form.players} onChange={(e) => setForm({ ...form, players: e.target.value })} className="bg-muted/50" /></div>
              <div className="space-y-2"><Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as Club["status"] })}>
                  <SelectTrigger className="bg-muted/50"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="Active">Active</SelectItem><SelectItem value="Pending">Pending</SelectItem><SelectItem value="Suspended">Suspended</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button variant="hero" onClick={handleSave} disabled={!form.name.trim()}>{editTarget ? "Save Changes" : "Add Club"}</Button>
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
    </div>
  );
}
