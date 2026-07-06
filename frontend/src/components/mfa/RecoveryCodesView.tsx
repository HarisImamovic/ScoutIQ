import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Download, Copy, ShieldAlert } from "lucide-react";

interface RecoveryCodesViewProps {
  codes: string[];
  onDone: () => void;
  doneLabel?: string;
  requireConfirmation?: boolean;
}

export function RecoveryCodesView({
  codes,
  onDone,
  doneLabel = "Continue",
  requireConfirmation = true,
}: RecoveryCodesViewProps) {
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleDownload = () => {
    const content = [
      "ScoutIQ Two-Factor Authentication Recovery Codes",
      `Generated: ${new Date().toISOString()}`,
      "",
      "Each code can be used only once. Store them somewhere safe.",
      "",
      ...codes,
    ].join("\n");
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "scoutiq-recovery-codes.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(codes.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 p-3 rounded-lg border border-yellow-500/30 bg-yellow-500/10">
        <ShieldAlert className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
        <p className="text-sm">
          These recovery codes are shown <strong>only once</strong>. Each code can be used a single
          time to sign in if you lose access to your other 2FA methods. Store them somewhere safe.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 p-4 rounded-lg border bg-muted/30 font-mono text-sm">
        {codes.map((code) => (
          <span key={code} className="text-center tracking-wider">{code}</span>
        ))}
      </div>

      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="flex-1 gap-1.5" onClick={handleDownload}>
          <Download className="w-4 h-4" />
          Download
        </Button>
        <Button variant="outline" size="sm" className="flex-1 gap-1.5" onClick={handleCopy}>
          <Copy className="w-4 h-4" />
          {copied ? "Copied!" : "Copy"}
        </Button>
      </div>

      {requireConfirmation && (
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <Checkbox checked={saved} onCheckedChange={(v) => setSaved(v === true)} />
          I have saved these recovery codes somewhere safe
        </label>
      )}

      <Button
        variant="hero"
        className="w-full"
        disabled={requireConfirmation && !saved}
        onClick={onDone}
      >
        {doneLabel}
      </Button>
    </div>
  );
}
