import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Star, FileText, UserCircle, Bell, AlertCircle, Check, X } from "lucide-react";
import { notificationsApi, type NotificationItem } from "@/api/notifications";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";

function NotificationIcon({ type }: { type: string }) {
  const base = "w-5 h-5";
  if (type === "star") return <Star className={`${base} text-primary`} />;
  if (type === "file") return <FileText className={`${base} text-secondary`} />;
  return <UserCircle className={`${base} text-muted-foreground`} />;
}

function iconBg(type: string) {
  if (type === "star") return "bg-primary/10";
  if (type === "file") return "bg-secondary/10";
  return "bg-muted";
}

function formatTime(ts: string) {
  try {
    return formatDistanceToNow(new Date(ts), { addSuffix: true });
  } catch {
    return ts;
  }
}

interface VideoModalProps {
  highlightId: string;
  embedUrl: string;
  title: string | null;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
  isPending: boolean;
}

function VideoReviewModal({
  highlightId,
  embedUrl,
  title,
  onClose,
  onApprove,
  onReject,
  isPending,
}: VideoModalProps) {
  return (
    <Dialog open onOpenChange={() => !isPending && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display">
            Review Highlight{title ? `: ${title}` : ""}
          </DialogTitle>
        </DialogHeader>
        <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
          <iframe
            src={embedUrl}
            title={title ?? "Player highlight"}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            loading="lazy"
            className="absolute inset-0 w-full h-full rounded-lg border-0"
          />
        </div>
        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onReject}
            disabled={isPending}
          >
            {isPending ? <Spinner size="sm" /> : <><X className="w-4 h-4 mr-1.5" />Reject</>}
          </Button>
          <Button
            variant="hero"
            onClick={onApprove}
            disabled={isPending}
          >
            {isPending ? <Spinner size="sm" /> : <><Check className="w-4 h-4 mr-1.5" />Approve</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function NotificationsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [videoModal, setVideoModal] = useState<{
    highlightId: string;
    embedUrl: string;
    title: string | null;
  } | null>(null);

  const { data: notifications = [], isLoading, isError } = useQuery({
    queryKey: ["notifications"],
    queryFn: notificationsApi.getNotifications,
    staleTime: 30_000,
  });

  useEffect(() => {
    const hasUnread = notifications.some((n) => !n.is_read);
    if (!hasUnread) return;
    notificationsApi.markAllRead().then(() => {
      qc.setQueryData(["notifications"], (old: typeof notifications | undefined) =>
        old ? old.map((n) => ({ ...n, is_read: true })) : []
      );
    });
  }, [notifications, qc]);

  const clearMutation = useMutation({
    mutationFn: notificationsApi.clearNotifications,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("Notifications cleared.");
    },
    onError: () => toast.error("Failed to clear notifications."),
  });

  const reviewMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "approved" | "rejected" }) =>
      notificationsApi.updateHighlightStatus(id, status),
    onSuccess: (_, { status }) => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      setVideoModal(null);
      toast.success(`Highlight ${status}.`);
    },
    onError: () => toast.error("Failed to update highlight status."),
  });

  const isGlobalAdmin = user?.role === "global_admin";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" label="Loading notifications…" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center h-64">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>Failed to load notifications. Please try again.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold">Notifications</h1>
          <p className="text-muted-foreground mt-1">System updates and alerts</p>
        </div>
        {notifications.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => clearMutation.mutate()}
            disabled={clearMutation.isPending}
          >
            {clearMutation.isPending ? (
              <span className="flex items-center gap-2"><Spinner size="sm" /> Clearing…</span>
            ) : (
              "Clear Up"
            )}
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <Card>
          <CardContent className="py-16 flex flex-col items-center justify-center text-center">
            <Bell className="w-12 h-12 text-muted-foreground/40 mb-4" />
            <h3 className="font-display font-semibold text-lg mb-1">No notifications</h3>
            <p className="text-sm text-muted-foreground">
              You have no notifications in the last 10 days.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {notifications.map((n: NotificationItem) => {
            const hasHighlightAction =
              isGlobalAdmin &&
              n.icon_type === "star" &&
              n.action_data?.highlight_status === "pending" &&
              n.action_data?.highlight_id;

            return (
              <Card key={n.id} className="hover-lift">
                <CardContent className="pt-5 flex items-start gap-4">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${iconBg(n.icon_type)}`}
                  >
                    <NotificationIcon type={n.icon_type} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-semibold text-sm">{n.title}</h3>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {formatTime(n.created_at)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{n.body}</p>
                    {hasHighlightAction && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-3"
                        onClick={() =>
                          setVideoModal({
                            highlightId: n.action_data!.highlight_id,
                            embedUrl: n.action_data!.embed_url,
                            title: n.action_data!.title ?? null,
                          })
                        }
                      >
                        View &amp; Review
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}

          <p className="text-center text-sm text-muted-foreground py-4">
            You do not have any more notifications in the last 10 days.
          </p>
        </div>
      )}

      {videoModal && (
        <VideoReviewModal
          highlightId={videoModal.highlightId}
          embedUrl={videoModal.embedUrl}
          title={videoModal.title}
          onClose={() => setVideoModal(null)}
          onApprove={() =>
            reviewMutation.mutate({ id: videoModal.highlightId, status: "approved" })
          }
          onReject={() =>
            reviewMutation.mutate({ id: videoModal.highlightId, status: "rejected" })
          }
          isPending={reviewMutation.isPending}
        />
      )}
    </div>
  );
}
