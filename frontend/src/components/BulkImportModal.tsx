import { useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Upload,
  Download,
  FileSpreadsheet,
  X,
  CheckCircle2,
  AlertCircle,
  TriangleAlert,
} from "lucide-react";
import client from "@/api/client";

interface ImportError {
  row: number;
  field: string;
  message: string;
}

interface ImportResult {
  created: number;
  errors: ImportError[];
}

interface Props {
  type: "clubs" | "players";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (count: number) => void;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_TYPES = [
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
];

type Phase = "idle" | "ready" | "importing" | "done";

export function BulkImportModal({ type, open, onOpenChange, onSuccess }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<ImportResult | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const label = type === "clubs" ? "Clubs" : "Players";
  const entity = type === "clubs" ? "club" : "player";

  const resetState = () => {
    setFile(null);
    setFileError(null);
    setPhase("idle");
    setResult(null);
    setImportError(null);
    setIsDragging(false);
  };

  const handleClose = (open: boolean) => {
    if (!open) resetState();
    onOpenChange(open);
  };

  const validateFile = (f: File): string | null => {
    const ext = f.name.toLowerCase();
    if (!ext.endsWith(".xlsx") && !ext.endsWith(".xls")) {
      return "Only Excel files (.xlsx or .xls) are accepted.";
    }
    if (!ACCEPTED_TYPES.includes(f.type) && f.type !== "") {
      return "Only Excel files (.xlsx or .xls) are accepted.";
    }
    if (f.size > MAX_FILE_SIZE) {
      return `File is too large (${(f.size / 1024 / 1024).toFixed(1)} MB). Maximum allowed size is 5 MB.`;
    }
    return null;
  };

  const acceptFile = (f: File) => {
    const err = validateFile(f);
    if (err) {
      setFileError(err);
      setFile(null);
      setPhase("idle");
    } else {
      setFileError(null);
      setFile(f);
      setPhase("ready");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) acceptFile(f);
    e.target.value = "";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) acceptFile(f);
  };

  const handleDownloadTemplate = async () => {
    try {
      const resp = await client.get(`/admin/${type}/bulk-import/template`, {
        responseType: "blob",
      });
      const url = URL.createObjectURL(resp.data as Blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${entity}s_template.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
    }
  };

  const handleImport = async () => {
    if (!file) return;
    setPhase("importing");
    setImportError(null);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const { data } = await client.post<ImportResult>(
        `/admin/${type}/bulk-import`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } },
      );
      setResult(data);
      setPhase("done");
      if (data.created > 0) {
        onSuccess(data.created);
      }
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      setImportError(typeof detail === "string" ? detail : "Import failed. Please try again.");
      setPhase("ready");
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display">Bulk Import {label}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border border-border">
            <FileSpreadsheet className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">Download the sample file first</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Fill in your {entity} data following the template format, then upload it below.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={handleDownloadTemplate} className="shrink-0">
              <Download className="w-3.5 h-3.5 mr-1.5" />
              Template
            </Button>
          </div>

          {phase !== "done" && (
            <>
              <div
                className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors select-none
                  ${isDragging
                    ? "border-primary bg-primary/5"
                    : file
                      ? "border-primary/40 bg-primary/5"
                      : "border-border hover:border-primary/40 hover:bg-muted/40"
                  }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => phase !== "importing" && fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                  onChange={handleFileChange}
                />

                {file ? (
                  <div className="flex items-center justify-center gap-3">
                    <FileSpreadsheet className="w-8 h-8 text-primary shrink-0" />
                    <div className="text-left">
                      <p className="text-sm font-medium truncate max-w-[16rem]">{file.name}</p>
                      <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                    </div>
                    <button
                      className="ml-2 p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"
                      onClick={(e) => { e.stopPropagation(); setFile(null); setPhase("idle"); setFileError(null); }}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <Upload className="mx-auto mb-3 w-8 h-8 text-muted-foreground" />
                    <p className="text-sm font-medium">
                      {isDragging ? "Drop your file here" : "Drop your Excel file here"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">or click to browse</p>
                    <p className="text-xs text-muted-foreground mt-2">.xlsx or .xls · max 5 MB</p>
                  </>
                )}
              </div>

              {fileError && (
                <Alert variant="destructive" className="py-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-sm">{fileError}</AlertDescription>
                </Alert>
              )}

              {importError && (
                <Alert variant="destructive" className="py-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-sm">{importError}</AlertDescription>
                </Alert>
              )}
            </>
          )}

          {phase === "done" && result && (
            <div className="space-y-3">
              {result.created > 0 && result.errors.length === 0 ? (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/10 border border-primary/20">
                  <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                  <p className="text-sm font-medium">
                    {result.created} {entity}{result.created !== 1 ? "s" : ""} imported successfully.
                  </p>
                </div>
              ) : (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                  <TriangleAlert className="w-5 h-5 text-yellow-600 shrink-0" />
                  <p className="text-sm">
                    <span className="font-medium">{result.created}</span> {entity}{result.created !== 1 ? "s" : ""} imported
                    {result.errors.length > 0 && (
                      <>, <span className="font-medium text-destructive">{result.errors.length}</span> row{result.errors.length !== 1 ? "s" : ""} had errors</>
                    )}.
                  </p>
                </div>
              )}

              {result.errors.length > 0 && (
                <div className="rounded-lg border border-border overflow-hidden">
                  <div className="px-3 py-2 bg-muted/50 border-b border-border">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Validation Errors
                    </p>
                  </div>
                  <div className="divide-y divide-border max-h-52 overflow-y-auto">
                    {result.errors.map((err, idx) => (
                      <div key={idx} className="flex items-start gap-2 px-3 py-2">
                        <AlertCircle className="w-3.5 h-3.5 text-destructive shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Badge variant="outline" className="text-xs px-1.5 py-0 h-4">
                              Row {err.row}
                            </Badge>
                            <span className="text-xs font-medium text-muted-foreground">{err.field}</span>
                          </div>
                          <p className="text-xs text-foreground mt-0.5">{err.message}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          {phase === "done" ? (
            <Button variant="hero" onClick={() => handleClose(false)}>
              Done
            </Button>
          ) : (
            <>
              <Button variant="ghost" onClick={() => handleClose(false)} disabled={phase === "importing"}>
                Cancel
              </Button>
              <Button
                variant="hero"
                onClick={handleImport}
                disabled={phase !== "ready" || !file}
              >
                {phase === "importing" ? (
                  <>
                    <Upload className="w-4 h-4 mr-2 animate-pulse" />
                    Importing…
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Import {label}
                  </>
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
