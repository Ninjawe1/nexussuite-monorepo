import { StatCard } from "../stat-card";
import { DollarSign, Users, Trophy, Megaphone } from "lucide-react";


export default function StatCardExample() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 p-6 bg-background">
      <StatCard
        title="Total Revenue"
        value="$142,500"
        icon={DollarSign}
        change="+12.5% vs last month"
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
        change="+5.2% this season"
      />

      <StatCard
        title="Active Campaigns"
        value="12"
        icon={Megaphone}
        change="-2.1% vs last month"
      />
    </div>
  );
}
