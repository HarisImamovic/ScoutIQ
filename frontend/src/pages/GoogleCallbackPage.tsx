import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import axios from "axios";
import { useAuth } from "@/contexts/AuthContext";
import { Spinner } from "@/components/ui/spinner";
import { Shield } from "lucide-react";

export default function GoogleCallbackPage() {
  const { loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const state = params.get("state");
    const error = params.get("error");

    if (error) {
      toast.error("Google sign-in was cancelled.");
      navigate("/login", { replace: true });
      return;
    }

    const storedState = sessionStorage.getItem("google_oauth_state");
    const codeVerifier = sessionStorage.getItem("google_code_verifier");

    sessionStorage.removeItem("google_oauth_state");
    sessionStorage.removeItem("google_code_verifier");

    if (!code || !state || !codeVerifier || state !== storedState) {
      toast.error("Authentication failed. Please try again.", { duration: 6000 });
      navigate("/login", { replace: true });
      return;
    }

    loginWithGoogle(code, codeVerifier).catch((err) => {
      if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        const detail = err.response?.data?.detail;
        if (status === 403) {
          toast.error(typeof detail === "string" ? detail : "Your account is unavailable.", { duration: 6000 });
        } else if (status === 503) {
          toast.error("Google sign-in is not available right now.", { duration: 6000 });
        } else {
          toast.error("Google sign-in failed. Please try again.", { duration: 6000 });
        }
      } else {
        toast.error("Google sign-in failed. Please try again.", { duration: 6000 });
      }
      navigate("/login", { replace: true });
    });
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-6">
        <div className="flex items-center justify-center gap-2">
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
            <Shield className="w-6 h-6 text-primary-foreground" />
          </div>
          <span className="font-display font-bold text-2xl">ScoutIQ</span>
        </div>
        <Spinner size="lg" label="Signing in with Google…" />
      </div>
    </div>
  );
}
