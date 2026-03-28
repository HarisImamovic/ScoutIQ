import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Building2, Users, Shield, BarChart3, Plus, Edit2, Trash2, UserCheck } from "lucide-react";

/* ─── Types ─── */
interface Club { id: number; name: string; country: string; scouts: number; status: "Active" | "Pending" | "Suspended" }
interface User { id: number; name: string; email: string; role: string; club: string; status: "Active" | "Inactive" }
interface AdminPlayer { id: number; name: string; position: string; age: number; club: string; country: string; rating: number }
interface AdminReport { id: number; player: string; scout: string; club: string; status: string; date: string; rating: number }

/* ─── Mock data ─── */
const initClubs: Club[] = [
  { id: 1, name: "Bayern Munich", country: "Germany", scouts: 12, status: "Active" },
  { id: 2, name: "FC Barcelona", country: "Spain", scouts: 15, status: "Active" },
  { id: 3, name: "Manchester City", country: "England", scouts: 10, status: "Active" },
  { id: 4, name: "PSG", country: "France", scouts: 8, status: "Pending" },
  { id: 5, name: "SC Freiburg", country: "Germany", scouts: 5, status: "Active" },
];

const initUsers: User[] = [
  { id: 1, name: "Marcus Weber", email: "m.weber@scoutiq.com", role: "Scout", club: "Bayern Munich", status: "Active" },
  { id: 2, name: "Carlos Mendez", email: "c.mendez@scoutiq.com", role: "Scout", club: "FC Barcelona", status: "Active" },
  { id: 3, name: "Alex Johnson", email: "alex@scoutiq.com", role: "Player", club: "SC Freiburg", status: "Active" },
  { id: 4, name: "Sarah Klein", email: "s.klein@scoutiq.com", role: "Club Admin", club: "Bayern Munich", status: "Active" },
  { id: 5, name: "James Wright", email: "j.wright@scoutiq.com", role: "Scout", club: "Manchester City", status: "Inactive" },
];

const initPlayers: AdminPlayer[] = [
  { id: 1, name: "Lamine Yamal", position: "RW", age: 18, club: "FC Barcelona", country: "Spain", rating: 92 },
  { id: 2, name: "Florian Wirtz", position: "AM", age: 20, club: "B. Leverkusen", country: "Germany", rating: 90 },
  { id: 3, name: "Erling Haaland", position: "ST", age: 24, club: "Manchester City", country: "Norway", rating: 95 },
  { id: 4, name: "Vinicius Jr", position: "LW", age: 24, club: "Real Madrid", country: "Brazil", rating: 94 },
];

const initReports: AdminReport[] = [
  { id: 1, player: "Lamine Yamal", scout: "Marcus Weber", club: "Bayern Munich", status: "Approved", date: "2026-03-12", rating: 92 },
  { id: 2, player: "Florian Wirtz", scout: "Carlos Mendez", club: "FC Barcelona", status: "Submitted", date: "2026-03-10", rating: 90 },
  { id: 3, player: "Endrick", scout: "James Wright", club: "Manchester City", status: "Draft", date: "2026-03-08", rating: 85 },
];

/* ─── Status colours ─── */
const clubStatusColors: Record<Club["status"], string> = {
  Active: "bg-primary/10 text-primary border-primary/20",
  Pending: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  Suspended: "bg-destructive/10 text-destructive border-destructive/20",
};

const userStatusColors: Record<User["status"], string> = {
  Active: "bg-primary/10 text-primary border-primary/20",
  Inactive: "bg-muted text-muted-foreground border-muted-foreground/20",
};

/* ─── Helpers ─── */
function RowActions({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="flex items-center justify-end gap-1">
      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit}><Edit2 className="w-3.5 h-3.5" /></Button>
      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={onDelete}><Trash2 className="w-3.5 h-3.5" /></Button>
    </div>
  );
}

