import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Trophy,
  Users,
  DollarSign,
  Calendar,
  FileText,
  BarChart3,
  Shield,
  Zap,
  ArrowRight,
  Sparkles,
  Gamepad2,
  MonitorPlay,
  Target,
  Swords,
} from "lucide-react";

import { WaitlistForm } from "@/components/WaitlistForm";

export default function Landing() {
  // Enforce dark/atomic theme for the landing page
  useEffect(() => {
    const root = document.documentElement;
    try {
      localStorage.setItem("design:theme", "atomic");
      root.classList.remove("nova", "aqua");
      root.classList.add("atomic", "dark");
      
      // Explicitly set atomic colors to ensure they override any defaults
      // Deep Teal / Emerald for Atomic Theme
      root.style.setProperty("--primary", "hsl(166 72% 45%)");
      root.style.setProperty("--ring", "hsl(166 72% 45%)");
      root.style.setProperty("--accent", "hsl(170 30% 22%)");
    } catch (_) {}

    return () => {
      // Cleanup on unmount
      root.classList.remove("atomic");
      root.style.removeProperty("--primary");
      root.style.removeProperty("--ring");
      root.style.removeProperty("--accent");
    };
  }, []);

  const features = [
    {
      icon: Users,
      title: "Roster Management",
      description:
        "Manage players, coaches, and staff with role-based permissions and real-time updates.",
    },
    {
      icon: Calendar,
      title: "Scrims & Matches",
      description:
        "Coordinate practice blocks, tournament schedules, and travel logistics in one view.",
    },
    {
      icon: DollarSign,
      title: "Automated Payroll",
      description:
        "Handle player salaries, prize pool distribution, and bonuses with precision.",
    },
    {
      icon: BarChart3,
      title: "Performance Analytics",
      description:
        "Track scrim results, individual stats, and social engagement metrics.",
    },
    {
      icon: FileText,
      title: "Smart Contracts",
      description:
        "Digitally sign and store player contracts, sponsorship deals, and NDAs.",
    },
    {
      icon: MonitorPlay,
      title: "Content Pipeline",
      description:
        "Streamline asset requests for thumbnails, overlays, and social graphics.",
    },
  ];

  return (
    <div id="landing-page-root" className="min-h-screen bg-[#0a0a0a] text-white overflow-x-hidden selection:bg-[#00dca5]/20 selection:text-[#00dca5]">
      {/* Background Grid Effect */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080801a_1px,transparent_1px),linear-gradient(to_bottom,#8080801a_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-background via-transparent to-background"></div>
      </div>

      {/* Floating Pill Navigation */}
      <div className="fixed top-6 left-0 right-0 z-50 flex justify-center px-4">
        <nav className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-full px-6 py-3 flex items-center gap-8 shadow-2xl">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
            <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/20 flex items-center justify-center">
              <Gamepad2 className="w-4 h-4 text-primary" />
            </div>
            <span className="font-heading font-bold tracking-tight text-lg">
              Nexus<span className="text-primary">Suite</span>
            </span>
          </div>

          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
            <a href="#features" className="hover:text-primary transition-colors">Features</a>
            <a href="/pricing" className="hover:text-primary transition-colors">Pricing</a>
            <a href="#enterprise" className="hover:text-primary transition-colors">Enterprise</a>
            <a href="#about" className="hover:text-primary transition-colors">About</a>
          </div>

          <div className="flex items-center gap-3">
             <Button 
               variant="ghost" 
               size="sm" 
               className="hidden sm:flex hover:bg-white/5 hover:text-white rounded-full px-4"
               onClick={() => window.location.href = "/login"}
             >
               Login
             </Button>
             <Button 
               size="sm" 
               className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-5 shadow-lg shadow-primary/20"
               onClick={() => window.location.href = "/register"}
             >
               Get Started
             </Button>
          </div>
        </nav>
      </div>

      {/* Hero Section */}
      <section className="relative z-10 pt-40 pb-32 overflow-hidden flex flex-col items-center justify-center text-center">
        <div className="container mx-auto px-4 relative">
          
          {/* Ambient Glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/20 blur-[120px] rounded-full pointer-events-none opacity-50"></div>

          <div className="flex flex-col items-center gap-8 max-w-4xl mx-auto relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 w-fit backdrop-blur-sm">
              <Zap className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-medium text-primary uppercase tracking-wider">
                The OS for Esports
              </span>
            </div>
            
            <h1 className="font-heading text-5xl md:text-7xl lg:text-8xl font-bold tracking-tighter leading-[0.9] text-transparent bg-clip-text bg-gradient-to-b from-white via-white to-white/50">
              Power Your <br />
              <span className="text-primary bg-clip-text text-transparent bg-gradient-to-r from-primary via-primary/80 to-primary">
                Esports Empire
              </span>
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl leading-relaxed">
              The all-in-one platform to manage rosters, streamline operations, 
              and scale your organization. <span className="text-white">Built for champions.</span>
            </p>
            
            {/* Waitlist Integration */}
            <div className="w-full max-w-md bg-black/40 backdrop-blur-xl border border-white/10 p-2 rounded-full shadow-2xl flex items-center gap-2 pl-4 pr-2 py-2 mt-4">
               <WaitlistForm variant="minimal" />
            </div>

            <div className="flex items-center gap-8 text-sm text-muted-foreground pt-4">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary" />
                <span>Enterprise Security</span>
              </div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <span>AI-Powered</span>
              </div>
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-primary" />
                <span>Real-time Sync</span>
              </div>
            </div>
          </div>

          {/* Hero Visual / Dashboard Preview */}
          <div className="relative mt-20 perspective-1000">
             <div className="relative glass rounded-2xl border border-white/10 p-2 shadow-2xl transform rotate-x-12 scale-95 opacity-90 hover:scale-100 hover:rotate-0 transition-all duration-700 ease-out">
                {/* Overlay gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent z-20 pointer-events-none h-1/2 bottom-0"></div>
                
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/5 to-transparent rounded-2xl pointer-events-none"></div>
                
                {/* Fake UI Header */}
                <div className="h-10 bg-black/60 rounded-t-xl flex items-center px-4 gap-2 mb-2 border-b border-white/5">
                  <div className="flex gap-2">
                     <div className="w-3 h-3 rounded-full bg-red-500/50"></div>
                     <div className="w-3 h-3 rounded-full bg-yellow-500/50"></div>
                     <div className="w-3 h-3 rounded-full bg-green-500/50"></div>
                  </div>
                  <div className="ml-4 h-6 w-64 bg-white/5 rounded-md"></div>
                </div>

                {/* Grid Layout inside the card - Keeping original content but centering visual */}
                <div className="grid grid-cols-2 gap-4 p-4 min-h-[400px]">
                  {/* Card 1 */}
                  <div className="col-span-2 bg-black/40 rounded-xl p-6 border border-white/5">
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <p className="text-xs text-muted-foreground uppercase mb-1">Total Revenue</p>
                        <h3 className="text-3xl font-mono font-bold">$1,240,500</h3>
                      </div>
                      <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20 px-3 py-1">
                        +12.5%
                      </Badge>
                    </div>
                    <div className="h-32 flex items-end gap-2">
                      {[40, 60, 45, 70, 65, 80, 75, 60, 55, 85, 90, 70].map((h, i) => (
                        <div key={i} style={{ height: `${h}%` }} className="flex-1 bg-primary/20 hover:bg-primary/50 transition-colors rounded-sm cursor-pointer group relative">
                           <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border border-white/10">
                              ${h}k
                           </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Card 2 */}
                  <div className="bg-black/40 rounded-xl p-6 border border-white/5 flex flex-col justify-between">
                    <div className="flex items-center gap-3 mb-4">
                      <Swords className="w-5 h-5 text-primary" />
                      <span className="text-sm font-medium">Next Match</span>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                         <div className="text-2xl font-bold">NX</div>
                         <div className="text-sm text-muted-foreground">vs</div>
                         <div className="text-2xl font-bold">C9</div>
                      </div>
                      <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Starts in</div>
                      <div className="text-xl font-mono font-bold text-primary">02:45:12</div>
                    </div>
                  </div>

                  {/* Card 3 */}
                  <div className="bg-black/40 rounded-xl p-6 border border-white/5 flex flex-col justify-between">
                     <div className="flex items-center gap-3 mb-4">
                      <Users className="w-5 h-5 text-primary" />
                      <span className="text-sm font-medium">Active Roster</span>
                    </div>
                    <div className="space-y-3">
                       <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs border border-zinc-700">P1</div>
                          <div className="text-sm">Simple</div>
                          <div className="ml-auto w-2 h-2 rounded-full bg-green-500"></div>
                       </div>
                       <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs border border-zinc-700">P2</div>
                          <div className="text-sm">Zywoo</div>
                          <div className="ml-auto w-2 h-2 rounded-full bg-green-500"></div>
                       </div>
                       <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs border border-zinc-700">P3</div>
                          <div className="text-sm">Niko</div>
                          <div className="ml-auto w-2 h-2 rounded-full bg-yellow-500"></div>
                       </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
        </div>
      </section>

      {/* Partners / Trusted By */}
      <section className="py-10 border-y border-white/5 bg-black/20">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-muted-foreground mb-6 uppercase tracking-widest">
            Trusted by Elite Organizations
          </p>
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
             {/* Placeholders for logos */}
             <div className="text-xl font-bold font-heading">FNATIC</div>
             <div className="text-xl font-bold font-heading">G2 ESPORTS</div>
             <div className="text-xl font-bold font-heading">LIQUID</div>
             <div className="text-xl font-bold font-heading">100 THIEVES</div>
             <div className="text-xl font-bold font-heading">CLOUD9</div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 relative z-10">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold font-heading mb-6">
              Everything You Need to <br />
              <span className="text-primary">Dominate the Scene</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              Stop using spreadsheets. NexusSuite provides a professional operating system tailored for the unique needs of esports organizations.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <Card
                key={i}
                className="group p-6 glass border-white/5 hover:border-primary/50 transition-all duration-300 hover:-translate-y-1"
              >
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-3 font-heading group-hover:text-primary transition-colors">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Stats / Proof */}
      <section className="py-24 bg-primary/5 border-y border-primary/10 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent"></div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div className="p-6">
              <div className="text-5xl font-bold font-mono mb-2 text-primary">
                $250M+
              </div>
              <p className="text-muted-foreground uppercase tracking-wider text-sm">
                Prize Money Tracked
              </p>
            </div>
            <div className="p-6 border-x border-primary/10">
              <div className="text-5xl font-bold font-mono mb-2 text-primary">
                5,000+
              </div>
              <p className="text-muted-foreground uppercase tracking-wider text-sm">
                Active Players
              </p>
            </div>
            <div className="p-6">
              <div className="text-5xl font-bold font-mono mb-2 text-primary">
                99.9%
              </div>
              <p className="text-muted-foreground uppercase tracking-wider text-sm">
                Uptime Reliability
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 relative">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-3xl mx-auto glass border border-primary/20 rounded-3xl p-12 md:p-20 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent"></div>
            
            <h2 className="text-4xl md:text-6xl font-bold font-heading mb-6 tracking-tight">
              Join the Closed Beta
            </h2>
            <p className="text-xl text-muted-foreground mb-10">
              Be among the first to experience the future of esports management.
              Sign up now to secure your spot.
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
                The premier operating system for esports organizations, creative agencies, and gaming communities.
              </p>
            </div>
            <div>
              <h4 className="font-bold mb-4 text-white">Platform</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li className="hover:text-primary cursor-pointer">Features</li>
                <li className="hover:text-primary cursor-pointer" onClick={() => window.location.href = "/pricing"}>Pricing</li>
                <li className="hover:text-primary cursor-pointer">Enterprise</li>
                <li className="hover:text-primary cursor-pointer">Changelog</li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4 text-white">Company</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li className="hover:text-primary cursor-pointer">About Us</li>
                <li className="hover:text-primary cursor-pointer">Careers</li>
                <li className="hover:text-primary cursor-pointer">Legal</li>
                <li className="hover:text-primary cursor-pointer">Contact</li>
              </ul>
            </div>
          </div>
          <div className="text-center text-sm text-muted-foreground pt-8 border-t border-white/5">
            © {new Date().getFullYear()} NexusSuite. All rights reserved. GG WP.
          </div>
        </div>
      </footer>
    </div>
  );
}
