import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { Eye, Bookmark, FileText, ArrowRight, AlertCircle, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { scoutApi } from "@/api/scout";
import { ClubLogo } from "@/components/ClubLogo";
import { formatMarketValue } from "@/lib/formatters";

export default function ScoutDashboard() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["scout-dashboard"],
    queryFn: scoutApi.getDashboard,
    staleTime: 30_000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" label="Loading dashboard…" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>Failed to load dashboard. Please refresh the page.</AlertDescription>
        </Alert>
      </div>
    );
  }

  const { stats, recently_viewed, saved_prospects, new_players_since_last_visit } = data;

  const widgets = [
    { label: "Players Viewed", value: stats.players_viewed, icon: Eye },
    { label: "Saved Prospects", value: stats.saved_prospects, icon: Bookmark },
    { label: "Reports Written", value: stats.reports_written, icon: FileText },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-display font-bold">Scout Dashboard</h1>
        <p className="text-muted-foreground mt-1">Discover and evaluate talent</p>
      </div>

      {new_players_since_last_visit > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 p-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <p className="text-sm">
              <span className="font-medium">
                {new_players_since_last_visit} new player{new_players_since_last_visit === 1 ? "" : "s"}
              </span>{" "}
              <span className="text-muted-foreground">added since your last visit.</span>
            </p>
          </div>
          <Link to="/dashboard/players" className="shrink-0">
            <Button variant="outline" size="sm" className="w-full sm:w-auto">
              View Players <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {widgets.map((s) => (
          <Card key={s.label} className="hover-lift">
            <CardContent className="pt-6">
              <s.icon className="w-5 h-5 text-primary mb-2" />
              <div className="text-2xl font-display font-bold">{s.value}</div>
              <div className="text-sm text-muted-foreground">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-display">Recently Viewed</CardTitle>
            <Link to="/dashboard/players">
              <Button variant="ghost" size="sm">
                View All <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {recently_viewed.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                No players viewed yet. Browse the Players page.
              </p>
            ) : (
              recently_viewed.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center font-display font-bold text-primary text-sm">
                      {p.position}
                    </div>
                    <div>
                      <div className="font-medium text-sm">{p.first_name} {p.last_name}</div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        {p.club_name && (
                          <ClubLogo name={p.club_name} logoUrl={p.club_logo_url} size="sm" className="w-4 h-4" />
                        )}
                        {p.club_name ?? "—"}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">{p.position}</Badge>
                    {p.age != null && (
                      <span className="text-xs text-muted-foreground">{p.age}y</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-display flex items-center gap-2">
              <Bookmark className="w-5 h-5 text-secondary" /> Saved Prospects
            </CardTitle>
            <Link to="/dashboard/saved-prospects">
              <Button variant="ghost" size="sm">
                View All <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {saved_prospects.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                No saved prospects yet. Save players from the Players page.
              </p>
            ) : (
              saved_prospects.map((p) => (
                <div
                  key={p.player_id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-2">
                    {p.club_name && (
                      <ClubLogo name={p.club_name} logoUrl={p.club_logo_url} size="sm" />
                    )}
                    <div>
                      <div className="font-medium text-sm">{p.first_name} {p.last_name}</div>
                      <div className="text-xs text-muted-foreground">{p.club_name ?? "—"}</div>
                    </div>
                  </div>
                  <Badge variant="outline">{p.position}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
