import { PayrollDialog } from "@/components/payroll-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { formatDateSafe } from "@/lib/date";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreHorizontal,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Plus,
  Download,
  Edit,
  Trash2,
} from "lucide-react";

export default function Payroll() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPayroll, setSelectedPayroll] = useState<
    PayrollType | undefined
  >();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: payrollEntries = [], isLoading } = useQuery<PayrollType[]>({
    queryKey: ["/api/payroll"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(`/api/payroll/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payroll"] });
      toast({
        title: "Success",
        description: "Payroll entry deleted successfully",
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: error.message || "Failed to delete payroll entry",
        variant: "destructive",
      });
    },
  });

  const totalSalaries = payrollEntries.reduce(
    (sum, entry) => sum + Number(entry.amount),
    0,
  );
  const paidAmount = payrollEntries
    .filter((e) => e.status === "paid")
    .reduce((sum, e) => sum + Number(e.amount), 0);
  const pendingAmount = payrollEntries
    .filter((e) => e.status === "pending")
    .reduce((sum, e) => sum + Number(e.amount), 0);

  const handleEdit = (payroll: PayrollType) => {
    setSelectedPayroll(payroll);
    setDialogOpen(true);
  };

  const handleAdd = () => {
    setSelectedPayroll(undefined);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this payroll entry?")) {
      await deleteMutation.mutateAsync(id);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1
            className="text-3xl font-heading font-bold mb-1"
            data-testid="text-payroll-title"
          >
            Payroll & Finance
          </h1>
          <p className="text-muted-foreground">
            Manage staff salaries and financial transactions
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" data-testid="button-export">
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Button onClick={handleAdd} data-testid="button-add-payroll">
            <Plus className="w-4 h-4 mr-2" />
            Add Payment
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Payroll
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-10 w-32" />
            ) : (
              <>
                <div
                  className="text-3xl font-bold font-mono"
                  data-testid="stat-total-payroll"
                >
                  ${totalSalaries.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Total payroll
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Paid
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-chart-2" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-10 w-32" />
            ) : (
              <>
                <div className="text-3xl font-bold font-mono text-chart-2">
                  ${paidAmount.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {payrollEntries.filter((e) => e.status === "paid").length}{" "}
                  transactions
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending
            </CardTitle>
            <TrendingDown className="h-4 w-4 text-chart-4" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-10 w-32" />
            ) : (
              <>
                <div className="text-3xl font-bold font-mono text-chart-4">
                  ${pendingAmount.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {payrollEntries.filter((e) => e.status === "pending").length}{" "}
                  transactions
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-heading">
            Payment History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : payrollEntries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No payroll entries yet. Add your first payment to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payrollEntries.map((entry) => (
                  <TableRow
                    key={entry.id}
                    className="hover-elevate"
                    data-testid={`row-payroll-${entry.id}`}
                  >
                    <TableCell className="font-medium">{entry.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {entry.role}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          entry.type === "monthly" ? "secondary" : "outline"
                        }
                        className="text-xs"
                      >
                        {entry.type.charAt(0).toUpperCase() +
                          entry.type.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono font-semibold">
                      ${Number(entry.amount).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatDateSafe(entry.date, "MMM dd, yyyy")}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          entry.status === "paid"
                            ? "bg-chart-2 text-primary-foreground"
                            : "bg-chart-4 text-primary-foreground"
                        }
                      >
                        {entry.status.charAt(0).toUpperCase() +
                          entry.status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            data-testid={`button-menu-payroll-${entry.id}`}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleEdit(entry)}
                            data-testid={`button-edit-payroll-${entry.id}`}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(entry.id)}
                            className="text-destructive"
                            data-testid={`button-delete-payroll-${entry.id}`}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <PayrollDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        payroll={selectedPayroll}
      />
    </div>
  );
}
