import { CampaignCard } from "@/components/campaign-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Eye, Heart, TrendingUp } from "lucide-react";

export default function Marcom() {
  const campaigns = [
    {
      id: "1",
      title: "VCT Championship Hype",
      description: "Building excitement for our team's championship run with daily highlights and player interviews",
      startDate: new Date('2024-10-01'),
      endDate: new Date('2024-10-15'),
      platforms: ['twitter' as const, 'instagram' as const, 'youtube' as const],
      reach: 125000,
      engagement: 8.5,
      status: "active" as const,
    },
    {
      id: "2",
      title: "New Roster Announcement",
      description: "Introducing our new League of Legends roster with teaser content and reveal event",
      startDate: new Date('2024-10-20'),
      endDate: new Date('2024-10-22'),
      platforms: ['twitter' as const, 'twitch' as const],
      status: "scheduled" as const,
    },
    {
      id: "3",
      title: "Bootcamp Documentary",
      description: "Behind-the-scenes content from our PUBG team's training bootcamp in Seoul",
      startDate: new Date('2024-09-15'),
      endDate: new Date('2024-09-30'),
      platforms: ['youtube' as const, 'tiktok' as const, 'instagram' as const],
      reach: 89000,
      engagement: 12.3,
      status: "completed" as const,
    },
    {
      id: "4",
      title: "Sponsor Spotlight Series",
      description: "Showcasing our partnerships and sponsors through creative content series",
      startDate: new Date('2024-10-05'),
      endDate: new Date('2024-10-25'),
      platforms: ['instagram' as const, 'youtube' as const],
      reach: 45000,
      engagement: 6.8,
      status: "active" as const,
    },
  ];

  const totalReach = campaigns.filter(c => c.reach).reduce((sum, c) => sum + (c.reach || 0), 0);
  const avgEngagement = campaigns.filter(c => c.engagement).reduce((sum, c) => sum + (c.engagement || 0), 0) / 
                        campaigns.filter(c => c.engagement).length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold mb-1" data-testid="text-marcom-title">
            Marketing & Communications
          </h1>
          <p className="text-muted-foreground">Manage campaigns and track social media performance</p>
        </div>
        <Button data-testid="button-add-campaign">
          <Plus className="w-4 h-4 mr-2" />
          New Campaign
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Reach</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-mono" data-testid="stat-total-reach">
              {(totalReach / 1000).toFixed(0)}K
            </div>
            <p className="text-xs text-muted-foreground mt-1">Across all campaigns</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Engagement</CardTitle>
            <Heart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-mono">
              {avgEngagement.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">Engagement rate</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Campaigns</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-mono">
              {campaigns.filter(c => c.status === 'active').length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Currently running</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {campaigns.map((campaign) => (
          <CampaignCard key={campaign.id} {...campaign} />
        ))}
      </div>
    </div>
  );
}
