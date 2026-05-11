import { useState, useMemo, useEffect } from "react";
import { toast } from "sonner";
import {
  useReactTable, getCoreRowModel, getSortedRowModel,
  getFilteredRowModel, getPaginationRowModel,
  flexRender, ColumnDef, SortingState, RowSelectionState,
} from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { Plus, Eye, Edit2, Trash2, Search, ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, Globe, AlertCircle, Building2, Image } from "lucide-react";
import client from "@/api/client";

interface League {
  id: string;
  name: string;
  country: string;
  logo_url: string | null;
  club_count: number;
  created_at: string;
}

const formatDate = (dt: string) =>
  new Date(dt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

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

function resolveLogoUrl(url: string | null): string | null {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${import.meta.env.VITE_API_URL}${url}`;
}

function LeagueLogo({ name, logoUrl, size = "sm" }: { name: string; logoUrl: string | null; size?: "sm" | "md" }) {
  const dim = size === "sm" ? "w-7 h-7" : "w-10 h-10";
  const resolved = resolveLogoUrl(logoUrl);
  if (resolved) {
    return <img src={resolved} alt={name} className={`${dim} rounded object-contain bg-muted`} />;
  }
  return (
    <div className={`${dim} rounded bg-muted flex items-center justify-center shrink-0`}>
      <Globe className="w-4 h-4 text-muted-foreground" />
    </div>
  );
}

const emptyForm = { name: "", country: "" };

export default function AdminLeaguesPage() {
  const [leagues, setLeagues] = useState<League[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [countryFilter, setCountryFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<League | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [viewTarget, setViewTarget] = useState<League | null>(null);

  useEffect(() => {
    client.get<{ items: League[]; total: number }>("/admin/leagues")
      .then(({ data }) => setLeagues(data.items))
      .catch(() => setError("Failed to load leagues."))
      .finally(() => setLoading(false));
  }, []);

  const countries = useMemo(
    () => Array.from(new Set(leagues.map((l) => l.country))).sort(),
    [leagues],
  );

  const filtered = useMemo(() => leagues.filter((l) => {
    const q = globalFilter.toLowerCase();
    const matchSearch = !q || l.name.toLowerCase().includes(q) || l.country.toLowerCase().includes(q);
    const matchCountry = countryFilter === "all" || l.country === countryFilter;
    return matchSearch && matchCountry;
  }), [leagues, globalFilter, countryFilter]);

  const columns: ColumnDef<League>[] = useMemo(() => [
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
          League <SortIcon d={column.getIsSorted()} />
        </button>
      ),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <LeagueLogo name={row.original.name} logoUrl={row.original.logo_url} size="sm" />
          <div className="font-medium">{row.original.name}</div>
        </div>
      ),
    },
    {
      accessorKey: "country",
      header: ({ column }) => (
        <button className="flex items-center font-medium hover:text-foreground" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Country <SortIcon d={column.getIsSorted()} />
        </button>
      ),
      cell: ({ getValue }) => <span className="text-sm">{getValue() as string}</span>,
    },
    {
      accessorKey: "club_count",
      header: ({ column }) => (
        <button className="flex items-center font-medium hover:text-foreground" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Clubs <SortIcon d={column.getIsSorted()} />
        </button>
      ),
      cell: ({ getValue }) => <span className="text-sm">{getValue() as number}</span>,
    },
    {
      accessorKey: "created_at",
      header: ({ column }) => (
        <button className="flex items-center font-medium hover:text-foreground" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Created <SortIcon d={column.getIsSorted()} />
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
    setLeagues((prev) => prev.filter((l) => !ids.includes(l.id)));
    setRowSelection({});
    try {
      await client.post("/admin/leagues/bulk-delete", { ids });
      toast.success(`${ids.length} league${ids.length !== 1 ? "s" : ""} deleted successfully.`);
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      toast.error(typeof detail === "string" ? detail : "Failed to delete selected leagues.");
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

  const uploadLogo = async (leagueId: string, file: File): Promise<League> => {
    const fd = new FormData();
    fd.append("file", file);
    const { data } = await client.post<League>(`/admin/leagues/${leagueId}/logo`, fd, {
      headers: { "Content-Type": undefined },
    });
    return data;
  };

  const openView = (l: League) => setViewTarget(l);
  const openCreate = () => {
    setEditTarget(null);
    setForm(emptyForm);
    setErrors({});
    setLogoFile(null);
    setModalOpen(true);
  };

  const openEdit = (l: League) => {
    setEditTarget(l);
    setForm({ name: l.name, country: l.country });
    setErrors({});
    setLogoFile(null);
    setModalOpen(true);
  };

  const validate = () => {
    const next: Record<string, string> = {};
    if (!form.name.trim()) next.name = "Name is required.";
    else if (form.name.length > 200) next.name = "Must not exceed 200 characters.";
    if (!form.country.trim()) next.country = "Country is required.";
    else if (form.country.length > 100) next.country = "Must not exceed 100 characters.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;

    if (editTarget) {
      try {
        setSaving(true);
        let updated = (await client.put<League>(`/admin/leagues/${editTarget.id}`, {
          name: form.name,
          country: form.country,
        })).data;
        if (logoFile) {
          try {
            updated = await uploadLogo(editTarget.id, logoFile);
          } catch (logoErr: any) {
            const detail = logoErr.response?.data?.detail;
            toast.error(typeof detail === "string" ? detail : "Logo upload failed. Please try a PNG, JPEG, or WebP under 2 MB.");
          }
        }
        setLeagues((prev) => prev.map((l) => l.id === editTarget.id ? updated : l));
        setModalOpen(false);
        toast.success("League updated successfully.");
      } catch (err: any) {
        const detail = err.response?.data?.detail;
        toast.error(typeof detail === "string" ? detail : "Failed to update league.");
      } finally {
        setSaving(false);
      }
      return;
    }

    try {
      setSaving(true);
      let created = (await client.post<League>("/admin/leagues", {
        name: form.name,
        country: form.country,
      })).data;
      if (logoFile) {
        try {
          created = await uploadLogo(created.id, logoFile);
        } catch (logoErr: any) {
          const detail = logoErr.response?.data?.detail;
          toast.error(typeof detail === "string" ? detail : "Logo upload failed. Please try a PNG, JPEG, or WebP under 2 MB.");
        }
      }
      setLeagues((prev) => [created, ...prev]);
      setModalOpen(false);
      toast.success("League created successfully.");
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      toast.error(typeof detail === "string" ? detail : "Failed to create league.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const id = deleteId;
    setDeleteId(null);
    setLeagues((prev) => prev.filter((l) => l.id !== id));
    try {
      await client.delete(`/admin/leagues/${id}`);
      toast.success("League deleted successfully.");
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      toast.error(typeof detail === "string" ? detail : "Failed to delete league.");
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Spinner size="lg" label="Loading leagues…" />
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
          <h1 className="text-2xl md:text-3xl font-display font-bold">Leagues</h1>
          <p className="text-muted-foreground mt-1">Manage all registered leagues</p>
        </div>
        <Button variant="hero" size="sm" onClick={openCreate}><Plus className="w-4 h-4 mr-2" /> Add League</Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total",          value: leagues.length,                                                   icon: Globe,      color: "text-primary" },
          { label: "Countries",      value: new Set(leagues.map((l) => l.country)).size,                     icon: Globe,      color: "text-blue-400" },
          { label: "Logos Uploaded", value: leagues.filter((l) => l.logo_url).length,                       icon: Image,      color: "text-emerald-400" },
          { label: "With Clubs",     value: leagues.filter((l) => l.club_count > 0).length,                  icon: Building2,  color: "text-purple-400" },
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

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search by name or country…" className="pl-10 bg-muted/50" value={globalFilter} onChange={(e) => setGlobalFilter(e.target.value)} />
        </div>
        <Select value={countryFilter} onValueChange={setCountryFilter}>
          <SelectTrigger className="w-full sm:w-48 bg-muted/50"><SelectValue placeholder="All Countries" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Countries</SelectItem>
            {countries.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
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

      <div className="text-sm text-muted-foreground">{filtered.length} league{filtered.length !== 1 ? "s" : ""}</div>

      <div className="md:hidden space-y-3">
        {table.getRowModel().rows.length === 0 ? (
          <p className="text-center py-12 text-muted-foreground">No leagues found</p>
        ) : table.getRowModel().rows.map((row) => {
          const l = row.original;
          return (
            <div key={l.id} className="bg-card border border-border rounded-xl p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <LeagueLogo name={l.name} logoUrl={l.logo_url} size="sm" />
                  <div>
                    <p className="font-medium text-sm">{l.name}</p>
                    <p className="text-xs text-muted-foreground">{l.country}</p>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openView(l)}><Eye className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(l)}><Edit2 className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteId(l.id)} disabled={selectedIds.length > 0}><Trash2 className="w-4 h-4" /></Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">{l.club_count} club{l.club_count !== 1 ? "s" : ""} · {formatDate(l.created_at)}</p>
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
                  <TableRow><TableCell colSpan={columns.length} className="text-center py-10 text-muted-foreground">No leagues found</TableCell></TableRow>
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
              <DialogTitle className="font-display">League Details</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <LeagueLogo name={viewTarget.name} logoUrl={viewTarget.logo_url} size="md" />
                <div>
                  <p className="font-medium">{viewTarget.name}</p>
                  <p className="text-xs text-muted-foreground">{viewTarget.country}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Country</p>
                  <p className="font-medium text-sm">{viewTarget.country}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Clubs</p>
                  <p className="font-medium text-sm">{viewTarget.club_count}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50 col-span-2">
                  <p className="text-xs text-muted-foreground">Created</p>
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

      <Dialog open={modalOpen} onOpenChange={(open) => { if (!open) setErrors({}); setModalOpen(open); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle className="font-display">{editTarget ? "Edit League" : "Add League"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>Name *</Label>
                <CharCount value={form.name} max={200} />
              </div>
              <Input
                value={form.name}
                onChange={(e) => { setForm({ ...form, name: e.target.value }); setErrors((p) => ({ ...p, name: undefined as any })); }}
                className={`bg-muted/50 ${errors.name ? "border-destructive focus-visible:ring-destructive" : ""}`}
                placeholder="e.g. Premier League"
              />
              {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>Country *</Label>
                <CharCount value={form.country} max={100} />
              </div>
              <Input
                value={form.country}
                onChange={(e) => { setForm({ ...form, country: e.target.value }); setErrors((p) => ({ ...p, country: undefined as any })); }}
                className={`bg-muted/50 ${errors.country ? "border-destructive focus-visible:ring-destructive" : ""}`}
                placeholder="e.g. England"
              />
              {errors.country && <p className="text-xs text-destructive">{errors.country}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>League Logo</Label>
              <div className="flex items-center gap-3">
                {(logoFile || editTarget?.logo_url) && (
                  <LeagueLogo
                    name={form.name || "League"}
                    logoUrl={logoFile ? URL.createObjectURL(logoFile) : editTarget?.logo_url ?? null}
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
            <Button variant="ghost" onClick={() => setModalOpen(false)} disabled={saving}>Cancel</Button>
            <Button variant="hero" onClick={handleSave} disabled={saving}>{saving ? "Saving…" : editTarget ? "Save Changes" : "Add League"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete League</AlertDialogTitle><AlertDialogDescription>This will permanently delete this league. Clubs in this league will have their league assignment cleared. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.length} league{selectedIds.length !== 1 ? "s" : ""}?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete {selectedIds.length} selected league{selectedIds.length !== 1 ? "s" : ""}. Clubs in these leagues will have their league assignment cleared. This action cannot be undone.</AlertDialogDescription>
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
