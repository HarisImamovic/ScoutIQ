import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, Smartphone, Mail, MessageSquareText, ChevronLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { mfaApi, MfaTotpSetup, MfaConfirmResult } from "@/api/mfa";
import { RecoveryCodesView } from "@/components/mfa/RecoveryCodesView";

type Step = "choose" | "totp" | "email" | "sms" | "recovery";

export default function MfaSetupPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { completeMfaLogin } = useAuth();

  const state = location.state as { mfaToken?: string; smsAvailable?: boolean } | null;
  const mfaToken = state?.mfaToken;
  const smsAvailable = state?.smsAvailable ?? false;

  const [step, setStep] = useState<Step>("choose");
  const [totpSetup, setTotpSetup] = useState<MfaTotpSetup | null>(null);
  const [phone, setPhone] = useState("");
  const [smsCodeSent, setSmsCodeSent] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<MfaConfirmResult | null>(null);

  if (!mfaToken) {
    return <Navigate to="/login" replace />;
  }

  const handleError = (err: unknown, fallback: string) => {
    if (axios.isAxiosError(err)) {
      const status = err.response?.status;
      if (status === 401) {
        toast.error("Your session has expired. Please log in again.", { duration: 6000 });
        navigate("/login", { replace: true });
        return;
      }
      if (status === 429) {
        toast.error("Too many attempts. Please wait before trying again.", { duration: 6000 });
        return;
      }
      const detail = err.response?.data?.detail;
      if (typeof detail === "string") { toast.error(detail, { duration: 6000 }); return; }
    }
    toast.error(fallback, { duration: 6000 });
  };

  const startTotp = async () => {
    setBusy(true);
    try {
      const { data } = await mfaApi.setupTotp(mfaToken);
      setTotpSetup(data);
      setStep("totp");
    } catch (err) {
      handleError(err, "Failed to start authenticator setup.");
    } finally {
      setBusy(false);
    }
  };

  const startEmail = async () => {
    setBusy(true);
    try {
      await mfaApi.setupEmail(mfaToken);
      toast.success("Code sent to your email.");
      setStep("email");
    } catch (err) {
      handleError(err, "Failed to send email code.");
    } finally {
      setBusy(false);
    }
  };

  const sendSmsCode = async () => {
    setBusy(true);
    try {
      await mfaApi.setupSms(phone.trim(), mfaToken);
      setSmsCodeSent(true);
      toast.success("Code sent to your phone.");
    } catch (err) {
      handleError(err, "Failed to send SMS code.");
    } finally {
      setBusy(false);
    }
  };

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      let data: MfaConfirmResult;
      if (step === "totp") {
        ({ data } = await mfaApi.confirmTotp(code, mfaToken));
      } else if (step === "email") {
        ({ data } = await mfaApi.confirmEmail(code, mfaToken));
      } else {
        ({ data } = await mfaApi.confirmSms(code, mfaToken));
      }
      setResult(data);
      setStep("recovery");
    } catch (err) {
      handleError(err, "Verification failed. Please check the code and try again.");
    } finally {
      setBusy(false);
    }
  };

  const handleDone = async () => {
    if (result?.access_token) {
      await completeMfaLogin(result.access_token);
      toast.success("Two-factor authentication enabled. Logged in successfully.");
      navigate("/dashboard", { replace: true });
    } else {
      navigate("/login", { replace: true });
    }
  };

  const backToChoose = () => {
    setStep("choose");
    setCode("");
    setSmsCodeSent(false);
    setTotpSetup(null);
  };

  const canConfirm = /^\d{6}$/.test(code) && (step !== "sms" || smsCodeSent);

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
            <Shield className="w-6 h-6 text-primary-foreground" />
          </div>
          <span className="font-display font-bold text-2xl">ScoutIQ</span>
        </div>

        {step === "choose" && (
          <>
            <h1 className="text-2xl font-display font-bold mb-2">Secure your account</h1>
            <p className="text-muted-foreground mb-8">
              Two-factor authentication is required on ScoutIQ. Choose a verification method to continue.
            </p>
            <div className="space-y-3">
              <button
                onClick={startTotp}
                disabled={busy}
                className="w-full flex items-start gap-4 p-4 rounded-lg border hover:border-primary/50 transition-colors text-left"
              >
                <Smartphone className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <div className="font-medium text-sm flex items-center gap-2">
                    Authenticator app
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-primary bg-primary/10 rounded px-1.5 py-0.5">Recommended</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Use Google Authenticator, Microsoft Authenticator, or any TOTP app.
                  </p>
                </div>
              </button>

              <button
                onClick={startEmail}
                disabled={busy}
                className="w-full flex items-start gap-4 p-4 rounded-lg border hover:border-primary/50 transition-colors text-left"
              >
                <Mail className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <div className="font-medium text-sm">Email verification code</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Receive a 6-digit code at your account email on every sign-in.
                  </p>
                </div>
              </button>

              {smsAvailable && (
                <button
                  onClick={() => setStep("sms")}
                  disabled={busy}
                  className="w-full flex items-start gap-4 p-4 rounded-lg border hover:border-primary/50 transition-colors text-left"
                >
                  <MessageSquareText className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <div className="font-medium text-sm">SMS verification code</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Receive a 6-digit code by text message on every sign-in.
                    </p>
                  </div>
                </button>
              )}
            </div>
          </>
        )}

        {step !== "choose" && step !== "recovery" && (
          <>
            <button
              onClick={backToChoose}
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
            >
              <ChevronLeft className="w-4 h-4" />
              Choose a different method
            </button>

            <form onSubmit={handleConfirm} className="space-y-5">
              {step === "totp" && totpSetup && (
                <>
                  <h1 className="text-xl font-display font-bold">Set up your authenticator app</h1>
                  <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                    <li>Open your authenticator app</li>
                    <li>Scan the QR code below (or enter the key manually)</li>
                    <li>Enter the 6-digit code the app shows</li>
                  </ol>
                  <div className="flex justify-center p-4 rounded-lg border bg-white">
                    <img src={totpSetup.qr_data_uri} alt="Scan this QR code with your authenticator app" className="w-44 h-44" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Manual entry key</Label>
                    <code className="block text-xs bg-muted/50 border rounded px-3 py-2 font-mono break-all">
                      {totpSetup.secret}
                    </code>
                  </div>
                </>
              )}

              {step === "email" && (
                <>
                  <h1 className="text-xl font-display font-bold">Check your email</h1>
                  <p className="text-sm text-muted-foreground">
                    We sent a 6-digit code to your account email. Enter it below to enable email verification.
                  </p>
                  <Button type="button" variant="ghost" size="sm" onClick={startEmail} disabled={busy} className="text-muted-foreground">
                    Resend code
                  </Button>
                </>
              )}

              {step === "sms" && (
                <>
                  <h1 className="text-xl font-display font-bold">Set up SMS verification</h1>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+38761123456"
                      className="h-12 bg-muted/50"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">International format with country code.</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={sendSmsCode}
                    disabled={busy || !/^\+[1-9]\d{7,14}$/.test(phone.trim())}
                  >
                    {busy ? "Sending…" : smsCodeSent ? "Resend code" : "Send code"}
                  </Button>
                </>
              )}

              <div className="space-y-2">
                <Label htmlFor="setup-code">Verification code</Label>
                <Input
                  id="setup-code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  placeholder="000000"
                  className="h-12 text-center text-2xl tracking-[0.5em] font-mono bg-muted/50"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                />
              </div>

              <Button type="submit" variant="hero" className="w-full h-12" disabled={busy || !canConfirm}>
                {busy ? "Verifying…" : "Enable & Continue"}
              </Button>
            </form>
          </>
        )}

        {step === "recovery" && result?.recovery_codes && (
          <>
            <h1 className="text-2xl font-display font-bold mb-2">Save your recovery codes</h1>
            <p className="text-muted-foreground mb-6">
              Two-factor authentication is now enabled on your account.
            </p>
            <RecoveryCodesView codes={result.recovery_codes} onDone={handleDone} doneLabel="Continue to dashboard" />
          </>
        )}

        {step === "recovery" && !result?.recovery_codes && (
          <>
            <h1 className="text-2xl font-display font-bold mb-2">Two-factor authentication enabled</h1>
            <Button variant="hero" className="w-full h-12 mt-4" onClick={handleDone}>
              Continue to dashboard
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
