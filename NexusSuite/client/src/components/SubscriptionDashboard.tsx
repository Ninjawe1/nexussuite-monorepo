/**
 * Subscription Dashboard Component
 * Displays current subscription status, billing information, and plan management
 */

import React, { useState, useEffect } from 'react';
import { useOrganization } from '@/contexts/OrganizationContext';

import {
  subscriptionService,
  Subscription,
  SubscriptionPlan,
  UsageMetrics,
} from '@/services/subscriptionService';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import {
  Calendar,
  TrendingUp,
  Users,
  Database,
  AlertTriangle,
  CheckCircle,
  Clock,
  Loader2,
  Package,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDateSafe } from '@/lib/date';

interface SubscriptionDashboardProps {
  className?: string;
}

export const SubscriptionDashboard: React.FC<SubscriptionDashboardProps> = ({ className = '' }) => {
  const { currentOrganization } = useOrganization();
  const { toast } = useToast();

  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [usage, setUsage] = useState<UsageMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [isReactivateDialogOpen, setIsReactivateDialogOpen] = useState(false);
  const [isPlanDialogOpen, setIsPlanDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);

  const [fallbackProductId, setFallbackProductId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  /**
   * Load subscription data
   */
  const loadSubscriptionData = async () => {
    if (!currentOrganization) return;

    setIsLoading(true);

    try {
      const sub = await subscriptionService.getSubscription(currentOrganization.id);
      setSubscription(sub);

      const usageOrNull = await subscriptionService
        .getUsageMetrics(currentOrganization.id)
        .catch(() => null);
      if (usageOrNull) setUsage(usageOrNull);

      const productIdFromSub =
        (sub as any)?.metadata?.productId || (sub as any)?.plan?.metadata?.productId;

      let plansList: any[] = [];
      try {
        plansList = await subscriptionService.getPlans(productIdFromSub || undefined);
      } catch {}
      if (!Array.isArray(plansList) || plansList.length === 0) {
        try {
          plansList = await subscriptionService.getPlans();
        } catch {}
      }
      setPlans(plansList as any);
    } catch (err) {
      console.error('Failed to load subscription data', err);
      toast({
        title: 'Failed to load billing',
        description: 'Unable to load subscription data',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // removed unused handlePlanChange (dialog is opened directly via button)

  const confirmPlanChangeImmediate = async (plan: SubscriptionPlan) => {
    if (!currentOrganization) return;
    setIsUpdating(true);
    try {
      const priceId = (plan as any)?.priceId || (plan.metadata as any)?.priceId;
      const productId = (plan.metadata as any)?.productId as string | undefined;
      if (priceId || productId) {
        const session = await subscriptionService.createCheckoutSession(
          currentOrganization.id,
          priceId ? String(priceId) : undefined,
          undefined,
          undefined,
          productId ? String(productId) : undefined,
          priceId ? undefined : 'product1'
        );
        const url = (session as any)?.url;
        if (url) {
          window.location.assign(url);
          return;
        }
      }
      toast({
        title: 'Checkout unavailable',
        description: 'Unable to initiate checkout',
        variant: 'destructive',
      });
    } catch (error) {
      console.error('Failed to change plan:', error);
      toast({
        title: 'Plan change failed',
        description: 'Unable to change your subscription plan',
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  /**
   * Confirm plan change
   */
  const confirmPlanChange = async () => {
    if (!currentOrganization) return;

    setIsUpdating(true);

    try {
      if (selectedPlan && subscription?.status === 'active') {
        await subscriptionService.updateSubscription(currentOrganization.id, selectedPlan.id);
        toast({
          title: 'Plan updated',
          description: `Successfully switched to ${selectedPlan.name} plan`,
        });
      } else {
        toast({
          title: 'Checkout disabled',
          description: 'Please contact support to purchase this plan',
        });

        return;
      }

      // Refresh data
      await loadSubscriptionData();
      setIsPlanDialogOpen(false);
      setSelectedPlan(null);
    } catch (error) {
      console.error('Failed to change plan:', error);
      toast({
        title: 'Plan change failed',
        description: 'Unable to change your subscription plan',
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  /**
   * Handle subscription cancellation
   */
  const handleCancelSubscription = async () => {
    if (!currentOrganization) return;

    setIsUpdating(true);

    try {
      await subscriptionService.cancelSubscription(
        currentOrganization.id,
        false,
        'User requested cancellation'
      );

      toast({
        title: 'Subscription canceled',
        description: 'Your subscription will end at the end of the current billing period',
      });

      await loadSubscriptionData();
      setIsCancelDialogOpen(false);
    } catch (error) {
      console.error('Failed to cancel subscription:', error);
      toast({
        title: 'Cancellation failed',
        description: 'Unable to cancel your subscription',
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  /**
   * Handle subscription reactivation
   */
  const handleReactivateSubscription = async () => {
    if (!currentOrganization) return;

    setIsUpdating(true);

    try {
      await subscriptionService.reactivateSubscription(currentOrganization.id);

      toast({
        title: 'Subscription reactivated',
        description: 'Your subscription has been successfully reactivated',
      });

      await loadSubscriptionData();
      setIsReactivateDialogOpen(false);
    } catch (error) {
      console.error('Failed to reactivate subscription:', error);
      toast({
        title: 'Reactivation failed',
        description: 'Unable to reactivate your subscription',
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  /**
   * Get status badge color
   */
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active':
        return 'default';
      case 'trialing':
        return 'secondary';
      case 'past_due':
        return 'destructive';
      case 'canceled':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  /**
   * Get status icon
   */
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'trialing':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'past_due':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'canceled':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  useEffect(() => {
    // Detect checkout_id or success/canceled flags from querystring and notify
    try {
      const params = new URLSearchParams(window.location.search);
      const checkoutId = params.get('checkout_id');
      const success = params.get('success');
      const canceled = params.get('canceled');
      if (checkoutId || success === 'true') {
        toast({
          title: 'Checkout complete',
          description: 'Your purchase was processed. Updating subscription…',
        });
      } else if (canceled === 'true') {
        toast({
          title: 'Checkout canceled',
          description: 'No changes were made to your subscription.',
        });
      }
    } catch {}
    loadSubscriptionData();
    (async () => {
      if (!currentOrganization) return;
      // If no product metadata yet, resolve starter product by slug
      try {
        const sub = await subscriptionService.getSubscription(currentOrganization.id);
        const pid = (sub as any)?.metadata?.productId || (sub as any)?.plan?.metadata?.productId;
        if (!pid) {
          const resolved = await subscriptionService.resolveProductId('product1');

          if (resolved) {
            setFallbackProductId(resolved);
            const starterPlans = await subscriptionService.getPlans(resolved);
            if (starterPlans.length) setPlans(starterPlans);
          }
        }
      } catch {}
    })();
    (async () => {
      if (!currentOrganization) return;
      try {
        const params = new URLSearchParams(window.location.search);
        const checkoutId = params.get('checkout_id');
        const success = params.get('success');
        if (checkoutId || success === 'true') {
          setIsRefreshing(true);
          let lastSub: any = null;
          for (let i = 0; i < 5; i++) {
            try {
              const sub = await subscriptionService.getSubscription(currentOrganization.id);
              lastSub = sub as any;
              setSubscription(sub);
              const hasPeriodEnd = !!String((sub as any)?.currentPeriodEnd || '').trim();
              const hasPlanData = !!(
                (sub as any)?.plan ||
                (sub as any)?.priceId ||
                (sub as any)?.planId
              );
              const needsForceStarter =
                !sub || String((sub as any)?.plan || '').toLowerCase() === 'free';
              const isLive = ['active', 'trialing', 'incomplete'].includes(
                String((sub as any)?.status || '').toLowerCase()
              );
              if (needsForceStarter && (isLive || checkoutId || success === 'true')) {
                try {
                  const updated = await subscriptionService.updateSubscription(
                    currentOrganization.id,
                    'starter',
                    'none'
                  );

                  setSubscription(updated as any);
                } catch {}
              }
              if (hasPeriodEnd && hasPlanData) break;
            } catch {}
            await new Promise(r => setTimeout(r, 1500));
          }
          try {
            const productIdFromSub =
              (lastSub as any)?.metadata?.productId || (lastSub as any)?.plan?.metadata?.productId;

            if (productIdFromSub) {
              const plansList = await subscriptionService.getPlans(productIdFromSub);
              if (Array.isArray(plansList) && plansList.length) setPlans(plansList);
            }
          } catch {}
          setIsRefreshing(false);
        }
      } catch {}
    })();
  }, [currentOrganization]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const currentPlan = (() => {
    const sub: any = subscription as any;
    if (!sub) return null as any;
    const status = String(sub?.status || '').toLowerCase();
    const isLive = status === 'active' || status === 'trialing' || status === 'incomplete';
    const isFree = String(sub?.plan || '').toLowerCase() === 'free';
    if (isLive && isFree) {
      const interval: 'month' | 'year' =
        String(sub?.billingInterval || sub?.interval || '').toLowerCase() === 'year'
          ? 'year'
          : 'month';
      let price = 0;
      if (Array.isArray(plans) && plans.length) {
        const starter = (plans as any[]).find(
          (p: any) =>
            String(p?.id || '').toLowerCase() === 'starter' ||
            String(p?.name || '')
              .toLowerCase()
              .includes('starter')
        );

        if (starter) price = Number(starter?.price || 250);
      }
      if (!price) price = 250;
      return {
        id: 'starter',
        name: 'Starter',
        description: String(sub?.plan?.description || ''),
        price,
        currency: 'USD',
        interval,
        features: [],
        limits: {},
        metadata: sub?.plan?.metadata || {},
      } as any;
    }
    const pId: string | undefined = sub?.priceId as string | undefined;
    if (pId && Array.isArray(plans) && plans.length) {
      const match = (plans as any[]).find((p: any) => {
        const top = String(p?.priceId || '').trim();
        const meta = String(p?.metadata?.priceId || '').trim();
        const idEq = String(p?.id || '').trim();

        const target = String(pId).trim();
        return top === target || meta === target || idEq === target;
      });
      if (match) return match as any;
    }
    if (sub?.plan && typeof sub?.plan !== 'string') return sub.plan as any;
    const keyRaw: string = String(
      (typeof sub?.plan === 'string' ? sub?.plan : '') || sub?.planId || sub?.plan?.id || ''
    ).trim();
    if (keyRaw) {
      const key = keyRaw.toLowerCase();
      const name = key.charAt(0).toUpperCase() + key.slice(1);
      const interval: 'month' | 'year' =
        String(sub?.billingInterval || sub?.interval || '').toLowerCase() === 'year'
          ? 'year'
          : 'month';
      let price = 0;
      if (Array.isArray(plans) && plans.length) {
        const byId = (plans as any[]).find((p: any) => String(p?.id || '').toLowerCase() === key);
        const byPrice = pId
          ? (plans as any[]).find((p: any) => {
              const top = String(p?.priceId || '').trim();
              const meta = String(p?.metadata?.priceId || '').trim();
              const idEq = String(p?.id || '').trim();
              const target = String(pId).trim();
              return top === target || meta === target || idEq === target;
            })
          : null;
        const ref = byPrice || byId;
        if (ref) price = Number(ref?.price || 0);
      }
      if (!price && key === 'starter') price = 250;
      return {
        id: key || 'starter',
        name,
        description: String(sub?.plan?.description || ''),
        price,
        currency: 'USD',
        interval,
        features: [],
        limits: {},
        metadata: sub?.plan?.metadata || {},
      } as any;
    }
    return null as any;
  })();
  const isSubscriptionActive = subscription?.status === 'active';
  const isSubscriptionCanceled = subscription?.status === 'canceled';

  const displayRenewalDate = (() => {
    const end = String(subscription?.currentPeriodEnd || '').trim();
    if (end) return formatDateSafe(end, 'MMM dd, yyyy', 'N/A');
    const status = String(subscription?.status || '').toLowerCase();
    const intervalRaw = String(
      (subscription as any)?.billingInterval || (subscription as any)?.interval || 'month'
    ).toLowerCase();
    const interval: 'month' | 'year' = intervalRaw === 'year' ? 'year' : 'month';
    const baseIso = String(
      subscription?.currentPeriodStart ||
        (subscription as any)?.updatedAt ||
        (subscription as any)?.createdAt ||
        new Date().toISOString()
    );
    const base = new Date(baseIso);
    if (!(base instanceof Date) || isNaN(base.getTime())) return 'N/A';
    const next = new Date(base);
    if (interval === 'year') {
      next.setFullYear(next.getFullYear() + 1);
    } else {
      next.setMonth(next.getMonth() + 1);
    }
    if (status === 'active' || status === 'trialing' || status === 'incomplete') {
      return formatDateSafe(next.toISOString(), 'MMM dd, yyyy', 'N/A');
    }
    return 'N/A';
  })();

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Current Subscription Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Current Subscription
              </CardTitle>
              <CardDescription>Manage your organization's subscription and billing</CardDescription>
            </div>

            {subscription && (
              <Badge
                variant={getStatusBadgeVariant(subscription.status)}
                className="flex items-center gap-1"
              >
                {getStatusIcon(subscription.status)}
                {subscription.status}
              </Badge>
            )}
            <Button
              variant="outline"
              onClick={async () => {
                if (!currentOrganization?.id) return;
                const url = await subscriptionService.getPortalUrl(currentOrganization.id);
                if (url) window.open(url, '_blank');
              }}
            >
              Open Billing Portal
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {subscription ? (
            <div className="space-y-4">
              {/* Plan Details */}
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                {isRefreshing ? (
                  <div className="w-full flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <Skeleton className="h-5 w-40 mb-2" />
                      <Skeleton className="h-4 w-64" />
                    </div>
                    <div className="text-right">
                      <Skeleton className="h-7 w-28" />
                    </div>
                  </div>
                ) : (
                  <>
                    <div>
                      <h3 className="font-semibold">{currentPlan?.name || 'Unknown Plan'}</h3>
                      <p className="text-sm text-muted-foreground">
                        {currentPlan?.description || 'No description available'}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold">
                        ${currentPlan?.price || 0}
                        <span className="text-sm font-normal text-muted-foreground">
                          /{currentPlan?.interval || 'month'}
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Billing Period */}
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                {isRefreshing ? (
                  <Skeleton className="h-4 w-40" />
                ) : (
                  <span>
                    {isSubscriptionCanceled ? 'Ended' : 'Renews'} on {displayRenewalDate}
                  </span>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-4">
                {isSubscriptionActive && (
                  <Button
                    variant="outline"
                    onClick={() => setIsCancelDialogOpen(true)}
                    disabled={isUpdating}
                    className="text-destructive hover:text-destructive"
                  >
                    Cancel Subscription
                  </Button>
                )}

                {isSubscriptionCanceled && (
                  <Button
                    variant="default"
                    onClick={() => setIsReactivateDialogOpen(true)}
                    disabled={isUpdating}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Reactivate
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Active Subscription</h3>
              <p className="text-muted-foreground mb-4">
                Your organization doesn't have an active subscription. Choose a plan to get started.
              </p>
              <Button onClick={() => setIsPlanDialogOpen(true)}>Choose a Plan</Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Usage Metrics */}
      {usage && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Usage This Period
            </CardTitle>
            <CardDescription>Monitor your organization's resource usage</CardDescription>
          </CardHeader>

          <CardContent>
            <div className="space-y-6">
              {/* API Calls */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <Database className="h-4 w-4" />
                    API Calls
                  </span>
                  <span className="font-medium">
                    {usage.currentUsage.apiCalls.toLocaleString()} /{' '}
                    {usage.limits.apiCalls.toLocaleString()}
                  </span>
                </div>
                <Progress value={usage.percentageUsed.apiCalls} className="h-2" />

                <div className="text-xs text-muted-foreground">
                  {usage.percentageUsed.apiCalls.toFixed(1)}% used
                </div>
              </div>

              {/* Storage */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <Database className="h-4 w-4" />
                    Storage
                  </span>
                  <span className="font-medium">
                    {(usage.currentUsage.storage / 1024).toFixed(1)} GB /{' '}
                    {(usage.limits.storage / 1024).toFixed(1)} GB
                  </span>
                </div>
                <Progress value={usage.percentageUsed.storage} className="h-2" />

                <div className="text-xs text-muted-foreground">
                  {usage.percentageUsed.storage.toFixed(1)}% used
                </div>
              </div>

              {/* Users */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Team Members
                  </span>
                  <span className="font-medium">
                    {usage.currentUsage.users} / {usage.limits.users}
                  </span>
                </div>
                <Progress value={usage.percentageUsed.users} className="h-2" />
                <div className="text-xs text-muted-foreground">
                  {usage.percentageUsed.users.toFixed(1)}% used
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Plans Inline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Available Plans
          </CardTitle>
          <CardDescription>Upgrade directly from here</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 py-2">
            {plans.length === 0 && (
              <div className="col-span-full text-center py-6">
                <Package className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground mb-3">
                  No Polar plans available. Open the billing portal to manage products or try again.
                </p>

                <Button
                  variant="outline"
                  onClick={async () => {
                    if (!currentOrganization?.id) return;
                    const url = await subscriptionService.getPortalUrl(currentOrganization.id);
                    if (url) window.open(url, '_blank');
                  }}
                >
                  Open Billing Portal
                </Button>
                {fallbackProductId && (
                  <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <Card>
                      <CardHeader>
                        <CardTitle>Starter</CardTitle>
                        <CardDescription>Subscribe via Polar checkout</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold mb-4">
                          $250
                          <span className="text-sm font-normal text-muted-foreground">/month</span>
                        </div>
                        <Button
                          className="w-full"
                          onClick={() =>
                            confirmPlanChangeImmediate({
                              id: 'starter',
                              name: 'Starter',
                              description: '',
                              price: 0,
                              currency: 'USD',
                              interval: 'month',
                              features: [],
                              limits: {},
                              metadata: { productId: fallbackProductId },
                            }) as any
                          }
                        >
                          Select
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>
            )}
            {plans.map(plan => {
              const currentPriceId = (subscription as any)?.priceId as string | undefined;
              const isCurrentPlan =
                (plan as any)?.priceId && currentPriceId
                  ? (plan as any).priceId === currentPriceId
                  : currentPlan?.id === plan.id;
              // removed unused isUpgrade
              // Frontend safeguard: ensure limits always exist to avoid runtime errors
              const limits =
                plan.limits ??
                ({
                  apiCalls: 'Unlimited',
                  storage: 'Unlimited',
                  users: 'Unlimited',
                } as const);
              const stableKey =
                plan.id ||
                (plan as any).priceId ||
                (plan as any).productId ||
                `${plan.name}-${plan.interval}-${plan.price}`;

              return (
                <Card
                  key={stableKey}
                  className={`relative ${isCurrentPlan ? 'ring-2 ring-primary' : ''}`}
                >
                  <CardHeader>
                    <CardTitle>{plan.name}</CardTitle>
                    <CardDescription>
                      {plan.description}
                      {((plan as any)?.metadata?.productId || (plan as any)?.productId) && (
                        <span className="block mt-1 text-xs font-mono text-muted-foreground">
                          Product:{' '}
                          {String((plan as any).metadata?.productId || (plan as any).productId)}
                        </span>
                      )}
                    </CardDescription>
                  </CardHeader>

                  <CardContent>
                    <div className="text-3xl font-bold mb-4">
                      ${plan.price}
                      <span className="text-sm font-normal text-muted-foreground">
                        /{plan.interval}
                      </span>
                    </div>

                    <ul className="space-y-2 mb-6">
                      {(plan.features ?? []).map((feature, index) => (
                        <li key={index} className="flex items-center gap-2 text-sm">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          {feature}
                        </li>
                      ))}
                    </ul>

                    <div className="space-y-2 text-sm text-muted-foreground">
                      <div className="flex justify-between">
                        <span>API Calls:</span>
                        <span>
                          {typeof limits.apiCalls === 'number'
                            ? limits.apiCalls.toLocaleString()
                            : limits.apiCalls}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Storage:</span>
                        <span>
                          {typeof limits.storage === 'number'
                            ? `${(limits.storage / 1024).toFixed(1)} GB`
                            : limits.storage}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Users:</span>
                        <span>
                          {typeof limits.users === 'number' ? String(limits.users) : limits.users}
                        </span>
                      </div>
                    </div>

                    <Button
                      className="w-full mt-4"
                      variant={isCurrentPlan ? 'secondary' : 'default'}
                      onClick={() => confirmPlanChangeImmediate(plan)}
                      disabled={isCurrentPlan}
                    >
                      {isCurrentPlan ? 'Current Plan' : 'Select'}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Subscription</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel your subscription? Your access will continue until the
              end of the current billing period (
              {formatDateSafe(subscription?.currentPeriodEnd, 'MMM dd, yyyy', 'N/A')}
              ).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isUpdating}>Keep Subscription</AlertDialogCancel>

            <AlertDialogAction
              onClick={handleCancelSubscription}
              disabled={isUpdating}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isUpdating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Canceling...
                </>
              ) : (
                'Cancel Subscription'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reactivate Confirmation Dialog */}
      <AlertDialog open={isReactivateDialogOpen} onOpenChange={setIsReactivateDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reactivate Subscription</AlertDialogTitle>
            <AlertDialogDescription>
              Reactivate your subscription to regain full access to all features. Your billing will
              resume from the next cycle.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isUpdating}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleReactivateSubscription} disabled={isUpdating}>
              {isUpdating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Reactivating...
                </>
              ) : (
                'Reactivate Subscription'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SubscriptionDashboard;
