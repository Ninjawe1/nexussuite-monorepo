import { CampaignCard } from "@/components/campaign-card";
import { CampaignDialog } from "@/components/campaign-dialog";
import { SocialAccountOAuthDialog } from "@/components/social-account-dialog-oauth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Eye, Heart, TrendingUp, Users, BarChart3, RefreshCw, Trash2, Link as LinkIcon, CheckCircle2, XCircle } from "lucide-react";
import { SiInstagram, SiX, SiFacebook, SiTiktok, SiYoutube, SiTwitch } from "react-icons/si";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { Campaign as CampaignType, SocialAccount } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";

const platformIcons: Record<string, any> = {
  instagram: SiInstagram,
  twitter: SiX,
  facebook: SiFacebook,
  tiktok: SiTiktok,
  youtube: SiYoutube,
  twitch: SiTwitch,
};

export default function Marcom() {
  const [campaignDialogOpen, setCampaignDialogOpen] = useState(false);
  const [socialDialogOpen, setSocialDialogOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<CampaignType | undefined>();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [location, setLocation] = useLocation();

  // Handle OAuth callback messages
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauthSuccess = params.get("oauth_success");
    const oauthError = params.get("oauth_error");

    if (oauthSuccess === "true") {
      toast({
        title: "Success",
        description: "Social account connected successfully",
      });
      // Clear the OAuth params but preserve other query params
      params.delete("oauth_success");
      const newSearch = params.toString();
      const newUrl = newSearch ? `/marcom?${newSearch}` : "/marcom";
      window.history.replaceState({}, "", newUrl);
      
      // Invalidate queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ["/api/social/accounts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/social/analytics"] });
    } else if (oauthError) {
      toast({
        title: "Connection failed",
        description: `OAuth error: ${oauthError}`,
        variant: "destructive",
      });
      // Clear the OAuth params but preserve other query params
      params.delete("oauth_error");
      const newSearch = params.toString();
      const newUrl = newSearch ? `/marcom?${newSearch}` : "/marcom";
      window.history.replaceState({}, "", newUrl);
    }
  }, [toast, queryClient]);

  const { data: campaigns = [], isLoading: campaignsLoading } = useQuery<CampaignType[]>({
    queryKey: ["/api/campaigns"],
  });

  const { data: socialAccounts = [], isLoading: accountsLoading } = useQuery<SocialAccount[]>({
    queryKey: ["/api/social/accounts"],
  });

  const { data: socialAnalytics, isLoading: analyticsLoading } = useQuery<any>({
    queryKey: ["/api/social/analytics"],
  });

  const deleteCampaignMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(`/api/campaigns/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      toast({
        title: "Success",
        description: "Campaign deleted successfully",
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
        description: error.message || "Failed to delete campaign",
        variant: "destructive",
      });
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(`/api/social/accounts/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/social/accounts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/social/analytics"] });
      toast({
        title: "Success",
        description: "Social account disconnected",
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
        description: error.message || "Failed to disconnect account",
        variant: "destructive",
      });
    },
  });

  const syncAccountMutation = useMutation({
    mutationFn: async (accountId: string) => {
      return await apiRequest(`/api/social/sync/${accountId}`, "POST");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/social/analytics"] });
      toast({
        title: "Success",
        description: "Analytics synced successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to sync analytics",
        variant: "destructive",
      });
    },
  });

  const totalReach = campaigns.filter(c => c.reach).reduce((sum, c) => sum + (c.reach || 0), 0);
  const avgEngagement = campaigns.filter(c => c.engagement).length > 0
    ? campaigns.filter(c => c.engagement).reduce((sum, c) => sum + (Number(c.engagement) || 0), 0) / campaigns.filter(c => c.engagement).length
    : 0;

  const handleEditCampaign = (campaign: CampaignType) => {
    setSelectedCampaign(campaign);
    setCampaignDialogOpen(true);
  };

  const handleAddCampaign = () => {
    setSelectedCampaign(undefined);
    setCampaignDialogOpen(true);
  };

  const handleDeleteCampaign = async (id: string) => {
    if (confirm("Are you sure you want to delete this campaign?")) {
      await deleteCampaignMutation.mutateAsync(id);
    }
  };

  const handleConnectAccount = () => {
    setSocialDialogOpen(true);
  };

  const handleDisconnectAccount = async (id: string) => {
    if (confirm("Are you sure you want to disconnect this account?")) {
      await deleteAccountMutation.mutateAsync(id);
    }
  };

  const handleSyncAccount = async (accountId: string) => {
    await syncAccountMutation.mutateAsync(accountId);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold mb-1" data-testid="text-marcom-title">
            Marketing & Communications
          </h1>
          <p className="text-muted-foreground">Manage campaigns and track social media performance</p>
        </div>
      </div>

      <Tabs defaultValue="analytics" className="space-y-6">
        <TabsList>
          <TabsTrigger value="analytics" data-testid="tab-analytics">Social Analytics</TabsTrigger>
          <TabsTrigger value="campaigns" data-testid="tab-campaigns">Campaigns</TabsTrigger>
        </TabsList>

        <TabsContent value="analytics" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-heading font-semibold">Connected Accounts</h2>
            <Button onClick={handleConnectAccount} data-testid="button-connect-account">
              <LinkIcon className="w-4 h-4 mr-2" />
              Connect Account
            </Button>
          </div>

          {accountsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
          ) : socialAccounts.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No social accounts connected. Connect your first account to start tracking analytics.
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {socialAccounts.map((account) => {
                const Icon = platformIcons[account.platform] || LinkIcon;
                return (
                  <Card key={account.id}>
                    <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-3">
                      <div className="flex items-center gap-2">
                        <Icon className="h-5 w-5" />
                        <div>
                          <CardTitle className="text-base">{account.accountName}</CardTitle>
                          <p className="text-xs text-muted-foreground capitalize">{account.platform}</p>
                        </div>
                      </div>
                      {account.isActive && (
                        <Badge variant="secondary" className="text-xs">Active</Badge>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => handleSyncAccount(account.id)}
                          disabled={syncAccountMutation.isPending}
                          data-testid={`button-sync-${account.id}`}
                        >
                          <RefreshCw className="w-3 h-3 mr-1" />
                          Sync
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDisconnectAccount(account.id)}
                          data-testid={`button-disconnect-${account.id}`}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                      {account.lastSyncedAt && (
                        <p className="text-xs text-muted-foreground">
                          Last synced: {new Date(account.lastSyncedAt).toLocaleDateString()}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Followers</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {analyticsLoading ? (
                  <Skeleton className="h-10 w-24" />
                ) : (
                  <>
                    <div className="text-3xl font-bold font-mono" data-testid="stat-total-followers">
                      {((socialAnalytics?.totalFollowers || 0) / 1000).toFixed(1)}K
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Across all platforms</p>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Reach</CardTitle>
                <Eye className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {analyticsLoading ? (
                  <Skeleton className="h-10 w-24" />
                ) : (
                  <>
                    <div className="text-3xl font-bold font-mono" data-testid="stat-social-reach">
                      {((socialAnalytics?.totalReach || 0) / 1000).toFixed(0)}K
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Total impressions</p>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Engagement</CardTitle>
                <Heart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {analyticsLoading ? (
                  <Skeleton className="h-10 w-24" />
                ) : (
                  <>
                    <div className="text-3xl font-bold font-mono">
                      {((socialAnalytics?.totalEngagement || 0) / 1000).toFixed(1)}K
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Total interactions</p>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Avg Engagement Rate</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {analyticsLoading ? (
                  <Skeleton className="h-10 w-24" />
                ) : (
                  <>
                    <div className="text-3xl font-bold font-mono">
                      {(socialAnalytics?.avgEngagementRate || 0).toFixed(1)}%
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Across platforms</p>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {socialAnalytics?.platforms && socialAnalytics.platforms.length > 0 && (
            <div>
              <h3 className="text-lg font-heading font-semibold mb-4">Platform Breakdown</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {socialAnalytics.platforms.map((platform: any, index: number) => {
                  const Icon = platformIcons[platform.platform] || BarChart3;
                  return (
                    <Card key={index}>
                      <CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-3">
                        <Icon className="h-5 w-5" />
                        <CardTitle className="text-base capitalize">{platform.platform}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Followers:</span>
                          <span className="font-mono font-semibold">{(platform.followers || 0).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Reach:</span>
                          <span className="font-mono font-semibold">{(platform.reach || 0).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Engagement Rate:</span>
                          <span className="font-mono font-semibold">{platform.engagementRate || 0}%</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Posts:</span>
                          <span className="font-mono font-semibold">{platform.posts || 0}</span>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="campaigns" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-heading font-semibold">Marketing Campaigns</h2>
            <Button onClick={handleAddCampaign} data-testid="button-add-campaign">
              <Plus className="w-4 h-4 mr-2" />
              New Campaign
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Campaign Reach</CardTitle>
                <Eye className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {campaignsLoading ? (
                  <Skeleton className="h-10 w-24" />
                ) : (
                  <>
                    <div className="text-3xl font-bold font-mono" data-testid="stat-total-reach">
                      {(totalReach / 1000).toFixed(0)}K
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Across all campaigns</p>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Avg Engagement</CardTitle>
                <Heart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {campaignsLoading ? (
                  <Skeleton className="h-10 w-24" />
                ) : (
                  <>
                    <div className="text-3xl font-bold font-mono">
                      {avgEngagement.toFixed(1)}%
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Engagement rate</p>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Active Campaigns</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {campaignsLoading ? (
                  <Skeleton className="h-10 w-16" />
                ) : (
                  <>
                    <div className="text-3xl font-bold font-mono">
                      {campaigns.filter(c => c.status === 'active').length}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Currently running</p>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {campaignsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-64" />
              ))}
            </div>
          ) : campaigns.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No campaigns yet. Create your first campaign to get started.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {campaigns.map((campaign) => (
                <div key={campaign.id} className="relative group">
                  <CampaignCard
                    {...campaign}
                    platforms={campaign.platforms as any}
                    status={campaign.status as any}
                    startDate={new Date(campaign.startDate)}
                    endDate={new Date(campaign.endDate)}
                    reach={campaign.reach ?? undefined}
                    engagement={campaign.engagement ? Number(campaign.engagement) : undefined}
                  />
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                    <Button 
                      variant="secondary" 
                      size="sm"
                      onClick={() => handleEditCampaign(campaign)} 
                      data-testid={`button-edit-campaign-${campaign.id}`}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleDeleteCampaign(campaign.id)}
                      data-testid={`button-delete-campaign-${campaign.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <CampaignDialog
        open={campaignDialogOpen}
        onOpenChange={setCampaignDialogOpen}
        campaign={selectedCampaign}
      />

      <SocialAccountOAuthDialog
        open={socialDialogOpen}
        onOpenChange={setSocialDialogOpen}
      />
    </div>
  );
}
