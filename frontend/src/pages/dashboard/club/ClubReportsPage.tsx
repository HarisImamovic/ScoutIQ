import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Eye, CheckCircle2, XCircle, FileText, Clock, AlertCircle } from "lucide-react";
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

export default function ClubReportsPage() {
  const qc = useQueryClient();
  const [viewReport, setViewReport] = useState<ClubReportItem | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ id: string; action: "approved" | "rejected" } | null>(null);

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
          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {reports.length === 0 ? (
              <p className="text-center py-12 text-muted-foreground">No reports submitted by your scouts yet.</p>
            ) : reports.map((r) => (
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
            ))}
          </div>

          {/* Desktop table */}
          <Card className="hidden md:block">
            <CardContent className="pt-6">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-2 text-muted-foreground font-medium">Player</th>
                      <th className="text-left py-3 px-2 text-muted-foreground font-medium">Scout</th>
                      <th className="text-left py-3 px-2 text-muted-foreground font-medium">Rating</th>
                      <th className="text-left py-3 px-2 text-muted-foreground font-medium">Date</th>
                      <th className="text-left py-3 px-2 text-muted-foreground font-medium">Status</th>
                      <th className="text-right py-3 px-2 text-muted-foreground font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-muted-foreground">
                          No reports submitted by your scouts yet.
                        </td>
                      </tr>
                    ) : reports.map((r) => (
                      <tr key={r.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-2">
                          <div className="font-medium">{r.player_name}</div>
                          <div className="text-xs text-muted-foreground">{r.position}</div>
                        </td>
                        <td className="py-3 px-2 text-muted-foreground">{r.scout_name}</td>
                        <td className="py-3 px-2">
                          <span className="font-display font-bold text-primary">{r.rating}</span>
                        </td>
                        <td className="py-3 px-2 text-muted-foreground">{formatDate(r.created_at)}</td>
                        <td className="py-3 px-2">
                          <Badge variant="outline" className={STATUS_COLORS[r.status]}>
                            {STATUS_LABEL[r.status] ?? r.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-2">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setViewReport(r)} title="View report">
                              <Eye className="w-3.5 h-3.5" />
                            </Button>
                            {r.status === "submitted" && (
                              <>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-primary hover:text-primary" title="Approve" onClick={() => setConfirmAction({ id: r.id, action: "approved" })}>
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" title="Reject" onClick={() => setConfirmAction({ id: r.id, action: "rejected" })}>
                                  <XCircle className="w-3.5 h-3.5" />
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
