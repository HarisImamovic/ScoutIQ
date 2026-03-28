import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Eye, CheckCircle2, XCircle, FileText, Clock } from "lucide-react";

interface Report {
  id: number;
  player: string;
  position: string;
  scout: string;
  rating: number;
  date: string;
  status: "Pending" | "Approved" | "Rejected";
  notes: string;
}

const initialReports: Report[] = [
  { id: 1, player: "Lamine Yamal", position: "RW", scout: "Marcus Weber", rating: 92, date: "2026-03-12", status: "Pending", notes: "Exceptional technical ability and vision for his age. Dominated the right flank throughout the match. Recommended for immediate acquisition." },
  { id: 2, player: "Florian Wirtz", position: "AM", scout: "Carlos Mendez", rating: 90, date: "2026-03-10", status: "Pending", notes: "Outstanding creative midfielder with excellent passing range. Very composed under pressure. Potential long-term target." },
  { id: 3, player: "Endrick", position: "ST", scout: "James Wright", rating: 85, date: "2026-03-08", status: "Approved", notes: "Powerful striker with great positional sense. Still developing but massive potential." },
  { id: 4, player: "Gavi", position: "CM", scout: "Marcus Weber", rating: 87, date: "2026-03-05", status: "Rejected", notes: "Elite pressing and ball retention. However salary is prohibitive for our budget constraints." },
  { id: 5, player: "Mathys Tel", position: "CF", scout: "Carlos Mendez", rating: 84, date: "2026-02-28", status: "Pending", notes: "Promising young forward with pace and technical ability. Good fit for our system." },
];

const statusColors: Record<Report["status"], string> = {
  Pending: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  Approved: "bg-primary/10 text-primary border-primary/20",
  Rejected: "bg-destructive/10 text-destructive border-destructive/20",
};

export default function ClubReportsPage() {
  const [reports, setReports] = useState<Report[]>(initialReports);
  const [viewReport, setViewReport] = useState<Report | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ id: number; action: "Approved" | "Rejected" } | null>(null);

  const updateStatus = (id: number, status: Report["status"]) => {
    setReports((prev) => prev.map((r) => r.id === id ? { ...r, status } : r));
    setConfirmAction(null);
    setViewReport(null);
  };

  const pending = reports.filter((r) => r.status === "Pending").length;
  const approved = reports.filter((r) => r.status === "Approved").length;
  const rejected = reports.filter((r) => r.status === "Rejected").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-display font-bold">Reports</h1>
        <p className="text-muted-foreground mt-1">Review and action scout reports</p>
      </div>

      {/* Summary */}
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

      {/* Reports table */}
      <Card>
        <CardContent className="pt-6">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-2 text-muted-foreground font-medium">Player</th>
                  <th className="text-left py-3 px-2 text-muted-foreground font-medium hidden sm:table-cell">Scout</th>
                  <th className="text-left py-3 px-2 text-muted-foreground font-medium">Rating</th>
                  <th className="text-left py-3 px-2 text-muted-foreground font-medium hidden md:table-cell">Date</th>
                  <th className="text-left py-3 px-2 text-muted-foreground font-medium">Status</th>
                  <th className="text-right py-3 px-2 text-muted-foreground font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((r) => (
                  <tr key={r.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-2">
                      <div className="font-medium">{r.player}</div>
                      <div className="text-xs text-muted-foreground">{r.position}</div>
                    </td>
                    <td className="py-3 px-2 text-muted-foreground hidden sm:table-cell">{r.scout}</td>
                    <td className="py-3 px-2">
                      <span className="font-display font-bold text-primary">{r.rating}</span>
                    </td>
                    <td className="py-3 px-2 text-muted-foreground hidden md:table-cell">{r.date}</td>
                    <td className="py-3 px-2">
                      <Badge variant="outline" className={statusColors[r.status]}>{r.status}</Badge>
                    </td>
                    <td className="py-3 px-2">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setViewReport(r)} title="View report">
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                        {r.status === "Pending" && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-primary hover:text-primary"
                              title="Approve"
                              onClick={() => setConfirmAction({ id: r.id, action: "Approved" })}
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              title="Reject"
                              onClick={() => setConfirmAction({ id: r.id, action: "Rejected" })}
                            >
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

      {/* View modal */}
      <Dialog open={!!viewReport} onOpenChange={() => setViewReport(null)}>
        {viewReport && (
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-display flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Scout Report — {viewReport.player}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Player</p>
                  <p className="font-medium text-sm">{viewReport.player}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Position</p>
                  <p className="font-medium text-sm">{viewReport.position}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Scout</p>
                  <p className="font-medium text-sm">{viewReport.scout}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Rating</p>
                  <p className="font-display font-bold text-primary text-lg">{viewReport.rating}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Date</p>
                  <p className="font-medium text-sm">{viewReport.date}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Status</p>
                  <Badge variant="outline" className={`mt-1 ${statusColors[viewReport.status]}`}>{viewReport.status}</Badge>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Scout Notes</p>
                <div className="p-3 rounded-lg bg-muted/50 text-sm leading-relaxed">{viewReport.notes}</div>
              </div>
            </div>
            {viewReport.status === "Pending" && (
              <DialogFooter className="gap-2">
                <Button
                  variant="outline"
                  className="text-destructive border-destructive/30 hover:bg-destructive/10"
                  onClick={() => setConfirmAction({ id: viewReport.id, action: "Rejected" })}
                >
                  <XCircle className="w-4 h-4 mr-2" /> Reject
                </Button>
                <Button variant="hero" onClick={() => setConfirmAction({ id: viewReport.id, action: "Approved" })}>
                  <CheckCircle2 className="w-4 h-4 mr-2" /> Approve
                </Button>
              </DialogFooter>
            )}
          </DialogContent>
        )}
      </Dialog>

      {/* Confirm action dialog */}
      <AlertDialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.action === "Approved" ? "Approve Report" : "Reject Report"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.action === "Approved"
                ? "This report will be marked as approved and the scout will be notified."
                : "This report will be rejected and the scout will be notified."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmAction && updateStatus(confirmAction.id, confirmAction.action)}
              className={confirmAction?.action === "Approved"
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "bg-destructive text-destructive-foreground hover:bg-destructive/90"}
            >
              {confirmAction?.action === "Approved" ? "Approve" : "Reject"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
