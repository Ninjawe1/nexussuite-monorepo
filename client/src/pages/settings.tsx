import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { Upload, UserPlus, Copy, Trash2, Check, Crown, Zap, Rocket } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

function InviteManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("staff");
  const [permissions, setPermissions] = useState<string[]>([]);
  const [copiedToken, setCopiedToken] = useState("");

  const { data: invites = [] } = useQuery<Invite[]>({
    queryKey: ["/api/invites"],
  });

  const createInviteMutation = useMutation({
    mutationFn: async (data: { email: string; role: string; permissions: string[] }) => {
      return await apiRequest("/api/invites", "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invites"] });
      setIsDialogOpen(false);
      setEmail("");
      setRole("staff");
      setPermissions([]);
      toast({ title: "Success", description: "Invite created successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create invite", variant: "destructive" });
    },
  });

  const deleteInviteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(`/api/invites/${id}`, "DELETE", {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invites"] });
      toast({ title: "Success", description: "Invite deleted" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete invite", variant: "destructive" });
    },
  });

  const copyInviteLink = (token: string) => {
    const link = `${window.location.origin}/invite/${token}`;
    navigator.clipboard.writeText(link);
    setCopiedToken(token);
    toast({ title: "Copied!", description: "Invite link copied to clipboard" });
    setTimeout(() => setCopiedToken(""), 2000);
  };

  const handleCreateInvite = () => {
    if (!email) {
      toast({ title: "Error", description: "Email is required", variant: "destructive" });
      return;
    }
    createInviteMutation.mutate({ email, role, permissions });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-heading">Staff Invites</CardTitle>
            <CardDescription>Invite team members to join your club</CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-invite">
                <UserPlus className="mr-2 h-4 w-4" />
                Invite Staff
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite New Staff Member</DialogTitle>
                <DialogDescription>
                  Send an invitation link to add a new member to your club
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="staff@example.com"
                    type="email"
                    data-testid="input-invite-email"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select value={role} onValueChange={setRole}>
                    <SelectTrigger data-testid="select-invite-role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="staff">Staff</SelectItem>
                      <SelectItem value="player">Player</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="analyst">Analyst</SelectItem>
                      <SelectItem value="marcom">Marketing</SelectItem>
                      <SelectItem value="finance">Finance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={handleCreateInvite}
                  disabled={createInviteMutation.isPending}
                  data-testid="button-submit-invite"
                >
                  {createInviteMutation.isPending ? "Creating..." : "Create Invite"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {invites.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">No pending invites</p>
        ) : (
          <div className="space-y-3">
            {invites.map((invite) => (
              <div
                key={invite.id}
                className="flex items-center justify-between p-4 rounded-lg border"
                data-testid={`invite-item-${invite.id}`}
              >
                <div className="flex-1">
                  <p className="font-medium">{invite.email}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline">{invite.role}</Badge>
                    <Badge variant={invite.status === "pending" ? "default" : "secondary"}>
                      {invite.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      Expires: {formatDateSafe(invite.expiresAt, "MMM dd, yyyy")}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyInviteLink(invite.token)}
                    data-testid={`button-copy-invite-${invite.id}`}
                  >
                    {copiedToken === invite.token ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => deleteInviteMutation.mutate(invite.id)}
                    data-testid={`button-delete-invite-${invite.id}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SubscriptionManagement() {
  const { toast } = useToast();
  const { data: tenant, isLoading } = useQuery<Tenant>({
    queryKey: ["/api/tenant"],
  });

  const upgradeMutation = useMutation({
    mutationFn: async (plan: string) => {
      const response = await apiRequest("/api/subscriptions/create-checkout", "POST", { plan });
      return response;
    },
    onSuccess: (data: { url: string }) => {
      window.location.href = data.url;
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to start checkout", variant: "destructive" });
    },
  });

  const portalMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("/api/subscriptions/create-portal", "POST", {});
      return response;
    },
    onSuccess: (data: { url: string }) => {
      window.location.href = data.url;
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to open billing portal", variant: "destructive" });
    },
  });

  const plans = [
    {
      name: "Starter",
      value: "starter",
      price: "$29",
      icon: Zap,
      features: [
        "Up to 10 staff members",
        "Basic analytics",
        "Email support",
        "1 GB file storage",
      ],
    },
    {
      name: "Growth",
      value: "growth",
      price: "$99",
      icon: Rocket,
      features: [
        "Up to 50 staff members",
        "Advanced analytics",
        "Priority support",
        "10 GB file storage",
        "Social media integration",
      ],
    },
    {
      name: "Enterprise",
      value: "enterprise",
      price: "$299",
      icon: Crown,
      features: [
        "Unlimited staff members",
        "Custom analytics",
        "Dedicated support",
        "Unlimited storage",
        "Full social media suite",
        "API access",
      ],
    },
  ];

  const currentPlan = tenant?.subscriptionPlan || "starter";
  const subscriptionStatus = tenant?.subscriptionStatus || "active";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-heading">Subscription Plan</CardTitle>
            <CardDescription>Manage your subscription and billing</CardDescription>
          </div>
          {tenant?.stripeCustomerId && (
            <Button
              variant="outline"
              onClick={() => portalMutation.mutate()}
              disabled={portalMutation.isPending}
              data-testid="button-billing-portal"
            >
              {portalMutation.isPending ? "Loading..." : "Manage Billing"}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <Badge variant={subscriptionStatus === "active" ? "default" : "destructive"}>
                {subscriptionStatus.charAt(0).toUpperCase() + subscriptionStatus.slice(1)}
              </Badge>
              <span className="text-sm text-muted-foreground">
                Current plan: <span className="font-semibold text-foreground">{currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)}</span>
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {plans.map((plan) => {
                const Icon = plan.icon;
                const isCurrentPlan = currentPlan === plan.value;
                
                return (
                  <div
                    key={plan.value}
                    className={`p-4 rounded-lg border-2 ${
                      isCurrentPlan ? "border-primary bg-primary/5" : "border-border"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <Icon className="w-5 h-5 text-primary" />
                      <h3 className="font-heading font-semibold">{plan.name}</h3>
                    </div>
                    <div className="mb-4">
                      <span className="text-3xl font-bold">{plan.price}</span>
                      <span className="text-muted-foreground">/mo</span>
                    </div>
                    <ul className="space-y-2 mb-4">
                      {plan.features.map((feature, idx) => (
                        <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                          <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <Button
                      className="w-full"
                      variant={isCurrentPlan ? "outline" : "default"}
                      disabled={isCurrentPlan || upgradeMutation.isPending}
                      onClick={() => upgradeMutation.mutate(plan.value)}
                      data-testid={`button-upgrade-${plan.value}`}
                    >
                      {isCurrentPlan ? "Current Plan" : upgradeMutation.isPending ? "Loading..." : "Upgrade"}
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function Settings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [name, setName] = useState("");
  const [clubTag, setClubTag] = useState("");
  const [website, setWebsite] = useState("");
  const [region, setRegion] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#a855f7");
  const [logoUrl, setLogoUrl] = useState("");

  const { data: tenant, isLoading } = useQuery<Tenant>({
    queryKey: ["/api/tenant"],
  });

  useEffect(() => {
    if (tenant) {
      setName(tenant.name || "");
      setClubTag(tenant.clubTag || "");
      setWebsite(tenant.website || "");
      setRegion(tenant.region || "");
      setPrimaryColor(tenant.primaryColor || "#a855f7");
      setLogoUrl(tenant.logoUrl || "");
    }
  }, [tenant]);

  // Sync subscription from Stripe checkout session
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session_id');
    
    if (sessionId) {
      // Clear the session_id from URL
      window.history.replaceState({}, '', '/settings');
      
      // Sync the subscription - apiRequest throws on non-2xx
      apiRequest('/api/subscriptions/sync-session', 'POST', { sessionId })
        .then(() => {
          // Success - apiRequest only resolves on 2xx responses
          queryClient.invalidateQueries({ queryKey: ['/api/tenant'] });
          toast({
            title: 'Success',
            description: 'Your subscription has been updated!',
          });
        })
        .catch((error: Error) => {
          // Error - apiRequest threw due to non-2xx or network error
          console.error('Error syncing subscription:', error);
          toast({
            title: 'Error',
            description: error.message || 'Failed to sync subscription. Please contact support.',
            variant: 'destructive',
          });
        });
    }
  }, [queryClient, toast]);

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<Tenant>) => {
      return await apiRequest("/api/tenant", "PATCH", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tenant"] });
      toast({
        title: "Success",
        description: "Settings updated successfully",
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
        description: error.message || "Failed to update settings",
        variant: "destructive",
      });
    },
  });

  const handleSaveBranding = async () => {
    await updateMutation.mutateAsync({
      primaryColor,
      logoUrl,
    });
  };

  const handleSaveInfo = async () => {
    await updateMutation.mutateAsync({
      name,
      clubTag,
      website,
      region,
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-heading font-bold mb-1" data-testid="text-settings-title">
          Club Settings
        </h1>
        <p className="text-muted-foreground">Customize your club's branding and preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-heading">Club Branding</CardTitle>
            <CardDescription>Upload your club logo and customize colors</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="logo-upload">Club Logo</Label>
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 rounded-lg bg-primary flex items-center justify-center">
                      {logoUrl ? (
                        <img src={logoUrl} alt="Club logo" className="w-full h-full object-cover rounded-lg" />
                      ) : (
                        <span className="text-primary-foreground font-heading font-bold text-3xl">
                          {clubTag?.charAt(0) || "N"}
                        </span>
                      )}
                    </div>
                    <div className="flex-1">
                      <Input
                        id="logo-url"
                        placeholder="https://example.com/logo.png"
                        value={logoUrl}
                        onChange={(e) => setLogoUrl(e.target.value)}
                        data-testid="input-logo-url"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Recommended: PNG or SVG, 512x512px minimum
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="primary-color">Primary Brand Color</Label>
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-12 h-12 rounded-lg border-2 border-border cursor-pointer"
                      style={{ backgroundColor: primaryColor }}
                    />
                    <Input
                      id="primary-color"
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-24 h-12"
                      data-testid="input-primary-color"
                    />
                    <span className="font-mono text-sm text-muted-foreground">{primaryColor}</span>
                  </div>
                </div>

                <Button 
                  className="w-full" 
                  onClick={handleSaveBranding}
                  disabled={updateMutation.isPending}
                  data-testid="button-save-branding"
                >
                  {updateMutation.isPending ? "Saving..." : "Save Branding Changes"}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-heading">Club Information</CardTitle>
            <CardDescription>Update your club's basic information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="club-name">Club Name</Label>
                  <Input
                    id="club-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    data-testid="input-club-name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="club-tag">Club Tag</Label>
                  <Input
                    id="club-tag"
                    value={clubTag}
                    onChange={(e) => setClubTag(e.target.value)}
                    maxLength={5}
                    data-testid="input-club-tag"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="club-website">Website</Label>
                  <Input
                    id="club-website"
                    type="url"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://nexus.gg"
                    data-testid="input-club-website"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="club-region">Region</Label>
                  <Input
                    id="club-region"
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    data-testid="input-club-region"
                  />
                </div>

                <Button 
                  className="w-full" 
                  onClick={handleSaveInfo}
                  disabled={updateMutation.isPending}
                  data-testid="button-save-info"
                >
                  {updateMutation.isPending ? "Saving..." : "Save Information"}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <SubscriptionManagement />
      
      <InviteManagement />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-heading">Social Media Connections</CardTitle>
          <CardDescription>Connect your social media accounts for Marcom analytics</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {['Twitter/X', 'Instagram', 'YouTube', 'TikTok', 'Twitch'].map((platform) => (
            <div key={platform} className="flex items-center justify-between p-4 rounded-lg border border-border">
              <div>
                <p className="font-semibold">{platform}</p>
                <p className="text-sm text-muted-foreground">Not connected</p>
              </div>
              <Button variant="outline" size="sm" data-testid={`button-connect-${platform.toLowerCase().replace('/', '-')}`}>
                Connect
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
