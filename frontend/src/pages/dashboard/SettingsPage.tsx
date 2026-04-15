import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { useRole } from "@/contexts/RoleContext";
import { useAuth } from "@/contexts/AuthContext";
import { authApi } from "@/api/auth";
import { toast } from "sonner";
import axios from "axios";
import {
  CheckCircle2, Eye, EyeOff, User, Mail, Lock, KeyRound, Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Password policy ────────────────────────────────────────────────────────
const PASSWORD_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d\s])[\x20-\x7E]{8,72}$/;

function getPasswordHints(pw: string) {
  return [
    { label: "At least 8 characters",   met: pw.length >= 8 },
    { label: "One uppercase letter",     met: /[A-Z]/.test(pw) },
    { label: "One lowercase letter",     met: /[a-z]/.test(pw) },
    { label: "One number",               met: /\d/.test(pw) },
    { label: "One special character",    met: /[^A-Za-z\d\s]/.test(pw) },
  ];
}

// ── Player availability ────────────────────────────────────────────────────
type PlayerStatus = "free_agent" | "under_contract" | "talks_in_progress";

const statusConfig: Record<PlayerStatus, { label: string; color: string; description: string }> = {
  free_agent: {
    label: "Free Agent",
    color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    description: "You are available to join a new club",
  },
  under_contract: {
    label: "Under Contract",
    color: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    description: "You are currently contracted to a club",
  },
  talks_in_progress: {
    label: "Talks In Progress",
    color: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    description: "You are in discussions with one or more clubs",
  },
};

const roleLabels: Record<string, string> = {
  player: "Player",
  scout: "Scout",
  club_admin: "Club Admin",
  global_admin: "Global Admin",
};

