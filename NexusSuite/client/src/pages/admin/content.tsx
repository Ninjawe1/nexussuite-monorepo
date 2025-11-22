import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

const demoPosts = [
  { id: "p1", title: "New Feature: Campaign Analytics", status: "pending" },
  { id: "p2", title: "Tips: Growing your Club", status: "approved" },
  { id: "p3", title: "Case Study: Phoenix Esports", status: "rejected" },
];

export default function AdminContentPage() {
  const { toast } = useToast();
  const [exportFormat, setExportFormat] = useState("csv");

  const approve = (id: string) =>
    toast({ title: "Approve", description: `Approved ${id} (demo)` });
  const reject = (id: string) =>
    toast({ title: "Reject", description: `Rejected ${id} (demo)` });
  const backup = () =>
    toast({ title: "Backup", description: "Database backup created (demo)" });
  const restore = () =>
    toast({ title: "Restore", description: "Database restored (demo)" });
  const exportData = () =>
    toast({
      title: "Export",
      description: `Exported as ${exportFormat.toUpperCase()} (demo)`,
    });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Content & Data</h1>
        <p className="text-muted-foreground">
          Manage content, approvals, and data exports
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Submissions</CardTitle>
          <CardDescription>Approve or reject items</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {demoPosts.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between p-3 border border-border rounded-lg"
              >
                <div>
                  <div className="font-semibold">{p.title}</div>
                  <div className="text-xs text-muted-foreground">
                    Status: {p.status}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => approve(p.id)}
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => reject(p.id)}
                  >
                    Reject
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Data Tools</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Button onClick={backup}>Backup DB</Button>
            <Button variant="outline" onClick={restore}>
              Restore DB
            </Button>
            <Input
              className="w-40"
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value)}
            />
            <Button variant="outline" onClick={exportData}>
              Export
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Media Manager</CardTitle>
          <CardDescription>Uploaded assets (demo)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="aspect-square bg-muted rounded-lg flex items-center justify-center text-muted-foreground"
              >
                Asset {i}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
