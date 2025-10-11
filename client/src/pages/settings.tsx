import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload } from "lucide-react";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { Tenant } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";

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
          window.location.href = "/api/login";
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
