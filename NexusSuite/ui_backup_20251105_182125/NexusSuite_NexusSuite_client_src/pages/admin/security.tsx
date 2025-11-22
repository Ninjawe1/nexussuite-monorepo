import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function AdminSecurityPage() {
  const { toast } = useToast();
  const [twoFA, setTwoFA] = useState(true);

  const save = () => toast({ title: "Security", description: "Settings saved (demo)" });

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
          <div className="mt-3"><Button onClick={save}>Save</Button></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Login Attempts</CardTitle>
          <CardDescription>Failed / successful (demo)</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {["alice@example.com failed", "bob@example.com success"].map((l, idx) => (
              <li key={idx} className="p-2 border rounded-lg text-sm">{l}</li>
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
            {["Delete data for user carlo@example.com"].map((l, idx) => (
              <li key={idx} className="p-2 border rounded-lg text-sm">{l}</li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

