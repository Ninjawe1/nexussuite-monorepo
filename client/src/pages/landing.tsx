import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Trophy, Users, DollarSign, Calendar, FileText, BarChart3, Shield, Zap } from "lucide-react";

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
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-primary/10" />
        
        <div className="container relative mx-auto px-4 py-20">
          <div className="flex flex-col items-center text-center gap-8 max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
              <Zap className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">The Future of Esports Management</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
              <span className="bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
                Nexus Esports Suite
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl">
              Comprehensive multi-tenant SaaS platform for professional esports club management. 
              Track rosters, manage payroll, schedule matches, and drive growth—all in one place.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 mt-4">
              <Button 
                size="lg" 
                className="text-lg px-8"
                data-testid="button-login"
                onClick={() => window.location.href = "/login"}
              >
                <Trophy className="w-5 h-5 mr-2" />
                Get Started
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="text-lg px-8"
                data-testid="button-learn-more"
              >
                Learn More
              </Button>
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
            <Card 
              key={index} 
              className="p-6 hover-elevate transition-all"
              data-testid={`card-feature-${index}`}
            >
              <feature.icon className="w-12 h-12 text-primary mb-4" />
              <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
              <p className="text-muted-foreground">{feature.description}</p>
            </Card>
          ))}
        </div>
      </div>

      {/* CTA Section */}
      <div className="container mx-auto px-4 py-20">
        <Card className="p-12 text-center bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
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
