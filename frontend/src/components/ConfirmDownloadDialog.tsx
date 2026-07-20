import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Download, FileDown } from "lucide-react";

interface ConfirmDownloadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  playerName: string;
  onConfirm: () => void;
  isDownloading: boolean;
}

export function ConfirmDownloadDialog({
  open,
  onOpenChange,
  playerName,
  onConfirm,
  isDownloading,
}: ConfirmDownloadDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => !isDownloading && onOpenChange(o)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <FileDown className="w-5 h-5 text-primary" /> Download Report PDF
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground py-2">
          Download the scouting report for{" "}
          <span className="font-medium text-foreground">{playerName}</span> as a PDF file?
        </p>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isDownloading}>
            Cancel
          </Button>
          <Button variant="hero" onClick={onConfirm} disabled={isDownloading}>
            {isDownloading ? (
              <span className="flex items-center gap-2">
                <Spinner size="sm" className="text-white" /> Preparing…
              </span>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" /> Download PDF
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
