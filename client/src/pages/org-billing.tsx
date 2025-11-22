import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useOrganization } from "@/contexts/OrganizationContext";
import { apiRequest } from "@/lib/queryClient";

type SubscriptionPlan = "free" | "starter" | "professional" | "enterprise";
type BillingInterval = "month" | "year";

interface PlanConfig {
  id: SubscriptionPlan;
  name: string;
  description: string;
  price: { month: number; year: number };
  features: string[];
}

interface Subscription {
  id: string;
  organizationId: string;
  plan: SubscriptionPlan;
  status: "active" | "canceled" | "past_due" | "incomplete" | "incomplete_expired" | "trialing" | "paused" | "unpaid";
  billingInterval: BillingInterval;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
}

interface Customer {
  id: string;
  email: string;
  name?: string | null;
}

interface GetSubscriptionResponse {
  success: boolean;
  subscription: Subscription | null;
  customer: Customer | null;
}

export default function OrgBillingPage() {
  const { toast } = useToast();
  const { currentOrganization, currentMembership } = useOrganization();
  const orgId = currentOrganization?.id;
  const role = (currentMembership?.role || "").toLowerCase();
  const isOwner = role === "owner";

  const { data: plansRes } = useQuery<{ success: boolean; plans: Record<SubscriptionPlan, PlanConfig> }>({
    queryKey: ["/api/subscription/plans"],
    queryFn: async () => {
      const res = await apiRequest("/api/subscription/plans", "GET");
      return res.json();
    },
  });

  const { data: subRes, isLoading: subLoading, refetch: refetchSubscription } = useQuery<GetSubscriptionResponse>({
    enabled: !!orgId,
    queryKey: ["/api/subscription", orgId],
    queryFn: async () => {
      const url = new URL("/api/subscription", window.location.origin);
      url.searchParams.set("organizationId", orgId!);
      const res = await apiRequest(url.pathname + url.search, "GET");
      return res.json();
    },
  });

  const [newPlan, setNewPlan] = useState<SubscriptionPlan | undefined>(undefined);
  const [newInterval, setNewInterval] = useState<BillingInterval | undefined>(undefined);

  const manageBilling = useMutation({
    mutationFn: async () => {
      if (!orgId) throw new Error("Organization not found");
      const res = await apiRequest("/api/subscription/checkout", "POST", {
        organizationId: orgId,
        plan: subRes?.subscription?.plan || "starter",
        billingInterval: subRes?.subscription?.billingInterval || "month",
        successUrl: `${window.location.origin}/dashboard/org/billing?success=true`,
        cancelUrl: `${window.location.origin}/dashboard/org/billing?canceled=true`,
      });
      const json = await res.json();
      if (json?.success && json?.checkoutUrl) {
        window.open(json.checkoutUrl, "_blank");
      } else {
        throw new Error(json?.error || "Failed to create billing session");
      }
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Error", description: error?.message || "Failed to open billing" });
    },
  });

  const updatePlan = useMutation({
    mutationFn: async () => {
      if (!orgId) throw new Error("Organization not found");
      if (!newPlan && !newInterval) throw new Error("Select a plan or interval to update");
      const res = await apiRequest("/api/subscription", "PATCH", {
        organizationId: orgId,
        plan: newPlan,
        billingInterval: newInterval,
      });
      const json = await res.json();
      if (!json?.success) throw new Error(json?.error || "Failed to update subscription");
      return json;
    },
    onSuccess: () => {
      toast({ title: "Updated", description: "Subscription updated" });
      refetchSubscription();
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Error", description: error?.message || "Failed to update plan" });
    },
  });

  if (!isOwner) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Access restricted</CardTitle>
            <CardDescription>Only organization owners can access billing.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const currentPlan = subRes?.subscription?.plan || "free";
  const currentInterval = subRes?.subscription?.billingInterval || "month";
  const currentStatus = subRes?.subscription?.status || "inactive";

  const planEntries = plansRes?.plans ? Object.entries(plansRes.plans) : [];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Subscription & Billing</h1>
        <p className="text-muted-foreground">Manage your plan, billing, and invoices for this organization</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Current Plan</CardTitle>
            <CardDescription>Your active subscription details</CardDescription>
          </CardHeader>
          <CardContent>
            {subLoading ? (
              <div className="text-sm text-muted-foreground">Loading subscription...</div>
            ) : (
              <div className="space-y-2">
                <div className="font-medium capitalize">Plan: {currentPlan}</div>
                <div className="text-sm text-muted-foreground">Billing Interval: {currentInterval}</div>
                <div className="text-sm text-muted-foreground">Status: {currentStatus}</div>
                <Button className="mt-3" onClick={() => manageBilling.mutate()} disabled={manageBilling.isPending}>
                  {manageBilling.isPending ? "Opening..." : "Manage Billing"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Change Plan</CardTitle>
            <CardDescription>Upgrade or downgrade your subscription</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">Plan</label>
                <Select value={newPlan} onValueChange={(v) => setNewPlan(v as SubscriptionPlan)}>
                  <SelectTrigger className="w-[220px]">
                    <SelectValue placeholder="Select a plan" />
                  </SelectTrigger>
                  <SelectContent>
                    {planEntries.map(([key, cfg]) => (
                      <SelectItem key={key} value={key}>{cfg.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Billing Interval</label>
                <Select value={newInterval} onValueChange={(v) => setNewInterval(v as BillingInterval)}>
                  <SelectTrigger className="w-[220px]">
                    <SelectValue placeholder="Select interval" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="month">Monthly</SelectItem>
                    <SelectItem value="year">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={() => updatePlan.mutate()} disabled={updatePlan.isPending}>
                {updatePlan.isPending ? "Updating..." : "Update Subscription"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Invoices</CardTitle>
          <CardDescription>Recent invoices and receipts</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Receipt</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Placeholder until invoices endpoint is available */}
              <TableRow className="odd:bg-muted/30 hover:bg-muted/50">
                <TableCell colSpan={4} className="py-3 text-muted-foreground">No invoices yet.</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}