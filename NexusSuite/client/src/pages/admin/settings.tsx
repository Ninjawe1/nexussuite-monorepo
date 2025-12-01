import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

export default function AdminSettingsPage() {
  const { toast } = useToast();
  const [maintenance, setMaintenance] = useState(false);
  const [maintenanceMsg, setMaintenanceMsg] = useState("We'll be back soon.");
  const [apiKeyFirebase, setApiKeyFirebase] = useState('demo-firebase-key');
  const [apiKeyGoogle, setApiKeyGoogle] = useState('demo-google-key');

  const save = () => toast({ title: 'Settings', description: 'Saved (demo)' });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">App Control & Settings</h1>
        <p className="text-muted-foreground">Toggle features and manage integrations</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Features</CardTitle>
          <CardDescription>Enable or disable app features</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span>Maintenance Mode</span>
              <Switch checked={maintenance} onCheckedChange={setMaintenance} />
            </div>
            <Input value={maintenanceMsg} onChange={e => setMaintenanceMsg(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Integrations</CardTitle>
          <CardDescription>API keys and external services</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Input value={apiKeyFirebase} onChange={e => setApiKeyFirebase(e.target.value)} />
            <Input value={apiKeyGoogle} onChange={e => setApiKeyGoogle(e.target.value)} />

            <Button onClick={save}>Save</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>System Health</CardTitle>
          <CardDescription>Database status & uptime (demo)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Metric label="DB" value="OK" />
            <Metric label="Uptime (24h)" value="99.98%" />
            <Metric label="API Latency" value="180ms" />
            <Metric label="Queue" value="Normal" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-border rounded-lg p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-xl font-semibold">{value}</div>
    </div>
  );
}
