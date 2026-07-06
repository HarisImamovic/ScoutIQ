import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { ShieldCheck, Smartphone, Mail, MessageSquareText, KeyRound } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { mfaApi, MfaTotpSetup, MfaConfirmResult } from "@/api/mfa";
import { RecoveryCodesView } from "@/components/mfa/RecoveryCodesView";

const methodMeta: Record<string, { label: string; icon: typeof Smartphone }> = {
  totp: { label: "Authenticator app", icon: Smartphone },
  email: { label: "Email code", icon: Mail },
  sms: { label: "SMS code", icon: MessageSquareText },
};

function apiErrorToast(err: unknown, fallback: string) {
  if (axios.isAxiosError(err)) {
    const detail = err.response?.data?.detail;
    if (typeof detail === "string") {
      toast.error(detail);
      return;
    }
  }
  toast.error(fallback);
}

export function MfaCard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const hasPassword = user?.has_password ?? false;

  const { data: status, isLoading } = useQuery({
    queryKey: ["mfaStatus"],
    queryFn: async () => (await mfaApi.status()).data,
  });

  const [addMethod, setAddMethod] = useState<string | null>(null);
  const [totpSetup, setTotpSetup] = useState<MfaTotpSetup | null>(null);
  const [phone, setPhone] = useState("");
  const [challengeSent, setChallengeSent] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [addResult, setAddResult] = useState<MfaConfirmResult | null>(null);

  const [removeTarget, setRemoveTarget] = useState<string | null>(null);
  const [reauthPassword, setReauthPassword] = useState("");
  const [reauthCode, setReauthCode] = useState("");

  const [regenOpen, setRegenOpen] = useState(false);
  const [newCodes, setNewCodes] = useState<string[] | null>(null);

  const confirmedCount = status?.methods.filter((m) => m.confirmed).length ?? 0;

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["mfaStatus"] });

  const resetAddState = () => {
    setAddMethod(null);
    setTotpSetup(null);
    setPhone("");
    setChallengeSent(false);
    setCode("");
    setAddResult(null);
  };

  const resetReauthState = () => {
    setReauthPassword("");
    setReauthCode("");
  };

  const startAdd = async (method: string) => {
    setBusy(true);
    try {
      if (method === "totp") {
        const { data } = await mfaApi.setupTotp();
        setTotpSetup(data);
      } else if (method === "email") {
        await mfaApi.setupEmail();
        setChallengeSent(true);
        toast.success("Code sent to your email.");
      }
      setAddMethod(method);
    } catch (err) {
      apiErrorToast(err, "Failed to start setup.");
    } finally {
      setBusy(false);
    }
  };

  const sendSmsSetupCode = async () => {
    setBusy(true);
    try {
      await mfaApi.setupSms(phone.trim());
      setChallengeSent(true);
      toast.success("Code sent to your phone.");
    } catch (err) {
      apiErrorToast(err, "Failed to send SMS code.");
    } finally {
      setBusy(false);
    }
  };

  const confirmAdd = async () => {
    if (!addMethod) return;
    setBusy(true);
    try {
      let data: MfaConfirmResult;
      if (addMethod === "totp") ({ data } = await mfaApi.confirmTotp(code));
      else if (addMethod === "email") ({ data } = await mfaApi.confirmEmail(code));
      else ({ data } = await mfaApi.confirmSms(code));

      refresh();
      if (data.recovery_codes) {
        setAddResult(data);
      } else {
        toast.success("2FA method added successfully.");
        resetAddState();
      }
    } catch (err) {
      apiErrorToast(err, "Verification failed.");
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async () => {
    if (!removeTarget) return;
    setBusy(true);
    try {
      await mfaApi.removeMethod(removeTarget, {
        password: hasPassword ? reauthPassword : undefined,
        code: hasPassword ? undefined : reauthCode,
      });
      toast.success("2FA method removed successfully.");
      refresh();
      setRemoveTarget(null);
      resetReauthState();
    } catch (err) {
      apiErrorToast(err, "Failed to remove method.");
    } finally {
      setBusy(false);
    }
  };

  const handleRegenerate = async () => {
    setBusy(true);
    try {
      const { data } = await mfaApi.regenerateRecoveryCodes({
        password: hasPassword ? reauthPassword : undefined,
        code: hasPassword ? undefined : reauthCode,
      });
      setNewCodes(data.recovery_codes);
      refresh();
      resetReauthState();
    } catch (err) {
      apiErrorToast(err, "Failed to regenerate recovery codes.");
    } finally {
      setBusy(false);
    }
  };

  const reauthField = hasPassword ? (
    <div className="space-y-1.5">
      <Label htmlFor="reauth-pw">Confirm with your password</Label>
      <Input
        id="reauth-pw"
        type="password"
        value={reauthPassword}
        onChange={(e) => setReauthPassword(e.target.value)}
        className="bg-muted/50"
        placeholder="Your account password"
      />
    </div>
  ) : (
    <div className="space-y-1.5">
      <Label htmlFor="reauth-code">Confirm with a 2FA code</Label>
      <Input
        id="reauth-code"
        inputMode="numeric"
        maxLength={6}
        value={reauthCode}
        onChange={(e) => setReauthCode(e.target.value.replace(/\D/g, ""))}
        className="bg-muted/50 font-mono"
        placeholder="000000"
      />
      <p className="text-xs text-muted-foreground">
        Enter a code from your authenticator app, or request one via your email/SMS method first.
      </p>
    </div>
  );

  const reauthValid = hasPassword ? reauthPassword.length > 0 : /^\d{6}$/.test(reauthCode);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-display flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-primary" />
          Two-Factor Authentication
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading || !status ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <>
            <div className="space-y-2">
              {(["totp", "email", ...(status.sms_available || status.methods.some((m) => m.method === "sms") ? ["sms"] : [])] as string[]).map((method) => {
                const record = status.methods.find((m) => m.method === method);
                const enabled = record?.confirmed ?? false;
                const Icon = methodMeta[method].icon;
                return (
                  <div key={method} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <Icon className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <div className="text-sm font-medium">{methodMeta[method].label}</div>
                        {record?.destination && (
                          <div className="text-xs text-muted-foreground">{record.destination}</div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {enabled ? (
                        <>
                          <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">Enabled</Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:bg-destructive/10"
                            disabled={confirmedCount <= 1}
                            onClick={() => { setRemoveTarget(method); resetReauthState(); }}
                          >
                            Remove
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={busy}
                          onClick={() => (method === "sms" ? setAddMethod("sms") : startAdd(method))}
                        >
                          Enable
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {confirmedCount > 0 && (
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-3">
                  <KeyRound className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <div className="text-sm font-medium">Recovery codes</div>
                    <div className="text-xs text-muted-foreground">
                      {status.recovery_codes_remaining} unused code{status.recovery_codes_remaining === 1 ? "" : "s"} remaining
                    </div>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setRegenOpen(true); setNewCodes(null); resetReauthState(); }}
                >
                  Regenerate
                </Button>
              </div>
            )}

            {confirmedCount <= 1 && confirmedCount > 0 && (
              <p className="text-xs text-muted-foreground">
                Add a second method before removing your only active one.
              </p>
            )}
          </>
        )}

        <Dialog open={!!addMethod} onOpenChange={(open) => { if (!open) resetAddState(); }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {addResult?.recovery_codes ? "Save your recovery codes" : `Enable ${methodMeta[addMethod ?? "totp"]?.label}`}
              </DialogTitle>
              {!addResult?.recovery_codes && (
                <DialogDescription>
                  {addMethod === "totp" && "Scan the QR code with your authenticator app, then enter the 6-digit code."}
                  {addMethod === "email" && "Enter the 6-digit code we sent to your email."}
                  {addMethod === "sms" && "Enter your phone number, then confirm with the code we send you."}
                </DialogDescription>
              )}
            </DialogHeader>

            {addResult?.recovery_codes ? (
              <RecoveryCodesView
                codes={addResult.recovery_codes}
                onDone={() => { toast.success("2FA method added successfully."); resetAddState(); }}
                doneLabel="Done"
              />
            ) : (
              <div className="space-y-4">
                {addMethod === "totp" && totpSetup && (
                  <>
                    <div className="flex justify-center p-3 rounded-lg border bg-white">
                      <img src={totpSetup.qr_data_uri} alt="Scan this QR code with your authenticator app" className="w-40 h-40" />
                    </div>
                    <code className="block text-xs bg-muted/50 border rounded px-3 py-2 font-mono break-all">
                      {totpSetup.secret}
                    </code>
                  </>
                )}

                {addMethod === "sms" && (
                  <>
                    <div className="space-y-1.5">
                      <Label htmlFor="sms-phone">Phone number</Label>
                      <Input
                        id="sms-phone"
                        type="tel"
                        placeholder="+38761123456"
                        className="bg-muted/50"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={sendSmsSetupCode}
                      disabled={busy || !/^\+[1-9]\d{7,14}$/.test(phone.trim())}
                    >
                      {challengeSent ? "Resend code" : "Send code"}
                    </Button>
                  </>
                )}

                {addMethod === "email" && (
                  <Button variant="ghost" size="sm" onClick={() => startAdd("email")} disabled={busy} className="text-muted-foreground">
                    Resend code
                  </Button>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="add-code">Verification code</Label>
                  <Input
                    id="add-code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    placeholder="000000"
                    className="text-center text-xl tracking-[0.4em] font-mono bg-muted/50"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  />
                </div>

                <Button
                  variant="hero"
                  className="w-full"
                  onClick={confirmAdd}
                  disabled={busy || !/^\d{6}$/.test(code) || (addMethod === "sms" && !challengeSent)}
                >
                  {busy ? "Verifying…" : "Verify & Enable"}
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={!!removeTarget} onOpenChange={(open) => { if (!open) { setRemoveTarget(null); resetReauthState(); } }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Remove {methodMeta[removeTarget ?? "totp"]?.label}?</DialogTitle>
              <DialogDescription>
                You will no longer be able to use this method to sign in.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {reauthField}
              <Button
                variant="destructive"
                className="w-full"
                onClick={handleRemove}
                disabled={busy || !reauthValid}
              >
                {busy ? "Removing…" : "Remove Method"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={regenOpen} onOpenChange={(open) => { if (!open) { setRegenOpen(false); setNewCodes(null); resetReauthState(); } }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{newCodes ? "Your new recovery codes" : "Regenerate recovery codes"}</DialogTitle>
              {!newCodes && (
                <DialogDescription>
                  This will invalidate all of your existing recovery codes and generate a new set.
                </DialogDescription>
              )}
            </DialogHeader>
            {newCodes ? (
              <RecoveryCodesView
                codes={newCodes}
                onDone={() => { setRegenOpen(false); setNewCodes(null); toast.success("Recovery codes regenerated successfully."); }}
                doneLabel="Done"
              />
            ) : (
              <div className="space-y-4">
                {reauthField}
                <Button
                  variant="hero"
                  className="w-full"
                  onClick={handleRegenerate}
                  disabled={busy || !reauthValid}
                >
                  {busy ? "Generating…" : "Regenerate Codes"}
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
