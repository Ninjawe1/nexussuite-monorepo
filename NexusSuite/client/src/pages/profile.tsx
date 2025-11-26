import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Camera,
  Pencil,
  MapPin,
  Trophy,
  Users,
  ShieldCheck,
  Globe,
} from "lucide-react";


// Helper to convert file to base64 data URL
async function toDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

interface SocialLinks {
  twitch?: string;
  youtube?: string;
  discord?: string;
  twitter?: string; // X
}

interface ProfileData {
  id: string;
  username: string;
  fullName: string;
  role: string; // Player, Coach, Designer, Manager
  country?: string; // ISO code e.g., "US"
  location?: string; // City, Region
  bio?: string;
  joinedAt?: string; // ISO Date
  bannerBase64?: string;
  avatarBase64?: string;
  stats?: { matches?: number; teams?: number; followers?: number; xp?: number };
  achievements?: string[]; // e.g., ["MVP", "Champion"]
  social?: SocialLinks;
  notifications?: { email?: boolean; app?: boolean };
  twoFAEnabled?: boolean;
}

export default function ProfilePage() {
  const { user } = useAuth();
  const [tab, setTab] = useState("overview");

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [saving, setSaving] = useState(false);
  const [bannerUploading, setBannerUploading] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);

  const initials = useMemo(() => {
    const f = user?.firstName?.[0] ?? user?.email?.[0] ?? "U";
    const l = user?.lastName?.[0] ?? "";

    return `${f}${l}`.toUpperCase();
  }, [user]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await apiRequest("/api/profile", "GET");
        const data = await res.json();
        if (!mounted) return;
        setProfile({
          id: data?.id || user?.id || "self",
          username: data?.username || user?.email?.split("@")[0] || "user",
          fullName:
            data?.fullName ||
            `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim(),
          role:
            data?.role ||
            (user?.isSuperAdmin ? "Super Admin" : user?.role || "Member"),
          country: data?.country || "US",
          location: data?.location || "",
          bio: data?.bio || "",
          joinedAt:
            data?.joinedAt || user?.createdAt || new Date().toISOString(),
          bannerBase64: data?.bannerBase64 || undefined,
          avatarBase64: data?.avatarBase64 || undefined,
          stats: data?.stats || { matches: 0, teams: 0, followers: 0, xp: 0 },
          achievements: data?.achievements || ["MVP"],

          social: data?.social || {},
          notifications: data?.notifications || { email: true, app: true },
          twoFAEnabled: !!data?.twoFAEnabled,
        });
      } catch (e) {
        // Fallback to basic user data
        setProfile({
          id: user?.id || "self",
          username: user?.email?.split("@")[0] || "user",
          fullName:
            `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim() ||
            user?.email ||
            "User",
          role: user?.isSuperAdmin ? "Super Admin" : user?.role || "Member",
          country: "US",
          location: "",
          bio: "",
          joinedAt: user?.createdAt || new Date().toISOString(),
          stats: { matches: 0, teams: 0, followers: 0, xp: 0 },
          achievements: ["MVP"],

          social: {},
          notifications: { email: true, app: true },
          twoFAEnabled: false,
        });
      }
    })();
    return () => {
      mounted = false;
    };
  }, [user]);

  async function saveProfile(updates: Partial<ProfileData>) {
    if (!profile) return;
    setSaving(true);
    try {
      const res = await apiRequest("/api/profile", "POST", {

        ...profile,
        ...updates,
      });
      const data = await res.json();
      setProfile((prev) => ({

        ...(prev as ProfileData),
        ...(data || updates),
      }));
    } catch (e) {
      alert("Failed to save profile");

    } finally {
      setSaving(false);
    }
  }

  async function handleBannerUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBannerUploading(true);
    try {
      const base64 = await toDataUrl(file);
      await saveProfile({ bannerBase64: base64 });
    } finally {
      setBannerUploading(false);
    }
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarUploading(true);
    try {
      const base64 = await toDataUrl(file);
      await saveProfile({ avatarBase64: base64 });
    } finally {
      setAvatarUploading(false);
    }
  }

  if (!profile) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Loading profile...</p>
      </div>
    );
  }

  const joinedDate = profile.joinedAt
    ? new Date(profile.joinedAt).toLocaleDateString()
    : "";


  return (
    <div className="p-6 space-y-6">
      {/* Profile Header */}
      <Card className="overflow-hidden bg-gradient-to-br from-background to-muted/20">
        <div className="relative h-40 w-full bg-muted">
          {profile.bannerBase64 ? (
            <img
              src={profile.bannerBase64}
              alt="Profile banner"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-muted-foreground">
              <Globe className="w-6 h-6 mr-2" />
              <span>Upload a banner</span>
            </div>
          )}
          <label className="absolute top-3 right-3 inline-flex items-center gap-2 px-2 py-1 rounded-md bg-background/80 backdrop-blur hover:bg-background cursor-pointer border border-border">
            <Camera className="w-4 h-4" />
            <span className="text-xs">Banner</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleBannerUpload}
            />

          </label>
        </div>
        <CardContent className="relative">
          <div className="-mt-10 flex items-end gap-4">
            <div className="relative">
              <Avatar className="w-20 h-20 ring-4 ring-background shadow-md">
                {profile.avatarBase64 ? (
                  <AvatarImage src={profile.avatarBase64} />
                ) : (
                  <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                    {initials}
                  </AvatarFallback>
                )}
              </Avatar>
              <label className="absolute -bottom-2 -right-2 inline-flex items-center gap-1 px-2 py-1 rounded-md bg-background/80 backdrop-blur hover:bg-background cursor-pointer border border-border">
                <Pencil className="w-3 h-3" />
                <span className="text-[10px]">Edit</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                />
              </label>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-heading font-semibold truncate">
                  {profile.fullName || profile.username}
                </h1>
                <Badge variant="secondary" className="text-xs">
                  {profile.role}
                </Badge>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                <span>@{profile.username}</span>
                {profile.location ? (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {profile.location}
                  </span>
                ) : null}
                {profile.country ? (
                  <span className="text-xs opacity-80">{profile.country}</span>
                ) : null}
                <span className="ml-auto text-xs">Joined {joinedDate}</span>
              </div>
              {profile.bio ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  {profile.bio}
                </p>

              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs Navigation */}
      <Tabs value={tab} onValueChange={setTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="teams">Teams / Projects</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* Overview Section */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Matches</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-bold">
                {profile.stats?.matches ?? 0}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Teams</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-bold">
                {profile.stats?.teams ?? 0}
              </CardContent>

            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Followers</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-bold">
                {profile.stats?.followers ?? 0}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">XP Level</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-bold">
                {profile.stats?.xp ?? 0}
              </CardContent>

            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-4 h-4" /> Achievement Badges
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {(profile.achievements ?? []).map((b) => (

                <Badge key={b} variant="outline" className="bg-background/40">
                  {b}
                </Badge>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-4 h-4" /> Activity Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li>
                  Recent tournament participation, uploads, and posts will
                  appear here.
                </li>

                <li className="opacity-70">
                  (Hook to your existing activity feeds when available)
                </li>
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Teams / Projects */}
        <TabsContent value="teams" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Assignments</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Teams, projects, or tournaments associated with this user will
                be listed here.

              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings */}
        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="space-y-2">
                  <span className="text-sm">Full Name</span>
                  <Input
                    value={profile.fullName}
                    onChange={(e) =>

                      setProfile({
                        ...(profile as ProfileData),
                        fullName: e.target.value,
                      })
                    }
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm">Username</span>
                  <Input
                    value={profile.username}
                    onChange={(e) =>

                      setProfile({
                        ...(profile as ProfileData),
                        username: e.target.value,
                      })
                    }
                  />
                </label>
              </div>
              <label className="space-y-2">
                <span className="text-sm">Bio</span>
                <Textarea
                  value={profile.bio || ""}
                  onChange={(e) =>

                    setProfile({
                      ...(profile as ProfileData),
                      bio: e.target.value,
                    })
                  }
                />
              </label>
              <div className="flex items-center gap-2">
                <Button
                  variant="default"
                  onClick={() => saveProfile(profile!)}
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save Changes"}

                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Social Accounts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="space-y-1">
                  <span className="text-sm">Twitch</span>
                  <Input
                    placeholder="https://twitch.tv/username"
                    value={profile.social?.twitch || ""}
                    onChange={(e) =>

                      setProfile({
                        ...(profile as ProfileData),
                        social: {
                          ...(profile.social || {}),
                          twitch: e.target.value,
                        },
                      })
                    }
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-sm">YouTube</span>
                  <Input
                    placeholder="https://youtube.com/@username"
                    value={profile.social?.youtube || ""}
                    onChange={(e) =>

                      setProfile({
                        ...(profile as ProfileData),
                        social: {
                          ...(profile.social || {}),
                          youtube: e.target.value,
                        },
                      })
                    }
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-sm">Discord</span>
                  <Input
                    placeholder="https://discord.gg/invite-or-username"
                    value={profile.social?.discord || ""}
                    onChange={(e) =>

                      setProfile({
                        ...(profile as ProfileData),
                        social: {
                          ...(profile.social || {}),
                          discord: e.target.value,
                        },
                      })
                    }
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-sm">X / Twitter</span>
                  <Input
                    placeholder="https://x.com/username"
                    value={profile.social?.twitter || ""}
                    onChange={(e) =>

                      setProfile({
                        ...(profile as ProfileData),
                        social: {
                          ...(profile.social || {}),
                          twitter: e.target.value,
                        },
                      })
                    }
                  />
                </label>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  onClick={() => saveProfile({ social: profile.social })}
                >
                  Save Socials
                </Button>
                <Button variant="outline">
                  <ShieldCheck className="w-4 h-4 mr-2" /> Verify Linked
                  Accounts

                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Security & Notifications</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Enable 2FA</p>
                  <p className="text-xs text-muted-foreground">
                    Add an extra layer of security to your account.
                  </p>
                </div>
                <Switch
                  checked={!!profile.twoFAEnabled}
                  onCheckedChange={(v) =>

                    setProfile({
                      ...(profile as ProfileData),
                      twoFAEnabled: !!v,
                    })
                  }
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="space-y-1">
                  <span className="text-sm">New Password</span>
                  <Input type="password" placeholder="••••••••" />
                </label>
                <label className="space-y-1">
                  <span className="text-sm">Confirm Password</span>
                  <Input type="password" placeholder="••••••••" />
                </label>
              </div>
              <div className="flex items-center gap-6">
                <label className="inline-flex items-center gap-2 text-sm">
                  <Switch
                    checked={!!profile.notifications?.email}
                    onCheckedChange={(v) =>

                      setProfile({
                        ...(profile as ProfileData),
                        notifications: {
                          ...(profile.notifications || {}),
                          email: !!v,
                        },
                      })
                    }
                  />
                  Email Notifications
                </label>
                <label className="inline-flex items-center gap-2 text-sm">
                  <Switch
                    checked={!!profile.notifications?.app}
                    onCheckedChange={(v) =>

                      setProfile({
                        ...(profile as ProfileData),
                        notifications: {
                          ...(profile.notifications || {}),
                          app: !!v,
                        },
                      })
                    }
                  />
                  In-App Notifications
                </label>
              </div>
              <div className="flex items-center gap-2">
                <ThemeToggle />
                <Button variant="destructive" className="ml-auto">
                  Deactivate Account
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
