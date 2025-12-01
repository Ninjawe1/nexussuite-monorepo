import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  change?: string;
  subtitle?: string;
  valueClassName?: string;
}

export function StatCard({
  title,
  value,
  icon: Icon,
  change,
  subtitle,
  valueClassName,
}: StatCardProps) {
  return (
    <Card className="rounded-2xl border border-card-border/80 bg-card shadow-sm hover:bg-muted/40 transition-colors">
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className="flex items-center gap-2">
          {change && (
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full border ${change.startsWith('+') ? 'border-green-600/30 text-green-500' : 'border-red-600/30 text-red-500'}`}
              aria-label="trend-change"
            >
              {change}
            </span>
          )}
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent>
        <div
          className={`text-2xl font-bold ${valueClassName ?? ''}`}
          data-testid={`stat-${title.toLowerCase().replace(/\s+/g, '-')}`}
        >
          {value}
        </div>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}
