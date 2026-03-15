import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { BouncingBall } from "@/components/BouncingBall";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  Users, Search, FileText, Building2, BellRing, Bot,
  Shield, UserCheck, Briefcase, Crown,
  Twitter, Github, Linkedin, ArrowRight
} from "lucide-react";
import { motion } from "framer-motion";

const features = [
  { icon: Users, title: "Player Profiles", desc: "Comprehensive player data with stats, videos, and performance history." },
  { icon: Bot, title: "AI Scouting Assistant", desc: "Ask questions in natural language and get structured player insights." },
  { icon: Search, title: "Smart Search & Filtering", desc: "Advanced filters by position, age, stats, and more." },
  { icon: FileText, title: "Scouting Reports", desc: "Create, submit, and approve professional scouting reports." },
  { icon: Building2, title: "Club Department Mgmt", desc: "Manage scouts, departments, and player pipelines." },
  { icon: BellRing, title: "Telegram Prospect Alerts", desc: "Instant notifications when top prospects are detected." },
];

const roles = [
  { icon: UserCheck, title: "Player", desc: "Showcase your talent, track stats, and get discovered by scouts.", color: "primary" },
  { icon: Search, title: "Scout", desc: "Search players, create reports, and use AI-powered recommendations.", color: "secondary" },
  { icon: Briefcase, title: "Club Admin", desc: "Manage your club's scouting department and approve reports.", color: "primary" },
  { icon: Crown, title: "Global Admin", desc: "Full platform management with analytics and user administration.", color: "secondary" },
];

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.5 } }),
};

export default function LandingPage() {
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
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link to="/login">
              <Button variant="ghost" size="sm">Login</Button>
            </Link>
            <Link to="/register">
              <Button variant="hero" size="sm">Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      <section className="pt-32 pb-20 md:pt-44 md:pb-32">
        <div className="container flex flex-col lg:flex-row items-center gap-12">
          <motion.div
            className="flex-1 text-center lg:text-left"
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-display font-extrabold leading-tight tracking-tight">
              <span className="text-gradient-emerald">ScoutIQ</span>
              <br />
              <span className="text-foreground">AI-Powered Football</span>
              <br />
              <span className="text-foreground">Scouting</span>
            </h1>
            <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-xl mx-auto lg:mx-0">
              Discover, evaluate, and track football talent with data-driven insights and AI-powered scouting tools.
            </p>
            <div className="mt-8 flex flex-wrap gap-4 justify-center lg:justify-start">
              <Link to="/register">
                <Button variant="hero" size="lg" className="text-base px-8">
                  Get Started <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
              <Link to="/login">
                <Button variant="hero-outline" size="lg" className="text-base px-8">
                  Login
                </Button>
              </Link>
            </div>
          </motion.div>
          <motion.div
            className="flex-1 flex justify-center"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <BouncingBall size="lg" />
          </motion.div>
        </div>
      </section>

      <section id="features" className="py-20 bg-muted/30">
        <div className="container">
          <motion.div className="text-center mb-16" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
            <h2 className="text-3xl md:text-4xl font-display font-bold">
              Everything You Need for <span className="text-gradient-emerald">Professional Scouting</span>
            </h2>
            <p className="mt-4 text-muted-foreground text-lg max-w-2xl mx-auto">
              A complete toolkit designed for modern football operations.
            </p>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                className="group p-6 rounded-xl bg-card border border-border hover-lift cursor-default"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                custom={i}
              >
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <f.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-display font-semibold text-lg mb-2">{f.title}</h3>
                <p className="text-muted-foreground text-sm">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section id="roles" className="py-20">
        <div className="container">
          <motion.div className="text-center mb-16" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
            <h2 className="text-3xl md:text-4xl font-display font-bold">
              Built for <span className="text-gradient-blue">Every Role</span>
            </h2>
            <p className="mt-4 text-muted-foreground text-lg max-w-2xl mx-auto">
              Tailored dashboards and tools for every stakeholder in football scouting.
            </p>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {roles.map((r, i) => (
              <motion.div
                key={r.title}
                className={`p-6 rounded-xl border border-border bg-card hover-lift cursor-default ${
                  r.color === "primary" ? "card-glow-emerald" : "card-glow-blue"
                }`}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                custom={i}
              >
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 ${
                  r.color === "primary" ? "bg-primary/10" : "bg-secondary/10"
                }`}>
                  <r.icon className={`w-6 h-6 ${r.color === "primary" ? "text-primary" : "text-secondary"}`} />
                </div>
                <h3 className="font-display font-semibold text-lg mb-2">{r.title}</h3>
                <p className="text-muted-foreground text-sm">{r.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-border py-12 bg-muted/20">
        <div className="container">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <Shield className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-display font-bold text-lg">ScoutIQ</span>
            </div>
            <div className="flex items-center gap-6">
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors"><Twitter className="w-5 h-5" /></a>
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors"><Github className="w-5 h-5" /></a>
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors"><Linkedin className="w-5 h-5" /></a>
            </div>
          </div>
          <div className="mt-8 text-center text-sm text-muted-foreground">
            © 2026 ScoutIQ. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
