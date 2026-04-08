import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, User, Mail, Lock, Check, UserCheck, Search, Briefcase, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

const ROLE_OPTIONS = [
  { id: "player",     icon: UserCheck, title: "Player",     desc: "Showcase your talent and get discovered" },
  { id: "scout",      icon: Search,    title: "Scout",      desc: "Find and evaluate football talent" },
  { id: "club_admin", icon: Briefcase, title: "Club Admin", desc: "Manage your club's scouting operations" },
];

const PASSWORD_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&_\-#])[A-Za-z\d@$!%*?&_\-#]{8,72}$/;

function getPasswordHints(pw: string) {
  return [
    { label: "At least 8 characters",        met: pw.length >= 8 },
    { label: "One uppercase letter",          met: /[A-Z]/.test(pw) },
    { label: "One lowercase letter",          met: /[a-z]/.test(pw) },
    { label: "One number",                    met: /\d/.test(pw) },
    { label: "One special character (@$!%*?&_-#)", met: /[@$!%*?&_\-#]/.test(pw) },
  ];
}

export default function RegisterPage() {
  const { register, login, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [firstName, setFirstName]             = useState("");
  const [lastName, setLastName]               = useState("");
  const [email, setEmail]                     = useState("");
  const [password, setPassword]               = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [selectedRole, setSelectedRole]       = useState("");
  const [showPassword, setShowPassword]       = useState(false);
  const [showConfirm, setShowConfirm]         = useState(false);
  const [submitting, setSubmitting]           = useState(false);
  const [errors, setErrors]                   = useState<Record<string, string>>({});
  const [passwordFocused, setPasswordFocused] = useState(false);

  const credentialsRef = useRef<{ email: string; password: string } | null>(null);

  useEffect(() => {
    if (!isLoading && isAuthenticated) navigate("/dashboard", { replace: true });
  }, [isAuthenticated, isLoading]);

  const validateStep1 = () => {
    const next: Record<string, string> = {};
    if (!firstName.trim()) next.firstName = "First name is required.";
    if (!lastName.trim()) next.lastName = "Last name is required.";
    if (!email.trim()) next.email = "Email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) next.email = "Enter a valid email address.";
    if (!password) next.password = "Password is required.";
    else if (!PASSWORD_RE.test(password)) next.password = "Password does not meet requirements.";
    if (!confirmPassword) next.confirmPassword = "Please confirm your password.";
    else if (password !== confirmPassword) next.confirmPassword = "Passwords do not match.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleStep1Continue = () => {
    if (validateStep1()) setStep(2);
  };

  const handleRegister = async () => {
    if (!selectedRole) return;
    setSubmitting(true);
    try {
      await register({
        email,
        password,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        role: selectedRole,
      });
      credentialsRef.current = { email, password };
      setStep(3);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        if (status === 409) toast.error("An account with this email already exists.");
        else toast.error("Something went wrong. Please try again.");
      } else {
        toast.error("Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoToDashboard = async () => {
    if (!credentialsRef.current) return;
    setSubmitting(true);
    try {
      await login(credentialsRef.current.email, credentialsRef.current.password);
    } catch {
      navigate("/login", { replace: true });
    } finally {
      setSubmitting(false);
    }
  };

  const passwordHints = getPasswordHints(password);

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <div className="w-full max-w-lg">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Shield className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-display font-bold text-xl">ScoutIQ</span>
        </div>

        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all",
                step >= s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              )}>
                {step > s ? <Check className="w-4 h-4" /> : s}
              </div>
              {s < 3 && <div className={cn("w-12 h-0.5 mx-1 transition-colors", step > s ? "bg-primary" : "bg-muted")} />}
            </div>
          ))}
        </div>

        <div className="bg-card border border-border rounded-xl p-8 shadow-lg">
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-2xl font-display font-bold">Create your account</h2>
                <p className="text-muted-foreground text-sm mt-1">Enter your information</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="firstName"
                      placeholder="John"
                      autoComplete="given-name"
                      className={cn("pl-10 h-12 bg-muted/50", errors.firstName && "border-destructive")}
                      value={firstName}
                      onChange={(e) => { setFirstName(e.target.value); setErrors((p) => ({ ...p, firstName: undefined! })); }}
                    />
                  </div>
                  {errors.firstName && <p className="text-xs text-destructive">{errors.firstName}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="lastName"
                      placeholder="Doe"
                      autoComplete="family-name"
                      className={cn("pl-10 h-12 bg-muted/50", errors.lastName && "border-destructive")}
                      value={lastName}
                      onChange={(e) => { setLastName(e.target.value); setErrors((p) => ({ ...p, lastName: undefined! })); }}
                    />
                  </div>
                  {errors.lastName && <p className="text-xs text-destructive">{errors.lastName}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reg-email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="reg-email"
                    type="email"
                    placeholder="you@example.com"
                    autoComplete="email"
                    className={cn("pl-10 h-12 bg-muted/50", errors.email && "border-destructive")}
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setErrors((p) => ({ ...p, email: undefined! })); }}
                  />
                </div>
                {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="reg-pass">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="reg-pass"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    className={cn("pl-10 pr-10 h-12 bg-muted/50", errors.password && "border-destructive")}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setErrors((p) => ({ ...p, password: undefined! })); }}
                    onFocus={() => setPasswordFocused(true)}
                    onBlur={() => setPasswordFocused(false)}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {(passwordFocused || password) && (
                  <ul className="space-y-1 pt-1">
                    {passwordHints.map((h) => (
                      <li key={h.label} className={cn("flex items-center gap-1.5 text-xs transition-colors", h.met ? "text-emerald-500" : "text-muted-foreground")}>
                        <Check className={cn("w-3 h-3 shrink-0", !h.met && "opacity-30")} />
                        {h.label}
                      </li>
                    ))}
                  </ul>
                )}
                {errors.password && !passwordFocused && <p className="text-xs text-destructive">{errors.password}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="reg-confirm">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="reg-confirm"
                    type={showConfirm ? "text" : "password"}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    className={cn("pl-10 pr-10 h-12 bg-muted/50", errors.confirmPassword && "border-destructive")}
                    value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); setErrors((p) => ({ ...p, confirmPassword: undefined! })); }}
                  />
                  <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword}</p>}
              </div>

              <Button variant="hero" className="w-full h-12" onClick={handleStep1Continue}>
                Continue
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-2xl font-display font-bold">Select your role</h2>
                <p className="text-muted-foreground text-sm mt-1">How will you use ScoutIQ?</p>
              </div>
              <div className="space-y-3">
                {ROLE_OPTIONS.map((role) => (
                  <button
                    key={role.id}
                    onClick={() => setSelectedRole(role.id)}
                    className={cn(
                      "w-full p-4 rounded-xl border-2 text-left flex items-center gap-4 transition-all",
                      selectedRole === role.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                    )}
                  >
                    <div className={cn("w-12 h-12 rounded-lg flex items-center justify-center", selectedRole === role.id ? "bg-primary/20" : "bg-muted")}>
                      <role.icon className={cn("w-6 h-6", selectedRole === role.id ? "text-primary" : "text-muted-foreground")} />
                    </div>
                    <div>
                      <div className="font-semibold">{role.title}</div>
                      <div className="text-sm text-muted-foreground">{role.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1 h-12" onClick={() => setStep(1)}>Back</Button>
                <Button
                  variant="hero"
                  className="flex-1 h-12"
                  disabled={!selectedRole || submitting}
                  onClick={handleRegister}
                >
                  {submitting ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      Creating…
                    </span>
                  ) : "Create Account"}
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5 text-center">
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto">
                <Check className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-display font-bold">You're all set!</h2>
                <p className="text-muted-foreground text-sm mt-2">
                  Your account is ready. You can complete your profile from the dashboard.
                </p>
              </div>
              <Button
                variant="hero"
                className="w-full h-12"
                disabled={submitting}
                onClick={handleGoToDashboard}
              >
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Entering dashboard…
                  </span>
                ) : "Go to Dashboard"}
              </Button>
            </div>
          )}
        </div>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Already have an account?{" "}
          <Link to="/login" className="text-primary font-medium hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
