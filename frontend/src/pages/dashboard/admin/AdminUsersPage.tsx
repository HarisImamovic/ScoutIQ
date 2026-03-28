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

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  club: string;
  status: "Active" | "Inactive";
  createdAt: string;
}

const initialUsers: User[] = [
  { id: 1, name: "Marcus Weber",    email: "m.weber@scoutiq.com",    role: "Scout",        club: "Bayern Munich",    status: "Active",   createdAt: "2025-09-01" },
  { id: 2, name: "Carlos Mendez",   email: "c.mendez@scoutiq.com",   role: "Scout",        club: "FC Barcelona",     status: "Active",   createdAt: "2025-09-03" },
  { id: 3, name: "Alex Johnson",    email: "alex@scoutiq.com",       role: "Player",       club: "SC Freiburg",      status: "Active",   createdAt: "2025-09-10" },
  { id: 4, name: "Sarah Klein",     email: "s.klein@scoutiq.com",    role: "Club Admin",   club: "Bayern Munich",    status: "Active",   createdAt: "2025-09-12" },
  { id: 5, name: "James Wright",    email: "j.wright@scoutiq.com",   role: "Scout",        club: "Manchester City",  status: "Inactive", createdAt: "2025-09-15" },
  { id: 6, name: "Lena Fischer",    email: "l.fischer@scoutiq.com",  role: "Club Admin",   club: "B. Leverkusen",   status: "Active",   createdAt: "2025-10-01" },
  { id: 7, name: "João Pereira",    email: "j.pereira@scoutiq.com",  role: "Scout",        club: "PSG",              status: "Active",   createdAt: "2025-10-05" },
  { id: 8, name: "Emma Collins",    email: "e.collins@scoutiq.com",  role: "Player",       club: "Arsenal",          status: "Active",   createdAt: "2025-10-08" },
  { id: 9, name: "Riku Mäkinen",    email: "r.makinen@scoutiq.com",  role: "Scout",        club: "Manchester City",  status: "Active",   createdAt: "2025-10-12" },
  { id: 10, name: "Sofia Rossi",    email: "s.rossi@scoutiq.com",    role: "Club Admin",   club: "Juventus",         status: "Inactive", createdAt: "2025-10-20" },
  { id: 11, name: "David Park",     email: "d.park@scoutiq.com",     role: "Player",       club: "Real Madrid",      status: "Active",   createdAt: "2025-11-01" },
  { id: 12, name: "Ana Kovač",      email: "a.kovac@scoutiq.com",    role: "Scout",        club: "FC Barcelona",     status: "Active",   createdAt: "2025-11-05" },
  { id: 13, name: "Tom Brennan",    email: "t.brennan@scoutiq.com",  role: "Player",       club: "Arsenal",          status: "Active",   createdAt: "2025-11-10" },
  { id: 14, name: "Mia Hoffmann",   email: "m.hoffmann@scoutiq.com", role: "Club Admin",   club: "Bayern Munich",    status: "Active",   createdAt: "2025-11-15" },
  { id: 15, name: "System Admin",   email: "admin@scoutiq.com",      role: "Global Admin", club: "—",               status: "Active",   createdAt: "2025-08-01" },
];

const roles = ["Player", "Scout", "Club Admin", "Global Admin"];
const statusColors: Record<User["status"], string> = {
  Active: "bg-primary/10 text-primary border-primary/20",
  Inactive: "bg-muted text-muted-foreground border-muted-foreground/20",
};

function SortIcon({ d }: { d: "asc" | "desc" | false }) {
  if (!d) return <ArrowUpDown className="w-3.5 h-3.5 ml-1 opacity-40" />;
  return d === "asc"
    ? <ArrowUp className="w-3.5 h-3.5 ml-1 text-primary" />
    : <ArrowDown className="w-3.5 h-3.5 ml-1 text-primary" />;
}

