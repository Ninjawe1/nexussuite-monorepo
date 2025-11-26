import { AuditLogEntry } from "../audit-log-entry";


export default function AuditLogEntryExample() {
  return (
    <div className="flex flex-col gap-3 p-6 bg-background">
      <AuditLogEntry
        id="1"
        user="John Doe"
        action="Updated staff member role"
        entity="Staff #SA-4521"
        timestamp={new Date(Date.now() - 1000 * 60 * 15)}
        oldValue="Player"
        newValue="Manager"
        actionType="update"
      />
      <AuditLogEntry
        id="2"
        user="Sarah Johnson"
        action="Created new payroll entry"
        entity="Payroll #PR-8833"
        timestamp={new Date(Date.now() - 1000 * 60 * 60 * 2)}
        actionType="create"
      />
      <AuditLogEntry
        id="3"
        user="Mike Chen"
        action="Deleted expired contract"
        entity="Contract #CT-2291"
        timestamp={new Date(Date.now() - 1000 * 60 * 60 * 5)}
        actionType="delete"
      />
    </div>
  );
}
