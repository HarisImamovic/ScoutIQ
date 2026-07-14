import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

interface SortIconProps {
  direction: "asc" | "desc" | false;
  inline?: boolean;
}

export function SortIcon({ direction, inline = false }: SortIconProps) {
  if (!direction) {
    return <ArrowUpDown className={inline ? "w-3.5 h-3.5 ml-1 inline opacity-40" : "w-3.5 h-3.5 ml-1 opacity-40"} />;
  }
  const Icon = direction === "asc" ? ArrowUp : ArrowDown;
  return <Icon className={inline ? "w-3.5 h-3.5 ml-1 inline" : "w-3.5 h-3.5 ml-1 text-primary"} />;
}
