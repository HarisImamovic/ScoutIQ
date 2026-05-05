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
import { Plus, Edit2, Trash2, Search, ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, Users, Eye, EyeOff, Check, AlertCircle, CheckCircle } from "lucide-react";
import client from "@/api/client";

interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  club_id: string | null;
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

const roleColors: Record<string, string> = {
  player:       "bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400",
  scout:        "bg-purple-500/10 text-purple-600 border-purple-500/20 dark:text-purple-400",
  club_admin:   "bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400",
  global_admin: "bg-primary/10 text-primary border-primary/20",
};

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const formatDate = (dt: string) =>
  new Date(dt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

const statusColors: Record<string, string> = {
  Active:    "bg-primary/10 text-primary border-primary/20",
  Inactive:  "bg-muted text-muted-foreground border-muted-foreground/20",
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

const POSITIONS = ["GK", "CB", "LB", "RB", "CDM", "CM", "AM", "CAM", "LW", "RW", "CF", "ST"];

const emptyForm = { first_name: "", last_name: "", email: "", password: "", role: "scout", club_id: "none", status: "active", position: "" };

const PASSWORD_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d\s])[\x20-\x7E]{8,72}$/;

function getPasswordHints(pw: string) {
  return [
    { label: "At least 8 characters",  met: pw.length >= 8 },
    { label: "One uppercase letter",   met: /[A-Z]/.test(pw) },
    { label: "One lowercase letter",   met: /[a-z]/.test(pw) },
    { label: "One number",             met: /\d/.test(pw) },
    { label: "One special character",  met: /[^A-Za-z\d\s]/.test(pw) },
  ];
}

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
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

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
      cell: ({ getValue }) => {
        const role = getValue() as string;
        return (
          <Badge variant="outline" className={`text-xs ${roleColors[role] ?? ""}`}>
            {roleLabel[role] ?? role}
          </Badge>
        );
      },
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
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteId(row.original.id)} disabled={Object.keys(rowSelection).length > 0}><Trash2 className="w-3.5 h-3.5" /></Button>
        </div>
      ),
    },
  ], [rowSelection]);

  const selectedIds = Object.keys(rowSelection);

  const handleBulkDelete = async () => {
    setBulkDeleteOpen(false);
    const ids = table.getSelectedRowModel().rows.map((r) => r.original.id);
    setUsers((prev) => prev.filter((u) => !ids.includes(u.id)));
    setRowSelection({});
    try {
      await client.post("/admin/users/bulk-delete", { ids });
      toast.success(`${ids.length} user${ids.length !== 1 ? "s" : ""} deleted.`);
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      toast.error(typeof detail === "string" ? detail : "Failed to delete selected users.");
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

  const openCreate = () => {
    setEditTarget(null); setForm(emptyForm); setErrors({}); setShowPassword(false); setModalOpen(true);
  };
  const openEdit = (u: User) => {
    setEditTarget(u);
    setForm({ first_name: u.first_name, last_name: u.last_name, email: u.email, password: "", role: u.role, club_id: u.club_id ?? "none", status: u.status, position: "" });
    setErrors({}); setShowPassword(false);
    setModalOpen(true);
  };

  const validate = () => {
    const next: Record<string, string> = {};
    if (!form.first_name.trim()) next.first_name = "First name is required.";
    else if (form.first_name.length > 100) next.first_name = "Must not exceed 100 characters.";
    if (!form.last_name.trim()) next.last_name = "Last name is required.";
    else if (form.last_name.length > 100) next.last_name = "Must not exceed 100 characters.";
    if (!form.email.trim()) next.email = "Email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) next.email = "Enter a valid email address.";
    else if (form.email.length > 254) next.email = "Must not exceed 254 characters.";
    if (!editTarget) {
      if (!form.password) next.password = "Password is required.";
      else if (!PASSWORD_RE.test(form.password)) next.password = "Password does not meet requirements.";
      if (form.role === "player" && !form.position) next.position = "Position is required for player accounts.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
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
      const { data } = await client.post<User>("/admin/users", {
        ...form,
        club_id: form.club_id === "none" ? null : form.club_id || null,
        position: form.role === "player" ? form.position : undefined,
      });
      setUsers((p) => [data, ...p]);
      setModalOpen(false);
      toast.success("User created.");
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
    <div className="flex items-center justify-center h-64">
      <Spinner size="lg" label="Loading users…" />
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
          <h1 className="text-2xl md:text-3xl font-display font-bold">Users</h1>
          <p className="text-muted-foreground mt-1">Manage all platform users</p>
        </div>
        <Button variant="hero" size="sm" onClick={openCreate}><Plus className="w-4 h-4 mr-2" /> Add User</Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total",   value: users.length,                                      icon: Users,       color: "text-primary" },
          { label: "Active",  value: users.filter((u) => u.status === "active").length, icon: CheckCircle, color: "text-emerald-400" },
          { label: "Scouts",  value: users.filter((u) => u.role === "scout").length,    icon: Search,      color: "text-purple-400" },
          { label: "Players", value: users.filter((u) => u.role === "player").length,   icon: Users,       color: "text-blue-400" },
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

      <div className="text-sm text-muted-foreground">{filtered.length} user{filtered.length !== 1 ? "s" : ""}</div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {table.getRowModel().rows.length === 0 ? (
          <p className="text-center py-12 text-muted-foreground">No users found</p>
        ) : table.getRowModel().rows.map((row) => {
          const u = row.original;
          return (
            <div key={u.id} className="bg-card border border-border rounded-xl p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-sm">{u.first_name} {u.last_name}</p>
                  <p className="text-xs text-muted-foreground truncate max-w-[180px]">{u.email}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(u)}><Edit2 className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteId(u.id)} disabled={selectedIds.length > 0}><Trash2 className="w-4 h-4" /></Button>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className={`text-xs ${roleColors[u.role] ?? ""}`}>{roleLabel[u.role] ?? u.role}</Badge>
                <Badge variant="outline" className={`text-xs ${statusColors[capitalize(u.status)]}`}>{capitalize(u.status)}</Badge>
                {u.club_name && <span className="text-xs text-muted-foreground">{u.club_name}</span>}
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
      <Dialog open={modalOpen} onOpenChange={(open) => { if (!open) setErrors({}); setModalOpen(open); }}>
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
                  onChange={(e) => { setForm({ ...form, first_name: e.target.value }); setErrors(p => ({ ...p, first_name: undefined })); }}
                  className={`bg-muted/50 ${errors.first_name ? "border-destructive focus-visible:ring-destructive" : ""}`}
                />
                {errors.first_name && <p className="text-xs text-destructive">{errors.first_name}</p>}
              </div>
              {/* Last Name */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label>Last Name *</Label>
                  <CharCount value={form.last_name} max={100} />
                </div>
                <Input
                  value={form.last_name}
                  onChange={(e) => { setForm({ ...form, last_name: e.target.value }); setErrors(p => ({ ...p, last_name: undefined })); }}
                  className={`bg-muted/50 ${errors.last_name ? "border-destructive focus-visible:ring-destructive" : ""}`}
                />
                {errors.last_name && <p className="text-xs text-destructive">{errors.last_name}</p>}
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
                onChange={(e) => { setForm({ ...form, email: e.target.value }); setErrors(p => ({ ...p, email: undefined })); }}
                className={`bg-muted/50 ${errors.email ? "border-destructive focus-visible:ring-destructive" : ""}`}
              />
              {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
            </div>
            {/* Password (create only) */}
            {!editTarget && (
              <div className="space-y-1.5">
                <Label>Password *</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={(e) => { setForm({ ...form, password: e.target.value }); setErrors(p => ({ ...p, password: undefined })); }}
                    onFocus={() => setPasswordFocused(true)}
                    onBlur={() => setPasswordFocused(false)}
                    className={`bg-muted/50 pr-10 ${errors.password ? "border-destructive focus-visible:ring-destructive" : ""}`}
                    placeholder="Min 8 chars, upper, lower, digit, special"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
                {passwordFocused && form.password && (
                  <ul className="mt-1 space-y-1">
                    {getPasswordHints(form.password).map(({ label, met }) => (
                      <li key={label} className={`flex items-center gap-1.5 text-xs ${met ? "text-primary" : "text-muted-foreground"}`}>
                        <Check className={`w-3 h-3 ${met ? "opacity-100" : "opacity-30"}`} />
                        {label}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Role</Label>
                <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v, status: "active", position: "" })}>
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
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {form.role === "player" && !editTarget && (
              <div className="space-y-1.5">
                <Label>Position *</Label>
                <Select value={form.position} onValueChange={(v) => { setForm({ ...form, position: v }); setErrors(p => ({ ...p, position: undefined })); }}>
                  <SelectTrigger className={`bg-muted/50 ${errors.position ? "border-destructive focus-visible:ring-destructive" : ""}`}>
                    <SelectValue placeholder="Select position" />
                  </SelectTrigger>
                  <SelectContent>
                    {POSITIONS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
                {errors.position && <p className="text-xs text-destructive">{errors.position}</p>}
              </div>
            )}
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
            <Button variant="hero" onClick={handleSave} disabled={saving}>{saving ? "Saving…" : editTarget ? "Save Changes" : "Add User"}</Button>
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

      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.length} user{selectedIds.length !== 1 ? "s" : ""}?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete {selectedIds.length} selected user account{selectedIds.length !== 1 ? "s" : ""}. This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
