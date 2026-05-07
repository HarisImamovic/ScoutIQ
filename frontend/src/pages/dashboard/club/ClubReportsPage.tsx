import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useState, useMemo } from "react";
import {
  useReactTable, getCoreRowModel, getSortedRowModel,
  getPaginationRowModel, getFilteredRowModel,
  flexRender, createColumnHelper, SortingState,
} from "@tanstack/react-table";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Eye, CheckCircle2, XCircle, FileText, Clock, AlertCircle,
  Search, ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight,
} from "lucide-react";
import { clubAdminApi, isNoClubError, type ClubReportItem } from "@/api/clubAdmin";
import { NoClubState } from "@/components/NoClubState";

const STATUS_COLORS: Record<string, string> = {
  submitted: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  approved: "bg-primary/10 text-primary border-primary/20",
  rejected: "bg-destructive/10 text-destructive border-destructive/20",
};

const STATUS_LABEL: Record<string, string> = {
  submitted: "Pending",
  approved: "Approved",
  rejected: "Rejected",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

function SortIcon({ column }: { column: any }) {
  const sorted = column.getIsSorted();
  if (sorted === "asc") return <ArrowUp className="w-3.5 h-3.5 ml-1 inline" />;
  if (sorted === "desc") return <ArrowDown className="w-3.5 h-3.5 ml-1 inline" />;
  return <ArrowUpDown className="w-3.5 h-3.5 ml-1 inline opacity-40" />;
}

const columnHelper = createColumnHelper<ClubReportItem>();

export default function ClubReportsPage() {
  const qc = useQueryClient();
  const [viewReport, setViewReport] = useState<ClubReportItem | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ id: string; action: "approved" | "rejected" } | null>(null);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [positionFilter, setPositionFilter] = useState("all");

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["club-reports"],
    queryFn: clubAdminApi.getReports,
    staleTime: 30_000,
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: "approved" | "rejected" }) =>
      clubAdminApi.updateReportStatus(id, action),
    onSuccess: (updated) => {
      qc.setQueryData<ClubReportItem[]>(["club-reports"], (old) =>
        old ? old.map((r) => (r.id === updated.id ? updated : r)) : old,
      );
      qc.invalidateQueries({ queryKey: ["club-dashboard"] });
      toast.success(updated.status === "approved" ? "Report approved." : "Report rejected.");
      setConfirmAction(null);
      setViewReport((prev) => (prev?.id === updated.id ? updated : prev));
    },
    onError: () => {
      toast.error("Failed to update report status. Please try again.", { duration: 5000 });
      setConfirmAction(null);
    },
  });

  const reports = data ?? [];
  const pending = reports.filter((r) => r.status === "submitted").length;
  const approved = reports.filter((r) => r.status === "approved").length;
  const rejected = reports.filter((r) => r.status === "rejected").length;

  const positions = useMemo(
    () => Array.from(new Set(reports.map((r) => r.position))).sort(),
    [reports],
  );

  const filtered = useMemo(() => reports.filter((r) => {
    const q = globalFilter.toLowerCase();
    const matchSearch = !q || r.player_name.toLowerCase().includes(q) || r.scout_name.toLowerCase().includes(q);
    const matchStatus = statusFilter === "all" || r.status === statusFilter;
    const matchPos = positionFilter === "all" || r.position === positionFilter;
    return matchSearch && matchStatus && matchPos;
  }), [reports, globalFilter, statusFilter, positionFilter]);

  const columns = useMemo(() => [
    columnHelper.accessor("player_name", {
      header: ({ column }) => (
        <button onClick={() => column.toggleSorting()} className="flex items-center font-medium hover:text-foreground">
          Player <SortIcon column={column} />
        </button>
      ),
      cell: (info) => (
        <div>
          <div className="font-medium text-sm">{info.getValue()}</div>
          <div className="text-xs text-muted-foreground">{info.row.original.position}</div>
        </div>
      ),
    }),
    columnHelper.accessor("scout_name", {
      header: ({ column }) => (
        <button onClick={() => column.toggleSorting()} className="flex items-center font-medium hover:text-foreground">
          Scout <SortIcon column={column} />
        </button>
      ),
      cell: (info) => <span className="text-sm text-muted-foreground">{info.getValue()}</span>,
    }),
    columnHelper.accessor("rating", {
      header: ({ column }) => (
        <button onClick={() => column.toggleSorting()} className="flex items-center font-medium hover:text-foreground">
          Rating <SortIcon column={column} />
        </button>
      ),
      cell: (info) => (
        <span className="font-display font-bold text-primary">{info.getValue()}</span>
      ),
    }),
    columnHelper.accessor("created_at", {
      header: ({ column }) => (
        <button onClick={() => column.toggleSorting()} className="flex items-center font-medium hover:text-foreground">
          Date <SortIcon column={column} />
        </button>
      ),
      cell: (info) => <span className="text-sm text-muted-foreground">{formatDate(info.getValue())}</span>,
    }),
    columnHelper.accessor("status", {
      header: "Status",
      cell: (info) => (
        <Badge variant="outline" className={STATUS_COLORS[info.getValue()]}>
          {STATUS_LABEL[info.getValue()] ?? info.getValue()}
        </Badge>
      ),
    }),
    columnHelper.display({
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const r = row.original;
        return (
          <div className="flex items-center justify-end gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setViewReport(r)}>
              <Eye className="w-3.5 h-3.5" />
            </Button>
            {r.status === "submitted" && (
              <>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-primary hover:text-primary" onClick={() => setConfirmAction({ id: r.id, action: "approved" })}>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setConfirmAction({ id: r.id, action: "rejected" })}>
                  <XCircle className="w-3.5 h-3.5" />
                </Button>
              </>
            )}
          </div>
        );
      },
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-display font-bold">Reports</h1>
        <p className="text-muted-foreground mt-1">Review and action scout reports</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="hover-lift">
          <CardContent className="pt-5">
            <Clock className="w-5 h-5 text-yellow-500 mb-2" />
            <div className="text-2xl font-display font-bold">{pending}</div>
            <div className="text-sm text-muted-foreground">Pending</div>
          </CardContent>
        </Card>
        <Card className="hover-lift">
          <CardContent className="pt-5">
            <CheckCircle2 className="w-5 h-5 text-primary mb-2" />
            <div className="text-2xl font-display font-bold">{approved}</div>
            <div className="text-sm text-muted-foreground">Approved</div>
          </CardContent>
        </Card>
        <Card className="hover-lift">
          <CardContent className="pt-5">
            <XCircle className="w-5 h-5 text-destructive mb-2" />
            <div className="text-2xl font-display font-bold">{rejected}</div>
            <div className="text-sm text-muted-foreground">Rejected</div>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Spinner size="lg" label="Loading reports…" />
        </div>
      ) : isError ? (
        isNoClubError(error) ? <NoClubState page="reports" /> : (
          <div className="flex items-center justify-center h-64">
            <Alert variant="destructive" className="max-w-md">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>Failed to load reports. Please try again.</AlertDescription>
            </Alert>
          </div>
        )
      ) : (
        <>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by player or scout…"
                className="pl-10 bg-muted/50"
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-44 bg-muted/50"><SelectValue placeholder="All Statuses" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="submitted">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
            <Select value={positionFilter} onValueChange={setPositionFilter}>
              <SelectTrigger className="w-full sm:w-40 bg-muted/50"><SelectValue placeholder="All Positions" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Positions</SelectItem>
                {positions.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="text-sm text-muted-foreground">
            {filtered.length} report{filtered.length !== 1 ? "s" : ""}
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {table.getRowModel().rows.length === 0 ? (
              <p className="text-center py-12 text-muted-foreground">No reports found.</p>
            ) : table.getRowModel().rows.map((row) => {
              const r = row.original;
              return (
                <div key={r.id} className="bg-card border border-border rounded-xl p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-sm">{r.player_name}</p>
                      <p className="text-xs text-muted-foreground">{r.position} · {r.scout_name}</p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setViewReport(r)}>
                        <Eye className="w-3.5 h-3.5" />
                      </Button>
                      {r.status === "submitted" && (
                        <>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-primary hover:text-primary" onClick={() => setConfirmAction({ id: r.id, action: "approved" })}>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setConfirmAction({ id: r.id, action: "rejected" })}>
                            <XCircle className="w-3.5 h-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-display font-bold text-primary text-sm">{r.rating}</span>
                    <Badge variant="outline" className={STATUS_COLORS[r.status]}>
                      {STATUS_LABEL[r.status] ?? r.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground ml-auto">{formatDate(r.created_at)}</span>
                  </div>
                </div>
              );
            })}
            <div className="flex items-center justify-between pt-2">
              <span className="text-sm text-muted-foreground">
                Page {table.getState().pagination.pageIndex + 1} of {Math.max(1, table.getPageCount())}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Desktop table */}
          <Card className="hidden md:block">
            <CardContent className="pt-4">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    {table.getHeaderGroups().map((hg) => (
                      <TableRow key={hg.id}>
                        {hg.headers.map((header) => (
                          <TableHead key={header.id} className="text-muted-foreground font-medium whitespace-nowrap">
                            {flexRender(header.column.columnDef.header, header.getContext())}
                          </TableHead>
                        ))}
                      </TableRow>
                    ))}
                  </TableHeader>
                  <TableBody>
                    {table.getRowModel().rows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={columns.length} className="text-center py-10 text-muted-foreground">
                          No reports found.
                        </TableCell>
                      </TableRow>
                    ) : table.getRowModel().rows.map((row) => (
                      <TableRow key={row.id} className="hover:bg-muted/30">
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id} className="py-3 whitespace-nowrap">
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                <p className="text-sm text-muted-foreground">
                  Page {table.getState().pagination.pageIndex + 1} of {Math.max(1, table.getPageCount())} · {filtered.length} reports
                </p>
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
            </CardContent>
          </Card>
        </>
      )}

      {/* View modal */}
      <Dialog open={!!viewReport} onOpenChange={() => setViewReport(null)}>
        {viewReport && (
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle className="font-display flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Scout Report — {viewReport.player_name}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2 overflow-y-auto max-h-[70vh]">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Player</p>
                  <p className="font-medium text-sm">{viewReport.player_name}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Position</p>
                  <p className="font-medium text-sm">{viewReport.position}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Scout</p>
                  <p className="font-medium text-sm">{viewReport.scout_name}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Rating</p>
                  <p className="font-display font-bold text-primary text-lg">{viewReport.rating}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Date</p>
                  <p className="font-medium text-sm">{formatDate(viewReport.created_at)}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Status</p>
                  <Badge variant="outline" className={`mt-1 ${STATUS_COLORS[viewReport.status]}`}>
                    {STATUS_LABEL[viewReport.status] ?? viewReport.status}
                  </Badge>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Scout Notes</p>
                <div className="p-3 rounded-lg bg-muted/50 text-sm leading-relaxed break-words">
                  {viewReport.notes ?? "—"}
                </div>
              </div>
            </div>
            {viewReport.status === "submitted" && (
              <DialogFooter className="gap-2">
                <Button
                  variant="outline"
                  className="text-destructive border-destructive/30 hover:bg-destructive/10"
                  onClick={() => setConfirmAction({ id: viewReport.id, action: "rejected" })}
                  disabled={statusMutation.isPending}
                >
                  <XCircle className="w-4 h-4 mr-2" /> Reject
                </Button>
                <Button
                  variant="hero"
                  onClick={() => setConfirmAction({ id: viewReport.id, action: "approved" })}
                  disabled={statusMutation.isPending}
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" /> Approve
                </Button>
              </DialogFooter>
            )}
          </DialogContent>
        )}
      </Dialog>

      {/* Confirm action */}
      <AlertDialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.action === "approved" ? "Approve Report" : "Reject Report"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.action === "approved"
                ? "This report will be marked as approved."
                : "This report will be rejected."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={statusMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmAction && statusMutation.mutate(confirmAction)}
              disabled={statusMutation.isPending}
              className={
                confirmAction?.action === "approved"
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "bg-destructive text-destructive-foreground hover:bg-destructive/90"
              }
            >
              {statusMutation.isPending ? (
                <span className="flex items-center gap-2"><Spinner size="sm" /> Processing…</span>
              ) : (
                confirmAction?.action === "approved" ? "Approve" : "Reject"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
