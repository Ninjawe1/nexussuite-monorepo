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

export default function AdminMarketingPage() {
  const { toast } = useToast();
  const [affiliateCode, setAffiliateCode] = useState("AFF-001");
  const [bannerTitle, setBannerTitle] = useState("Welcome to NexusSuite");

  const saveAffiliate = () =>
    toast({
      title: "Affiliate",
      description: `Saved code ${affiliateCode} (demo)`,
    });
  const saveBanner = () =>
    toast({ title: "Banner", description: `Saved '${bannerTitle}' (demo)` });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Monetization & Marketing</h1>
        <p className="text-muted-foreground">
          Affiliates, banners, and campaigns
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Affiliate Program</CardTitle>
          <CardDescription>
            Track referrals and commissions (demo)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Input
              value={affiliateCode}
              onChange={(e) => setAffiliateCode(e.target.value)}
            />
            <Button onClick={saveAffiliate}>Save</Button>
          </div>
          <ul className="mt-3 space-y-2">
            {[
              { user: "alice@example.com", referrals: 11, commission: 44.2 },
              { user: "bob@example.com", referrals: 7, commission: 28.1 },
            ].map((r, idx) => (
              <li
                key={idx}
                className="flex items-center justify-between p-2 border border-border rounded-lg text-sm"
              >
                <span>{r.user}</span>
                <span>
                  {r.referrals} referrals • ${r.commission}
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Promotional Banners</CardTitle>
          <CardDescription>Landing content</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Input
              value={bannerTitle}
              onChange={(e) => setBannerTitle(e.target.value)}
            />
            <Button onClick={saveBanner}>Save</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Campaign Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {[
              { campaign: "Fall Promo", clicks: 1200, signups: 80 },
              { campaign: "Black Friday", clicks: 3400, signups: 270 },
            ].map((c, idx) => (
              <li
                key={idx}
                className="flex items-center justify-between p-2 border border-border rounded-lg text-sm"
              >
                <span>{c.campaign}</span>
                <span>
                  {c.clicks} clicks • {c.signups} signups
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
