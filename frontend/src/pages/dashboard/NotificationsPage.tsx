import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BellRing, Eye, Star, AlertTriangle } from "lucide-react";

const notifications = [
  { type: "prospect", title: "Top Prospect Detected", desc: "18-year-old winger from Brazil with exceptional dribbling stats.", time: "2 hours ago", icon: Star },
  { type: "report", title: "Report Approved", desc: "Your scouting report on Lamine Yamal has been approved.", time: "5 hours ago", icon: BellRing },
  { type: "alert", title: "Transfer Alert", desc: "Florian Wirtz is reportedly in transfer talks with Real Madrid.", time: "1 day ago", icon: AlertTriangle },
  { type: "prospect", title: "Top Prospect Detected", desc: "17-year-old goalkeeper from Germany, 89% save rate in U19.", time: "2 days ago", icon: Star },
];

export default function NotificationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-display font-bold">Notifications</h1>
        <p className="text-muted-foreground mt-1">Prospect alerts and platform updates</p>
      </div>

      <div className="space-y-3">
        {notifications.map((n, i) => (
          <Card key={i} className="hover-lift">
            <CardContent className="pt-6 flex items-start gap-4">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                n.type === "prospect" ? "bg-primary/10" : n.type === "alert" ? "bg-destructive/10" : "bg-secondary/10"
              }`}>
                <n.icon className={`w-5 h-5 ${
                  n.type === "prospect" ? "text-primary" : n.type === "alert" ? "text-destructive" : "text-secondary"
                }`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-semibold text-sm">{n.title}</h3>
                  <span className="text-xs text-muted-foreground shrink-0">{n.time}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{n.desc}</p>
                {n.type === "prospect" && (
                  <Button variant="outline" size="sm" className="mt-3">
                    <Eye className="w-4 h-4 mr-2" /> Quick View
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
