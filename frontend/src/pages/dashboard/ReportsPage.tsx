import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Eye, Edit2, Trash2, FileText } from "lucide-react";

interface Report {
  id: number;
  player: string;
  position: string;
  scout: string;
  status: "Draft" | "Submitted" | "Approved";
  date: string;
  rating: number;
  notes: string;
}

const initialReports: Report[] = [
  { id: 1, player: "Lamine Yamal", position: "RW", scout: "Marcus Weber", status: "Approved", date: "2026-03-12", rating: 92, notes: "Exceptional technical ability and vision for his age. Dominated the right flank throughout the match. Recommended for immediate acquisition." },
  { id: 2, player: "Florian Wirtz", position: "AM", scout: "Carlos Mendez", status: "Submitted", date: "2026-03-10", rating: 90, notes: "Outstanding creative midfielder with excellent passing range. Very composed under pressure. Potential long-term target." },
  { id: 3, player: "Endrick", position: "ST", scout: "James Wright", status: "Draft", date: "2026-03-08", rating: 85, notes: "Powerful striker with great positional sense. Still developing but massive potential." },
  { id: 4, player: "Gavi", position: "CM", scout: "Marcus Weber", status: "Submitted", date: "2026-03-05", rating: 87, notes: "Elite pressing and ball retention. Dominant in midfield duels. Salary could be prohibitive but worth exploring." },
];

const statusColors: Record<string, string> = {
  Draft: "",
  Submitted: "bg-secondary/10 text-secondary border-secondary/20",
  Approved: "bg-primary/10 text-primary border-primary/20",
};

const emptyForm = { player: "", position: "RW", rating: "80", status: "Draft" as Report["status"], notes: "" };

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>(initialReports);
  const [modalMode, setModalMode] = useState<"create" | "edit" | "view" | null>(null);
  const [activeReport, setActiveReport] = useState<Report | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);

  const openCreate = () => {
    setForm(emptyForm);
    setActiveReport(null);
    setModalMode("create");
  };

  const openEdit = (r: Report) => {
    setForm({ player: r.player, position: r.position, rating: String(r.rating), status: r.status, notes: r.notes });
    setActiveReport(r);
    setModalMode("edit");
  };

  const openView = (r: Report) => {
    setActiveReport(r);
    setModalMode("view");
  };

  const handleSave = () => {
    if (modalMode === "edit" && activeReport) {
      setReports((prev) =>
        prev.map((r) =>
          r.id === activeReport.id
            ? { ...r, player: form.player, position: form.position, rating: Number(form.rating), status: form.status, notes: form.notes }
            : r
        )
      );
    } else if (modalMode === "create") {
      setReports((prev) => [
        ...prev,
        {
          id: Date.now(),
          player: form.player,
          position: form.position,
          scout: "Marcus Weber",
          status: form.status,
          date: new Date().toISOString().slice(0, 10),
          rating: Number(form.rating),
          notes: form.notes,
        },
      ]);
    }
    setModalMode(null);
  };

  const handleDelete = () => {
    if (deleteId !== null) {
      setReports((prev) => prev.filter((r) => r.id !== deleteId));
      setDeleteId(null);
    }
  };

  const isFormValid = form.player.trim() && Number(form.rating) >= 1 && Number(form.rating) <= 100;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold">Scouting Reports</h1>
          <p className="text-muted-foreground mt-1">Create and manage scouting reports</p>
        </div>
        <Button variant="hero" size="sm" onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" /> New Report
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-2 text-muted-foreground font-medium">Player</th>
                  <th className="text-left py-3 px-2 text-muted-foreground font-medium hidden sm:table-cell">Scout</th>
                  <th className="text-left py-3 px-2 text-muted-foreground font-medium">Rating</th>
                  <th className="text-left py-3 px-2 text-muted-foreground font-medium">Status</th>
                  <th className="text-left py-3 px-2 text-muted-foreground font-medium hidden md:table-cell">Date</th>
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
                    <td className="py-3 px-2">
                      <Badge variant="outline" className={statusColors[r.status]}>
                        {r.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-2 text-muted-foreground hidden md:table-cell">{r.date}</td>
                    <td className="py-3 px-2">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openView(r)}>
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(r)}>
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => setDeleteId(r.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
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
      <Dialog open={modalMode === "view"} onOpenChange={() => setModalMode(null)}>
        {activeReport && (
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-display flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Scouting Report — {activeReport.player}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Player</p>
                  <p className="font-medium text-sm">{activeReport.player}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Position</p>
                  <p className="font-medium text-sm">{activeReport.position}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Scout</p>
                  <p className="font-medium text-sm">{activeReport.scout}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Rating</p>
                  <p className="font-display font-bold text-primary text-lg">{activeReport.rating}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Status</p>
                  <Badge variant="outline" className={`mt-1 ${statusColors[activeReport.status]}`}>
                    {activeReport.status}
                  </Badge>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Date</p>
                  <p className="font-medium text-sm">{activeReport.date}</p>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Scout Notes</p>
                <div className="p-3 rounded-lg bg-muted/50 text-sm leading-relaxed">
                  {activeReport.notes || <span className="text-muted-foreground italic">No notes added</span>}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setModalMode(null)}>Close</Button>
              <Button variant="hero" onClick={() => { setModalMode(null); setTimeout(() => openEdit(activeReport), 50); }}>
                <Edit2 className="w-4 h-4 mr-2" /> Edit
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>

      {/* Create / Edit modal */}
      <Dialog open={modalMode === "create" || modalMode === "edit"} onOpenChange={() => setModalMode(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">
              {modalMode === "edit" ? "Edit Report" : "New Scouting Report"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Player Name *</Label>
              <Input
                placeholder="e.g. Lamine Yamal"
                value={form.player}
                onChange={(e) => setForm({ ...form, player: e.target.value })}
                className="bg-muted/50"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Position</Label>
                <Select value={form.position} onValueChange={(v) => setForm({ ...form, position: v })}>
                  <SelectTrigger className="bg-muted/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["GK", "CB", "LB", "RB", "CDM", "CM", "AM", "LW", "RW", "CF", "ST"].map((p) => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Rating (1–100) *</Label>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={form.rating}
                  onChange={(e) => setForm({ ...form, rating: e.target.value })}
                  className="bg-muted/50"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as Report["status"] })}>
                <SelectTrigger className="bg-muted/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Draft">Draft</SelectItem>
                  <SelectItem value="Submitted">Submitted</SelectItem>
                  <SelectItem value="Approved">Approved</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Scout Notes</Label>
              <Textarea
                placeholder="Write your scouting observations..."
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="bg-muted/50 resize-none"
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setModalMode(null)}>Cancel</Button>
            <Button variant="hero" onClick={handleSave} disabled={!isFormValid}>
              {modalMode === "edit" ? "Save Changes" : "Create Report"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Report</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this scouting report. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
