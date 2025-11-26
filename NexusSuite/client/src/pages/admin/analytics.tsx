import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const growth = [
  { date: "2024-10-01", signups: 5 },
  { date: "2024-10-08", signups: 12 },
  { date: "2024-10-15", signups: 18 },
  { date: "2024-10-22", signups: 14 },
];

const topUsers = [
  { name: "Alice Ng", sessions: 120 },
  { name: "Bob Lee", sessions: 88 },
  { name: "Carlo M", sessions: 76 },
];

const features = [
  { feature: "Campaigns", count: 340 },
  { feature: "Analytics", count: 210 },
  { feature: "Wallet", count: 188 },
];

const revenueByPlan = [
  { plan: "Starter", amount: 0 },
  { plan: "Growth", amount: 98 },
  { plan: "Enterprise", amount: 199 },
];

const engagement = [
  { label: "Active Sessions", value: 312 },
  { label: "Avg Time", value: "11m 20s" },
  { label: "Retention 30d", value: "64%" },
];

const socialConnections = [
  { platform: "Twitter/X", count: 42 },
  { platform: "Instagram", count: 58 },
  { platform: "Twitch", count: 21 },
];

const systemPerformance = [
  { metric: "API Uptime (7d)", value: "99.97%" },
  { metric: "Avg Response", value: "180ms" },
  { metric: "Errors", value: "0.12%" },

];

export default function AdminAnalyticsPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Analytics & Insights</h1>
        <p className="text-muted-foreground">
          Growth, engagement, and performance at a glance
        </p>

      </div>

      <Card>
        <CardHeader>
          <CardTitle>User Growth</CardTitle>
          <CardDescription>Weekly signups (demo data)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {growth.map((g) => (

              <div key={g.date} className="border border-border rounded-lg p-4">
                <div className="text-xs text-muted-foreground">{g.date}</div>
                <div className="text-xl font-semibold">{g.signups}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Top Active Users</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {topUsers.map((u) => (
                <li key={u.name} className="flex items-center justify-between">
                  <span>{u.name}</span>
                  <span className="text-sm text-muted-foreground">
                    {u.sessions} sessions
                  </span>

                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Feature Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {features.map((f) => (
                <li
                  key={f.feature}
                  className="flex items-center justify-between"
                >
                  <span>{f.feature}</span>
                  <span className="text-sm text-muted-foreground">
                    {f.count}
                  </span>

                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Revenue by Plan</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {revenueByPlan.map((r) => (
                <li key={r.plan} className="flex items-center justify-between">
                  <span>{r.plan}</span>
                  <span className="text-sm text-muted-foreground">
                    ${r.amount}
                  </span>

                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Engagement</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {engagement.map((e) => (
                <li key={e.label} className="flex items-center justify-between">
                  <span>{e.label}</span>
                  <span className="text-sm text-muted-foreground">
                    {e.value}
                  </span>

                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Social Connections</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {socialConnections.map((s) => (
                <li
                  key={s.platform}
                  className="flex items-center justify-between"
                >
                  <span>{s.platform}</span>
                  <span className="text-sm text-muted-foreground">
                    {s.count}
                  </span>

                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>System Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {systemPerformance.map((sp) => (
                <li
                  key={sp.metric}
                  className="flex items-center justify-between"
                >
                  <span>{sp.metric}</span>
                  <span className="text-sm text-muted-foreground">
                    {sp.value}
                  </span>

                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
