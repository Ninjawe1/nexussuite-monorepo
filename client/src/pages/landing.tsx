import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Trophy, Users, DollarSign, Calendar, FileText, BarChart3, Shield, Zap, ArrowRight, Sparkles, Workflow, CheckCircle2 } from "lucide-react";

export default function Landing() {
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
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/18 via-transparent to-primary/10" />
        <div className="container relative mx-auto px-4 py-20">
          <div className="grid lg:grid-cols-2 gap-8 items-center">
            <div className="flex flex-col gap-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
                <Zap className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-primary">Esports Infrastructure, Reimagined</span>
              </div>
              <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
                <span className="bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">Manage. Analyze. Grow.</span>
              </h1>
              <p className="text-xl md:text-2xl text-muted-foreground max-w-xl">
                All-in-one platform to run your club—staff, payroll, matches, analytics, and marketing—beautifully integrated.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button size="lg" className="text-lg px-8" data-testid="button-login" onClick={() => window.location.href = "/login"}>
                  <Trophy className="w-5 h-5 mr-2" />
                  Get Started
                </Button>
                <Button size="lg" variant="outline" className="text-lg px-8">
                  Explore Features
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
            <div className="glass border-glow rounded-2xl p-6 scanline noise">
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
                    <span className="text-sm text-muted-foreground">Matches</span>
                  </div>
                  <div className="text-2xl font-mono mt-3">12 This Week</div>
                </Card>
                <Card className="p-4 importance-low">
                  <div className="flex items-center gap-3">
                    <Shield className="w-5 h-5 text-primary" />
                    <span className="text-sm text-muted-foreground">Audit</span>
                  </div>
                  <div className="text-2xl font-mono mt-3">All Clear</div>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="container mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Everything You Need to Manage Your Esports Club
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Built for teams of all sizes, from amateur to professional. Secure, scalable, and easy to use.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <Card key={index} className="p-6 glass border-glow hover-elevate fx-shimmer transition-all" data-testid={`card-feature-${index}`}>
              <div className="flex items-center gap-3 mb-3">
                <feature.icon className="w-12 h-12 text-primary" />
                <span className="text-sm text-muted-foreground inline-flex items-center gap-2"><Workflow className="w-4 h-4" /> Designed for speed</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
              <p className="text-muted-foreground mb-4">{feature.description}</p>
              <div className="flex items-center gap-2 text-sm text-primary">
                <CheckCircle2 className="w-4 h-4" /> Ready out of the box
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* CTA Section */}
      <div className="container mx-auto px-4 py-20">
        <Card className="p-12 text-center glass border-glow">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Elevate Your Esports Club?
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join leading esports organizations using Nexus to streamline operations and accelerate growth.
          </p>
          <Button 
            size="lg" 
            className="text-lg px-8"
            data-testid="button-get-started-bottom"
            onClick={() => window.location.href = "/login"}
          >
            <Trophy className="w-5 h-5 mr-2" />
            Get Started Now
          </Button>
        </Card>
      </div>
    </div>
  );
}