const emptyForm = { name: "", email: "", role: "Scout", club: "", status: "Active" as User["status"] };

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<User | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const filtered = useMemo(() => users.filter((u) => {
    const q = globalFilter.toLowerCase();
    const matchSearch = !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.club.toLowerCase().includes(q);
    const matchRole = roleFilter === "all" || u.role === roleFilter;
    const matchStatus = statusFilter === "all" || u.status === statusFilter;
    return matchSearch && matchRole && matchStatus;
  }), [users, globalFilter, roleFilter, statusFilter]);

  const columns: ColumnDef<User>[] = useMemo(() => [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <button className="flex items-center font-medium hover:text-foreground" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Name <SortIcon d={column.getIsSorted()} />
        </button>
      ),
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.name}</div>
          <div className="text-xs text-muted-foreground">{row.original.email}</div>
        </div>
      ),
    },
    {
      accessorKey: "role",
      header: "Role",
      cell: ({ getValue }) => <Badge variant="secondary" className="text-xs bg-muted">{getValue() as string}</Badge>,
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
      accessorKey: "status",
      header: "Status",
      cell: ({ getValue }) => {
        const v = getValue() as User["status"];
        return <Badge variant="outline" className={statusColors[v]}>{v}</Badge>;
      },
    },
    {
      accessorKey: "createdAt",
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

  const openCreate = () => { setEditTarget(null); setForm(emptyForm); setModalOpen(true); };
  const openEdit = (u: User) => {
    setEditTarget(u);
    setForm({ name: u.name, email: u.email, role: u.role, club: u.club, status: u.status });
    setModalOpen(true);
  };
  const handleSave = () => {
    if (editTarget) {
      setUsers((p) => p.map((u) => u.id === editTarget.id ? { ...u, ...form } : u));
    } else {
      setUsers((p) => [...p, { id: Date.now(), ...form, createdAt: new Date().toISOString().slice(0, 10) }]);
    }
    setModalOpen(false);
  };
  const handleDelete = () => {
    if (deleteId !== null) { setUsers((p) => p.filter((u) => u.id !== deleteId)); setDeleteId(null); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold">Users</h1>
          <p className="text-muted-foreground mt-1">Manage all platform users</p>
        </div>
        <Button variant="hero" size="sm" onClick={openCreate}><Plus className="w-4 h-4 mr-2" /> Add User</Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total", value: users.length },
          { label: "Active", value: users.filter((u) => u.status === "Active").length },
          { label: "Scouts", value: users.filter((u) => u.role === "Scout").length },
          { label: "Players", value: users.filter((u) => u.role === "Player").length },
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
          <Input placeholder="Search by name, email or club..." className="pl-10 bg-muted/50" value={globalFilter} onChange={(e) => setGlobalFilter(e.target.value)} />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-full sm:w-44 bg-muted/50"><SelectValue placeholder="All Roles" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            {roles.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-36 bg-muted/50"><SelectValue placeholder="All Statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="Active">Active</SelectItem>
            <SelectItem value="Inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="text-sm text-muted-foreground">{filtered.length} user{filtered.length !== 1 ? "s" : ""}</div>

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
                  <TableRow><TableCell colSpan={columns.length} className="text-center py-10 text-muted-foreground">No users found</TableCell></TableRow>
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
          <DialogHeader><DialogTitle className="font-display">{editTarget ? "Edit User" : "Add User"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2"><Label>Full Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="bg-muted/50" /></div>
            <div className="space-y-2"><Label>Email *</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="bg-muted/50" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Role</Label>
                <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                  <SelectTrigger className="bg-muted/50"><SelectValue /></SelectTrigger>
                  <SelectContent>{roles.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as User["status"] })}>
                  <SelectTrigger className="bg-muted/50"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="Active">Active</SelectItem><SelectItem value="Inactive">Inactive</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2"><Label>Club</Label><Input placeholder="e.g. Bayern Munich" value={form.club} onChange={(e) => setForm({ ...form, club: e.target.value })} className="bg-muted/50" /></div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button variant="hero" onClick={handleSave} disabled={!form.name.trim() || !form.email.trim()}>{editTarget ? "Save Changes" : "Add User"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete User</AlertDialogTitle><AlertDialogDescription>This will permanently delete this user account. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
