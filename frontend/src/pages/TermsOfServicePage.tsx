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
    title: "Acceptance of these terms",
    body: (
      <p>
        By creating an account or otherwise using ScoutIQ, you agree to these Terms of Service and to the{" "}
        <Link to="/privacy-policy" className="text-primary hover:underline">Privacy Policy</Link>. If you don't
        agree, please don't use the app.
      </p>
    ),
  },
  {
    title: "What ScoutIQ is",
    body: (
      <p>
        ScoutIQ is a personal, non-commercial football scouting platform built and maintained by an individual
        developer (Haris Imamovic), not a registered company. It's provided as-is, best-effort, without the
        guarantees a commercial product would typically offer around uptime, support response times, or data
        durability.
      </p>
    ),
  },
  {
    title: "Eligibility",
    body: <p>You must be at least 16 years old to create an account and use ScoutIQ.</p>,
  },
  {
    title: "Your account",
    body: (
      <ul className="list-disc pl-5 space-y-2">
        <li>You're responsible for the accuracy of the information you provide and for keeping your credentials confidential.</li>
        <li>One account per person. Accounts are not transferable.</li>
        <li>Two-factor authentication is mandatory after your first login — it protects your account and the data of others visible through it.</li>
        <li>You're responsible for activity that happens under your account, whether or not you performed it yourself, unless it results from a security failure on ScoutIQ's side.</li>
      </ul>
    ),
  },
  {
    title: "Acceptable use",
    body: (
      <ul className="list-disc pl-5 space-y-2">
        <li>No scraping, bulk-extracting, or automating access to the app outside of the API endpoints it exposes for normal use.</li>
        <li>No attempting to bypass role restrictions, authentication, or rate limits, or to access data outside your role's intended scope.</li>
        <li>No impersonating another person or organization, or misrepresenting your affiliation with a club.</li>
        <li>No uploading unlawful, defamatory, or harassing content — including in scouting reports, player profiles, or messages to the AI assistant.</li>
        <li>No using the platform to harass, discriminate against, or make unlawful employment decisions about the players featured on it.</li>
      </ul>
    ),
  },
  {
    title: "Content you submit",
    body: (
      <p>
        Scouts, club admins, and players may submit information about themselves and, in the case of scouting
        reports and player records, about others. You're responsible for the accuracy of what you submit and for
        having a legitimate basis to submit information about another person (for example, a scout's professional
        evaluation of a player they've watched). You retain ownership of the content you submit; by submitting it
        you grant ScoutIQ the license needed to store, process, and display it back to you and to other users
        whose roles are permitted to see it.
      </p>
    ),
  },
  {
    title: "AI assistant",
    body: (
      <p>
        The AI assistant (available to scouts) is a convenience tool built on a third-party model (Groq). Its
        responses can be inaccurate or incomplete and are not professional scouting, medical, legal, or financial
        advice. Don't rely on it as the sole basis for a decision about a player, and don't paste information into
        it that you wouldn't want processed by a third-party AI provider.
      </p>
    ),
  },
  {
    title: "Intellectual property",
    body: (
      <p>
        The ScoutIQ name, branding, and underlying software belong to the developer. Nothing in these terms
        transfers that ownership to you. Club and league logos remain the property of their respective owners and
        are used for identification within the app only.
      </p>
    ),
  },
  {
    title: "Termination",
    body: (
      <p>
        Accounts that violate these terms may be suspended or deleted. You can request deletion of your own
        account at any time — see the{" "}
        <Link to="/privacy-policy" className="text-primary hover:underline">Privacy Policy</Link> for how.
      </p>
    ),
  },
  {
    title: "No warranty",
    body: (
      <p>
        ScoutIQ is provided "as is" and "as available," without warranties of any kind, express or implied,
        including fitness for a particular purpose or non-infringement. As a personal project, it may have
        downtime, bugs, or occasional data loss, and there's no service-level agreement.
      </p>
    ),
  },
  {
    title: "Limitation of liability",
    body: (
      <p>
        To the maximum extent permitted by law, the developer isn't liable for indirect, incidental, or
        consequential damages arising from your use of ScoutIQ, including decisions made based on scouting
        reports, player data, or AI assistant output. Nothing here limits liability that can't legally be limited.
      </p>
    ),
  },
  {
    title: "Changes to these terms",
    body: (
      <p>
        If these terms change, the "Last updated" date at the top of this page will change. Continuing to use
        ScoutIQ after an update means you accept the revised terms. Since this is a personal project, there's no
        separate email announcement for terms updates.
      </p>
    ),
  },
  {
    title: "Contact",
    body: (
      <p>
        Questions about these terms:{" "}
        <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline">{CONTACT_EMAIL}</a>.
      </p>
    ),
  },
];

export default function TermsOfServicePage() {
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

          <h1 className="text-3xl md:text-4xl font-display font-bold">Terms of Service</h1>
          <p className="mt-2 text-sm text-muted-foreground">Last updated: {LAST_UPDATED}</p>

          <Card className="mt-8">
            <CardContent className="pt-6">
              <p className="text-muted-foreground leading-relaxed">
                These terms govern your use of ScoutIQ. If anything here is unclear, email{" "}
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
