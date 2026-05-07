import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Video, Trash2, ExternalLink, Play, AlertCircle, Info, Pencil } from "lucide-react";
import { playerApi, type HighlightItem } from "@/api/player";

const MAX_HIGHLIGHTS = 6;
const SUPPORTED_HINT = "YouTube, Vimeo, or Google Drive links only.";

const emptyForm = { url: "", title: "" };

function HighlightEmbed({ highlight }: { highlight: HighlightItem }) {
  return (
    <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
      <iframe
        src={highlight.embed_url}
        title={highlight.title ?? "Player highlight"}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
        loading="lazy"
        className="absolute inset-0 w-full h-full rounded-lg border-0"
      />
    </div>
  );
}

export default function HighlightsPage() {
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<HighlightItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<HighlightItem | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [urlError, setUrlError] = useState("");

  const { data: highlights = [], isLoading, isError } = useQuery({
    queryKey: ["player-highlights"],
    queryFn: playerApi.getHighlights,
    staleTime: 30_000,
  });

  const addMutation = useMutation({
    mutationFn: playerApi.addHighlight,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["player-highlights"] });
      setModalOpen(false);
      setForm(emptyForm);
      setUrlError("");
      toast.success("Highlight added successfully.");
    },
    onError: (err: any) => {
      const detail = err.response?.data?.detail;
      if (typeof detail === "string") {
        setUrlError(detail);
      } else {
        toast.error("Failed to add highlight. Please try again.");
      }
    },
  });

  const editMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { url: string; title?: string } }) =>
      playerApi.updateHighlight(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["player-highlights"] });
      setModalOpen(false);
      setEditTarget(null);
      setForm(emptyForm);
      setUrlError("");
      toast.success("Highlight updated successfully.");
    },
    onError: (err: any) => {
      const detail = err.response?.data?.detail;
      if (typeof detail === "string") {
        setUrlError(detail);
      } else {
        toast.error("Failed to update highlight. Please try again.");
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => playerApi.deleteHighlight(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["player-highlights"] });
      setDeleteTarget(null);
      toast.success("Highlight deleted successfully.");
    },
    onError: () => {
      toast.error("Failed to delete highlight. Please try again.");
    },
  });

  const atLimit = highlights.length >= MAX_HIGHLIGHTS;

  const openCreate = () => {
    setEditTarget(null);
    setForm(emptyForm);
    setUrlError("");
    setModalOpen(true);
  };

  const openEdit = (h: HighlightItem) => {
    setEditTarget(h);
    setForm({ url: h.url, title: h.title ?? "" });
    setUrlError("");
    setModalOpen(true);
  };

  const isMutating = addMutation.isPending || editMutation.isPending;

  const handleSubmit = () => {
    setUrlError("");
    if (!form.url.trim()) {
      setUrlError("Video URL is required.");
      return;
    }
    if (editTarget) {
      editMutation.mutate({
        id: editTarget.id,
        data: { url: form.url.trim(), title: form.title.trim() || undefined },
      });
    } else {
      addMutation.mutate({ url: form.url.trim(), title: form.title.trim() || undefined });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" label="Loading highlights…" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center h-64">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>Failed to load highlights. Please try again.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold">Highlights</h1>
          <p className="text-muted-foreground mt-1">Manage your video highlights for scouts</p>
        </div>
        {!atLimit && (
          <Button variant="hero" size="sm" onClick={openCreate}>
            <Plus className="w-4 h-4 mr-2" /> Add Highlight
          </Button>
        )}
      </div>

      {atLimit && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Maximum reached</AlertTitle>
          <AlertDescription>
            You have reached the maximum of {MAX_HIGHLIGHTS} highlights. Delete one to add another.
          </AlertDescription>
        </Alert>
      )}

      {highlights.length === 0 ? (
        <Card>
          <CardContent className="py-16 flex flex-col items-center justify-center text-center">
            <Video className="w-12 h-12 text-muted-foreground/40 mb-4" />
            <h3 className="font-display font-semibold text-lg mb-1">No highlights yet</h3>
            <p className="text-sm text-muted-foreground mb-4">Add your best video clips to attract scouts</p>
            <Button variant="hero" size="sm" onClick={openCreate}>
              <Plus className="w-4 h-4 mr-2" /> Add Your First Highlight
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {highlights.map((h) => (
            <Card key={h.id} className="hover-lift group">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Play className="w-4 h-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="text-sm font-semibold leading-snug truncate">
                        {h.title ?? "Untitled highlight"}
                      </CardTitle>
                      <Badge
                        variant={
                          h.status === "approved"
                            ? "default"
                            : h.status === "rejected"
                            ? "destructive"
                            : "secondary"
                        }
                        className="mt-1 text-xs"
                      >
                        {h.status === "approved"
                          ? "Approved"
                          : h.status === "rejected"
                          ? "Rejected"
                          : "Pending Review"}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <a
                      href={h.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center"
                    >
                      <Button variant="ghost" size="icon" className="h-8 w-8" tabIndex={-1}>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Button>
                    </a>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEdit(h)}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => setDeleteTarget(h)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <HighlightEmbed highlight={h} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={(open) => { if (!isMutating) { setModalOpen(open); if (!open) setEditTarget(null); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">
              {editTarget ? "Edit Highlight" : "Add Highlight"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>
                Video URL <span className="text-destructive">*</span>
              </Label>
              <Input
                placeholder="https://youtube.com/watch?v=..."
                value={form.url}
                onChange={(e) => { setForm({ ...form, url: e.target.value }); setUrlError(""); }}
                className="bg-muted/50"
                disabled={isMutating}
              />
              {urlError ? (
                <p className="text-xs text-destructive">{urlError}</p>
              ) : (
                <p className="text-xs text-muted-foreground">{SUPPORTED_HINT}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Title <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Input
                placeholder="e.g. Hat-trick vs Hoffenheim"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                maxLength={200}
                className="bg-muted/50"
                disabled={isMutating}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => { setModalOpen(false); setEditTarget(null); }}
              disabled={isMutating}
            >
              Cancel
            </Button>
            <Button
              variant="hero"
              onClick={handleSubmit}
              disabled={isMutating || !form.url.trim()}
            >
              {isMutating ? (
                <span className="flex items-center gap-2">
                  <Spinner size="sm" className="text-white" /> {editTarget ? "Saving…" : "Adding…"}
                </span>
              ) : (
                editTarget ? "Save Changes" : "Add Highlight"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={() => { if (!deleteMutation.isPending) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Highlight</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove{" "}
              <span className="font-semibold">
                {deleteTarget?.title ?? "this highlight"}
              </span>{" "}
              from your profile. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
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
