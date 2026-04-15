import { useState, useMemo, useEffect } from "react";
import { toast } from "sonner";
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
import client from "@/api/client";

interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  club_name: string | null;
  status: string;
  created_at: string;
}

const roleLabel: Record<string, string> = {
  player: "Player",
  scout: "Scout",
  club_admin: "Club Admin",
  global_admin: "Global Admin",
};

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const formatDate = (dt: string) =>
  new Date(dt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

const statusColors: Record<string, string> = {
  Active:    "bg-primary/10 text-primary border-primary/20",
  Inactive:  "bg-muted text-muted-foreground border-muted-foreground/20",
  Pending:   "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  Suspended: "bg-destructive/10 text-destructive border-destructive/20",
};

function SortIcon({ d }: { d: "asc" | "desc" | false }) {
  if (!d) return <ArrowUpDown className="w-3.5 h-3.5 ml-1 opacity-40" />;
  return d === "asc"
    ? <ArrowUp className="w-3.5 h-3.5 ml-1 text-primary" />
    : <ArrowDown className="w-3.5 h-3.5 ml-1 text-primary" />;
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

const emptyForm = { first_name: "", last_name: "", email: "", password: "", role: "scout", club_id: "none", status: "active" };

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [clubs, setClubs] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<User | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    client.get<{ items: User[]; total: number }>("/admin/users")
      .then(({ data }) => setUsers(data.items))
      .catch(() => setError("Failed to load users."))
      .finally(() => setLoading(false));
    client.get<{ items: { id: string; name: string; country: string }[]; total: number }>("/admin/clubs")
      .then(({ data }) => setClubs(data.items.map(c => ({ id: c.id, name: c.name }))));
  }, []);

  const filtered = useMemo(() => users.filter((u) => {
    const q = globalFilter.toLowerCase();
    const name = `${u.first_name} ${u.last_name}`.toLowerCase();
    const matchSearch = !q || name.includes(q) || u.email.toLowerCase().includes(q) || (u.club_name ?? "").toLowerCase().includes(q);
    const matchRole = roleFilter === "all" || u.role === roleFilter;
    const matchStatus = statusFilter === "all" || u.status === statusFilter;
    return matchSearch && matchRole && matchStatus;
  }), [users, globalFilter, roleFilter, statusFilter]);

  const columns: ColumnDef<User>[] = useMemo(() => [
    {
      id: "name",
      accessorFn: (u) => `${u.first_name} ${u.last_name}`,
      header: ({ column }) => (
        <button className="flex items-center font-medium hover:text-foreground" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Name <SortIcon d={column.getIsSorted()} />
        </button>
      ),
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.first_name} {row.original.last_name}</div>
          <div className="text-xs text-muted-foreground">{row.original.email}</div>
        </div>
      ),
    },
    {
      accessorKey: "role",
      header: "Role",
      cell: ({ getValue }) => (
        <Badge variant="secondary" className="text-xs bg-muted">
          {roleLabel[getValue() as string] ?? getValue() as string}
        </Badge>
      ),
    },
    {
      accessorKey: "club_name",
      header: ({ column }) => (
        <button className="flex items-center font-medium hover:text-foreground" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Club <SortIcon d={column.getIsSorted()} />
        </button>
      ),
      cell: ({ getValue }) => <span>{(getValue() as string | null) ?? "—"}</span>,
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
    const matchedClub = clubs.find(c => c.name === u.club_name);
    setForm({ first_name: u.first_name, last_name: u.last_name, email: u.email, password: "", role: u.role, club_id: matchedClub?.id ?? "none", status: u.status });
    setModalOpen(true);
  };

  const hasErrors =
    !form.first_name.trim() || form.first_name.length > 100 ||
    !form.last_name.trim() || form.last_name.length > 100 ||
    !form.email.trim() || form.email.length > 254 ||
    (!editTarget && !form.password.trim());

  const handleSave = async () => {
    if (editTarget) {
      try {
        setSaving(true);
        const { data } = await client.put<User>(`/admin/users/${editTarget.id}`, {
          first_name: form.first_name,
          last_name: form.last_name,
          email: form.email,
          role: form.role,
          club_id: form.club_id === "none" ? null : form.club_id || null,
          status: form.status,
        });
        setUsers(prev => prev.map(u => u.id === editTarget.id ? data : u));
        setModalOpen(false);
        toast.success("User updated successfully.");
      } catch (err: any) {
        const detail = err.response?.data?.detail;
        if (err.response?.status === 409) toast.error("A user with this email already exists.");
        else toast.error(typeof detail === "string" ? detail : "Failed to update user.");
      } finally {
        setSaving(false);
      }
      return;
    }
    try {
      setSaving(true);
      const { data } = await client.post<User>("/admin/users", { ...form, club_id: form.club_id === "none" ? null : form.club_id || null });
      setUsers((p) => [data, ...p]);
      setModalOpen(false);
      toast.success("User created successfully.");
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      if (err.response?.status === 409) toast.error("A user with this email already exists.");
      else if (err.response?.status === 422) toast.error(typeof detail === "string" ? detail : "Please check your inputs.");
      else toast.error("Failed to create user.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const id = deleteId;
    setDeleteId(null);
    setUsers(prev => prev.filter(u => u.id !== id));
    try {
      await client.delete(`/admin/users/${id}`);
      toast.success("User deleted.");
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      toast.error(typeof detail === "string" ? detail : "Failed to delete user.");
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-muted-foreground">Loading users…</div>
  );
  if (error) return (
    <div className="flex items-center justify-center h-64 text-destructive">{error}</div>
  );

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
          { label: "Total",   value: users.length },
          { label: "Active",  value: users.filter((u) => u.status === "active").length },
          { label: "Scouts",  value: users.filter((u) => u.role === "scout").length },
          { label: "Players", value: users.filter((u) => u.role === "player").length },
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
            <SelectItem value="player">Player</SelectItem>
            <SelectItem value="scout">Scout</SelectItem>
            <SelectItem value="club_admin">Club Admin</SelectItem>
            <SelectItem value="global_admin">Global Admin</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-36 bg-muted/50"><SelectValue placeholder="All Statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
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
            <div className="grid grid-cols-2 gap-3">
              {/* First Name */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label>First Name *</Label>
                  <CharCount value={form.first_name} max={100} />
                </div>
                <Input
                  value={form.first_name}
                  onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                  className={`bg-muted/50 ${form.first_name.length > 100 ? "border-destructive focus-visible:ring-destructive" : ""}`}
                />
                {form.first_name.length > 100 && (
                  <p className="text-xs text-destructive">Must not exceed 100 characters</p>
                )}
              </div>
              {/* Last Name */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label>Last Name *</Label>
                  <CharCount value={form.last_name} max={100} />
                </div>
                <Input
                  value={form.last_name}
                  onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                  className={`bg-muted/50 ${form.last_name.length > 100 ? "border-destructive focus-visible:ring-destructive" : ""}`}
                />
                {form.last_name.length > 100 && (
                  <p className="text-xs text-destructive">Must not exceed 100 characters</p>
                )}
              </div>
            </div>
            {/* Email */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>Email *</Label>
                <CharCount value={form.email} max={254} />
              </div>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className={`bg-muted/50 ${form.email.length > 254 ? "border-destructive focus-visible:ring-destructive" : ""}`}
              />
              {form.email.length > 254 && (
                <p className="text-xs text-destructive">Must not exceed 254 characters</p>
              )}
            </div>
            {/* Password (create only) */}
            {!editTarget && (
              <div className="space-y-1.5">
                <Label>Password *</Label>
                <Input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="bg-muted/50"
                  placeholder="Min 8 chars, upper, lower, digit, special"
                />
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Role</Label>
                <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                  <SelectTrigger className="bg-muted/50"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="player">Player</SelectItem>
                    <SelectItem value="scout">Scout</SelectItem>
                    <SelectItem value="club_admin">Club Admin</SelectItem>
                    <SelectItem value="global_admin">Global Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger className="bg-muted/50"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5"><Label>Club</Label>
              <Select value={form.club_id} onValueChange={(v) => setForm({ ...form, club_id: v })}>
                <SelectTrigger className="bg-muted/50"><SelectValue placeholder="No club" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No club</SelectItem>
                  {clubs.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button variant="hero" onClick={handleSave} disabled={saving || hasErrors}>{saving ? "Saving…" : editTarget ? "Save Changes" : "Add User"}</Button>
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
