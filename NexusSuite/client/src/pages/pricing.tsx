import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Check, X, Gamepad2, ArrowRight } from "lucide-react";
import { WaitlistForm } from "@/components/WaitlistForm";

export default function Pricing() {
  // Enforce dark/atomic theme
  useEffect(() => {
    try {
      localStorage.setItem("design:theme", "atomic");
      document.documentElement.classList.remove("nova", "aqua");
      document.documentElement.classList.add("atomic", "dark");
    } catch (_) {}
  }, []);

  const tiers = [
    {
      name: "Starter",
      price: "$0",
      description: "Perfect for amateur teams and community tournaments.",
      features: [
        "Up to 2 Rosters",
        "Basic Scrim Scheduling",
        "Community Support",
        "Public Profile",
        "1GB Asset Storage",
      ],
      notIncluded: [
        "Automated Payroll",
        "Smart Contracts",
        "Advanced Analytics",
        "Custom Domain",
        "Priority Support",
      ],
      cta: "Start for Free",
      variant: "outline",
    },
    {
      name: "Pro",
      price: "$29",
      period: "/month",
      description: "For growing organizations that need professional tools.",
      popular: true,
      features: [
        "Unlimited Rosters",
        "Advanced Scheduling & Calendar",
        "Automated Payroll (Basic)",
        "Smart Contracts (5/mo)",
        "Performance Analytics",
        "10GB Asset Storage",
        "Priority Email Support",
      ],
      notIncluded: [
        "Custom API Access",
        "White-labeling",
        "Dedicated Account Manager",
      ],
      cta: "Start Free Trial",
      variant: "default",
    },
    {
      name: "Enterprise",
      price: "Custom",
      description: "Full-scale operating system for elite esports organizations.",
      features: [
        "Unlimited Everything",
        "Automated Payroll (Global)",
        "Unlimited Smart Contracts",
        "Deep Analytics & Insights",
        "Custom API Integration",
        "White-label Portal",
        "Dedicated Account Manager",
        "SLA Guarantee",
      ],
      notIncluded: [],
      cta: "Contact Sales",
      variant: "outline",
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden selection:bg-primary/20 selection:text-primary">
      {/* Background Grid Effect */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-background via-transparent to-background"></div>
      </div>

      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.location.href = "/"}>
            <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Gamepad2 className="w-5 h-5 text-primary" />
            </div>
            <span className="font-heading text-xl font-bold tracking-tight">
              Nexus<span className="text-primary">Suite</span>
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              className="hidden md:flex hover:bg-primary/10 hover:text-primary"
              onClick={() => (window.location.href = "/login")}
            >
              Login
            </Button>
            <Button
              size="sm"
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={() => (window.location.href = "/register")}
            >
              Get Started <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 pt-20 pb-20 text-center">
        <div className="container mx-auto px-4">
          <h1 className="font-heading text-4xl md:text-6xl font-bold tracking-tighter mb-6">
            Simple, Transparent <span className="text-primary">Pricing</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
            Choose the plan that fits your organization's stage. No hidden fees. Cancel anytime.
          </p>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="relative z-10 pb-24">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {tiers.map((tier, index) => (
              <Card 
                key={index} 
                className={`relative p-8 glass border-white/5 flex flex-col ${
                  tier.popular ? "border-primary/50 shadow-lg shadow-primary/10 scale-105 z-10" : "hover:border-primary/20"
                }`}
              >
                {tier.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground hover:bg-primary px-4 py-1">
                      Most Popular
                    </Badge>
                  </div>
                )}
                
                <div className="mb-8">
                  <h3 className="text-xl font-bold font-heading mb-2">{tier.name}</h3>
                  <div className="flex items-baseline gap-1 mb-4">
                    <span className="text-4xl font-bold font-mono">{tier.price}</span>
                    {tier.period && <span className="text-muted-foreground">{tier.period}</span>}
                  </div>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {tier.description}
                  </p>
                </div>

                <div className="space-y-4 mb-8 flex-1">
                  {tier.features.map((feature, i) => (
                    <div key={i} className="flex items-start gap-3 text-sm">
                      <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3 text-primary" />
                      </div>
                      <span>{feature}</span>
                    </div>
                  ))}
                  {tier.notIncluded.map((feature, i) => (
                    <div key={i} className="flex items-start gap-3 text-sm text-muted-foreground/50">
                      <div className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center shrink-0">
                        <X className="w-3 h-3" />
                      </div>
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>

                <Button 
                  variant={tier.variant === "default" ? "default" : "outline"}
                  className={`w-full ${tier.variant === "default" ? "bg-primary hover:bg-primary/90" : ""}`}
                  onClick={() => window.location.href = "/register"}
                >
                  {tier.cta}
                </Button>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-24 bg-black/20 border-y border-white/5">
        <div className="container mx-auto px-4 max-w-3xl">
          <h2 className="text-3xl font-bold font-heading text-center mb-12">Frequently Asked Questions</h2>
          <div className="space-y-8">
            <div>
              <h3 className="text-lg font-bold mb-2">Can I switch plans later?</h3>
              <p className="text-muted-foreground">Yes, you can upgrade or downgrade your plan at any time. Changes will be reflected in your next billing cycle.</p>
            </div>
            <Separator className="bg-white/5" />
            <div>
              <h3 className="text-lg font-bold mb-2">Do you offer discounts for non-profits?</h3>
              <p className="text-muted-foreground">We support collegiate and non-profit esports organizations. Contact our sales team for special pricing.</p>
            </div>
            <Separator className="bg-white/5" />
            <div>
              <h3 className="text-lg font-bold mb-2">What payment methods do you accept?</h3>
              <p className="text-muted-foreground">We accept all major credit cards (Visa, Mastercard, Amex) and PayPal. For Enterprise plans, we support wire transfers.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Waitlist CTA (Reuse) */}
      <section className="py-32 relative">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold font-heading mb-6">
              Not ready to commit?
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Join our closed beta waitlist to get early access to new features and community updates.
            </p>
            <div className="flex justify-center w-full">
               <WaitlistForm />
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-white/10 bg-black/40">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div className="col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <Gamepad2 className="w-6 h-6 text-primary" />
                <span className="font-heading text-xl font-bold">NexusSuite</span>
              </div>
              <p className="text-muted-foreground max-w-sm">
                The premier operating system for esports organizations.
              </p>
            </div>
            <div>
              <h4 className="font-bold mb-4 text-white">Platform</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li className="hover:text-primary cursor-pointer" onClick={() => window.location.href = "/"}>Home</li>
                <li className="hover:text-primary cursor-pointer text-primary">Pricing</li>
                <li className="hover:text-primary cursor-pointer">Enterprise</li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4 text-white">Company</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li className="hover:text-primary cursor-pointer">About Us</li>
                <li className="hover:text-primary cursor-pointer">Contact</li>
              </ul>
            </div>
          </div>
          <div className="text-center text-sm text-muted-foreground pt-8 border-t border-white/5">
            © {new Date().getFullYear()} NexusSuite. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}