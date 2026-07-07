import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, Smartphone, Mail, KeyRound, MessageSquareText } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { mfaApi } from "@/api/mfa";

const methodMeta: Record<string, { label: string; hint: string; icon: typeof Smartphone }> = {
  totp: { label: "Authenticator app", hint: "Enter the 6-digit code from your authenticator app.", icon: Smartphone },
  email: { label: "Email code", hint: "We'll send a 6-digit code to your email address.", icon: Mail },
  sms: { label: "SMS code", hint: "We'll send a 6-digit code to your phone.", icon: MessageSquareText },
};

export default function MfaVerifyPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { completeMfaLogin } = useAuth();

  const state = location.state as { mfaToken?: string; methods?: string[] } | null;
  const mfaToken = state?.mfaToken;
  const methods = state?.methods ?? [];

  const [method, setMethod] = useState(methods.includes("totp") ? "totp" : methods[0] ?? "");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [useRecovery, setUseRecovery] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState("");

  if (!mfaToken || methods.length === 0) {
    return <Navigate to="/login" replace />;
  }

  const handleSessionExpired = () => {
    toast.error("Your verification session has expired. Please log in again.", { duration: 6000 });
    navigate("/login", { replace: true });
  };

  const handleError = (err: unknown, fallback: string) => {
    if (axios.isAxiosError(err)) {
      const status = err.response?.status;
      if (status === 401) { handleSessionExpired(); return; }
      if (status === 429) { toast.error("Too many attempts. Please wait before trying again.", { duration: 6000 }); return; }
      const detail = err.response?.data?.detail;
      if (typeof detail === "string") { toast.error(detail, { duration: 6000 }); return; }
    }
    toast.error(fallback, { duration: 6000 });
  };

  const handleSendCode = async () => {
    setSending(true);
    try {
      await mfaApi.challenge(method, mfaToken);
      setCodeSent(true);
      toast.success(method === "email" ? "Code sent to your email." : "Code sent to your phone.");
    } catch (err) {
      handleError(err, "Failed to send code. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifying(true);
    try {
      if (useRecovery) {
        const { data } = await mfaApi.recovery(recoveryCode, mfaToken);
        await completeMfaLogin(data.access_token);
      } else {
        const { data } = await mfaApi.verify(method, code, mfaToken);
        await completeMfaLogin(data.access_token);
      }
      toast.success("Logged in successfully.");
      navigate("/dashboard", { replace: true });
    } catch (err) {
      handleError(err, "Verification failed. Please try again.");
    } finally {
      setVerifying(false);
    }
  };

  const switchMethod = (m: string) => {
    setMethod(m);
    setCode("");
    setCodeSent(false);
  };

  const needsChallenge = method === "email" || method === "sms";
  const canVerify = useRecovery
    ? recoveryCode.trim().length >= 8
    : /^\d{6}$/.test(code) && (!needsChallenge || codeSent);

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
            <Shield className="w-6 h-6 text-primary-foreground" />
          </div>
          <span className="font-display font-bold text-2xl">ScoutIQ</span>
        </div>

        <h1 className="text-2xl font-display font-bold mb-2">Two-factor authentication</h1>
        <p className="text-muted-foreground mb-8">
          {useRecovery
            ? "Enter one of your recovery codes. Each code works only once."
            : "Verify your identity to finish signing in."}
        </p>

        <form onSubmit={handleVerify} className="space-y-5">
          {!useRecovery && (
            <>
              {methods.length > 1 && (
                <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${methods.length}, 1fr)` }}>
                  {methods.map((m) => {
                    const Icon = methodMeta[m]?.icon ?? Smartphone;
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => switchMethod(m)}
                        className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border text-xs font-medium transition-colors ${
                          method === m ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40"
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        {methodMeta[m]?.label ?? m}
                      </button>
                    );
                  })}
                </div>
              )}

              <p className="text-sm text-muted-foreground">{methodMeta[method]?.hint}</p>

              {needsChallenge && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSendCode}
                  disabled={sending}
                >
                  {sending ? "Sending…" : codeSent ? "Resend code" : "Send code"}
                </Button>
              )}

              <div className="space-y-2">
                <Label htmlFor="mfa-code">Verification code</Label>
                <Input
                  id="mfa-code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  placeholder="000000"
                  className="h-12 text-center text-2xl tracking-[0.5em] font-mono bg-muted/50"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  autoFocus
                />
              </div>
            </>
          )}

          {useRecovery && (
            <div className="space-y-2">
              <Label htmlFor="recovery-code">Recovery code</Label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="recovery-code"
                  placeholder="XXXXX-XXXXX"
                  className="pl-10 h-12 font-mono bg-muted/50"
                  value={recoveryCode}
                  onChange={(e) => setRecoveryCode(e.target.value)}
                  autoFocus
                />
              </div>
            </div>
          )}

          <Button type="submit" variant="hero" className="w-full h-12" disabled={verifying || !canVerify}>
            {verifying ? "Verifying…" : "Verify"}
          </Button>

          <button
            type="button"
            onClick={() => { setUseRecovery(!useRecovery); setCode(""); setRecoveryCode(""); }}
            className="w-full text-center text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            {useRecovery ? "Use a verification code instead" : "Use a recovery code instead"}
          </button>
        </form>
      </div>
    </div>
  );
}
