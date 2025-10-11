import { StatCard } from "@/components/stat-card";
import { MatchCard } from "@/components/match-card";
import { CampaignCard } from "@/components/campaign-card";
import { DollarSign, Users, Trophy, Megaphone, TrendingUp, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function Dashboard() {
  const upcomingMatches = [
    {
      id: "1",
      teamA: "Nexus Valorant",
      teamB: "Team Phoenix",
      date: new Date('2024-10-12T18:00:00'),
      tournament: "VCT Champions",
      game: "Valorant",
      venue: "Online",
      status: "upcoming" as const,
    },
    {
      id: "2",
      teamA: "Nexus League",
      teamB: "Storm Esports",
      date: new Date('2024-10-13T20:00:00'),
      tournament: "LCS Summer",
      game: "League of Legends",
      status: "upcoming" as const,
    },
  ];

  const activeCampaigns = [
    {
      id: "1",
      title: "VCT Championship Hype",
      description: "Building excitement for championship run",
      startDate: new Date('2024-10-01'),
      endDate: new Date('2024-10-15'),
      platforms: ['twitter' as const, 'instagram' as const],
      reach: 125000,
      engagement: 8.5,
      status: "active" as const,
    },
  ];

  const recentActivity = [
    { id: 1, action: "Sarah Johnson updated payroll for October", time: "2 hours ago", type: "payroll" },
    { id: 2, action: "New contract uploaded for Alex Rivera", time: "5 hours ago", type: "contract" },
    { id: 3, action: "VCT match result: Win 2-1", time: "1 day ago", type: "match" },
    { id: 4, action: "New staff member added: Mike Chen", time: "2 days ago", type: "staff" },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-heading font-bold mb-1" data-testid="text-dashboard-title">
          Dashboard
        </h1>
        <p className="text-muted-foreground">Welcome back! Here's what's happening with your esports club.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Revenue"
          value="$142,500"
          icon={DollarSign}
          trend={12.5}
          trendLabel="vs last month"
        />
        <StatCard
          title="Active Rosters"
          value="6"
          icon={Users}
          subtitle="Across 4 game titles"
        />
        <StatCard
          title="Win Rate"
          value="68%"
          icon={Trophy}
          trend={5.2}
          trendLabel="this season"
        />
        <StatCard
          title="Active Campaigns"
          value="12"
          icon={Megaphone}
          trend={-2.1}
          trendLabel="vs last month"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-3">
            <CardTitle className="text-lg font-heading">Upcoming Matches</CardTitle>
            <Button variant="ghost" size="sm" data-testid="button-view-all-matches">
              View All
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcomingMatches.map((match) => (
              <MatchCard key={match.id} {...match} />
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-3">
            <CardTitle className="text-lg font-heading">Recent Activity</CardTitle>
            <Button variant="ghost" size="sm" data-testid="button-view-audit-log">
              View All
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg hover-elevate">
                  <div className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">{activity.action}</p>
                    <p className="text-xs text-muted-foreground mt-1">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
          <CardTitle className="text-lg font-heading">Active Marketing Campaigns</CardTitle>
          <Button variant="ghost" size="sm" data-testid="button-view-all-campaigns">
            View All
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeCampaigns.map((campaign) => (
              <CampaignCard key={campaign.id} {...campaign} />
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="hover-elevate active-elevate-2 cursor-pointer">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-chart-2/10 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-chart-2" />
              </div>
              <div>
                <p className="text-2xl font-bold font-mono">+24%</p>
                <p className="text-sm text-muted-foreground">Revenue Growth</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover-elevate active-elevate-2 cursor-pointer">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Calendar className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold font-mono">8</p>
                <p className="text-sm text-muted-foreground">Matches This Week</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover-elevate active-elevate-2 cursor-pointer">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-chart-4/10 flex items-center justify-center">
                <Users className="w-6 h-6 text-chart-4" />
              </div>
              <div>
                <p className="text-2xl font-bold font-mono">42</p>
                <p className="text-sm text-muted-foreground">Total Staff Members</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
