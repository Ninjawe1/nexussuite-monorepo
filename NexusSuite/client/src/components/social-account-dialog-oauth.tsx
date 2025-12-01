import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SiInstagram, SiX, SiFacebook, SiTiktok, SiYoutube, SiTwitch } from 'react-icons/si';
import { Link as LinkIcon, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useOrganization } from '@/contexts/OrganizationContext';

interface OAuthStatus {
  configured: boolean;
  name: string;
  note?: string;
}

interface SocialAccountOAuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const platformIcons: Record<string, any> = {
  instagram: SiInstagram,
  twitter: SiX,
  facebook: SiFacebook,
  tiktok: SiTiktok,
  youtube: SiYoutube,
  twitch: SiTwitch,
};

const platformColors: Record<string, string> = {
  instagram: 'bg-gradient-to-br from-orange-500 to-red-500',
  twitter: 'bg-black',
  facebook: 'bg-blue-600',
  tiktok: 'bg-black',
  youtube: 'bg-red-600',
  twitch: 'bg-zinc-800',
};

export function SocialAccountOAuthDialog({ open, onOpenChange }: SocialAccountOAuthDialogProps) {
  const { currentOrganization: organization } = useOrganization();
  const { toast } = useToast();
  const [connectingPlatform, setConnectingPlatform] = useState<string | null>(null);

  const {
    data: oauthStatus = {},
    isLoading,
    error,
  } = useQuery<Record<string, OAuthStatus>>({
    queryKey: ['/api/oauth/status', organization?.id],

    enabled: open && !!organization?.id,
  });

  const handleConnect = async (platform: string) => {
    try {
      setConnectingPlatform(platform);

      const response = await fetch(
        `/api/oauth/init/${platform}?organizationId=${organization?.id}`,
        {
          credentials: 'include',
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to initiate OAuth');
      }

      const { authUrl } = await response.json();

      // Redirect to the OAuth authorization page
      window.location.href = authUrl;
    } catch (error: any) {
      setConnectingPlatform(null);
      toast({
        title: 'Connection failed',
        description: error.message || 'Failed to connect social account',
        variant: 'destructive',
      });
    }
  };

  const anyConfigured = Object.values(oauthStatus).some(status => status.configured);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl" data-testid="dialog-social-oauth">
        <DialogHeader>
          <DialogTitle>Connect Social Media Account</DialogTitle>
          <DialogDescription>
            Connect your social media accounts using OAuth to track analytics and engagement.
          </DialogDescription>
        </DialogHeader>

        {isLoading && (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Loading platforms...</p>
          </div>
        )}

        {error && (
          <Alert variant="destructive" data-testid="alert-error">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Failed to load OAuth platforms. Please try again.</AlertDescription>
          </Alert>
        )}

        {!isLoading && !error && !anyConfigured && (
          <Alert data-testid="alert-no-platforms">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>OAuth Not Configured</strong>
              <p className="mt-2 text-sm">
                To enable social media connections, you need to register developer apps on each
                platform and configure the API credentials as environment variables.
              </p>
              <p className="mt-2 text-sm font-mono text-xs">
                Example: INSTAGRAM_CLIENT_ID, INSTAGRAM_CLIENT_SECRET
              </p>
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(oauthStatus).map(([platform, status]) => {
            const Icon = platformIcons[platform];
            const colorClass = platformColors[platform];
            const isConnecting = connectingPlatform === platform;

            return (
              <Card
                key={platform}
                className="hover-elevate"
                data-testid={`card-platform-${platform}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`${colorClass} p-3 rounded-md text-white`}>
                      {Icon && <Icon className="h-6 w-6" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{status.name}</h3>
                        {status.configured ? (
                          <Badge
                            variant="default"
                            className="text-xs"
                            data-testid={`badge-configured-${platform}`}
                          >
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Ready
                          </Badge>
                        ) : (
                          <Badge
                            variant="secondary"
                            className="text-xs"
                            data-testid={`badge-not-configured-${platform}`}
                          >
                            Not Configured
                          </Badge>
                        )}
                      </div>
                      {status.note && (
                        <p className="text-xs text-muted-foreground mb-3">{status.note}</p>
                      )}
                      {!status.configured && (
                        <p className="text-xs text-muted-foreground mb-3 font-mono">
                          Needs: {platform.toUpperCase()}_CLIENT_ID, {platform.toUpperCase()}
                          _CLIENT_SECRET
                        </p>
                      )}
                      <Button
                        size="sm"
                        variant={status.configured ? 'default' : 'outline'}
                        disabled={!status.configured || isConnecting}
                        onClick={() => handleConnect(platform)}
                        className="w-full"
                        data-testid={`button-connect-${platform}`}
                      >
                        {isConnecting ? (
                          'Connecting...'
                        ) : (
                          <>
                            <LinkIcon className="h-3 w-3 mr-2" />
                            Connect {status.name}
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Alert className="mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-sm">
            <strong>Setup Required:</strong> Each platform requires you to register a developer
            application and obtain OAuth credentials. Contact your administrator to configure these
            integrations.
          </AlertDescription>
        </Alert>
      </DialogContent>
    </Dialog>
  );
}
