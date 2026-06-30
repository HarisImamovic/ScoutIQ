import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Edit2, Trash2, DollarSign, TrendingUp, Users, AlertCircle } from "lucide-react";
import { DatePicker } from "@/components/ui/date-picker";
import {
  clubAdminApi,
  isNoClubError,
  isConflictError,
  type ContractItem,
  type CreateContractPayload,
  type UpdateContractPayload,
} from "@/api/clubAdmin";
import { NoClubState } from "@/components/NoClubState";

const STATUS_COLORS: Record<string, string> = {
  active: "bg-primary/10 text-primary border-primary/20",
  injured: "bg-destructive/10 text-destructive border-destructive/20",
  on_loan: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
};

const STATUS_LABEL: Record<string, string> = {
  active: "Active",
  injured: "Injured",
  on_loan: "On Loan",
};

interface ContractForm {
  player_id: string;
  weekly_salary: number;
  start_date: string;
  contract_until: string;
  availability_status: string;
}

const emptyForm: ContractForm = {
  player_id: "",
  weekly_salary: 0,
  start_date: "",
  contract_until: "",
  availability_status: "active",
};

function isExpiringSoon(dateStr: string | null): boolean {
  if (!dateStr) return false;
  return new Date(dateStr).getTime() - Date.now() < 1000 * 60 * 60 * 24 * 180;
}

