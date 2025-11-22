import { StatCard } from "../stat-card";
import { DollarSign, Users, Trophy, Megaphone } from "lucide-react";

export default function StatCardExample() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 p-6 bg-background">
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
  );
}
