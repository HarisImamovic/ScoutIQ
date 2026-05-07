import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface ClubLogoProps {
  name: string;
  shortName?: string | null;
  logoUrl?: string | null;
  primaryColor?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizeClasses: Record<string, string> = {
  sm: "w-8 h-8",
  md: "w-10 h-10",
  lg: "w-16 h-16",
  xl: "w-20 h-20",
};

const textClasses: Record<string, string> = {
  sm: "text-xs",
  md: "text-sm",
  lg: "text-lg",
  xl: "text-xl",
};

function resolveUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${import.meta.env.VITE_API_URL}${url}`;
}

export function ClubLogo({ name, shortName, logoUrl, primaryColor, size = "md", className }: ClubLogoProps) {
  const fallbackText = shortName ?? name.slice(0, 3).toUpperCase();
  const resolvedUrl = resolveUrl(logoUrl);

  return (
    <Avatar className={cn(sizeClasses[size], "rounded-xl flex-shrink-0", className)}>
      {resolvedUrl && (
        <AvatarImage src={resolvedUrl} alt={`${name} logo`} className="object-contain" />
      )}
      <AvatarFallback
        delayMs={resolvedUrl ? 600 : 0}
        className={cn("rounded-xl font-display font-bold text-white", textClasses[size])}
        style={{ backgroundColor: primaryColor ?? "hsl(var(--primary))" }}
      >
        {fallbackText}
      </AvatarFallback>
    </Avatar>
  );
}
