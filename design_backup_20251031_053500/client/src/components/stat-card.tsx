import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: number;
  trendLabel?: string;
  subtitle?: string;
}

export function StatCard({ title, value, icon: Icon, trend, trendLabel, subtitle }: StatCardProps) {
  const isPositive = trend !== undefined && trend > 0;
  const isNegative = trend !== undefined && trend < 0;

  return (
    <Card className="hover-elevate">
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
        <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold font-heading" data-testid={`stat-${title.toLowerCase().replace(/\s+/g, '-')}`}>
          {value}
        </div>
        {trend !== undefined && (
          <div className="flex items-center gap-1 mt-1">
            {isPositive && <TrendingUp className="h-3 w-3 text-chart-2" />}
            {isNegative && <TrendingDown className="h-3 w-3 text-chart-5" />}
            <span className={`text-xs font-medium ${isPositive ? 'text-chart-2' : isNegative ? 'text-chart-5' : 'text-muted-foreground'}`}>
              {trend > 0 ? '+' : ''}{trend}%
            </span>
            {trendLabel && <span className="text-xs text-muted-foreground">{trendLabel}</span>}
          </div>
        )}
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}
