import { StatCard } from "@/components/stat-card";
import { MatchCard } from "@/components/match-card";
import { CampaignCard } from "@/components/campaign-card";
import { DollarSign, Users, Trophy, Megaphone, TrendingUp, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import type { Match, Campaign, AuditLog, Staff, Payroll } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";
import { toDateSafe } from "@/lib/date";

export default function Dashboard() {
  const { data: matches = [] } = useQuery<Match[]>({
    queryKey: ["/api/matches"],
  });

  const { data: campaigns = [] } = useQuery<Campaign[]>({
    queryKey: ["/api/campaigns"],
  });

  const { data: auditLogs = [] } = useQuery<AuditLog[]>({
    queryKey: ["/api/audit-logs"],
  });

  const { data: staff = [] } = useQuery<Staff[]>({
    queryKey: ["/api/staff"],
  });

  const { data: payroll = [] } = useQuery<Payroll[]>({
    queryKey: ["/api/payroll"],
  });

  const upcomingMatches = matches
    .filter((m) => m.status === "upcoming")
    .sort((a, b) => (toDateSafe(a.date)?.getTime() ?? 0) - (toDateSafe(b.date)?.getTime() ?? 0))
    .slice(0, 2)
    .map((m) => ({
      ...m,
      scoreA: m.scoreA ?? undefined,
      scoreB: m.scoreB ?? undefined,
      venue: m.venue ?? undefined,
      status: m.status as "upcoming" | "live" | "completed",
    }));

  const activeCampaigns = campaigns
    .filter((c) => c.status === "active")
    .slice(0, 3)
    .map((c) => ({
      ...c,
      platforms: c.platforms as Array<"twitter" | "instagram" | "youtube" | "tiktok" | "twitch">,
      reach: c.reach ?? undefined,
      engagement: c.engagement ? parseFloat(c.engagement) : undefined,
      status: c.status as "active" | "completed" | "scheduled",
    }));

  const recentActivity = auditLogs.slice(0, 5);

  const totalRevenue = payroll
    .filter((p) => p.status === "paid")
    .reduce((sum, p) => sum + parseFloat(p.amount), 0);

  const activeStaffCount = staff.filter((s) => s.status === "active").length;

  const completedMatches = matches.filter((m) => m.status === "completed");
  const wonMatches = completedMatches.filter((m) => m.scoreA && m.scoreB && m.scoreA > m.scoreB).length;
  const winRate = completedMatches.length > 0 ? Math.round((wonMatches / completedMatches.length) * 100) : 0;

  const thisWeekMatches = matches.filter((m) => {
    const matchDate = toDateSafe(m.date);
    if (!matchDate) return false;
    const now = new Date();
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return matchDate >= now && matchDate <= weekFromNow;
  }).length;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-1" data-testid="text-dashboard-title">
          Dashboard
        </h1>
        <p className="text-muted-foreground">Welcome back! Here's what's happening with your esports club.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Revenue"
          value={`$${totalRevenue.toLocaleString()}`}
          icon={DollarSign}
          change="+12%"
          subtitle="From last month"
        />
        <StatCard
          title="Active Staff"
          value={activeStaffCount.toString()}
          icon={Users}
          change="+2"
          subtitle="Since last week"
        />
        <StatCard title="Win Rate" value={`${winRate}%`} icon={Trophy} change='-3%' subtitle={`Last ${completedMatches.length} matches`} />
        <StatCard
          title="Active Campaigns"
          value={activeCampaigns.length.toString()}
          icon={Megaphone}
          change="+5%"
          subtitle="Reach & engagement"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-3">
            <CardTitle className="font-semibold">Upcoming Matches</CardTitle>
            <Button variant="ghost" size="sm" data-testid="button-view-all-matches">
              View All
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcomingMatches.length > 0 ? (
              upcomingMatches.map((match) => <MatchCard key={match.id} {...match} />)
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No upcoming matches</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-3">
            <CardTitle className="font-semibold">Recent Activity</CardTitle>
            <Button variant="ghost" size="sm" data-testid="button-view-audit-log">
              View All
            </Button>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {recentActivity.length > 0 ? (
                recentActivity.map((activity) => (
                  <li key={activity.id} className="flex items-start gap-3 p-3 -m-3 rounded-lg hover:bg-muted/50">
                    <div className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">{activity.action}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {
                          (() => {
                            const d = toDateSafe(activity.timestamp);
                            return d ? formatDistanceToNow(d, { addSuffix: true }) : "Unknown time";
                          })()
                        }
                      </p>
                    </div>
                  </li>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No recent activity</p>
              )}
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
          <CardTitle className="font-semibold">Active Marketing Campaigns</CardTitle>
          <Button variant="ghost" size="sm" data-testid="button-view-all-campaigns">
            View All
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeCampaigns.length > 0 ? (
              activeCampaigns.map((campaign) => <CampaignCard key={campaign.id} {...campaign} />)
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4 col-span-full">No active campaigns</p>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="hover:bg-muted/50 cursor-pointer">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Team Performance</p>
                <p className="font-semibold">Improving</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="hover:bg-muted/50 cursor-pointer">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center">
                <Calendar className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Next Match</p>
                <p className="font-semibold">In {thisWeekMatches} days</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="hover:bg-muted/50 cursor-pointer">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                <Users className="w-6 h-6 text-yellow-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Staff Onboarding</p>
                <p className="font-semibold">3 new members</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
