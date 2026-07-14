import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  ColumnDef,
  SortingState,
} from "@tanstack/react-table";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  ChevronLeft, ChevronRight,
  BookmarkX, Search, Filter, AlertCircle,
} from "lucide-react";
import { scoutApi, ScoutSavedProspectItem } from "@/api/scout";
import { ClubLogo } from "@/components/ClubLogo";
import { SortIcon } from "@/components/SortIcon";
import { formatMarketValue } from "@/lib/formatters";

const POSITIONS = ["All", "GK", "CB", "LB", "RB", "CDM", "CM", "AM", "LW", "RW", "CF", "ST"];

export default function SavedProspectsPage() {
  const qc = useQueryClient();

  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [posFilter, setPosFilter] = useState("All");
  const [unsaveConfirm, setUnsaveConfirm] = useState<ScoutSavedProspectItem | null>(null);

  const { data: prospects = [], isLoading, isError } = useQuery({
    queryKey: ["scout-saved-prospects"],
    queryFn: scoutApi.getSavedProspects,
    staleTime: 0,
  });

  const unsaveMutation = useMutation({
    mutationFn: scoutApi.unsaveProspect,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["scout-saved-prospects"] });
      qc.invalidateQueries({ queryKey: ["players-browse"] });
      qc.invalidateQueries({ queryKey: ["scout-dashboard"] });
      toast.success("Player unsaved.");
    },
    onError: () => {
      toast.error("Failed to remove prospect.");
    },
  });

  const filtered = useMemo(() => {
    return prospects.filter((p) => {
      const matchPos = posFilter === "All" || p.position === posFilter;
      const term = globalFilter.toLowerCase();
      const matchSearch =
        !term ||
        `${p.first_name} ${p.last_name}`.toLowerCase().includes(term) ||
        (p.nationality ?? "").toLowerCase().includes(term);
      return matchPos && matchSearch;
    });
  }, [prospects, posFilter, globalFilter]);

  const columns: ColumnDef<ScoutSavedProspectItem>[] = useMemo(
    () => [
      {
        accessorFn: (row) => `${row.first_name} ${row.last_name}`,
        id: "name",
        header: ({ column }) => (
          <button
            className="flex items-center text-left font-medium hover:text-foreground transition-colors"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Player <SortIcon direction={column.getIsSorted()} />
          </button>
        ),
        cell: ({ row }) => (
          <div>
            <div className="font-medium">{row.original.first_name} {row.original.last_name}</div>
            <div className="text-xs text-muted-foreground">{row.original.nationality ?? "—"}</div>
          </div>
        ),
      },
      {
        accessorKey: "position",
        header: "Position",
        cell: ({ getValue }) => (
          <Badge variant="outline" className="text-xs">{getValue() as string}</Badge>
        ),
      },
      {
        accessorKey: "age",
        header: ({ column }) => (
          <button
            className="flex items-center font-medium hover:text-foreground transition-colors"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Age <SortIcon direction={column.getIsSorted()} />
          </button>
        ),
        cell: ({ getValue }) => getValue() ?? "—",
      },
      {
        accessorKey: "club_name",
        header: "Club",
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            {row.original.club_name && (
              <ClubLogo name={row.original.club_name} logoUrl={row.original.club_logo_url} size="sm" />
            )}
            <span className="text-sm">{row.original.club_name ?? "Free agent"}</span>
          </div>
        ),
      },
      {
        accessorKey: "market_value",
        header: ({ column }) => (
          <button
            className="flex items-center font-medium hover:text-foreground transition-colors"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Market Value <SortIcon direction={column.getIsSorted()} />
          </button>
        ),
        cell: ({ getValue }) => formatMarketValue(getValue() as number | null),
      },
      {
        accessorKey: "saved_at",
        header: "Saved",
        cell: ({ getValue }) => (
          <span className="text-muted-foreground text-xs">
            {new Date(getValue() as string).toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive"
            title="Remove from saved"
            disabled={unsaveMutation.isPending}
            onClick={() => setUnsaveConfirm(row.original)}
          >
            <BookmarkX className="w-4 h-4" />
          </Button>
        ),
      },
    ],
    [unsaveMutation.isPending, setUnsaveConfirm]
  );

  const confirmUnsave = () => {
    if (!unsaveConfirm) return;
    const id = unsaveConfirm.player_id;
    setUnsaveConfirm(null);
    unsaveMutation.mutate(id);
  };

  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-display font-bold">Saved Prospects</h1>
        <p className="text-muted-foreground mt-1">Your shortlisted players for recruitment</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search prospects..."
            className="pl-10 bg-muted/50"
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
          />
        </div>
        <Select value={posFilter} onValueChange={setPosFilter}>
          <SelectTrigger className="w-full sm:w-44 bg-muted/50">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Position" />
          </SelectTrigger>
          <SelectContent>
            {POSITIONS.map((p) => (
              <SelectItem key={p} value={p}>
                {p === "All" ? "All Positions" : p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Spinner size="lg" label="Loading prospects…" />
        </div>
      ) : isError ? (
        <div className="flex items-center justify-center h-64">
          <Alert variant="destructive" className="max-w-md">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>Failed to load saved prospects. Please try again.</AlertDescription>
          </Alert>
        </div>
      ) : (
        <>
          <div className="text-sm text-muted-foreground">
            {filtered.length} prospect{filtered.length !== 1 ? "s" : ""}
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {table.getRowModel().rows.length === 0 ? (
              <p className="text-center py-12 text-muted-foreground">No saved prospects yet. Save players from the Players page.</p>
            ) : table.getRowModel().rows.map((row) => {
              const p = row.original;
              return (
                <div key={p.player_id} className="bg-card border border-border rounded-xl p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-sm">{p.first_name} {p.last_name}</p>
                      <p className="text-xs text-muted-foreground">{p.position}{p.nationality ? ` · ${p.nationality}` : ""}{p.age != null ? ` · Age ${p.age}` : ""}</p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive shrink-0" disabled={unsaveMutation.isPending} onClick={() => setUnsaveConfirm(p)}>
                      <BookmarkX className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {p.club_name && (
                      <ClubLogo name={p.club_name} logoUrl={p.club_logo_url} size="sm" className="w-5 h-5" />
                    )}
                    <span className="text-xs text-muted-foreground">{p.club_name ?? "Free agent"}</span>
                    <span className="text-xs font-semibold text-primary ml-auto">{formatMarketValue(p.market_value)}</span>
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
                      <TableRow>
                        <TableCell colSpan={columns.length} className="text-center py-12 text-muted-foreground">
                          No saved prospects yet. Save players from the Players page.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                <p className="text-sm text-muted-foreground">
                  Page {table.getState().pagination.pageIndex + 1} of {Math.max(1, table.getPageCount())}
                </p>
                <div className="flex items-center gap-2">
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
        </>
      )}
      <Dialog open={!!unsaveConfirm} onOpenChange={() => setUnsaveConfirm(null)}>
        {unsaveConfirm && (
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle className="font-display flex items-center gap-2">
                <BookmarkX className="w-5 h-5 text-destructive" /> Remove Prospect
              </DialogTitle>
            </DialogHeader>
            <div className="py-2 space-y-3">
              <p className="text-sm text-muted-foreground">
                Remove{" "}
                <span className="font-semibold text-foreground">
                  {unsaveConfirm.first_name} {unsaveConfirm.last_name}
                </span>{" "}
                from your saved prospects?
              </p>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center font-display font-bold text-destructive text-sm">
                  {unsaveConfirm.position}
                </div>
                <div>
                  <p className="text-sm font-medium">
                    {unsaveConfirm.first_name} {unsaveConfirm.last_name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {unsaveConfirm.club_name ?? "Free agent"} ·{" "}
                    {unsaveConfirm.age != null ? `Age ${unsaveConfirm.age}` : "—"}
                  </p>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setUnsaveConfirm(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={confirmUnsave}
                disabled={unsaveMutation.isPending}
              >
                {unsaveMutation.isPending ? (
                  <span className="flex items-center gap-2">
                    <Spinner size="sm" /> Removing…
                  </span>
                ) : (
                  <>
                    <BookmarkX className="w-4 h-4 mr-2" /> Remove
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
