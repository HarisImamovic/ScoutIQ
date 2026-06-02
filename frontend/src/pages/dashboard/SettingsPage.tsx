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
import { playerApi } from "@/api/player";
import { telegramApi } from "@/api/telegram";
import { toast } from "sonner";
import axios from "axios";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2, Eye, EyeOff, User, Mail, Lock, KeyRound, Shield, Copy, ExternalLink,
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

// ── Telegram card ──────────────────────────────────────────────────────────
function TelegramCard() {
  const queryClient = useQueryClient();
  const [linkData, setLinkData] = useState<{ code: string; bot_username: string; expires_at: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const { data: statusData, isLoading: statusLoading } = useQuery({
    queryKey: ["telegramStatus"],
    queryFn: telegramApi.getStatus,
  });

  const generateMutation = useMutation({
    mutationFn: telegramApi.generateCode,
    onSuccess: (data) => {
      setLinkData(data);
    },
    onError: () => {
      toast.error("Failed to generate link code.");
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: telegramApi.disconnect,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["telegramStatus"] });
      setLinkData(null);
      toast.success("Telegram disconnected.");
    },
    onError: () => {
      toast.error("Failed to disconnect Telegram.");
    },
  });

  const handleCopy = () => {
    if (!linkData) return;
    navigator.clipboard.writeText(`/start ${linkData.code}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const connected = statusData?.connected ?? false;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-display flex items-center gap-2">
          <svg className="w-4 h-4 text-primary" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.17 13.67l-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.98.889z"/>
          </svg>
          Telegram Notifications
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {statusLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : connected ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">Connected</Badge>
              <span className="text-sm text-muted-foreground">You will receive report notifications on Telegram.</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => disconnectMutation.mutate()}
              disabled={disconnectMutation.isPending}
              className="text-destructive border-destructive/30 hover:bg-destructive/10"
            >
              {disconnectMutation.isPending ? "Disconnecting…" : "Disconnect"}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Connect your Telegram account to receive notifications when your scouting reports are approved or rejected.
            </p>
            {!linkData ? (
              <Button
                variant="hero"
                size="sm"
                onClick={() => generateMutation.mutate()}
                disabled={generateMutation.isPending}
              >
                {generateMutation.isPending ? "Generating…" : "Connect Telegram"}
              </Button>
            ) : (
              <div className="space-y-3 p-4 rounded-lg border bg-muted/30">
                <p className="text-sm font-medium">Follow these steps:</p>
                <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>Click "Open in Telegram" below, or open your Telegram app manually</li>
                  <li>Send the code to the bot (it will be pre-filled if you use the button)</li>
                  <li>You will receive a confirmation message once connected</li>
                </ol>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs bg-background border rounded px-3 py-2 font-mono break-all">
                    /start {linkData.code}
                  </code>
                  <Button variant="outline" size="sm" onClick={handleCopy} className="shrink-0 gap-1.5">
                    <Copy className="w-3.5 h-3.5" />
                    {copied ? "Copied!" : "Copy"}
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={`https://t.me/${linkData.bot_username}?start=${linkData.code}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Open in Telegram
                  </a>
                  <span className="text-xs text-muted-foreground">· Code expires in 15 minutes</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground"
                  onClick={() => generateMutation.mutate()}
                  disabled={generateMutation.isPending}
                >
                  Generate new code
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

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

  const profileHasChanges =
    firstName.trim() !== (user?.first_name ?? "") ||
    lastName.trim()  !== (user?.last_name  ?? "") ||
    email.trim()     !== (user?.email      ?? "");

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
  const [playerStatus, setPlayerStatus] = useState<PlayerStatus>("free_agent");

  const { data: playerData } = useQuery({
    queryKey: ["player-dashboard"],
    queryFn: playerApi.getDashboard,
    enabled: role === "player",
  });

  const hasClub = playerData?.has_club ?? false;

  useEffect(() => {
    if (playerData?.availability_status) {
      setPlayerStatus(playerData.availability_status as PlayerStatus);
    }
  }, [playerData?.availability_status]);

  const availMutation = useMutation({
    mutationFn: (s: PlayerStatus) => playerApi.updateAvailability(s),
    onSuccess: () => {
      toast.success("Availability status updated successfully.");
    },
    onError: (err) => {
      if (axios.isAxiosError(err)) {
        const detail = err.response?.data?.detail;
        toast.error(typeof detail === "string" ? detail : "Failed to update status.");
      } else {
        toast.error("Failed to update status.");
      }
    },
  });

  const handleAvailSave = () => {
    availMutation.mutate(playerStatus);
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
              disabled={profileSaving || profileHasErrors || !profileHasChanges}
            >
              {profileSaving ? "Saving…" : "Save Changes"}
            </Button>

            {user?.has_password && (
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground gap-1.5"
                onClick={() => { setShowPwSection(v => !v); setCurrentPw(""); setNewPw(""); setConfirmPw(""); }}
              >
                <KeyRound className="w-4 h-4" />
                {showPwSection ? "Cancel" : "Change Password"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Change password card ──────────────────────────────────────────── */}
      {showPwSection && user?.has_password && (
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
                  <SelectItem value="under_contract" disabled={!hasClub}>Under Contract</SelectItem>
                  <SelectItem value="talks_in_progress">Talks In Progress</SelectItem>
                </SelectContent>
              </Select>
              {!hasClub && (
                <p className="text-xs text-muted-foreground">
                  "Under Contract" is only available once you are assigned to a club.
                </p>
              )}
            </div>
            <div className={`flex items-start gap-3 p-3 rounded-lg border ${statusConfig[playerStatus].color}`}>
              <div className="flex-1">
                <Badge className={`${statusConfig[playerStatus].color} text-xs font-medium mb-1`}>
                  {statusConfig[playerStatus].label}
                </Badge>
                <p className="text-sm">{statusConfig[playerStatus].description}</p>
              </div>
            </div>
            <Button variant="hero" size="sm" onClick={handleAvailSave} disabled={availMutation.isPending}>
              {availMutation.isPending ? "Saving…" : "Update Status"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── Telegram Notifications ───────────────────────────────────────── */}
      {role === "scout" && <TelegramCard />}

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
