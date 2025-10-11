import { AuditLogEntry } from "@/components/audit-log-entry";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";
import { useState } from "react";

export default function Audit() {
  const [filter, setFilter] = useState("all");

  const auditLogs = [
    {
      id: "1",
      user: "John Doe",
      action: "Updated staff member role",
      entity: "Staff #SA-4521",
      timestamp: new Date(Date.now() - 1000 * 60 * 15),
      oldValue: "Player",
      newValue: "Manager",
      actionType: "update" as const,
    },
    {
      id: "2",
      user: "Sarah Johnson",
      action: "Created new payroll entry",
      entity: "Payroll #PR-8833",
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
      actionType: "create" as const,
    },
    {
      id: "3",
      user: "Mike Chen",
      action: "Deleted expired contract",
      entity: "Contract #CT-2291",
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5),
      actionType: "delete" as const,
    },
    {
      id: "4",
      user: "John Doe",
      action: "Updated campaign end date",
      entity: "Campaign #CM-5512",
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24),
      oldValue: "Oct 10, 2024",
      newValue: "Oct 15, 2024",
      actionType: "update" as const,
    },
    {
      id: "5",
      user: "Lisa Martinez",
      action: "Created new match entry",
      entity: "Match #MT-9921",
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
      actionType: "create" as const,
    },
    {
      id: "6",
      user: "Sarah Johnson",
      action: "Updated match result",
      entity: "Match #MT-8811",
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3),
      oldValue: "Pending",
      newValue: "Win 2-1",
      actionType: "update" as const,
    },
  ];

  const filteredLogs = filter === "all" ? auditLogs : auditLogs.filter(log => log.actionType === filter);

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
          {filteredLogs.map((log) => (
            <AuditLogEntry key={log.id} {...log} />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
