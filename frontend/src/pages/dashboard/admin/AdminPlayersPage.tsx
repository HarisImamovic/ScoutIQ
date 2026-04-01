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
import { Plus, Edit2, Trash2, Search, ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, Users } from "lucide-react";

interface Player {
  id: number;
  name: string;
  position: string;
  age: number;
  club: string;
  country: string;
  league: string;
  rating: number;
  status: "Active" | "Injured" | "On Loan" | "Free Agent";
}

const initialPlayers: Player[] = [
  { id: 1,  name: "Lamine Yamal",          position: "RW",  age: 18, club: "FC Barcelona",    country: "Spain",        league: "La Liga",        rating: 92, status: "Active"    },
  { id: 2,  name: "Florian Wirtz",          position: "AM",  age: 20, club: "B. Leverkusen",   country: "Germany",      league: "Bundesliga",     rating: 90, status: "Active"    },
  { id: 3,  name: "Endrick",                position: "ST",  age: 18, club: "Real Madrid",     country: "Brazil",       league: "La Liga",        rating: 85, status: "Active"    },
  { id: 4,  name: "Mathys Tel",             position: "CF",  age: 19, club: "Bayern Munich",   country: "France",       league: "Bundesliga",     rating: 84, status: "Active"    },
  { id: 5,  name: "Gavi",                   position: "CM",  age: 21, club: "FC Barcelona",    country: "Spain",        league: "La Liga",        rating: 87, status: "Injured"   },
  { id: 6,  name: "Jude Bellingham",        position: "AM",  age: 22, club: "Real Madrid",     country: "England",      league: "La Liga",        rating: 93, status: "Active"    },
  { id: 7,  name: "Bukayo Saka",            position: "RW",  age: 23, club: "Arsenal",         country: "England",      league: "Premier League", rating: 91, status: "Active"    },
  { id: 8,  name: "Phil Foden",             position: "AM",  age: 24, club: "Manchester City", country: "England",      league: "Premier League", rating: 90, status: "Active"    },
  { id: 9,  name: "Pedri",                  position: "CM",  age: 22, club: "FC Barcelona",    country: "Spain",        league: "La Liga",        rating: 89, status: "Active"    },
  { id: 10, name: "Vinicius Jr",            position: "LW",  age: 24, club: "Real Madrid",     country: "Brazil",       league: "La Liga",        rating: 94, status: "Active"    },
  { id: 11, name: "Erling Haaland",         position: "ST",  age: 24, club: "Manchester City", country: "Norway",       league: "Premier League", rating: 95, status: "Active"    },
  { id: 12, name: "Khvicha Kvaratskhelia",  position: "LW",  age: 23, club: "PSG",             country: "Georgia",      league: "Ligue 1",        rating: 88, status: "Active"    },
  { id: 13, name: "Alex Johnson",           position: "CAM", age: 23, club: "SC Freiburg",     country: "England",      league: "Bundesliga",     rating: 74, status: "Active"    },
  { id: 14, name: "Rayan Cherki",           position: "AM",  age: 21, club: "Borussia Dortmund", country: "France",     league: "Bundesliga",     rating: 83, status: "Active"    },
  { id: 15, name: "Warren Zaïre-Emery",     position: "CM",  age: 18, club: "PSG",             country: "France",       league: "Ligue 1",        rating: 82, status: "On Loan"   },
];

const positions = ["GK","CB","LB","RB","CDM","CM","AM","CAM","LW","RW","CF","ST"];
const statusColors: Record<Player["status"], string> = {
  Active:     "bg-primary/10 text-primary border-primary/20",
  Injured:    "bg-destructive/10 text-destructive border-destructive/20",
  "On Loan":  "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  "Free Agent": "bg-purple-500/10 text-purple-500 border-purple-500/20",
};

function SortIcon({ d }: { d: "asc" | "desc" | false }) {
  if (!d) return <ArrowUpDown className="w-3.5 h-3.5 ml-1 opacity-40" />;
  return d === "asc" ? <ArrowUp className="w-3.5 h-3.5 ml-1 text-primary" /> : <ArrowDown className="w-3.5 h-3.5 ml-1 text-primary" />;
}

const emptyForm = { name: "", position: "ST", age: "", club: "", country: "", league: "", rating: "", status: "Active" as Player["status"] };

