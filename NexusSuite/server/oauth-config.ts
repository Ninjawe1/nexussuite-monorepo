// OAuth configuration for social media platforms
// Each platform requires app registration and API credentials

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  authorizationUrl: string;
  tokenUrl: string;
  scope: string[];
  redirectUri: string;
}

export const OAUTH_PLATFORMS = {
  instagram: {
    name: "Instagram",
    authorizationUrl: "https://api.instagram.com/oauth/authorize",
    tokenUrl: "https://api.instagram.com/oauth/access_token",
    scope: ["user_profile", "user_media"],
    requiresBusinessAccount: true,
    note: "Requires Facebook Business account and app review",
  },
  twitter: {
    name: "Twitter / X",
    authorizationUrl: "https://twitter.com/i/oauth2/authorize",
    tokenUrl: "https://api.twitter.com/2/oauth2/token",
    scope: ["tweet.read", "users.read", "follows.read"],
    requiresPaidApi: true,
    note: "Requires paid API access ($100+/month)",
  },
  facebook: {
    name: "Facebook",
    authorizationUrl: "https://www.facebook.com/v18.0/dialog/oauth",
    tokenUrl: "https://graph.facebook.com/v18.0/oauth/access_token",
    scope: ["pages_show_list", "pages_read_engagement", "read_insights"],
    note: "Requires app review and business verification",
  },
  tiktok: {
    name: "TikTok",
    authorizationUrl: "https://www.tiktok.com/v2/auth/authorize",
    tokenUrl: "https://open.tiktokapis.com/v2/oauth/token",
    scope: ["user.info.basic", "video.list"],
    note: "Requires developer account and app approval",
  },
  youtube: {
    name: "YouTube",
    authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    scope: [
      "https://www.googleapis.com/auth/youtube.readonly",
      "https://www.googleapis.com/auth/yt-analytics.readonly",
    ],
    note: "Requires Google Cloud project and OAuth consent screen",
  },
  twitch: {
    name: "Twitch",
    authorizationUrl: "https://id.twitch.tv/oauth2/authorize",
    tokenUrl: "https://id.twitch.tv/oauth2/token",
    scope: ["user:read:email", "channel:read:subscriptions", "analytics:read:extensions"],
    note: "Requires Twitch developer account",
  },
};

function getBaseUrl(): string {
  // Production: Use REPLIT_DOMAINS (comma-separated list, take first)
  if (process.env.REPLIT_DOMAINS) {
    const domain = process.env.REPLIT_DOMAINS.split(',')[0];
    return `https://${domain}`;
  }
  
  // Development: Use REPLIT_DEV_DOMAIN or localhost
  if (process.env.REPLIT_DEV_DOMAIN) {
    return `https://${process.env.REPLIT_DEV_DOMAIN}`;
  }
  
  return "http://localhost:5000";
}

export function getOAuthConfig(platform: string, skipLogging = false): OAuthConfig | null {
  const platformConfig = OAUTH_PLATFORMS[platform as keyof typeof OAUTH_PLATFORMS];
  if (!platformConfig) return null;

  // Get platform-specific credentials from environment variables
  const envPrefix = platform.toUpperCase();
  const clientId = process.env[`${envPrefix}_CLIENT_ID`];
  const clientSecret = process.env[`${envPrefix}_CLIENT_SECRET`];

  // If credentials aren't configured, return null
  if (!clientId || !clientSecret) {
    if (!skipLogging) {
      console.log(`OAuth not configured for ${platform}. Missing ${envPrefix}_CLIENT_ID or ${envPrefix}_CLIENT_SECRET`);
    }
    return null;
  }

  const baseUrl = getBaseUrl();
  const redirectUri = `${baseUrl}/api/oauth/callback/${platform}`;

  return {
    clientId,
    clientSecret,
    authorizationUrl: platformConfig.authorizationUrl,
    tokenUrl: platformConfig.tokenUrl,
    scope: platformConfig.scope,
    redirectUri,
  };
}

export function isOAuthConfigured(platform: string): boolean {
  return getOAuthConfig(platform, true) !== null;
}

