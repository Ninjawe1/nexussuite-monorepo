import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Download, DollarSign, TrendingUp, TrendingDown } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function Payroll() {
  const payrollEntries = [
    { id: "1", name: "Sarah Johnson", role: "Manager", amount: 8500, type: "Monthly", status: "paid", date: "Oct 1, 2024" },
    { id: "2", name: "Mike Chen", role: "Analyst", amount: 6500, type: "Monthly", status: "paid", date: "Oct 1, 2024" },
    { id: "3", name: "Alex Rivera", role: "Player", amount: 12000, type: "Monthly", status: "pending", date: "Oct 15, 2024" },
    { id: "4", name: "Emma Wilson", role: "Staff", amount: 5500, type: "Monthly", status: "paid", date: "Oct 1, 2024" },
    { id: "5", name: "James Park", role: "Player", amount: 10000, type: "Monthly", status: "paid", date: "Oct 1, 2024" },
    { id: "6", name: "Lisa Martinez", role: "Admin", amount: 9500, type: "Monthly", status: "paid", date: "Oct 1, 2024" },
    { id: "7", name: "Tournament Bonus", role: "Team", amount: 50000, type: "One-time", status: "pending", date: "Oct 20, 2024" },
  ];

  const totalSalaries = payrollEntries.reduce((sum, entry) => sum + entry.amount, 0);
  const paidAmount = payrollEntries.filter(e => e.status === 'paid').reduce((sum, e) => sum + e.amount, 0);
  const pendingAmount = payrollEntries.filter(e => e.status === 'pending').reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold mb-1" data-testid="text-payroll-title">
            Payroll & Finance
          </h1>
          <p className="text-muted-foreground">Manage staff salaries and financial transactions</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" data-testid="button-export">
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Button data-testid="button-add-payroll">
            <Plus className="w-4 h-4 mr-2" />
            Add Payment
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Payroll</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-mono" data-testid="stat-total-payroll">
              ${totalSalaries.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">October 2024</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Paid</CardTitle>
            <TrendingUp className="h-4 w-4 text-chart-2" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-mono text-chart-2">
              ${paidAmount.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{payrollEntries.filter(e => e.status === 'paid').length} transactions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
            <TrendingDown className="h-4 w-4 text-chart-4" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-mono text-chart-4">
              ${pendingAmount.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{payrollEntries.filter(e => e.status === 'pending').length} transactions</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-heading">Payment History</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payrollEntries.map((entry) => (
                <TableRow key={entry.id} className="hover-elevate" data-testid={`row-payroll-${entry.id}`}>
                  <TableCell className="font-medium">{entry.name}</TableCell>
                  <TableCell className="text-muted-foreground">{entry.role}</TableCell>
                  <TableCell>
                    <Badge variant={entry.type === 'Monthly' ? 'secondary' : 'outline'} className="text-xs">
                      {entry.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono font-semibold">
                    ${entry.amount.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{entry.date}</TableCell>
                  <TableCell>
                    <Badge className={entry.status === 'paid' ? 'bg-chart-2 text-primary-foreground' : 'bg-chart-4 text-primary-foreground'}>
                      {entry.status.charAt(0).toUpperCase() + entry.status.slice(1)}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
