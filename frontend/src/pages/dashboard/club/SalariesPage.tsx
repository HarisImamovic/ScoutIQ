import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Edit2, Trash2, DollarSign, TrendingUp, Users } from "lucide-react";

interface PlayerSalary {
  id: number;
  name: string;
  position: string;
  age: number;
  weeklySalary: number;
  contractUntil: string;
  status: "Active" | "Injured" | "On Loan";
}

const initialSalaries: PlayerSalary[] = [
  { id: 1, name: "Vincenzo Grifo", position: "LW", age: 31, weeklySalary: 22000, contractUntil: "2026-06-30", status: "Active" },
  { id: 2, name: "Christian Günter", position: "LB", age: 31, weeklySalary: 18000, contractUntil: "2026-06-30", status: "Active" },
  { id: 3, name: "Lucas Höler", position: "CF", age: 30, weeklySalary: 16000, contractUntil: "2025-06-30", status: "Active" },
  { id: 4, name: "Maximilian Eggestein", position: "CM", age: 27, weeklySalary: 20000, contractUntil: "2027-06-30", status: "Active" },
  { id: 5, name: "Daniel-Kofi Kyereh", position: "AM", age: 28, weeklySalary: 15000, contractUntil: "2026-06-30", status: "Injured" },
  { id: 6, name: "Luca Waldschmidt", position: "ST", age: 28, weeklySalary: 17000, contractUntil: "2026-06-30", status: "On Loan" },
];

const statusColors: Record<PlayerSalary["status"], string> = {
  Active: "bg-primary/10 text-primary border-primary/20",
  Injured: "bg-destructive/10 text-destructive border-destructive/20",
  "On Loan": "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
};

const emptyForm = { name: "", position: "CM", age: "", weeklySalary: "", contractUntil: "", status: "Active" as PlayerSalary["status"] };

