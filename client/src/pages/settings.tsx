import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Palette } from "lucide-react";
import { useState } from "react";

export default function Settings() {
  const [primaryColor, setPrimaryColor] = useState("#a855f7");

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
            <div className="space-y-2">
              <Label htmlFor="logo-upload">Club Logo</Label>
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-lg bg-primary flex items-center justify-center">
                  <span className="text-primary-foreground font-heading font-bold text-3xl">N</span>
                </div>
                <Button variant="outline" data-testid="button-upload-logo">
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Logo
                </Button>
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

            <Button className="w-full" data-testid="button-save-branding">
              Save Branding Changes
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-heading">Club Information</CardTitle>
            <CardDescription>Update your club's basic information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="club-name">Club Name</Label>
              <Input
                id="club-name"
                defaultValue="Nexus Esports"
                data-testid="input-club-name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="club-tag">Club Tag</Label>
              <Input
                id="club-tag"
                defaultValue="NXS"
                maxLength={5}
                data-testid="input-club-tag"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="club-website">Website</Label>
              <Input
                id="club-website"
                type="url"
                placeholder="https://nexus.gg"
                data-testid="input-club-website"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="club-region">Region</Label>
              <Input
                id="club-region"
                defaultValue="North America"
                data-testid="input-club-region"
              />
            </div>

            <Button className="w-full" data-testid="button-save-info">
              Save Information
            </Button>
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
              <Button variant="outline" size="sm" data-testid={`button-connect-${platform.toLowerCase()}`}>
                Connect
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
