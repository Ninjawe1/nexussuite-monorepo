import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trophy, Target, TrendingUp, Users } from "lucide-react";
import { useState } from "react";

export default function Analytics() {
  const [selectedRoster, setSelectedRoster] = useState("valorant");

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

  const data = analyticsData.valorant;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold mb-1" data-testid="text-analytics-title">
            Analytics Dashboard
          </h1>
          <p className="text-muted-foreground">Track performance metrics across all rosters</p>
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
            <CardTitle className="text-sm font-medium text-muted-foreground">Win Rate</CardTitle>
            <Trophy className="h-4 w-4 text-chart-2" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-mono text-chart-2" data-testid="stat-win-rate">
              {data.winRate}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">{data.wins}W - {data.losses}L</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Matches</CardTitle>
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
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Placement</CardTitle>
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
            <CardTitle className="text-sm font-medium text-muted-foreground">Roster Size</CardTitle>
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
            <CardTitle className="text-lg font-heading">Performance Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center bg-card rounded-lg">
              <div className="text-center">
                <TrendingUp className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">
                  Interactive charts will be displayed here
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Showing win/loss trends over time
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-heading">Top Performers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.topPlayers.map((player, idx) => (
                <div key={player.name} className="flex items-center justify-between p-3 rounded-lg bg-card hover-elevate">
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
    </div>
  );
}

