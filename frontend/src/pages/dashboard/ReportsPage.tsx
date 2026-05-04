import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Eye, Edit2, Trash2, FileText, AlertCircle, ChevronsUpDown, Check } from "lucide-react";
import { scoutApi, ScoutReportItem } from "@/api/scout";

const POSITIONS = ["GK", "CB", "LB", "RB", "CDM", "CM", "AM", "LW", "RW", "CF", "ST"];

const statusColors: Record<string, string> = {
  draft: "",
  submitted: "bg-secondary/10 text-secondary border-secondary/20",
  approved: "bg-primary/10 text-primary border-primary/20",
  rejected: "bg-destructive/10 text-destructive border-destructive/20",
};

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const emptyForm = { player_id: "", player_name: "", position: "ST", rating: "80", status: "draft", notes: "" };

type FormState = typeof emptyForm;
type ModalMode = "create" | "edit" | "view" | null;

export default function ReportsPage() {
  const qc = useQueryClient();

  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [activeReport, setActiveReport] = useState<ScoutReportItem | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [playerOpen, setPlayerOpen] = useState(false);

  const { data: reports = [], isLoading, isError } = useQuery({
    queryKey: ["scout-reports"],
    queryFn: scoutApi.getReports,
    staleTime: 30_000,
  });

  const { data: playerOptions = [] } = useQuery({
    queryKey: ["scout-player-dropdown"],
    queryFn: scoutApi.getPlayersForDropdown,
    staleTime: 60_000,
  });

  const createMutation = useMutation({
    mutationFn: scoutApi.createReport,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["scout-reports"] });
      qc.invalidateQueries({ queryKey: ["scout-dashboard"] });
      setModalMode(null);
      toast.success("Report created.");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: FormState }) =>
      scoutApi.updateReport(id, {
        player_id: data.player_id || undefined,
        player_name: data.player_name,
        position: data.position,
        rating: Number(data.rating),
        status: data.status,
        notes: data.notes || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["scout-reports"] });
      setModalMode(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: scoutApi.deleteReport,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["scout-reports"] });
      qc.invalidateQueries({ queryKey: ["scout-dashboard"] });
      setDeleteId(null);
      toast.success("Report deleted.");
    },
    onError: () => {
      toast.error("Failed to delete report.");
    },
  });

  const openCreate = () => {
    setForm(emptyForm);
    setActiveReport(null);
    setModalMode("create");
  };

  const openEdit = (r: ScoutReportItem) => {
    setForm({
      player_id: r.player_id ?? "",
      player_name: r.player_name,
      position: r.position,
      rating: String(r.rating),
      status: r.status,
      notes: r.notes ?? "",
    });
    setActiveReport(r);
    setModalMode("edit");
  };

  const openView = (r: ScoutReportItem) => {
    setActiveReport(r);
    setModalMode("view");
  };

  const handleSave = () => {
    if (!isFormValid) return;
    const payload = {
      player_id: form.player_id || undefined,
      player_name: form.player_name.trim(),
      position: form.position,
      rating: Number(form.rating),
      status: form.status,
      notes: form.notes.trim() || undefined,
    };
    if (modalMode === "edit" && activeReport) {
      updateMutation.mutate({ id: activeReport.id, data: form });
    } else {
      createMutation.mutate(payload);
    }
  };

  const isFormValid =
    form.player_id.trim().length > 0 &&
    form.player_name.trim().length > 0 &&
    Number(form.rating) >= 1 &&
    Number(form.rating) <= 100;

  const isSaving = createMutation.isPending || updateMutation.isPending;

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

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Spinner size="lg" label="Loading reports…" />
        </div>
      ) : isError ? (
        <div className="flex items-center justify-center h-64">
          <Alert variant="destructive" className="max-w-md">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>Failed to load reports. Please try again.</AlertDescription>
          </Alert>
        </div>
      ) : (
        <>
        {/* Mobile cards */}
        <div className="md:hidden space-y-3">
          {reports.length === 0 ? (
            <p className="text-center py-12 text-muted-foreground">No reports yet. Create your first scouting report.</p>
          ) : reports.map((r) => (
            <div key={r.id} className="bg-card border border-border rounded-xl p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-sm">{r.player_name}</p>
                  <p className="text-xs text-muted-foreground">{r.position}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openView(r)}><Eye className="w-3.5 h-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(r)}><Edit2 className="w-3.5 h-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteId(r.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-display font-bold text-primary text-sm">{r.rating}</span>
                <Badge variant="outline" className={statusColors[r.status]}>{capitalize(r.status)}</Badge>
                <span className="text-xs text-muted-foreground ml-auto">
                  {new Date(r.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                </span>
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
                    <th className="text-left py-3 px-2 text-muted-foreground font-medium">Rating</th>
                    <th className="text-left py-3 px-2 text-muted-foreground font-medium">Status</th>
                    <th className="text-left py-3 px-2 text-muted-foreground font-medium">Date</th>
                    <th className="text-right py-3 px-2 text-muted-foreground font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-12 text-muted-foreground">
                        No reports yet. Create your first scouting report.
                      </td>
                    </tr>
                  ) : (
                    reports.map((r) => (
                      <tr key={r.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-2">
                          <div className="font-medium">{r.player_name}</div>
                          <div className="text-xs text-muted-foreground">{r.position}</div>
                        </td>
                        <td className="py-3 px-2">
                          <span className="font-display font-bold text-primary">{r.rating}</span>
                        </td>
                        <td className="py-3 px-2">
                          <Badge variant="outline" className={statusColors[r.status]}>
                            {capitalize(r.status)}
                          </Badge>
                        </td>
                        <td className="py-3 px-2 text-muted-foreground">
                          {new Date(r.created_at).toLocaleDateString("en-GB", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>
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
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
        </>
      )}

      <Dialog open={modalMode === "view"} onOpenChange={() => setModalMode(null)}>
        {activeReport && (
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle className="font-display flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Scouting Report — {activeReport.player_name}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2 overflow-y-auto max-h-[70vh]">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Player</p>
                  <p className="font-medium text-sm">{activeReport.player_name}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Position</p>
                  <p className="font-medium text-sm">{activeReport.position}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Rating</p>
                  <p className="font-display font-bold text-primary text-lg">{activeReport.rating}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Status</p>
                  <Badge variant="outline" className={`mt-1 ${statusColors[activeReport.status]}`}>
                    {capitalize(activeReport.status)}
                  </Badge>
                </div>
                <div className="p-3 rounded-lg bg-muted/50 col-span-2">
                  <p className="text-xs text-muted-foreground">Date</p>
                  <p className="font-medium text-sm">
                    {new Date(activeReport.created_at).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Scout Notes</p>
                <div className="p-3 rounded-lg bg-muted/50 text-sm leading-relaxed break-words">
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

      <Dialog open={modalMode === "create" || modalMode === "edit"} onOpenChange={() => setModalMode(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-display">
              {modalMode === "edit" ? "Edit Report" : "New Scouting Report"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2 overflow-y-auto max-h-[70vh]">
            <div className="space-y-2">
              <Label>Player *</Label>
              <Popover open={playerOpen} onOpenChange={setPlayerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between bg-muted/50 font-normal"
                  >
                    {form.player_id ? form.player_name : "Select player…"}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="p-0" style={{ width: "var(--radix-popover-trigger-width)" }}>
                  <Command>
                    <CommandInput placeholder="Search players…" />
                    <CommandList>
                      <CommandEmpty>No players found.</CommandEmpty>
                      <CommandGroup>
                        {playerOptions.map((p) => (
                          <CommandItem
                            key={p.id}
                            value={`${p.first_name} ${p.last_name} ${p.position}`}
                            onSelect={() => {
                              setForm(f => ({
                                ...f,
                                player_id: p.id,
                                player_name: `${p.first_name} ${p.last_name}`,
                                position: p.position,
                              }));
                              setPlayerOpen(false);
                            }}
                          >
                            <Check className={`mr-2 h-4 w-4 ${form.player_id === p.id ? "opacity-100" : "opacity-0"}`} />
                            <span>{p.first_name} {p.last_name}</span>
                            <span className="ml-auto text-xs text-muted-foreground">{p.position}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Position</Label>
                <Select value={form.position} onValueChange={(v) => setForm({ ...form, position: v })}>
                  <SelectTrigger className="bg-muted/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {POSITIONS.map((p) => (
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
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger className="bg-muted/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="submitted">Submitted</SelectItem>
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
                rows={6}
                maxLength={2000}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setModalMode(null)} disabled={isSaving}>
              Cancel
            </Button>
            <Button variant="hero" onClick={handleSave} disabled={!isFormValid || isSaving}>
              {isSaving ? (
                <span className="flex items-center gap-2">
                  <Spinner size="sm" className="text-white" />
                  {modalMode === "edit" ? "Saving…" : "Creating…"}
                </span>
              ) : modalMode === "edit" ? "Save Changes" : "Create Report"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Report</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this scouting report. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