export default function SalariesPage() {
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ContractItem | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<ContractForm>(emptyForm);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["club-contracts"],
    queryFn: clubAdminApi.getContracts,
    staleTime: 30_000,
  });

  const { data: squadData, isLoading: squadLoading } = useQuery({
    queryKey: ["club-squad"],
    queryFn: () => clubAdminApi.getSquad(),
    staleTime: 60_000,
  });

  const contracts = data ?? [];
  const squad = squadData ?? [];

  const contractedIds = new Set(contracts.map((c) => c.player_id));
  const availablePlayers = squad.filter((p) => !contractedIds.has(p.id));

  const createMutation = useMutation({
    mutationFn: (payload: CreateContractPayload) => clubAdminApi.createContract(payload),
    onSuccess: (created) => {
      qc.setQueryData<ContractItem[]>(["club-contracts"], (old) =>
        old ? [created, ...old] : [created],
      );
      toast.success("Contract created successfully.");
      setModalOpen(false);
    },
    onError: (err) => {
      if (isConflictError(err)) {
        toast.error("This player already has a contract.", { duration: 5000 });
      } else {
        toast.error("Failed to create contract. Please try again.", { duration: 5000 });
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateContractPayload }) =>
      clubAdminApi.updateContract(id, payload),
    onSuccess: (updated) => {
      qc.setQueryData<ContractItem[]>(["club-contracts"], (old) =>
        old ? old.map((c) => (c.id === updated.id ? updated : c)) : old,
      );
      toast.success("Contract updated successfully.");
      setModalOpen(false);
    },
    onError: () => toast.error("Failed to update contract. Please try again.", { duration: 5000 }),
  });

  const deleteMutation = useMutation({
    mutationFn: clubAdminApi.deleteContract,
    onSuccess: (_, id) => {
      qc.setQueryData<ContractItem[]>(["club-contracts"], (old) =>
        old ? old.filter((c) => c.id !== id) : old,
      );
      toast.success("Contract deleted successfully.");
      setDeleteId(null);
    },
    onError: () => toast.error("Failed to delete contract. Please try again.", { duration: 5000 }),
  });

  const active = contracts.filter((c) => c.availability_status !== "on_loan");
  const totalWeekly = active.reduce((sum, c) => sum + c.weekly_salary, 0);
  const totalAnnual = totalWeekly * 52;

  const openCreate = () => {
    setEditTarget(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (c: ContractItem) => {
    setEditTarget(c);
    setForm({
      player_id: c.player_id,
      weekly_salary: c.weekly_salary,
      start_date: c.start_date ?? "",
      contract_until: c.contract_until ?? "",
      availability_status: c.availability_status,
    });
    setModalOpen(true);
  };

  const handleSave = () => {
    if (editTarget) {
      updateMutation.mutate({
        id: editTarget.id,
        payload: {
          weekly_salary: form.weekly_salary,
          start_date: form.start_date,
          contract_until: form.contract_until,
          availability_status: form.availability_status,
        },
      });
    } else {
      createMutation.mutate({
        player_id: form.player_id,
        weekly_salary: form.weekly_salary,
        start_date: form.start_date,
        contract_until: form.contract_until,
        availability_status: form.availability_status,
      });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;
  const salaryValid = form.weekly_salary >= 1 && form.weekly_salary <= 3_000_000;
  const showSalaryError = form.weekly_salary > 0 && !salaryValid;
  const datesPresent = form.start_date.length > 0 && form.contract_until.length > 0;
  const datesOrdered =
    !datesPresent || form.start_date <= form.contract_until;
  const isValid =
    salaryValid &&
    (editTarget !== null || form.player_id.length > 0) &&
    datesPresent &&
    datesOrdered;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold">Salaries</h1>
          <p className="text-muted-foreground mt-1">Track and manage player contracts</p>
        </div>
        {!isNoClubError(error) && (
          <Button variant="hero" size="sm" onClick={openCreate}>
            <Plus className="w-4 h-4 mr-2" /> Add Contract
          </Button>
        )}
      </div>

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
            <div className="text-2xl font-display font-bold">{contracts.length}</div>
            <div className="text-sm text-muted-foreground">Players on Record</div>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Spinner size="lg" label="Loading contracts…" />
        </div>
      ) : isError ? (
        isNoClubError(error) ? (
          <NoClubState page="salaries" />
        ) : (
          <div className="flex items-center justify-center h-64">
            <Alert variant="destructive" className="max-w-md">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>Failed to load salary data. Please try again.</AlertDescription>
            </Alert>
          </div>
        )
      ) : (
        <>
          <div className="md:hidden space-y-3">
            {contracts.length === 0 ? (
              <p className="text-center py-12 text-muted-foreground">
                No contracts on record. Add a contract to get started.
              </p>
            ) : (
              contracts.map((c) => (
                <div key={c.id} className="bg-card border border-border rounded-xl p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-sm">{c.player_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {c.position ?? "—"}{c.age != null ? ` · Age ${c.age}` : ""}
                      </p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(c)}>
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => setDeleteId(c.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-display font-semibold text-primary text-sm">
                      €{c.weekly_salary.toLocaleString()}/wk
                    </span>
                    <Badge variant="outline" className={`text-xs ${STATUS_COLORS[c.availability_status] ?? ""}`}>
                      {STATUS_LABEL[c.availability_status] ?? c.availability_status}
                    </Badge>
                    {c.contract_until && (
                      <span
                        className={`text-xs ml-auto ${
                          isExpiringSoon(c.contract_until) ? "text-yellow-600 font-medium" : "text-muted-foreground"
                        }`}
                      >
                        {c.contract_until}{isExpiringSoon(c.contract_until) ? " ⚠" : ""}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          <Card className="hidden md:block">
            <CardContent className="pt-6">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-2 text-muted-foreground font-medium">Player</th>
                      <th className="text-left py-3 px-2 text-muted-foreground font-medium">Pos</th>
                      <th className="text-left py-3 px-2 text-muted-foreground font-medium">Weekly</th>
                      <th className="text-left py-3 px-2 text-muted-foreground font-medium">Annual</th>
                      <th className="text-left py-3 px-2 text-muted-foreground font-medium">Start Date</th>
                      <th className="text-left py-3 px-2 text-muted-foreground font-medium">Contract Until</th>
                      <th className="text-left py-3 px-2 text-muted-foreground font-medium">Status</th>
                      <th className="text-right py-3 px-2 text-muted-foreground font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contracts.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-muted-foreground">
                          No contracts on record. Add a contract to get started.
                        </td>
                      </tr>
                    ) : (
                      contracts.map((c) => (
                        <tr
                          key={c.id}
                          className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                        >
                          <td className="py-3 px-2">
                            <div className="font-medium">{c.player_name}</div>
                            {c.age != null && (
                              <div className="text-xs text-muted-foreground">Age {c.age}</div>
                            )}
                          </td>
                          <td className="py-3 px-2">
                            <Badge variant="outline" className="text-xs">
                              {c.position ?? "—"}
                            </Badge>
                          </td>
                          <td className="py-3 px-2 font-display font-semibold text-primary">
                            €{c.weekly_salary.toLocaleString()}
                          </td>
                          <td className="py-3 px-2 text-muted-foreground">
                            €{(c.weekly_salary * 52).toLocaleString()}
                          </td>
                          <td className="py-3 px-2 text-muted-foreground">
                            {c.start_date ?? "—"}
                          </td>
                          <td className="py-3 px-2">
                            {c.contract_until ? (
                              <span
                                className={
                                  isExpiringSoon(c.contract_until)
                                    ? "text-yellow-600 font-medium"
                                    : "text-muted-foreground"
                                }
                              >
                                {c.contract_until}{isExpiringSoon(c.contract_until) ? " ⚠" : ""}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="py-3 px-2">
                            <Badge
                              variant="outline"
                              className={STATUS_COLORS[c.availability_status] ?? ""}
                            >
                              {STATUS_LABEL[c.availability_status] ?? c.availability_status}
                            </Badge>
                          </td>
                          <td className="py-3 px-2">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => openEdit(c)}
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive hover:text-destructive"
                                onClick={() => setDeleteId(c.id)}
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

      <Dialog open={modalOpen} onOpenChange={(open) => { if (!isPending) setModalOpen(open); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">
              {editTarget ? "Edit Contract" : "Add Contract"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {editTarget ? (
              <div className="space-y-2">
                <Label>Player</Label>
                <div className="h-9 flex items-center px-3 rounded-md border border-border bg-muted/30 text-sm">
                  {editTarget.player_name}
                  {editTarget.position && (
                    <span className="ml-2 text-muted-foreground">· {editTarget.position}</span>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Player *</Label>
                {squadLoading ? (
                  <div className="flex items-center gap-2 h-9 px-3 rounded-md border border-border bg-muted/30">
                    <Spinner size="sm" />
                    <span className="text-sm text-muted-foreground">Loading squad…</span>
                  </div>
                ) : (
                  <Select
                    value={form.player_id}
                    onValueChange={(v) => setForm({ ...form, player_id: v })}
                  >
                    <SelectTrigger className="bg-muted/50">
                      <SelectValue placeholder="Select a player…" />
                    </SelectTrigger>
                    <SelectContent>
                      {availablePlayers.length === 0 ? (
                        <div className="py-2 px-3 text-sm text-muted-foreground">
                          {squad.length === 0
                            ? "No players in your squad."
                            : "All squad players already have contracts."}
                        </div>
                      ) : (
                        availablePlayers.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.first_name} {p.last_name}
                            {p.position && ` · ${p.position}`}
                            {p.age != null && ` · Age ${p.age}`}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label>Weekly Salary (€) *</Label>
              <Input
                type="number"
                min={1}
                max={3_000_000}
                placeholder="e.g. 20000"
                value={form.weekly_salary || ""}
                onChange={(e) => setForm({ ...form, weekly_salary: Number(e.target.value) })}
                className={`bg-muted/50 ${showSalaryError ? "border-destructive" : ""}`}
              />
              {showSalaryError && (
                <p className="text-xs text-destructive">Salary must be between €1 and €3,000,000 per week.</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Start Date *</Label>
                <DatePicker
                  value={form.start_date}
                  onChange={(v) => setForm({ ...form, start_date: v })}
                  placeholder="Start date"
                  className={!datesOrdered ? "border-destructive" : ""}
                />
              </div>
              <div className="space-y-2">
                <Label>Contract Until *</Label>
                <DatePicker
                  value={form.contract_until}
                  onChange={(v) => setForm({ ...form, contract_until: v })}
                  placeholder="End date"
                  className={!datesOrdered ? "border-destructive" : ""}
                />
              </div>
            </div>
            {!datesOrdered && (
              <p className="text-xs text-destructive">Start date must be on or before the contract end date.</p>
            )}

            <div className="space-y-2">
              <Label>Availability Status</Label>
              <Select
                value={form.availability_status}
                onValueChange={(v) => setForm({ ...form, availability_status: v })}
              >
                <SelectTrigger className="bg-muted/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="injured">Injured</SelectItem>
                  <SelectItem value="on_loan">On Loan</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setModalOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button variant="hero" onClick={handleSave} disabled={!isValid || isPending}>
              {isPending ? (
                <span className="flex items-center gap-2">
                  <Spinner size="sm" className="text-white" /> Saving…
                </span>
              ) : editTarget ? (
                "Save Changes"
              ) : (
                "Add Contract"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleteId !== null}
        onOpenChange={() => { if (!deleteMutation.isPending) setDeleteId(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Contract</AlertDialogTitle>
            <AlertDialogDescription>
              Delete this player's contract record? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <Spinner size="sm" /> Deleting…
                </span>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