export default function AdminPlayersPage() {
  const [players, setPlayers] = useState<Player[]>(initialPlayers);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [posFilter, setPosFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Player | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const filtered = useMemo(() => players.filter((p) => {
    const q = globalFilter.toLowerCase();
    const matchSearch = !q || p.name.toLowerCase().includes(q) || p.club.toLowerCase().includes(q) || p.country.toLowerCase().includes(q);
    const matchPos = posFilter === "all" || p.position === posFilter;
    const matchStatus = statusFilter === "all" || p.status === statusFilter;
    return matchSearch && matchPos && matchStatus;
  }), [players, globalFilter, posFilter, statusFilter]);

  const columns: ColumnDef<Player>[] = useMemo(() => [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <button className="flex items-center font-medium hover:text-foreground" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Player <SortIcon d={column.getIsSorted()} />
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
      accessorKey: "position",
      header: "Pos",
      cell: ({ getValue }) => <Badge variant="outline" className="text-xs">{getValue() as string}</Badge>,
    },
    {
      accessorKey: "age",
      header: ({ column }) => (
        <button className="flex items-center font-medium hover:text-foreground" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Age <SortIcon d={column.getIsSorted()} />
        </button>
      ),
    },
    {
      accessorKey: "club",
      header: ({ column }) => (
        <button className="flex items-center font-medium hover:text-foreground" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Club <SortIcon d={column.getIsSorted()} />
        </button>
      ),
    },
    {
      accessorKey: "rating",
      header: ({ column }) => (
        <button className="flex items-center font-medium hover:text-foreground" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Rating <SortIcon d={column.getIsSorted()} />
        </button>
      ),
      cell: ({ getValue }) => <span className="font-display font-bold text-primary">{getValue() as number}</span>,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ getValue }) => {
        const v = getValue() as Player["status"];
        return <Badge variant="outline" className={statusColors[v]}>{v}</Badge>;
      },
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
  const openEdit = (p: Player) => {
    setEditTarget(p);
    setForm({ name: p.name, position: p.position, age: String(p.age), club: p.club, country: p.country, league: p.league, rating: String(p.rating), status: p.status });
    setModalOpen(true);
  };
  const handleSave = () => {
    const entry = { name: form.name, position: form.position, age: Number(form.age), club: form.club, country: form.country, league: form.league, rating: Number(form.rating), status: form.status };
    if (editTarget) {
      setPlayers((prev) => prev.map((p) => p.id === editTarget.id ? { ...p, ...entry } : p));
    } else {
      setPlayers((prev) => [...prev, { id: Date.now(), ...entry }]);
    }
    setModalOpen(false);
  };
  const handleDelete = () => {
    if (deleteId !== null) { setPlayers((p) => p.filter((pl) => pl.id !== deleteId)); setDeleteId(null); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold">Players</h1>
          <p className="text-muted-foreground mt-1">Manage all registered players on the platform</p>
        </div>
        <Button variant="hero" size="sm" onClick={openCreate}><Plus className="w-4 h-4 mr-2" /> Add Player</Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total",      value: players.length },
          { label: "Active",     value: players.filter((p) => p.status === "Active").length },
          { label: "Injured",    value: players.filter((p) => p.status === "Injured").length },
          { label: "Free Agents",value: players.filter((p) => p.status === "Free Agent").length },
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
          <Input placeholder="Search by name, club or country..." className="pl-10 bg-muted/50" value={globalFilter} onChange={(e) => setGlobalFilter(e.target.value)} />
        </div>
        <Select value={posFilter} onValueChange={setPosFilter}>
          <SelectTrigger className="w-full sm:w-44 bg-muted/50"><SelectValue placeholder="All Positions" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Positions</SelectItem>
            {positions.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40 bg-muted/50"><SelectValue placeholder="All Statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="Active">Active</SelectItem>
            <SelectItem value="Injured">Injured</SelectItem>
            <SelectItem value="On Loan">On Loan</SelectItem>
            <SelectItem value="Free Agent">Free Agent</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="text-sm text-muted-foreground">{filtered.length} player{filtered.length !== 1 ? "s" : ""}</div>

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
                  <TableRow><TableCell colSpan={columns.length} className="text-center py-10 text-muted-foreground">No players found</TableCell></TableRow>
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
          <DialogHeader><DialogTitle className="font-display">{editTarget ? "Edit Player" : "Add Player"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2"><Label>Full Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="bg-muted/50" /></div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2"><Label>Position</Label>
                <Select value={form.position} onValueChange={(v) => setForm({ ...form, position: v })}>
                  <SelectTrigger className="bg-muted/50"><SelectValue /></SelectTrigger>
                  <SelectContent>{positions.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Age</Label><Input type="number" min={15} max={45} value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} className="bg-muted/50" /></div>
              <div className="space-y-2"><Label>Rating</Label><Input type="number" min={1} max={100} value={form.rating} onChange={(e) => setForm({ ...form, rating: e.target.value })} className="bg-muted/50" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Club</Label><Input value={form.club} onChange={(e) => setForm({ ...form, club: e.target.value })} className="bg-muted/50" /></div>
              <div className="space-y-2"><Label>Country</Label><Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} className="bg-muted/50" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>League</Label><Input value={form.league} onChange={(e) => setForm({ ...form, league: e.target.value })} className="bg-muted/50" /></div>
              <div className="space-y-2"><Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as Player["status"] })}>
                  <SelectTrigger className="bg-muted/50"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Injured">Injured</SelectItem>
                    <SelectItem value="On Loan">On Loan</SelectItem>
                    <SelectItem value="Free Agent">Free Agent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button variant="hero" onClick={handleSave} disabled={!form.name.trim()}>{editTarget ? "Save Changes" : "Add Player"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete Player</AlertDialogTitle><AlertDialogDescription>This will permanently remove this player from the platform. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
