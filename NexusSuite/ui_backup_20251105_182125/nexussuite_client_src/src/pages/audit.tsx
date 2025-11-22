import { AuditLogEntry } from "@/components/audit-log-entry";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { AuditLog } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";

export default function Audit() {
  const [filter, setFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: auditLogs = [], isLoading } = useQuery<AuditLog[]>({
    queryKey: ["/api/audit-logs"],
  });

  const filteredLogs = auditLogs.filter(log => {
    const matchesFilter = filter === "all" || log.actionType === filter;
    const matchesSearch = !searchQuery || 
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.entity.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-heading font-bold mb-1" data-testid="text-audit-title">
          Audit Log
        </h1>
        <p className="text-muted-foreground">Complete history of all system actions and changes</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search audit logs..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            data-testid="input-search-audit"
          />
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-full sm:w-48" data-testid="select-action-filter">
            <SelectValue placeholder="Filter by action" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            <SelectItem value="create">Create</SelectItem>
            <SelectItem value="update">Update</SelectItem>
            <SelectItem value="delete">Delete</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-heading">Activity History</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery || filter !== "all" 
                ? "No audit logs match your filters." 
                : "No audit logs yet. Actions will be tracked here."}
            </div>
          ) : (
            filteredLogs.map((log) => (
              <AuditLogEntry
                key={log.id}
                user={log.userName}
                action={log.action}
                entity={log.entity}
                timestamp={log.timestamp ?? (log as any).createdAt}
                oldValue={log.oldValue || undefined}
                newValue={log.newValue || undefined}
                actionType={log.actionType as "create" | "update" | "delete"}
              />
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

