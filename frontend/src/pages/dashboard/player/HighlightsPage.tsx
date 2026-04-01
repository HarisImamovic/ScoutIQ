import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Video, Edit2, Trash2, ExternalLink, Play } from "lucide-react";

interface Highlight {
  id: number;
  title: string;
  url: string;
  duration: string;
  date: string;
  tags: string[];
}

const initialHighlights: Highlight[] = [
  {
    id: 1,
    title: "Hat-trick vs Hoffenheim",
    url: "https://youtube.com/watch?v=example1",
    duration: "4:23",
    date: "2026-03-10",
    tags: ["Goals", "Match Highlights"],
  },
  {
    id: 2,
    title: "Skills & Dribbling Compilation 2025/26",
    url: "https://youtube.com/watch?v=example2",
    duration: "7:15",
    date: "2026-02-20",
    tags: ["Skills", "Dribbling"],
  },
  {
    id: 3,
    title: "Assist masterclass vs Stuttgart",
    url: "https://youtube.com/watch?v=example3",
    duration: "3:08",
    date: "2026-01-15",
    tags: ["Assists", "Passing"],
  },
];

const emptyForm = { title: "", url: "", duration: "", date: "", tags: "" };

export default function HighlightsPage() {
  const [highlights, setHighlights] = useState<Highlight[]>(initialHighlights);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [editTarget, setEditTarget] = useState<Highlight | null>(null);
  const [form, setForm] = useState(emptyForm);

  const openCreate = () => {
    setEditTarget(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (h: Highlight) => {
    setEditTarget(h);
    setForm({ title: h.title, url: h.url, duration: h.duration, date: h.date, tags: h.tags.join(", ") });
    setModalOpen(true);
  };

  const handleSave = () => {
    const tags = form.tags.split(",").map((t) => t.trim()).filter(Boolean);
    if (editTarget) {
      setHighlights((prev) =>
        prev.map((h) => h.id === editTarget.id ? { ...h, ...form, tags } : h)
      );
    } else {
      setHighlights((prev) => [
        ...prev,
        { id: Date.now(), ...form, tags },
      ]);
    }
    setModalOpen(false);
  };

  const handleDelete = () => {
    if (deleteId !== null) {
      setHighlights((prev) => prev.filter((h) => h.id !== deleteId));
      setDeleteId(null);
    }
  };

  const isFormValid = form.title.trim() && form.url.trim();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold">Highlights</h1>
          <p className="text-muted-foreground mt-1">Manage your video highlights for scouts</p>
        </div>
        <Button variant="hero" size="sm" onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" /> Add Highlight
        </Button>
      </div>

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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {highlights.map((h) => (
            <Card key={h.id} className="hover-lift group">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Play className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(h)}>
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => setDeleteId(h.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
                <CardTitle className="text-sm font-semibold leading-snug mt-2">{h.title}</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{h.date}</span>
                  {h.duration && <span>{h.duration}</span>}
                </div>
                <div className="flex flex-wrap gap-1">
                  {h.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs bg-primary/10 text-primary border-0">
                      {tag}
                    </Badge>
                  ))}
                </div>
                <a href={h.url} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm" className="w-full text-xs">
                    <ExternalLink className="w-3.5 h-3.5 mr-1.5" /> Watch Video
                  </Button>
                </a>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create / Edit modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">
              {editTarget ? "Edit Highlight" : "Add Highlight"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                placeholder="e.g. Hat-trick vs Hoffenheim"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="bg-muted/50"
              />
            </div>
            <div className="space-y-2">
              <Label>Video URL *</Label>
              <Input
                placeholder="https://youtube.com/watch?v=..."
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
                className="bg-muted/50"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Duration</Label>
                <Input
                  placeholder="e.g. 4:23"
                  value={form.duration}
                  onChange={(e) => setForm({ ...form, duration: e.target.value })}
                  className="bg-muted/50"
                />
              </div>
              <div className="space-y-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="bg-muted/50"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Tags <span className="text-muted-foreground">(comma separated)</span></Label>
              <Input
                placeholder="Goals, Dribbling, Assists"
                value={form.tags}
                onChange={(e) => setForm({ ...form, tags: e.target.value })}
                className="bg-muted/50"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button variant="hero" onClick={handleSave} disabled={!isFormValid}>
              {editTarget ? "Save Changes" : "Add Highlight"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Highlight</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this highlight from your profile. This action cannot be undone.
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
