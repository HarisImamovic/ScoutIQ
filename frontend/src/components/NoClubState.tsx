import { Building2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface NoClubStateProps {
  page?: string;
}

export function NoClubState({ page }: NoClubStateProps) {
  const descriptions: Record<string, string> = {
    dashboard: "Your overview, squad stats, and recent reports will appear here once you've been assigned.",
    players: "You'll be able to browse and manage your squad once you've been assigned to a club.",
    reports: "Scout reports submitted for your club will appear here once you've been assigned.",
    salaries: "Your squad's contract and salary records will appear here once you've been assigned.",
  };

  const description = page ? descriptions[page] : undefined;

  return (
    <div className="flex items-center justify-center h-[60vh]">
      <Card className="max-w-md w-full">
        <CardContent className="pt-10 pb-10 flex flex-col items-center text-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
            <Building2 className="w-8 h-8 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-display font-bold">No Club Assigned</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Your account hasn't been assigned to a club yet. A{" "}
              <span className="font-medium text-foreground">Global Administrator</span> can assign you
              to a club from the Users management panel.
            </p>
            {description && (
              <p className="text-xs text-muted-foreground pt-1 border-t border-border mt-3 pt-3">
                {description}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
