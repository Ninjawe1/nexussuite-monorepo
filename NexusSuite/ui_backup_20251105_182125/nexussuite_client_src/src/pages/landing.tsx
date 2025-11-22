import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Trophy, Users, DollarSign, Calendar, FileText, BarChart3, Shield, Zap, ArrowRight, Sparkles, Workflow, CheckCircle2 } from "lucide-react";

export default function Landing() {
  // Make the public landing feel like the Atomic template by default
  // without affecting the authenticated app shell. Users can still
  // override via ?theme=... flags handled in App.tsx.
  useEffect(() => {
    try {
      localStorage.setItem("design:theme", "atomic");
      document.documentElement.classList.remove("nova", "aqua", "atomic");
      document.documentElement.classList.add("atomic");
    } catch (_) {}
  }, []);

  const features = [
    {
      icon: Users,
      title: "Staff Management",
      description: "Manage your esports team roster with role-based permissions and instant updates"
    },
    {
      icon: DollarSign,
      title: "Payroll System",
      description: "Track salaries, bonuses, and payments with automated calculations and export features"
    },
    {
      icon: Calendar,
      title: "Match Scheduling",
      description: "Organize tournaments and matches with calendar and list views, live score updates"
    },
    {
      icon: BarChart3,
      title: "Analytics Dashboard",
      description: "Real-time insights into team performance, revenue, and campaign effectiveness"
    },
    {
      icon: FileText,
      title: "Contract Management",
      description: "Store and manage player, staff, and sponsor contracts with expiration tracking"
    },
    {
      icon: Shield,
      title: "Audit Logging",
      description: "Complete audit trail of all changes with before/after values for compliance"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation */}
      <nav className="sticky top-0 z-30 section-divider bg-background/80 backdrop-blur-md">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/20 border border-primary/30 fx-glow flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <span className="font-heading text-xl">Nexus Suite</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => window.location.href = "/login"}>Login</Button>
            <Button size="sm" onClick={() => window.location.href = "/register"}>Sign up</Button>
          </div>
        </div>
      </nav>

      {/* Atomic-style Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/14 via-transparent to-primary/8" />
        <div className="container relative mx-auto px-4 py-24">
          <div className="grid lg:grid-cols-2 gap-8 items-center">
            <div className="flex flex-col gap-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
                <Zap className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-primary">Design work, the efficient way</span>
              </div>
              <h1 className="font-heading text-5xl md:text-7xl font-bold tracking-tight">
                Elevate the way you source design
              </h1>
              <p className="text-xl md:text-2xl text-muted-foreground max-w-xl">
                High-quality, scalable design delivered without the overhead. Tailored to your vision, integrated with your workflow.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button size="lg" className="text-lg px-8 fx-ripple" data-testid="button-login" onClick={() => window.location.href = "/login"}>
                  <Trophy className="w-5 h-5 mr-2" />
                  Get Started
                </Button>
                <Button size="lg" variant="outline" className="text-lg px-8">
                  Learn More
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
            {/* Atomic glass panel with quick stats */}
            <div className="glass border-glow rounded-2xl p-6 scanline noise shadcn-card">
              <div className="grid grid-cols-2 gap-4">
                <Card className="p-4 importance-high">
                  <div className="flex items-center gap-3">
                    <BarChart3 className="w-5 h-5 text-primary" />
                    <span className="text-sm text-muted-foreground">Performance</span>
                  </div>
                  <div className="text-2xl font-mono mt-3">+18.4% MoM</div>
                </Card>
                <Card className="p-4 importance-medium">
                  <div className="flex items-center gap-3">
                    <DollarSign className="w-5 h-5 text-primary" />
                    <span className="text-sm text-muted-foreground">Revenue</span>
                  </div>
                  <div className="text-2xl font-mono mt-3">$124,500</div>
                </Card>
                <Card className="p-4 importance-medium">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-primary" />
                    <span className="text-sm text-muted-foreground">Projects</span>
                  </div>
                  <div className="text-2xl font-mono mt-3">26 Active</div>
                </Card>
                <Card className="p-4 importance-low">
                  <div className="flex items-center gap-3">
                    <Shield className="w-5 h-5 text-primary" />
                    <span className="text-sm text-muted-foreground">Quality</span>
                  </div>
                  <div className="text-2xl font-mono mt-3">Top-tier</div>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Value Props / Features (Atomic style) */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">We resolve problems associated with creative procedures</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">Cost effective solution. Tailor–made design. Scalable as you grow. Workflow integration.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {["Cost effective solution","Tailor–made design","Scalable as you grow","Workflow integration"].map((title, i) => (
            <Card key={i} className="p-6 glass border-glow shadcn-card hover-elevate fx-shimmer transition-all">
              <h3 className="text-lg font-semibold mb-2">{title}</h3>
              <p className="text-muted-foreground">Get high-quality design work at a fraction of the cost.</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Process section */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Top–notch designs, delivered at your doorstep</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[{t:"Tell us your vision",d:"Choose a plan and share your design project details with us: we’re here to listen."},{t:"Receive the magic",d:"Sit back and relax: our expert designers will turn your vision into reality."},{t:"Get ongoing support",d:"Your subscription ensures you have continuous access to our design team."}].map((s, i) => (
            <Card key={i} className="p-6 glass border-glow shadcn-card">
              <h3 className="text-xl font-semibold mb-2">{s.t}</h3>
              <p className="text-muted-foreground">{s.d}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20">
        <Card className="p-12 text-center glass border-glow shadcn-card">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Elevate the way you source design</h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">Get ready to start producing stunning, efficient design work without the hassles of hiring.</p>
          <Button size="lg" className="text-lg px-8" data-testid="button-get-started-bottom" onClick={() => window.location.href = "/login"}>
            <Trophy className="w-5 h-5 mr-2" />
            Start Now
          </Button>
        </Card>
      </section>
    </div>
  );
}

