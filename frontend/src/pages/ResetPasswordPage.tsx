import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, Lock, Eye, EyeOff, ArrowLeft, CheckCircle2, AlertCircle } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import client from "@/api/client";

const PASSWORD_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d\s])[\x20-\x7E]{8,72}$/;

function PasswordHint({ met, label }: { met: boolean; label: string }) {
  return (
    <span className={`flex items-center gap-1.5 text-xs ${met ? "text-primary" : "text-muted-foreground"}`}>
      <span className={`w-1 h-1 rounded-full flex-shrink-0 ${met ? "bg-primary" : "bg-muted-foreground/50"}`} />
      {label}
    </span>
  );
}

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [focused, setFocused] = useState(false);
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");
  const [done, setDone] = useState(false);

  const hints = [
    { label: "At least 8 characters", met: password.length >= 8 },
    { label: "One uppercase letter",  met: /[A-Z]/.test(password) },
    { label: "One lowercase letter",  met: /[a-z]/.test(password) },
    { label: "One number",            met: /\d/.test(password) },
    { label: "One special character", met: /[^A-Za-z\d\s]/.test(password) },
  ];

  const validate = () => {
    const next: typeof errors = {};
    if (!PASSWORD_RE.test(password)) next.password = "Password does not meet requirements.";
    if (!confirm) next.confirm = "Please confirm your password.";
    else if (password !== confirm) next.confirm = "Passwords do not match.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError("");
    if (!validate()) return;
    setSubmitting(true);
    try {
      await client.post("/auth/reset-password", { token, new_password: password });
      setDone(true);
      toast.success("Password reset successfully.");
      setTimeout(() => navigate("/login", { replace: true }), 2500);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const detail = err.response?.data?.detail as string | undefined;
        if (err.response?.status === 429) {
          setServerError("Too many attempts. Please wait a moment and try again.");
        } else if (detail) {
          setServerError(detail);
        } else {
          setServerError("Something went wrong. Please try again.");
        }
      } else {
        setServerError("Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center space-y-4 max-w-sm">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8 text-destructive" />
          </div>
          <h1 className="text-2xl font-display font-bold">Invalid link</h1>
          <p className="text-muted-foreground text-sm">
            This password reset link is invalid. Please request a new one.
          </p>
          <Link to="/forgot-password">
            <Button variant="hero" className="mt-2">Request new link</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-primary/20 via-background to-secondary/20 items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,hsl(var(--primary)/0.1),transparent_50%)]" />
        <div className="text-center z-10">
          <div className="flex items-center justify-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
              <Shield className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-3xl">ScoutIQ</span>
          </div>
          <p className="mt-4 text-muted-foreground max-w-sm">
            AI-powered football scouting platform for the modern game.
          </p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-xl">ScoutIQ</span>
          </div>

          {done ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-2xl font-display font-bold">Password updated</h1>
              <p className="text-muted-foreground text-sm">
                Your password has been reset. Redirecting you to sign in…
              </p>
            </div>
          ) : (
            <>
              <Link to="/login" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
                <ArrowLeft className="w-4 h-4" /> Back to sign in
              </Link>

              <h1 className="text-3xl font-display font-bold mb-2">Set new password</h1>
              <p className="text-muted-foreground mb-8 text-sm">
                Choose a strong password for your account.
              </p>

              <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium">New Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      autoComplete="new-password"
                      className={`pl-10 pr-10 h-12 bg-muted/50 border-border focus:border-primary transition-colors ${errors.password ? "border-destructive focus:border-destructive" : ""}`}
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setErrors((p) => ({ ...p, password: undefined })); }}
                      onFocus={() => setFocused(true)}
                      onBlur={() => setFocused(false)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {(focused || errors.password) && (
                    <div className="grid grid-cols-2 gap-1 pt-1">
                      {hints.map((h) => <PasswordHint key={h.label} met={h.met} label={h.label} />)}
                    </div>
                  )}
                  {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm" className="text-sm font-medium">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="confirm"
                      type={showConfirm ? "text" : "password"}
                      placeholder="••••••••"
                      autoComplete="new-password"
                      className={`pl-10 pr-10 h-12 bg-muted/50 border-border focus:border-primary transition-colors ${errors.confirm ? "border-destructive focus:border-destructive" : ""}`}
                      value={confirm}
                      onChange={(e) => { setConfirm(e.target.value); setErrors((p) => ({ ...p, confirm: undefined })); }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.confirm && <p className="text-xs text-destructive">{errors.confirm}</p>}
                </div>

                {serverError && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                    <AlertCircle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                    <p className="text-xs text-destructive">{serverError}</p>
                  </div>
                )}

                <Button type="submit" variant="hero" className="w-full h-12 text-base" disabled={submitting}>
                  {submitting ? (
                    <span className="flex items-center gap-2">
                      <Spinner size="sm" className="text-white" /> Updating…
                    </span>
                  ) : (
                    "Reset password"
                  )}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
