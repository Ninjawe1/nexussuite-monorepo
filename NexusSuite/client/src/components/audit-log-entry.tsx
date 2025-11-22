import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { toDateSafe, formatDateSafe } from "@/lib/date";

interface AuditLogEntryProps {
  id: string;
  user: string;
  action: string;
  entity: string;
  timestamp: unknown;
  oldValue?: string;
  newValue?: string;
  actionType: "create" | "update" | "delete";
}

export function AuditLogEntry({
  id,
  user,
  action,
  entity,
  timestamp,
  oldValue,
  newValue,
  actionType,
}: AuditLogEntryProps) {
  const actionColors = {
    create: "bg-chart-2 text-primary-foreground",
    update: "bg-chart-4 text-primary-foreground",
    delete: "bg-chart-5 text-primary-foreground",
  };

  const initials = user
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  return (
    <div
      className="flex gap-4 p-4 rounded-lg border border-border hover-elevate"
      data-testid={`log-entry-${id}`}
    >
      <Avatar className="w-8 h-8 shrink-0">
        <AvatarFallback className="bg-primary text-primary-foreground text-xs">
          {initials}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm">{user}</span>
            <Badge className={`${actionColors[actionType]} text-xs`}>
              {actionType.charAt(0).toUpperCase() + actionType.slice(1)}
            </Badge>
          </div>
          <span className="text-xs text-muted-foreground shrink-0">
            {(() => {
              const d = toDateSafe(timestamp);
              const absolute = formatDateSafe(
                timestamp,
                "MMM dd, yyyy HH:mm",
                "—",
              );
              const relative = d
                ? formatDistanceToNow(d, { addSuffix: true })
                : "Unknown time";
              return `${absolute} • ${relative}`;
            })()}
          </span>
        </div>
        <p className="text-sm mb-2">{action}</p>
        <p className="text-xs text-muted-foreground mb-2">
          Entity: <span className="font-mono">{entity}</span>
        </p>
        {oldValue && newValue && (
          <div className="grid grid-cols-2 gap-3 mt-2 p-3 rounded-md bg-card text-xs">
            <div>
              <p className="text-muted-foreground mb-1">Old Value:</p>
              <p className="font-mono text-chart-5">{oldValue}</p>
            </div>
            <div>
              <p className="text-muted-foreground mb-1">New Value:</p>
              <p className="font-mono text-chart-2">{newValue}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
