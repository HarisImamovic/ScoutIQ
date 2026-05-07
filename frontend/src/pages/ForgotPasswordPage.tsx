import { useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, Mail, ArrowLeft, CheckCircle2 } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import client from "@/api/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [serverError, setServerError] = useState("");

  const validate = () => {
    if (!email.trim()) { setEmailError("Email is required."); return false; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setEmailError("Enter a valid email address."); return false; }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError("");
    if (!validate()) return;
    setSubmitting(true);
    try {
      await client.post("/auth/forgot-password", { email });
      setSent(true);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 429) {
        setServerError("Too many attempts. Please wait a moment and try again.");
      } else {
        setServerError("Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-primary/20 via-background to-secondary/20 items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,hsl(var(--primary)/0.1),transparent_50%)]" />
        <div className="text-center z-10">
          <div className="flex items-center justify-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
              <Shield className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-3xl">ScoutIQ</span>
          </div>
          <p className="mt-4 text-muted-foreground max-w-sm">
            AI-powered football scouting platform for the modern game.
          </p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-xl">ScoutIQ</span>
          </div>

          {sent ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-2xl font-display font-bold">Check your inbox</h1>
              <p className="text-muted-foreground text-sm leading-relaxed">
                If an account exists for <span className="font-medium text-foreground">{email}</span>,
                you'll receive a password reset link shortly. The link expires in 10 minutes.
              </p>
              <p className="text-xs text-muted-foreground">
                Didn't receive it? Check your spam folder or{" "}
                <button
                  className="text-primary hover:underline"
                  onClick={() => { setSent(false); setEmail(""); }}
                >
                  try again
                </button>.
              </p>
              <Link to="/login" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mt-4">
                <ArrowLeft className="w-4 h-4" /> Back to sign in
              </Link>
            </div>
          ) : (
            <>
              <Link to="/login" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
                <ArrowLeft className="w-4 h-4" /> Back to sign in
              </Link>

              <h1 className="text-3xl font-display font-bold mb-2">Forgot password?</h1>
              <p className="text-muted-foreground mb-8 text-sm">
                Enter your email address and we'll send you a link to reset your password.
              </p>

              <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      autoComplete="email"
                      className={`pl-10 h-12 bg-muted/50 border-border focus:border-primary transition-colors ${emailError ? "border-destructive focus:border-destructive" : ""}`}
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setEmailError(""); setServerError(""); }}
                    />
                  </div>
                  {emailError && <p className="text-xs text-destructive">{emailError}</p>}
                </div>

                {serverError && <p className="text-xs text-destructive">{serverError}</p>}

                <Button type="submit" variant="hero" className="w-full h-12 text-base" disabled={submitting}>
                  {submitting ? (
                    <span className="flex items-center gap-2">
                      <Spinner size="sm" className="text-white" /> Sending…
                    </span>
                  ) : (
                    "Send reset link"
                  )}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
