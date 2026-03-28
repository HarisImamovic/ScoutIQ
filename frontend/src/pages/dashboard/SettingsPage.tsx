import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { useRole } from "@/contexts/RoleContext";
import { CheckCircle2 } from "lucide-react";

type PlayerStatus = "free_agent" | "under_contract" | "talks_in_progress";

const statusConfig: Record<PlayerStatus, { label: string; color: string; description: string }> = {
  free_agent: {
    label: "Free Agent",
    color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    description: "You are available to join a new club",
  },
  under_contract: {
    label: "Under Contract",
    color: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    description: "You are currently contracted to a club",
  },
  talks_in_progress: {
    label: "Talks In Progress",
    color: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    description: "You are in discussions with one or more clubs",
  },
};

export default function SettingsPage() {
  const { role } = useRole();
  const [playerStatus, setPlayerStatus] = useState<PlayerStatus>("under_contract");
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl md:text-3xl font-display font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your account and preferences</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-display">Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Full Name</Label>
            <Input defaultValue="John Doe" className="bg-muted/50" />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input defaultValue="john@example.com" className="bg-muted/50" />
          </div>
          <Button variant="hero" size="sm" onClick={handleSave}>
            {saved ? (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" /> Saved
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Player-only: availability status */}
      {role === "player" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-display">Availability Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Let scouts know your current situation. This status is visible on your public profile.
            </p>

            <div className="space-y-2">
              <Label>Current Status</Label>
              <Select value={playerStatus} onValueChange={(v) => setPlayerStatus(v as PlayerStatus)}>
                <SelectTrigger className="bg-muted/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free_agent">Free Agent</SelectItem>
                  <SelectItem value="under_contract">Under Contract</SelectItem>
                  <SelectItem value="talks_in_progress">Talks In Progress</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className={`flex items-start gap-3 p-3 rounded-lg border ${statusConfig[playerStatus].color}`}>
              <div className="flex-1">
                <Badge className={`${statusConfig[playerStatus].color} text-xs font-medium mb-1`}>
                  {statusConfig[playerStatus].label}
                </Badge>
                <p className="text-sm">{statusConfig[playerStatus].description}</p>
              </div>
            </div>

            <Button variant="hero" size="sm" onClick={handleSave}>
              {saved ? (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" /> Saved
                </>
              ) : (
                "Update Status"
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-display">Appearance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-sm">Theme</div>
              <div className="text-xs text-muted-foreground">Switch between light and dark mode</div>
            </div>
            <ThemeToggle />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