export default function AdminDashboard() {
  /* ─── Clubs ─── */
  const [clubs, setClubs] = useState<Club[]>(initClubs);
  const [clubModal, setClubModal] = useState(false);
  const [clubEdit, setClubEdit] = useState<Club | null>(null);
  const [clubForm, setClubForm] = useState({ name: "", country: "", scouts: "", status: "Active" as Club["status"] });

  /* ─── Users ─── */
  const [users, setUsers] = useState<User[]>(initUsers);
  const [userModal, setUserModal] = useState(false);
  const [userEdit, setUserEdit] = useState<User | null>(null);
  const [userForm, setUserForm] = useState({ name: "", email: "", role: "Scout", club: "", status: "Active" as User["status"] });

  /* ─── Players ─── */
  const [players, setPlayers] = useState<AdminPlayer[]>(initPlayers);
  const [playerModal, setPlayerModal] = useState(false);
  const [playerEdit, setPlayerEdit] = useState<AdminPlayer | null>(null);
  const [playerForm, setPlayerForm] = useState({ name: "", position: "ST", age: "", club: "", country: "", rating: "" });

  /* ─── Reports ─── */
  const [reports, setReports] = useState<AdminReport[]>(initReports);

  /* ─── Delete ─── */
  const [deleteTarget, setDeleteTarget] = useState<{ type: string; id: number } | null>(null);

  const handleDelete = () => {
    if (!deleteTarget) return;
    const { type, id } = deleteTarget;
    if (type === "club") setClubs((p) => p.filter((c) => c.id !== id));
    if (type === "user") setUsers((p) => p.filter((u) => u.id !== id));
    if (type === "player") setPlayers((p) => p.filter((pl) => pl.id !== id));
    if (type === "report") setReports((p) => p.filter((r) => r.id !== id));
    setDeleteTarget(null);
  };

  /* ─── Club CRUD ─── */
  const openClubCreate = () => { setClubEdit(null); setClubForm({ name: "", country: "", scouts: "", status: "Active" }); setClubModal(true); };
  const openClubEdit = (c: Club) => { setClubEdit(c); setClubForm({ name: c.name, country: c.country, scouts: String(c.scouts), status: c.status }); setClubModal(true); };
  const saveClub = () => {
    const entry = { name: clubForm.name, country: clubForm.country, scouts: Number(clubForm.scouts), status: clubForm.status };
    if (clubEdit) setClubs((p) => p.map((c) => c.id === clubEdit.id ? { ...c, ...entry } : c));
    else setClubs((p) => [...p, { id: Date.now(), ...entry }]);
    setClubModal(false);
  };

  /* ─── User CRUD ─── */
  const openUserCreate = () => { setUserEdit(null); setUserForm({ name: "", email: "", role: "Scout", club: "", status: "Active" }); setUserModal(true); };
  const openUserEdit = (u: User) => { setUserEdit(u); setUserForm({ name: u.name, email: u.email, role: u.role, club: u.club, status: u.status }); setUserModal(true); };
  const saveUser = () => {
    const entry = { name: userForm.name, email: userForm.email, role: userForm.role, club: userForm.club, status: userForm.status };
    if (userEdit) setUsers((p) => p.map((u) => u.id === userEdit.id ? { ...u, ...entry } : u));
    else setUsers((p) => [...p, { id: Date.now(), ...entry }]);
    setUserModal(false);
  };

  /* ─── Player CRUD ─── */
  const openPlayerCreate = () => { setPlayerEdit(null); setPlayerForm({ name: "", position: "ST", age: "", club: "", country: "", rating: "" }); setPlayerModal(true); };
  const openPlayerEdit = (pl: AdminPlayer) => { setPlayerEdit(pl); setPlayerForm({ name: pl.name, position: pl.position, age: String(pl.age), club: pl.club, country: pl.country, rating: String(pl.rating) }); setPlayerModal(true); };
  const savePlayer = () => {
    const entry = { name: playerForm.name, position: playerForm.position, age: Number(playerForm.age), club: playerForm.club, country: playerForm.country, rating: Number(playerForm.rating) };
    if (playerEdit) setPlayers((p) => p.map((pl) => pl.id === playerEdit.id ? { ...pl, ...entry } : pl));
    else setPlayers((p) => [...p, { id: Date.now(), ...entry }]);
    setPlayerModal(false);
  };

  const reportStatusColors: Record<string, string> = {
    Draft: "",
    Submitted: "bg-secondary/10 text-secondary border-secondary/20",
    Approved: "bg-primary/10 text-primary border-primary/20",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-display font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-1">Platform overview and management</p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Clubs", value: clubs.length, icon: Building2 },
          { label: "Total Users", value: users.length + 1200, icon: Users },
          { label: "Active Scouts", value: users.filter((u) => u.role === "Scout" && u.status === "Active").length + 180, icon: Shield },
          { label: "Reports/Month", value: reports.length + 320, icon: BarChart3 },
        ].map((s) => (
          <Card key={s.label} className="hover-lift">
            <CardContent className="pt-6">
              <s.icon className="w-5 h-5 text-primary mb-2" />
              <div className="text-2xl font-display font-bold">{s.value}</div>
              <div className="text-sm text-muted-foreground">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* CRUD tabs */}
      <Tabs defaultValue="clubs">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="clubs">Clubs</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="players">Players</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        {/* ── Clubs ── */}
        <TabsContent value="clubs" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Button variant="hero" size="sm" onClick={openClubCreate}>
              <Plus className="w-4 h-4 mr-2" /> Add Club
            </Button>
          </div>
          <Card>
            <CardContent className="pt-4">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-2 text-muted-foreground font-medium">Club</th>
                      <th className="text-left py-3 px-2 text-muted-foreground font-medium">Country</th>
                      <th className="text-left py-3 px-2 text-muted-foreground font-medium hidden sm:table-cell">Scouts</th>
                      <th className="text-left py-3 px-2 text-muted-foreground font-medium">Status</th>
                      <th className="text-right py-3 px-2 text-muted-foreground font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clubs.map((c) => (
                      <tr key={c.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-2 font-medium">{c.name}</td>
                        <td className="py-3 px-2 text-muted-foreground">{c.country}</td>
                        <td className="py-3 px-2 hidden sm:table-cell">{c.scouts}</td>
                        <td className="py-3 px-2">
                          <Badge variant="outline" className={clubStatusColors[c.status]}>{c.status}</Badge>
                        </td>
                        <td className="py-3 px-2">
                          <RowActions onEdit={() => openClubEdit(c)} onDelete={() => setDeleteTarget({ type: "club", id: c.id })} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Users ── */}
        <TabsContent value="users" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Button variant="hero" size="sm" onClick={openUserCreate}>
              <Plus className="w-4 h-4 mr-2" /> Add User
            </Button>
          </div>
          <Card>
            <CardContent className="pt-4">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-2 text-muted-foreground font-medium">Name</th>
                      <th className="text-left py-3 px-2 text-muted-foreground font-medium hidden md:table-cell">Email</th>
                      <th className="text-left py-3 px-2 text-muted-foreground font-medium">Role</th>
                      <th className="text-left py-3 px-2 text-muted-foreground font-medium hidden sm:table-cell">Club</th>
                      <th className="text-left py-3 px-2 text-muted-foreground font-medium">Status</th>
                      <th className="text-right py-3 px-2 text-muted-foreground font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-2 font-medium">{u.name}</td>
                        <td className="py-3 px-2 text-muted-foreground hidden md:table-cell">{u.email}</td>
                        <td className="py-3 px-2">
                          <Badge variant="secondary" className="text-xs bg-muted">{u.role}</Badge>
                        </td>
                        <td className="py-3 px-2 text-muted-foreground hidden sm:table-cell">{u.club}</td>
                        <td className="py-3 px-2">
                          <Badge variant="outline" className={userStatusColors[u.status]}>{u.status}</Badge>
                        </td>
                        <td className="py-3 px-2">
                          <RowActions onEdit={() => openUserEdit(u)} onDelete={() => setDeleteTarget({ type: "user", id: u.id })} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Players ── */}
        <TabsContent value="players" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Button variant="hero" size="sm" onClick={openPlayerCreate}>
              <Plus className="w-4 h-4 mr-2" /> Add Player
            </Button>
          </div>
          <Card>
            <CardContent className="pt-4">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-2 text-muted-foreground font-medium">Player</th>
                      <th className="text-left py-3 px-2 text-muted-foreground font-medium">Pos</th>
                      <th className="text-left py-3 px-2 text-muted-foreground font-medium hidden sm:table-cell">Age</th>
                      <th className="text-left py-3 px-2 text-muted-foreground font-medium hidden md:table-cell">Club</th>
                      <th className="text-left py-3 px-2 text-muted-foreground font-medium hidden lg:table-cell">Country</th>
                      <th className="text-left py-3 px-2 text-muted-foreground font-medium">Rating</th>
                      <th className="text-right py-3 px-2 text-muted-foreground font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {players.map((p) => (
                      <tr key={p.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-2 font-medium">{p.name}</td>
                        <td className="py-3 px-2"><Badge variant="outline" className="text-xs">{p.position}</Badge></td>
                        <td className="py-3 px-2 text-muted-foreground hidden sm:table-cell">{p.age}</td>
                        <td className="py-3 px-2 text-muted-foreground hidden md:table-cell">{p.club}</td>
                        <td className="py-3 px-2 text-muted-foreground hidden lg:table-cell">{p.country}</td>
                        <td className="py-3 px-2 font-display font-bold text-primary">{p.rating}</td>
                        <td className="py-3 px-2">
                          <RowActions onEdit={() => openPlayerEdit(p)} onDelete={() => setDeleteTarget({ type: "player", id: p.id })} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Reports ── */}
        <TabsContent value="reports" className="space-y-4 mt-4">
          <Card>
            <CardContent className="pt-4">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-2 text-muted-foreground font-medium">Player</th>
                      <th className="text-left py-3 px-2 text-muted-foreground font-medium hidden sm:table-cell">Scout</th>
                      <th className="text-left py-3 px-2 text-muted-foreground font-medium hidden md:table-cell">Club</th>
                      <th className="text-left py-3 px-2 text-muted-foreground font-medium">Rating</th>
                      <th className="text-left py-3 px-2 text-muted-foreground font-medium">Status</th>
                      <th className="text-left py-3 px-2 text-muted-foreground font-medium hidden lg:table-cell">Date</th>
                      <th className="text-right py-3 px-2 text-muted-foreground font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.map((r) => (
                      <tr key={r.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-2 font-medium">{r.player}</td>
                        <td className="py-3 px-2 text-muted-foreground hidden sm:table-cell">{r.scout}</td>
                        <td className="py-3 px-2 text-muted-foreground hidden md:table-cell">{r.club}</td>
                        <td className="py-3 px-2 font-display font-bold text-primary">{r.rating}</td>
                        <td className="py-3 px-2">
                          <Badge variant="outline" className={reportStatusColors[r.status]}>{r.status}</Badge>
                        </td>
                        <td className="py-3 px-2 text-muted-foreground hidden lg:table-cell">{r.date}</td>
                        <td className="py-3 px-2">
                          <div className="flex items-center justify-end">
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteTarget({ type: "report", id: r.id })}>
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
        </TabsContent>
      </Tabs>

      {/* Club modal */}
      <Dialog open={clubModal} onOpenChange={setClubModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">{clubEdit ? "Edit Club" : "Add Club"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2"><Label>Club Name *</Label><Input value={clubForm.name} onChange={(e) => setClubForm({ ...clubForm, name: e.target.value })} className="bg-muted/50" /></div>
            <div className="space-y-2"><Label>Country</Label><Input value={clubForm.country} onChange={(e) => setClubForm({ ...clubForm, country: e.target.value })} className="bg-muted/50" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Scouts</Label><Input type="number" min={0} value={clubForm.scouts} onChange={(e) => setClubForm({ ...clubForm, scouts: e.target.value })} className="bg-muted/50" /></div>
              <div className="space-y-2"><Label>Status</Label>
                <Select value={clubForm.status} onValueChange={(v) => setClubForm({ ...clubForm, status: v as Club["status"] })}>
                  <SelectTrigger className="bg-muted/50"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setClubModal(false)}>Cancel</Button>
            <Button variant="hero" onClick={saveClub} disabled={!clubForm.name.trim()}>{clubEdit ? "Save Changes" : "Add Club"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* User modal */}
      <Dialog open={userModal} onOpenChange={setUserModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">{userEdit ? "Edit User" : "Add User"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2"><Label>Full Name *</Label><Input value={userForm.name} onChange={(e) => setUserForm({ ...userForm, name: e.target.value })} className="bg-muted/50" /></div>
            <div className="space-y-2"><Label>Email *</Label><Input type="email" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} className="bg-muted/50" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Role</Label>
                <Select value={userForm.role} onValueChange={(v) => setUserForm({ ...userForm, role: v })}>
                  <SelectTrigger className="bg-muted/50"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Player">Player</SelectItem>
                    <SelectItem value="Scout">Scout</SelectItem>
                    <SelectItem value="Club Admin">Club Admin</SelectItem>
                    <SelectItem value="Global Admin">Global Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Status</Label>
                <Select value={userForm.status} onValueChange={(v) => setUserForm({ ...userForm, status: v as User["status"] })}>
                  <SelectTrigger className="bg-muted/50"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2"><Label>Club</Label><Input value={userForm.club} onChange={(e) => setUserForm({ ...userForm, club: e.target.value })} className="bg-muted/50" /></div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setUserModal(false)}>Cancel</Button>
            <Button variant="hero" onClick={saveUser} disabled={!userForm.name.trim() || !userForm.email.trim()}>{userEdit ? "Save Changes" : "Add User"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Player modal */}
      <Dialog open={playerModal} onOpenChange={setPlayerModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">{playerEdit ? "Edit Player" : "Add Player"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2"><Label>Player Name *</Label><Input value={playerForm.name} onChange={(e) => setPlayerForm({ ...playerForm, name: e.target.value })} className="bg-muted/50" /></div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2"><Label>Position</Label>
                <Select value={playerForm.position} onValueChange={(v) => setPlayerForm({ ...playerForm, position: v })}>
                  <SelectTrigger className="bg-muted/50"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["GK", "CB", "LB", "RB", "CDM", "CM", "AM", "LW", "RW", "CF", "ST"].map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Age</Label><Input type="number" min={15} max={45} value={playerForm.age} onChange={(e) => setPlayerForm({ ...playerForm, age: e.target.value })} className="bg-muted/50" /></div>
              <div className="space-y-2"><Label>Rating</Label><Input type="number" min={1} max={100} value={playerForm.rating} onChange={(e) => setPlayerForm({ ...playerForm, rating: e.target.value })} className="bg-muted/50" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Club</Label><Input value={playerForm.club} onChange={(e) => setPlayerForm({ ...playerForm, club: e.target.value })} className="bg-muted/50" /></div>
              <div className="space-y-2"><Label>Country</Label><Input value={playerForm.country} onChange={(e) => setPlayerForm({ ...playerForm, country: e.target.value })} className="bg-muted/50" /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPlayerModal(false)}>Cancel</Button>
            <Button variant="hero" onClick={savePlayer} disabled={!playerForm.name.trim()}>{playerEdit ? "Save Changes" : "Add Player"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.type}</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete this record. This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
