import React from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

import type {
  Staff as StaffType,
  Payroll as PayrollType,
  Contract as ContractType,
  Tournament as TournamentType,
  Match as MatchType,
  Campaign as CampaignType,
  AuditLog as AuditLogType,
} from "@shared/schema";
import { rosterService } from "@/services/rosterService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/stat-card";
import { MatchCard } from "@/components/match-card";
import { CampaignCard } from "@/components/campaign-card";
import { AuditLogEntry } from "@/components/audit-log-entry";
import {
  Users,
  Building,
  CreditCard,
  Wallet,
  Trophy,
  ClipboardList,
  TrendingUp,
} from "lucide-react";
import { DashboardLineChart } from "@/components/ui/chart";
import { toDateSafe, formatDateSafe } from "@/lib/date";


// Simple loading fallback used while auth/org context resolves
function LoadingScreen() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
        <p className="mt-4 text-muted-foreground">Loading dashboard...</p>
      </div>
    </div>
  );
}

type DashboardContentProps = {
  user: any;
  currentOrganization: any;
};

// Stable child component: contains all queries and unconditional render tree
function DashboardContent({ user, currentOrganization }: DashboardContentProps) {
  const { data: staff = [] } = useQuery<StaffType[]>({
    queryKey: ["/api/staff", currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization?.id) return [];
      const res = await apiRequest(`/api/staff?organizationId=${currentOrganization.id}`, "GET");
      return await res.json();
    },
    enabled: !!currentOrganization?.id,
  });
  const { data: payroll = [] } = useQuery<PayrollType[]>({
    queryKey: ["/api/payroll", currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization?.id) return [];
      const res = await apiRequest(`/api/payroll?organizationId=${currentOrganization.id}`, "GET");
      return await res.json();
    },
    enabled: !!currentOrganization?.id,
  });
  const { data: contracts = [] } = useQuery<ContractType[]>({
    queryKey: ["/api/contracts", currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization?.id) return [];
      const res = await apiRequest(`/api/contracts?organizationId=${currentOrganization.id}`, "GET");
      return await res.json();
    },
    enabled: !!currentOrganization?.id,
  });
  const { data: tournaments = [] } = useQuery<TournamentType[]>({
    queryKey: ["/api/tournaments", currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization?.id) return [];
      const res = await apiRequest(`/api/tournaments?organizationId=${currentOrganization.id}`, "GET");
      return await res.json();
    },
    enabled: !!currentOrganization?.id,
  });
  const { data: matches = [] } = useQuery<MatchType[]>({
    queryKey: ["/api/matches", currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization?.id) return [];
      const res = await apiRequest(`/api/matches?organizationId=${currentOrganization.id}`, "GET");
      return await res.json();
    },
    enabled: !!currentOrganization?.id,
  });
  const { data: campaigns = [] } = useQuery<CampaignType[]>({
    queryKey: ["/api/campaigns", currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization?.id) return [];
      const res = await apiRequest(`/api/campaigns?organizationId=${currentOrganization.id}`, "GET");
      return await res.json();
    },
    enabled: !!currentOrganization?.id,
  });
  const { data: rosters = [] } = useQuery({
    queryKey: ["/api/rosters", currentOrganization?.id],
    queryFn: () => rosterService.getRosters(currentOrganization?.id || ""),
    enabled: !!currentOrganization?.id,
  });
  const { data: auditLogs = [] } = useQuery<AuditLogType[]>({
    queryKey: ["/api/audit-logs", currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization?.id) return [];
      const res = await apiRequest(`/api/audit-logs?organizationId=${currentOrganization.id}`, "GET");
      return await res.json();
    },
    enabled: !!currentOrganization?.id,
  });

  // KPI calculations
  const players = staff.filter((s) => s.role.toLowerCase() === "player");
  const teamMembers = staff.length;
  const rosterCount = Array.isArray(rosters) ? rosters.length : 0;
  const tournamentsRunning = tournaments.filter(
    (t) => (t as any).status === "ongoing",
  ).length;
  const payrollTotal = payroll.reduce((sum, p) => sum + parseFloat(String(p.amount)), 0);
  const activeContracts = contracts.filter((c) => {
    const exp = toDateSafe((c as any).expirationDate);
    const isActiveStatus = (c as any).status === "active";

    return isActiveStatus && (!exp || exp.getTime() > Date.now());
  }).length;

  // Trend data (small sparkline) - use payroll dates/amounts or mock
  const trendData = payroll.length
    ? payroll
        .slice(-10)
        .map((p) => ({
          date: toDateSafe((p as any).date)?.toISOString().slice(5, 10) ?? "",
          value: parseFloat(String(p.amount)),
        }))
    : [
        { date: "01-01", value: 10 },
        { date: "01-05", value: 12 },
        { date: "01-10", value: 9 },
        { date: "01-15", value: 14 },
        { date: "01-20", value: 16 },
      ];

  const upcomingMatches = matches
    .filter((m) => (m as any).status === "upcoming")
    .slice(0, 4);
  const activeCampaigns = campaigns
    .filter((c) => (c as any).status === "active")
    .slice(0, 3);

  const recentLogs = auditLogs.slice(0, 5);

  // Live analytics (win rate) with fallback mock
  const { data: liveAnalytics } = useQuery<any>({
    queryKey: ["/api/analytics"],

    enabled: !!currentOrganization?.id,
  });
  const winRate = (liveAnalytics?.winRate as number | undefined) ?? 68;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Lightweight header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Organization-wide overview for {currentOrganization?.name || user.name || user.email}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {currentOrganization?.plan && (
            <Badge variant="secondary">Plan: {currentOrganization.plan}</Badge>
          )}
        </div>
      </div>

      {/* Top KPI row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Players" value={players.length} icon={Users} subtitle="Registered players" />
        <StatCard title="Rosters" value={rosterCount} icon={ClipboardList} subtitle="Active rosters" />
        <StatCard title="Tournaments" value={tournaments.length} icon={Trophy} subtitle="Tracked tournaments" />
        <StatCard title="Win Rate" value={`${winRate}%`} icon={Trophy} subtitle="Recent performance" valueClassName="text-chart-2" />

      </div>

      {/* Finance + Team KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard title="Team Members" value={teamMembers} icon={Users} subtitle="All staff" />
        <StatCard title="Payroll Total" value={`$${payrollTotal.toLocaleString()}`} icon={Wallet} subtitle="Latest period" />
        <StatCard title="Active Contracts" value={activeContracts} icon={CreditCard} subtitle="Valid today" />

      </div>

      {/* Small trend graph */}
      <Card>
        <CardHeader className="pb-3 flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Finance Trend (recent)
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <DashboardLineChart
            data={trendData}
            xKey="date"
            series={[{ key: "value", label: "Amount", colorToken: "hsl(var(--chart-2))" }]}

            height={160}
          />
        </CardContent>
      </Card>

      {/* Upcoming matches + Recent activity (compact) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="p-4 md:p-5">
            <CardTitle>Upcoming Matches</CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:p-5 space-y-3">
            {upcomingMatches.length === 0 ? (
              <p className="text-sm text-muted-foreground">No upcoming matches</p>
            ) : (
              upcomingMatches.map((m) => (

                <div key={m.id} className="flex items-center justify-between rounded-md border p-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {(m as any).teamA} vs {(m as any).teamB}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {formatDateSafe((m as any).date, "MMM dd, HH:mm", "—")} • {(m as any).tournament || (m as any).game}

                    </p>
                  </div>
                </div>
              ))
            )}
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={() => (window.location.href = "/matches")}>View all matches</Button>

            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 md:p-5">
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:p-5 space-y-3">
            {recentLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recent activity</p>
            ) : (
              recentLogs.slice(0, 5).map((log) => (
                <div key={log.id} className="flex items-center justify-between rounded-md border p-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {((log as any).entity || "Item")} {((log as any).action || "updated")} by {((log as any).userName || "User")}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {formatDateSafe((log as any).timestamp, "MMM dd, HH:mm", "—")}

                    </p>
                  </div>
                </div>
              ))
            )}
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={() => (window.location.href = "/audit-log")}>View all</Button>

            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active campaigns */}
      <Card>
        <CardHeader>
          <CardTitle>Active Marketing Campaigns</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          {activeCampaigns.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active campaigns</p>
          ) : (
            activeCampaigns.map((c) => (

              <CampaignCard
                key={c.id}
                id={c.id}
                title={(c as any).title}
                description={(c as any).description}
                startDate={toDateSafe((c as any).startDate) || new Date()}
                endDate={toDateSafe((c as any).endDate) || new Date()}
                platforms={(c as any).platforms as any}
                reach={(c as any).reach ?? undefined}
                engagement={parseFloat(String((c as any).engagement ?? 0))}
                status={(c as any).status as any}
              />
            ))
          )}
        </CardContent>
      </Card>

      {/* Quick access */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Button variant="outline" onClick={() => (window.location.href = "/players")}>View Players</Button>
        <Button variant="outline" onClick={() => (window.location.href = "/finance")}>View Finance</Button>
        <Button variant="outline" onClick={() => (window.location.href = "/tournaments")}>Manage Tournaments</Button>
        <Button variant="outline" onClick={() => (window.location.href = "/rosters")}>Manage Rosters</Button>
        <Button variant="outline" onClick={() => (window.location.href = "/team")}>Team Management</Button>

      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const { currentOrganization, isLoading: orgLoading } = useOrganization();

  const canRenderDashboard = !!user && !!currentOrganization?.id;
  if (authLoading || orgLoading) return <LoadingScreen />;
  return canRenderDashboard ? (
    <DashboardContent user={user} currentOrganization={currentOrganization} />
  ) : (
    <LoadingScreen />
  );
}
