import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function AdminReportsPage() {
  const { toast } = useToast();
  const [period, setPeriod] = useState("monthly");

  const generate = (format: "pdf" | "csv") => {
    toast({
      title: "Report",

      description: `Generated ${period} report as ${format.toUpperCase()} (demo)`,
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Reports & Exporting</h1>
        <p className="text-muted-foreground">
          Revenue, signups, uptime, feature usage
        </p>

      </div>

      <Card>
        <CardHeader>
          <CardTitle>Generate Reports</CardTitle>
          <CardDescription>Choose period and format</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => generate("pdf")}>Export PDF</Button>
            <Button variant="outline" onClick={() => generate("csv")}>

              Export CSV
            </Button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            <Metric label="Revenue" value="$297" />
            <Metric label="Signups" value="49" />
            <Metric label="Uptime" value="99.97%" />
            <Metric label="Feature Usage" value="Campaigns 340" />
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
