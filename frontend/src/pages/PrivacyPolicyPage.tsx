import { Link } from "react-router-dom";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Shield } from "lucide-react";

const LAST_UPDATED = "July 17, 2026";
const CONTACT_EMAIL = "haris.imamovic2208@gmail.com";

const sections = [
  {
    title: "Data we collect",
    body: (
      <ul className="list-disc pl-5 space-y-2">
        <li><strong className="text-foreground">Account data:</strong> name, email address, and a bcrypt-hashed password (or, for Google sign-in, your Google account's email/name/avatar via OAuth — we never see your Google password).</li>
        <li><strong className="text-foreground">Role-specific data:</strong> player profiles (position, stats, market value), scouting reports, saved prospects, highlight video links, club/contract/salary records — depending on the role you or an admin assigns to your account.</li>
        <li><strong className="text-foreground">Security data:</strong> two-factor authentication status (TOTP secrets are encrypted at rest, recovery codes and verification codes are hashed, never stored in plain text), and a phone number only if you opt in to SMS-based 2FA.</li>
        <li><strong className="text-foreground">Telegram data:</strong> your Telegram chat ID, only if you choose to link your account for notifications.</li>
        <li><strong className="text-foreground">AI assistant messages:</strong> if you (as a scout) use the AI assistant, your messages and relevant player/report context are sent to our AI provider (Groq) to generate a response, and usage is logged for rate-limiting purposes.</li>
        <li><strong className="text-foreground">Usage data:</strong> which players a scout has viewed, and in-app notifications, used to power the product's own features (not shared for advertising).</li>
        <li><strong className="text-foreground">A single authentication cookie:</strong> an httpOnly refresh-token cookie used to keep you signed in. No advertising or analytics cookies are used.</li>
      </ul>
    ),
  },
  {
    title: "Why we collect it",
    body: (
      <p>
        Solely to operate ScoutIQ's core features: authenticating you, showing the right dashboard for your
        role, running the scouting/reporting workflow, sending notifications, and securing your account.
        Nothing is sold or used for advertising.
      </p>
    ),
  },
  {
    title: "Who else sees it",
    body: (
      <>
        <p className="mb-3">
          ScoutIQ runs on third-party infrastructure that necessarily processes your data on our behalf:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong className="text-foreground">Neon</strong> — hosts the PostgreSQL database (all app data).</li>
          <li><strong className="text-foreground">Render</strong> — hosts the backend application.</li>
          <li><strong className="text-foreground">Groq</strong> — processes AI assistant chat messages.</li>
          <li><strong className="text-foreground">Resend</strong> — sends transactional email (password resets, 2FA codes).</li>
          <li><strong className="text-foreground">Twilio</strong> — sends SMS codes, only if you opt in to SMS 2FA.</li>
          <li><strong className="text-foreground">Google</strong> — processes Google Sign-In, if you use it.</li>
          <li><strong className="text-foreground">Telegram</strong> — delivers bot notifications, if you link your account.</li>
        </ul>
        <p className="mt-3">We do not sell, rent, or share your data with anyone else.</p>
      </>
    ),
  },
  {
    title: "Data retention",
    body: (
      <p>
        Your data is kept for as long as your account exists. If you want your account and associated data
        deleted, email <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline">{CONTACT_EMAIL}</a> and
        it will be removed manually.
      </p>
    ),
  },
  {
    title: "Your rights",
    body: (
      <p>
        Regardless of where you're located, you can email{" "}
        <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline">{CONTACT_EMAIL}</a> at any
        time to request a copy of the data we hold about you, ask for corrections, or request deletion of your
        account. If you're in the EU/UK or California, this covers the substance of your GDPR/CCPA rights
        (access, rectification, erasure, portability, and objection to processing) — as an individual
        maintaining a personal project rather than a company, these requests are handled manually and in good
        faith rather than through an automated compliance system.
      </p>
    ),
  },
  {
    title: "Security",
    body: (
      <p>
        Passwords are hashed with bcrypt, sessions use short-lived JWTs, 2FA secrets and recovery codes are
        encrypted or hashed at rest, and all traffic is served over HTTPS. No system is perfectly secure, but
        reasonable industry-standard measures are in place. If a breach is discovered that affects your data,
        you will be notified without undue delay by email once the scope is understood.
      </p>
    ),
  },
  {
    title: "Children",
    body: <p>ScoutIQ is not directed at children under 16, and it should not be used by anyone under that age.</p>,
  },
  {
    title: "Changes to this policy",
    body: (
      <p>
        If this policy changes, the "Last updated" date at the top of this page will change. Since this is a
        personal project, there is no separate email announcement for policy updates.
      </p>
    ),
  },
  {
    title: "Contact",
    body: (
      <p>
        Questions, requests, or concerns about your data:{" "}
        <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline">{CONTACT_EMAIL}</a>.
      </p>
    ),
  },
];

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-background">
      <nav className="fixed top-0 z-50 w-full glass border-b border-border/50">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-xl">ScoutIQ</span>
          </Link>
          <ThemeToggle />
        </div>
      </nav>

      <section className="pt-32 pb-20">
        <div className="container max-w-3xl">
          <Link to="/">
            <Button variant="ghost" size="sm" className="mb-6 -ml-2">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to home
            </Button>
          </Link>

          <h1 className="text-3xl md:text-4xl font-display font-bold">Privacy Policy</h1>
          <p className="mt-2 text-sm text-muted-foreground">Last updated: {LAST_UPDATED}</p>

          <Card className="mt-8">
            <CardContent className="pt-6">
              <p className="text-muted-foreground leading-relaxed">
                ScoutIQ is a personal, non-commercial project built and maintained by an individual developer
                (Haris Imamovic), not a registered company. This policy explains what data the app collects,
                why, and how you can control it. If anything here is unclear, email{" "}
                <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline">{CONTACT_EMAIL}</a>{" "}
                and I'll answer directly.
              </p>
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardContent className="pt-6">
              {sections.map((s, i) => (
                <div key={s.title}>
                  <CardHeader className="p-0 mb-3">
                    <CardTitle className="text-xl font-display">{s.title}</CardTitle>
                  </CardHeader>
                  <div className="text-muted-foreground leading-relaxed">{s.body}</div>
                  {i < sections.length - 1 && <Separator className="my-6" />}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
