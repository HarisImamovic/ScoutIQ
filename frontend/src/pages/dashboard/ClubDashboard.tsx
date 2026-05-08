import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import {
  FileText, Building2, UserCheck, ArrowRight,
  CheckCircle2, XCircle, Clock, AlertCircle, Users,
} from "lucide-react";
import { Link } from "react-router-dom";
import { clubAdminApi, isNoClubError } from "@/api/clubAdmin";
import { NoClubState } from "@/components/NoClubState";
import { ClubLogo } from "@/components/ClubLogo";

const STATUS_COLORS: Record<string, string> = {
  submitted: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  approved: "bg-primary/10 text-primary border-primary/20",
  rejected: "bg-destructive/10 text-destructive border-destructive/20",
};

const STATUS_LABEL: Record<string, string> = {
  submitted: "Pending",
  approved: "Approved",
  rejected: "Rejected",
};

export default function ClubDashboard() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["club-dashboard"],
    queryFn: clubAdminApi.getDashboard,
    staleTime: 30_000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" label="Loading dashboard…" />
      </div>
    );
  }

  if (isError) {
    if (isNoClubError(error)) return <NoClubState page="dashboard" />;
    return (
      <div className="flex items-center justify-center h-64">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>Failed to load dashboard. Please try again.</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!data) return null;

  const { club, stats, scouts, recent_reports } = data;

  const statCards = [
    { label: "Squad Players", value: stats.squad_count, icon: Users, color: "text-primary" },
    { label: "Active Scouts", value: stats.scout_count, icon: UserCheck, color: "text-purple-500" },
    { label: "Pending Reports", value: stats.pending_reports, icon: Clock, color: "text-yellow-500" },
    { label: "Approved Reports", value: stats.approved_reports, icon: CheckCircle2, color: "text-primary" },
    { label: "Rejected Reports", value: stats.rejected_reports, icon: XCircle, color: "text-destructive" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <ClubLogo
          name={club.name}
          shortName={club.short_name}
          logoUrl={club.logo_url}
          primaryColor={club.primary_color}
          size="lg"
          className="shadow-lg"
        />
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold">{club.name}</h1>
          <p className="text-muted-foreground mt-0.5">
            {[club.league_name, club.country].filter(Boolean).join(" · ")}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {statCards.map((s) => (
          <Card key={s.label} className="hover-lift">
            <CardContent className="pt-5 pb-4">
              <s.icon className={`w-4 h-4 ${s.color} mb-2`} />
              <div className="text-xl font-display font-bold">{s.value}</div>
              <div className="text-xs text-muted-foreground mt-0.5 leading-tight">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-lg font-display">Scout Performance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {scouts.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No scouts assigned to this club yet.</p>
            ) : scouts.map((s) => (
              <div key={s.scout_id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div>
                  <div className="font-medium text-sm">{s.name}</div>
                  <div className="text-xs text-muted-foreground">{s.report_count} approved report{s.report_count !== 1 ? "s" : ""}</div>
                </div>
                <Badge variant="secondary" className="bg-primary/10 text-primary border-0">
                  <FileText className="w-3 h-3 mr-1" />{s.report_count}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-lg font-display">Recent Reports</CardTitle>
            <Link to="/dashboard/club-reports">
              <Button variant="ghost" size="sm" className="text-xs">
                View All <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {recent_reports.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No reports submitted yet.</p>
            ) : recent_reports.map((r) => (
              <div key={r.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div>
                  <div className="font-medium text-sm">{r.player_name}</div>
                  <div className="text-xs text-muted-foreground">
                    by {r.scout_name} · Rating: <span className="text-primary font-bold">{r.rating}</span>
                  </div>
                </div>
                <Badge variant="outline" className={STATUS_COLORS[r.status] ?? ""}>
                  {STATUS_LABEL[r.status] ?? r.status}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {(club.stadium_name || club.stadium_capacity) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-display flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" /> Stadium
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1">
                {club.stadium_name && <p className="font-semibold">{club.stadium_name}</p>}
                {club.stadium_capacity && (
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Capacity: {club.stadium_capacity.toLocaleString()} seats
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
