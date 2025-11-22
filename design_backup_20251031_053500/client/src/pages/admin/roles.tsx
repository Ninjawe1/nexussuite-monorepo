import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

const demoSubAdmins = [
  { id: "sa1", name: "Finance Admin", user: "alice@example.com" },
  { id: "sa2", name: "Support Admin", user: "bob@example.com" },
];

export default function AdminRolesPage() {
  const { toast } = useToast();
  const [role, setRole] = useState("finance");

  const create = () => toast({ title: "Sub-admin", description: `Created ${role} (demo)` });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Team & Role Management</h1>
        <p className="text-muted-foreground">Create roles and track activity</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create Sub-admin</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger className="w-56"><SelectValue placeholder="Role" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="finance">Finance Admin</SelectItem>
                <SelectItem value="support">Support Admin</SelectItem>
                <SelectItem value="content">Content Admin</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={create}>Create</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Activity Log</CardTitle>
          <CardDescription>Who changed what (demo)</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {["Support Admin updated email template", "Finance Admin refunded invoice inv_002"].map((l, idx) => (
              <li key={idx} className="p-2 border rounded-lg text-sm">{l}</li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}