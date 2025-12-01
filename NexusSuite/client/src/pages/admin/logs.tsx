import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const demoLogs = [
  {
    id: 1,
    type: 'API',
    message: 'GET /api/clubs 200 OK',
    ts: '2024-10-22 10:01:22',
  },
  {
    id: 2,
    type: 'Auth',
    message: 'Login success alice@example.com',
    ts: '2024-10-22 10:15:03',
  },
  {
    id: 3,
    type: 'Error',
    message: 'Stripe webhook retry',
    ts: '2024-10-22 11:02:44',
  },
];

export default function AdminLogsPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Access & Activity Logs</h1>
        <p className="text-muted-foreground">Recent events and actions (demo)</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Logs</CardTitle>
          <CardDescription>Last 100 events</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {demoLogs.map(l => (
              <li
                key={l.id}
                className="flex items-center justify-between p-3 border border-border rounded-lg"
              >
                <span className="text-sm">
                  [{l.type}] {l.message}
                </span>
                <span className="text-xs text-muted-foreground">{l.ts}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
