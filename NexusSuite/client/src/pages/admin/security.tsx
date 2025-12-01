import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

export default function AdminSecurityPage() {
  const { toast } = useToast();
  const [twoFA, setTwoFA] = useState(true);
  const [deliveryMethod, setDeliveryMethod] = useState('email');
  const [target, setTarget] = useState('');
  const [code, setCode] = useState('');

  const save = () => toast({ title: 'Security', description: 'Settings saved (demo)' });

  const generateMfa = async () => {
    try {
      const res = await fetch('/api/admin/mfa/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        cache: 'no-store',

        body: JSON.stringify({ deliveryMethod, target }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || 'Failed to generate MFA');
      }
      toast({ title: 'MFA', description: 'Code sent' });
    } catch (e: any) {
      toast({ title: 'MFA', description: e?.message || 'Generate failed', variant: 'destructive' });
    }
  };

  const verifyMfa = async () => {
    try {
      const res = await fetch('/api/admin/mfa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        cache: 'no-store',

        body: JSON.stringify({ code }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || 'Failed to verify MFA');
      }
      toast({ title: 'MFA', description: 'Verified' });
    } catch (e: any) {
      toast({ title: 'MFA', description: e?.message || 'Verify failed', variant: 'destructive' });
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Security & Compliance</h1>
        <p className="text-muted-foreground">2FA, login attempts, and audit trails</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Two-factor Authentication</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <span>Require 2FA for admins</span>
            <Switch checked={twoFA} onCheckedChange={setTwoFA} />
          </div>
          <div className="mt-3">
            <Button onClick={save}>Save</Button>
          </div>
          <div className="mt-6 grid gap-3">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Delivery</label>
              <div className="flex gap-2">
                <Button
                  variant={deliveryMethod === 'email' ? 'default' : 'outline'}
                  onClick={() => setDeliveryMethod('email')}
                >
                  Email
                </Button>
                <Button
                  variant={deliveryMethod === 'sms' ? 'default' : 'outline'}
                  onClick={() => setDeliveryMethod('sms')}
                >
                  SMS
                </Button>
              </div>
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Target</label>
              <Input
                value={target}
                onChange={e => setTarget(e.target.value)}
                placeholder={deliveryMethod === 'email' ? 'email' : 'phone'}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={generateMfa} disabled={!target.trim()}>
                Send Code
              </Button>
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Code</label>
              <Input
                value={code}
                onChange={e => setCode(e.target.value)}
                placeholder="Enter code"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={verifyMfa} disabled={!code.trim()}>
                Verify
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Login Attempts</CardTitle>
          <CardDescription>Failed / successful (demo)</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {['alice@example.com failed', 'bob@example.com success'].map((l, idx) => (
              <li key={idx} className="p-2 border border-border rounded-lg text-sm">
                {l}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>GDPR Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {['Delete data for user carlo@example.com'].map((l, idx) => (
              <li key={idx} className="p-2 border border-border rounded-lg text-sm">
                {l}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