export default function SalariesPage() {
  const [salaries, setSalaries] = useState<PlayerSalary[]>(initialSalaries);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<PlayerSalary | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);

  const totalWeekly = salaries.filter((s) => s.status !== "On Loan").reduce((acc, s) => acc + s.weeklySalary, 0);
  const totalAnnual = totalWeekly * 52;

  const openCreate = () => {
    setEditTarget(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (p: PlayerSalary) => {
    setEditTarget(p);
    setForm({
      name: p.name,
      position: p.position,
      age: String(p.age),
      weeklySalary: String(p.weeklySalary),
      contractUntil: p.contractUntil,
      status: p.status,
    });
    setModalOpen(true);
  };

  const handleSave = () => {
    const entry = {
      name: form.name,
      position: form.position,
      age: Number(form.age),
      weeklySalary: Number(form.weeklySalary),
      contractUntil: form.contractUntil,
      status: form.status,
    };
    if (editTarget) {
      setSalaries((prev) => prev.map((p) => p.id === editTarget.id ? { ...p, ...entry } : p));
    } else {
      setSalaries((prev) => [...prev, { id: Date.now(), ...entry }]);
    }
    setModalOpen(false);
  };

  const handleDelete = () => {
    if (deleteId !== null) {
      setSalaries((prev) => prev.filter((p) => p.id !== deleteId));
      setDeleteId(null);
    }
  };

  const isValid = form.name.trim() && Number(form.weeklySalary) > 0;

  const isExpiringSoon = (date: string) => {
    const diff = new Date(date).getTime() - Date.now();
    return diff < 1000 * 60 * 60 * 24 * 180;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold">Salaries</h1>
          <p className="text-muted-foreground mt-1">Track and manage player contracts</p>
        </div>
        <Button variant="hero" size="sm" onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" /> Add Player
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="hover-lift">
          <CardContent className="pt-5">
            <DollarSign className="w-5 h-5 text-primary mb-2" />
            <div className="text-2xl font-display font-bold">€{totalWeekly.toLocaleString()}</div>
            <div className="text-sm text-muted-foreground">Weekly Wage Bill</div>
          </CardContent>
        </Card>
        <Card className="hover-lift">
          <CardContent className="pt-5">
            <TrendingUp className="w-5 h-5 text-secondary mb-2" />
            <div className="text-2xl font-display font-bold">€{(totalAnnual / 1_000_000).toFixed(1)}M</div>
            <div className="text-sm text-muted-foreground">Annual Wage Bill</div>
          </CardContent>
        </Card>
        <Card className="hover-lift">
          <CardContent className="pt-5">
            <Users className="w-5 h-5 text-purple-500 mb-2" />
            <div className="text-2xl font-display font-bold">{salaries.length}</div>
            <div className="text-sm text-muted-foreground">Players on Record</div>
          </CardContent>
        </Card>
      </div>

      {/* Salary table */}
      <Card>
        <CardContent className="pt-6">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-2 text-muted-foreground font-medium">Player</th>
                  <th className="text-left py-3 px-2 text-muted-foreground font-medium hidden sm:table-cell">Pos</th>
                  <th className="text-left py-3 px-2 text-muted-foreground font-medium">Weekly</th>
                  <th className="text-left py-3 px-2 text-muted-foreground font-medium hidden md:table-cell">Annual</th>
                  <th className="text-left py-3 px-2 text-muted-foreground font-medium hidden lg:table-cell">Contract Until</th>
                  <th className="text-left py-3 px-2 text-muted-foreground font-medium">Status</th>
                  <th className="text-right py-3 px-2 text-muted-foreground font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {salaries.map((p) => (
                  <tr key={p.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-2">
                      <div className="font-medium">{p.name}</div>
                      <div className="text-xs text-muted-foreground">Age {p.age}</div>
                    </td>
                    <td className="py-3 px-2 hidden sm:table-cell">
                      <Badge variant="outline" className="text-xs">{p.position}</Badge>
                    </td>
                    <td className="py-3 px-2 font-display font-semibold text-primary">
                      €{p.weeklySalary.toLocaleString()}
                    </td>
                    <td className="py-3 px-2 hidden md:table-cell text-muted-foreground">
                      €{(p.weeklySalary * 52).toLocaleString()}
                    </td>
                    <td className="py-3 px-2 hidden lg:table-cell">
                      <span className={isExpiringSoon(p.contractUntil) ? "text-yellow-600 font-medium" : "text-muted-foreground"}>
                        {p.contractUntil}
                        {isExpiringSoon(p.contractUntil) && " ⚠"}
                      </span>
                    </td>
                    <td className="py-3 px-2">
                      <Badge variant="outline" className={statusColors[p.status]}>{p.status}</Badge>
                    </td>
                    <td className="py-3 px-2">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(p)}>
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => setDeleteId(p.id)}
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

      {/* Create/Edit modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">{editTarget ? "Edit Player" : "Add Player"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Player Name *</Label>
              <Input placeholder="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="bg-muted/50" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Position</Label>
                <Select value={form.position} onValueChange={(v) => setForm({ ...form, position: v })}>
                  <SelectTrigger className="bg-muted/50"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["GK", "CB", "LB", "RB", "CDM", "CM", "AM", "LW", "RW", "CF", "ST"].map((p) => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Age</Label>
                <Input type="number" min={15} max={45} placeholder="e.g. 25" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} className="bg-muted/50" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Weekly Salary (€) *</Label>
              <Input type="number" min={0} placeholder="e.g. 20000" value={form.weeklySalary} onChange={(e) => setForm({ ...form, weeklySalary: e.target.value })} className="bg-muted/50" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Contract Until</Label>
                <Input type="date" value={form.contractUntil} onChange={(e) => setForm({ ...form, contractUntil: e.target.value })} className="bg-muted/50" />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as PlayerSalary["status"] })}>
                  <SelectTrigger className="bg-muted/50"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Injured">Injured</SelectItem>
                    <SelectItem value="On Loan">On Loan</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button variant="hero" onClick={handleSave} disabled={!isValid}>
              {editTarget ? "Save Changes" : "Add Player"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Player</AlertDialogTitle>
            <AlertDialogDescription>Remove this player's salary record? This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
