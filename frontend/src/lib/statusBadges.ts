export const userStatusColors: Record<string, string> = {
  Active:    "bg-primary/10 text-primary border-primary/20",
  Inactive:  "bg-muted text-muted-foreground border-muted-foreground/20",
  Suspended: "bg-destructive/10 text-destructive border-destructive/20",
};

export const clubStatusColors: Record<string, string> = {
  Active:    "bg-primary/10 text-primary border-primary/20",
  Pending:   "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  Suspended: "bg-destructive/10 text-destructive border-destructive/20",
};

export const adminPlayerStatusColors: Record<string, string> = {
  Active:  "bg-primary/10 text-primary border-primary/20",
  Injured: "bg-destructive/10 text-destructive border-destructive/20",
};

export const playerStatusColors: Record<string, string> = {
  active:   "bg-primary/10 text-primary border-primary/20",
  injured:  "bg-destructive/10 text-destructive border-destructive/20",
  on_loan:  "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  inactive: "bg-muted text-muted-foreground border-border",
};

export const playerStatusLabels: Record<string, string> = {
  active:  "Active",
  injured: "Injured",
  on_loan: "On Loan",
};

export const reportStatusColors: Record<string, string> = {
  submitted: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  approved:  "bg-primary/10 text-primary border-primary/20",
  rejected:  "bg-destructive/10 text-destructive border-destructive/20",
};

export const reportStatusLabels: Record<string, string> = {
  submitted: "Pending",
  approved:  "Approved",
  rejected:  "Rejected",
};
