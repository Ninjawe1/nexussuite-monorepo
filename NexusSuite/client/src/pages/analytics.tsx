import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardLineChart, DashboardBarChart } from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trophy, Target, TrendingUp, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";

export default function Analytics() {
  const [selectedRoster, setSelectedRoster] = useState("valorant");
  const { toast } = useToast();

  const rosters = [
    { id: "valorant", name: "Valorant", game: "Valorant" },
    { id: "league", name: "League of Legends", game: "LoL" },
    { id: "pubg", name: "PUBG Mobile", game: "PUBG" },
    { id: "csgo", name: "Counter-Strike", game: "CS:GO" },
  ];

  const analyticsData = {
    valorant: {
      winRate: 68,
      totalMatches: 45,
      wins: 31,
      losses: 14,
      avgPlacement: 2.3,
      topPlayers: [
        { name: "Alex Rivera", kd: 1.42, avg: 245 },
        { name: "Sarah Kim", kd: 1.28, avg: 218 },
        { name: "Mike Torres", kd: 1.15, avg: 197 },
      ],
    },
  };

  const mockMetrics = analyticsData.valorant;

  // Mock time series data for charts (fallback if backend disabled)
  const performanceTrend = [
    { month: "Jan", winRate: 52 },
    { month: "Feb", winRate: 58 },
    { month: "Mar", winRate: 61 },
    { month: "Apr", winRate: 63 },
    { month: "May", winRate: 66 },
    { month: "Jun", winRate: 68 },
  ];

  const matchResults = [
    { month: "Jan", wins: 5, losses: 3 },
    { month: "Feb", wins: 6, losses: 2 },
    { month: "Mar", wins: 7, losses: 4 },
    { month: "Apr", wins: 8, losses: 3 },
    { month: "May", wins: 9, losses: 2 },
    { month: "Jun", wins: 10, losses: 4 },
  ];

  // Try to load live analytics with graceful fallback
  const {
    data: liveAnalytics,
    error: analyticsError,
  } = useQuery({
    queryKey: ["/api/analytics", selectedRoster],
    queryFn: async () => {
      // Pass roster identifier if supported by backend for filtering
      const res = await apiRequest(`/api/analytics?roster=${selectedRoster}`);
      return res as any;
    },
    // Always attempt; fallback will handle errors
    staleTime: 60_000,
  });

  // DEV-only feedback when falling back
  useEffect(() => {
    if (import.meta.env.DEV) {
      if (analyticsError) {
        const err = analyticsError as Error;
        const msg = isUnauthorizedError(err)
          ? "Unauthorized or offline; using mock analytics data."
          : "Analytics endpoint unavailable; using mock analytics data.";
        toast({ title: "Analytics fallback", description: msg });
        console.warn("Analytics fallback:", err?.message);
      }
    }
  }, [analyticsError, toast]);

  // Map live data when available; otherwise use mock
  const metrics = {
    winRate: liveAnalytics?.winRate ?? mockMetrics.winRate,
    totalMatches: liveAnalytics?.totalMatches ?? mockMetrics.totalMatches,
    wins: liveAnalytics?.wins ?? mockMetrics.wins,
    losses: liveAnalytics?.losses ?? mockMetrics.losses,
    avgPlacement: liveAnalytics?.avgPlacement ?? mockMetrics.avgPlacement,
    topPlayers: Array.isArray(liveAnalytics?.topPlayers)
      ? liveAnalytics.topPlayers
      : mockMetrics.topPlayers,
  };

  const data = metrics;

  return (
    <div className="container mx-auto px-6 md:px-8 py-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1
            className="text-3xl font-heading font-bold mb-1"
            data-testid="text-analytics-title"
          >
            Analytics Dashboard
          </h1>
          <p className="text-muted-foreground">
            Track performance metrics across all rosters
          </p>
        </div>
        <Select value={selectedRoster} onValueChange={setSelectedRoster}>
          <SelectTrigger className="w-64" data-testid="select-roster">
            <SelectValue placeholder="Select roster" />
          </SelectTrigger>
          <SelectContent>
            {rosters.map((roster) => (
              <SelectItem key={roster.id} value={roster.id}>
                {roster.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Win Rate
            </CardTitle>
            <Trophy className="h-4 w-4 text-chart-2" />
          </CardHeader>
          <CardContent>
            <div
              className="text-3xl font-bold font-mono text-chart-2"
              data-testid="stat-win-rate"
            >
              {data.winRate}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {data.wins}W - {data.losses}L
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Matches
            </CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-mono">
              {data.totalMatches}
            </div>
            <p className="text-xs text-muted-foreground mt-1">This season</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg Placement
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-chart-3" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-mono text-chart-3">
              {data.avgPlacement}
            </div>
            <p className="text-xs text-muted-foreground mt-1">In tournaments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Roster Size
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-mono">
              {data.topPlayers.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Active players</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-heading">
              Performance Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DashboardLineChart
              data={(liveAnalytics?.trend as any[]) || performanceTrend}
              xKey="month"
              series={[{ key: "winRate", label: "Win Rate (%)" }]}
              height={256}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-heading">
              Match Results by Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DashboardBarChart
              data={(liveAnalytics?.results as any[]) || matchResults}
              xKey="month"
              series={[
                { key: "wins", label: "Wins" },
                { key: "losses", label: "Losses" },
              ]}
              height={256}
            />
          </CardContent>
        </Card>
      </div>

      {/* Top performers list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-heading">Top Performers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.topPlayers.map((player, idx) => (
              <div
                key={player.name}
                className="flex items-center justify-between p-3 rounded-lg bg-card hover-elevate"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
                    {idx + 1}
                  </div>
                  <div>
                    <p className="font-semibold">{player.name}</p>
                    <p className="text-xs text-muted-foreground">K/D: {player.kd}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-mono font-semibold">{player.avg}</p>
                  <p className="text-xs text-muted-foreground">Avg ACS</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