// ── Component ──────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const { role } = useRole();
  const { user, refreshUser } = useAuth();

  // ── Profile form ────────────────────────────────────────────────────────
  const [firstName, setFirstName] = useState("");
  const [lastName,  setLastName]  = useState("");
  const [email,     setEmail]     = useState("");
  const [profileSaving, setProfileSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setFirstName(user.first_name);
      setLastName(user.last_name);
      setEmail(user.email);
    }
  }, [user]);

  const profileHasErrors =
    !firstName.trim() || firstName.length > 100 ||
    !lastName.trim()  || lastName.length > 100  ||
    !email.trim();

  const handleProfileSave = async () => {
    if (profileHasErrors) return;
    setProfileSaving(true);
    try {
      await authApi.updateProfile({
        first_name: firstName.trim(),
        last_name:  lastName.trim(),
        email:      email.trim(),
      });
      await refreshUser();
      toast.success("Profile updated successfully.");
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const detail = err.response?.data?.detail;
        if (typeof detail === "string") {
          toast.error(detail);
        } else {
          toast.error("Failed to update profile.");
        }
      }
    } finally {
      setProfileSaving(false);
    }
  };

  // ── Change password ──────────────────────────────────────────────────────
  const [showPwSection, setShowPwSection] = useState(false);
  const [currentPw,  setCurrentPw]  = useState("");
  const [newPw,      setNewPw]      = useState("");
  const [confirmPw,  setConfirmPw]  = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew,     setShowNew]     = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [newPwFocused, setNewPwFocused] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);

  const hints = getPasswordHints(newPw);
  const newPwValid = PASSWORD_RE.test(newPw);
  const pwHasErrors = !currentPw || !newPwValid || newPw !== confirmPw;

  const handleChangePassword = async () => {
    if (pwHasErrors) return;
    setPwSaving(true);
    try {
      await authApi.changePassword(currentPw, newPw);
      toast.success("Password changed successfully.");
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
      setShowPwSection(false);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const detail = err.response?.data?.detail;
        if (typeof detail === "string") {
          toast.error(detail);
        } else {
          toast.error("Failed to change password.");
        }
      }
    } finally {
      setPwSaving(false);
    }
  };

  // ── Player availability ──────────────────────────────────────────────────
  const [playerStatus, setPlayerStatus] = useState<PlayerStatus>("under_contract");
  const [availSaved, setAvailSaved] = useState(false);

  const handleAvailSave = () => {
    setAvailSaved(true);
    setTimeout(() => setAvailSaved(false), 2000);
  };

  // ── Member since ─────────────────────────────────────────────────────────
  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString("en-GB", { year: "numeric", month: "long", day: "numeric" })
    : "—";

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl md:text-3xl font-display font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your account and preferences</p>
      </div>

      {/* ── Profile card ─────────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-display flex items-center gap-2">
              <User className="w-4 h-4 text-primary" />
              Profile
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs capitalize">
                <Shield className="w-3 h-3 mr-1 text-primary" />
                {roleLabels[user?.role ?? ""] ?? user?.role ?? ""}
              </Badge>
              <span className="text-xs text-muted-foreground">Member since {memberSince}</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                maxLength={110}
                className={cn(
                  "bg-muted/50",
                  (!firstName.trim() || firstName.length > 100) && firstName !== "" && "border-destructive"
                )}
              />
              {firstName.length > 100 && (
                <p className="text-xs text-destructive">Max 100 characters</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={e => setLastName(e.target.value)}
                maxLength={110}
                className={cn(
                  "bg-muted/50",
                  (!lastName.trim() || lastName.length > 100) && lastName !== "" && "border-destructive"
                )}
              />
              {lastName.length > 100 && (
                <p className="text-xs text-destructive">Max 100 characters</p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">
              <Mail className="w-3.5 h-3.5 inline mr-1 text-muted-foreground" />
              Email
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="bg-muted/50"
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <Button
              variant="hero"
              size="sm"
              onClick={handleProfileSave}
              disabled={profileSaving || profileHasErrors}
            >
              {profileSaving ? "Saving…" : "Save Changes"}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground gap-1.5"
              onClick={() => { setShowPwSection(v => !v); setCurrentPw(""); setNewPw(""); setConfirmPw(""); }}
            >
              <KeyRound className="w-4 h-4" />
              {showPwSection ? "Cancel" : "Change Password"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Change password card ──────────────────────────────────────────── */}
      {showPwSection && (
        <Card className="border-primary/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-display flex items-center gap-2">
              <Lock className="w-4 h-4 text-primary" />
              Change Password
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Current password */}
            <div className="space-y-1.5">
              <Label htmlFor="currentPw">Current Password</Label>
              <div className="relative">
                <Input
                  id="currentPw"
                  type={showCurrent ? "text" : "password"}
                  value={currentPw}
                  onChange={e => setCurrentPw(e.target.value)}
                  className="bg-muted/50 pr-10"
                  placeholder="Enter your current password"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* New password */}
            <div className="space-y-1.5">
              <Label htmlFor="newPw">New Password</Label>
              <div className="relative">
                <Input
                  id="newPw"
                  type={showNew ? "text" : "password"}
                  value={newPw}
                  onChange={e => setNewPw(e.target.value)}
                  onFocus={() => setNewPwFocused(true)}
                  onBlur={() => setNewPwFocused(false)}
                  className={cn(
                    "bg-muted/50 pr-10",
                    newPw && !newPwValid && "border-destructive"
                  )}
                  placeholder="Enter your new password"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Hint checklist */}
              {(newPwFocused || newPw) && (
                <ul className="space-y-1 mt-2">
                  {hints.map(h => (
                    <li
                      key={h.label}
                      className={cn(
                        "flex items-center gap-2 text-xs transition-colors",
                        h.met ? "text-emerald-500" : "text-muted-foreground"
                      )}
                    >
                      <CheckCircle2 className={cn("w-3.5 h-3.5 shrink-0", h.met ? "text-emerald-500" : "text-muted-foreground/40")} />
                      {h.label}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Confirm password */}
            <div className="space-y-1.5">
              <Label htmlFor="confirmPw">Confirm New Password</Label>
              <div className="relative">
                <Input
                  id="confirmPw"
                  type={showConfirm ? "text" : "password"}
                  value={confirmPw}
                  onChange={e => setConfirmPw(e.target.value)}
                  className={cn(
                    "bg-muted/50 pr-10",
                    confirmPw && confirmPw !== newPw && "border-destructive"
                  )}
                  placeholder="Re-enter your new password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {confirmPw && confirmPw !== newPw && (
                <p className="text-xs text-destructive">Passwords do not match.</p>
              )}
            </div>

            <Button
              variant="hero"
              size="sm"
              onClick={handleChangePassword}
              disabled={pwSaving || pwHasErrors}
            >
              {pwSaving ? "Updating…" : "Update Password"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── Player availability ───────────────────────────────────────────── */}
      {role === "player" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-display">Availability Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Let scouts know your current situation. This status is visible on your public profile.
            </p>
            <div className="space-y-2">
              <Label>Current Status</Label>
              <Select value={playerStatus} onValueChange={v => setPlayerStatus(v as PlayerStatus)}>
                <SelectTrigger className="bg-muted/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free_agent">Free Agent</SelectItem>
                  <SelectItem value="under_contract">Under Contract</SelectItem>
                  <SelectItem value="talks_in_progress">Talks In Progress</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className={`flex items-start gap-3 p-3 rounded-lg border ${statusConfig[playerStatus].color}`}>
              <div className="flex-1">
                <Badge className={`${statusConfig[playerStatus].color} text-xs font-medium mb-1`}>
                  {statusConfig[playerStatus].label}
                </Badge>
                <p className="text-sm">{statusConfig[playerStatus].description}</p>
              </div>
            </div>
            <Button variant="hero" size="sm" onClick={handleAvailSave}>
              {availSaved ? (
                <><CheckCircle2 className="w-4 h-4 mr-2" /> Saved</>
              ) : (
                "Update Status"
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── Appearance ───────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-display">Appearance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-sm">Theme</div>
              <div className="text-xs text-muted-foreground">Switch between light and dark mode</div>
            </div>
            <ThemeToggle />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
