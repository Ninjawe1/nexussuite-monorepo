import { ContractRow } from "@/components/contract-row";
import { ContractDialog } from "@/components/contract-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, FileText, AlertTriangle, CheckCircle, Edit, Trash2, MoreHorizontal } from "lucide-react";
import { useState } from "react";
import { differenceInDays } from "date-fns";
import { toDateSafe } from "@/lib/date";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { Contract as ContractType } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Contracts() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState<ContractType | undefined>();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: contracts = [], isLoading } = useQuery<ContractType[]>({
    queryKey: ["/api/contracts"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(`/api/contracts/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contracts"] });
      toast({
        title: "Success",
        description: "Contract deleted successfully",
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
        description: error.message || "Failed to delete contract",
        variant: "destructive",
      });
    },
  });

  // Derive stats based on expiration dates, not just the manual status field
  const now = new Date();
  const getDaysUntil = (c: ContractType) => {
    const d = toDateSafe(c.expirationDate);
    return d ? differenceInDays(d, now) : null;
  };

  // Currently valid = not expired (includes those expiring soon)
  const activeContracts = contracts.filter((c) => {
    const days = getDaysUntil(c);
    return days !== null && days > 0; // future date
  }).length;

  // Expiring soon = within next 30 days OR explicitly marked as expiring
  const expiringContracts = contracts.filter((c) => {
    const days = getDaysUntil(c);
    const within30 = days !== null && days > 0 && days <= 30;
    return within30 || c.status === "expiring";
  }).length;

  // Expired = past date OR explicitly marked as expired
  const expiredContracts = contracts.filter((c) => {
    const days = getDaysUntil(c);
    const isPast = days !== null && days <= 0;
    return isPast || c.status === "expired";
  }).length;

  const handleEdit = (contract: ContractType) => {
    setSelectedContract(contract);
    setDialogOpen(true);
  };

  const handleAdd = () => {
    setSelectedContract(undefined);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this contract?")) {
      await deleteMutation.mutateAsync(id);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold mb-1" data-testid="text-contracts-title">
            Contracts Management
          </h1>
          <p className="text-muted-foreground">Manage player, staff, and sponsor contracts</p>
        </div>
        <Button onClick={handleAdd} data-testid="button-upload-contract">
          <Upload className="w-4 h-4 mr-2" />
          Upload Contract
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Contracts</CardTitle>
            <CheckCircle className="h-4 w-4 text-chart-2" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-10 w-16" />
            ) : (
              <>
                <div className="text-3xl font-bold font-mono text-chart-2" data-testid="stat-active-contracts">
                  {activeContracts}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Currently valid</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Expiring Soon</CardTitle>
            <AlertTriangle className="h-4 w-4 text-chart-4" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-10 w-16" />
            ) : (
              <>
                <div className="text-3xl font-bold font-mono text-chart-4">
                  {expiringContracts}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Within 30 days</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Expired</CardTitle>
            <FileText className="h-4 w-4 text-chart-5" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-10 w-16" />
            ) : (
              <>
                <div className="text-3xl font-bold font-mono text-chart-5">
                  {expiredContracts}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Needs renewal</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-heading">All Contracts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : contracts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No contracts yet. Upload your first contract to get started.
            </div>
          ) : (
            contracts.map((contract) => (
              <div key={contract.id} className="flex items-center gap-3 group">
                <div className="flex-1">
                  <ContractRow
                    {...contract}
                    expirationDate={contract.expirationDate}
                  />
                </div>
                {/* actions menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity" data-testid={`button-menu-contract-${contract.id}`}>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleEdit(contract)} data-testid={`button-edit-contract-${contract.id}`}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleDelete(contract.id)}
                      className="text-destructive"
                      data-testid={`button-delete-contract-${contract.id}`}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <ContractDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        contract={selectedContract}
      />
    </div>
  );
}
