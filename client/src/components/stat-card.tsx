import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  change?: string;
  subtitle?: string;
}

export function StatCard({ title, value, icon: Icon, change, subtitle }: StatCardProps) {
  return (
    <Card className="hover:bg-muted/50">
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold" data-testid={`stat-${title.toLowerCase().replace(/\s+/g, '-')}`}>
          {value}
        </div>
        <p className="text-xs text-muted-foreground">
          {change && <span className={`mr-1 ${change.startsWith("+") ? "text-green-600" : "text-red-600"}`}>{change}</span>}
          {subtitle}
        </p>
      </CardContent>
    </Card>
  );
}
