export function extractFilename(contentDisposition?: string): string | null {
  if (!contentDisposition) return null;
  const utf8Match = /filename\*=UTF-8''([^;]+)/i.exec(contentDisposition);
  if (utf8Match) return decodeURIComponent(utf8Match[1]);
  const asciiMatch = /filename="?([^";]+)"?/i.exec(contentDisposition);
  return asciiMatch ? asciiMatch[1] : null;
}

export function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
