# Social Media Analytics Integration Guide

## Overview

The Nexus Esports Suite now supports **automatic social media analytics fetching** using OAuth 2.0. Users can connect their social media accounts with a simple click - no manual API key entry required. The platform automatically pulls analytics data (followers, engagement, impressions, etc.) from connected accounts.

## Supported Platforms

- **Twitter/X** - Followers, tweets, public metrics
- **Instagram** - Followers, posts, business account insights
- **YouTube** - Subscribers, videos, views
- **TikTok** - Followers, videos, engagement
- **Twitch** - Followers, views, channel stats
- **Facebook** - Page followers, fan count

## How It Works

### 1. User Connects Account (OAuth Flow)

```
User clicks "Connect Account" 
  → Selects platform (e.g., Twitter)
  → Redirects to platform's login page
  → User authorizes the app
  → Platform redirects back with authorization code
  → Server exchanges code for access token
  → Access token stored securely in database
  → Analytics automatically fetched for the first time
```

### 2. Automatic Initial Sync

After successful OAuth connection, the system:
- Immediately calls the platform's API using the access token
- Fetches current analytics (followers, posts, engagement, etc.)
- Stores metrics in the database
- Updates the account's `lastSyncedAt` timestamp
- Creates audit log entries for tracking

### 3. Manual Refresh

Users can manually refresh analytics anytime:
- Click the "Sync" button on any connected account
- System fetches latest data from the platform
- Updates metrics in real-time
- Shows success/error feedback

## Setting Up OAuth for Each Platform

To enable OAuth for a platform, you need to:

### 1. Register a Developer App

Each platform requires you to create a developer application:

- **Twitter/X**: https://developer.twitter.com/en/portal/dashboard
- **Instagram**: https://developers.facebook.com/ (requires Facebook Business account)
- **YouTube**: https://console.cloud.google.com/
- **TikTok**: https://developers.tiktok.com/
- **Twitch**: https://dev.twitch.tv/console
- **Facebook**: https://developers.facebook.com/

### 2. Configure OAuth Redirect URIs

In your platform's developer settings, add these callback URLs:

**Production:**
```
https://your-app.replit.app/api/oauth/callback/twitter
https://your-app.replit.app/api/oauth/callback/instagram
https://your-app.replit.app/api/oauth/callback/youtube
https://your-app.replit.app/api/oauth/callback/tiktok
https://your-app.replit.app/api/oauth/callback/twitch
https://your-app.replit.app/api/oauth/callback/facebook
```

**Development:**
```
https://[your-repl].[your-username].replit.dev/api/oauth/callback/twitter
(repeat for other platforms)
```

### 3. Get Client Credentials

From your developer app, obtain:
- **Client ID** (sometimes called App ID or API Key)
- **Client Secret** (sometimes called App Secret)

### 4. Set Environment Variables

In your Replit project, add these environment variables:

```bash
# Twitter/X
TWITTER_CLIENT_ID=your_twitter_client_id
TWITTER_CLIENT_SECRET=your_twitter_client_secret

# Instagram (uses Facebook OAuth)
INSTAGRAM_CLIENT_ID=your_instagram_app_id
INSTAGRAM_CLIENT_SECRET=your_instagram_app_secret

# YouTube (uses Google OAuth)
YOUTUBE_CLIENT_ID=your_google_client_id
YOUTUBE_CLIENT_SECRET=your_google_client_secret

# TikTok
TIKTOK_CLIENT_ID=your_tiktok_client_key
TIKTOK_CLIENT_SECRET=your_tiktok_client_secret

# Twitch
TWITCH_CLIENT_ID=your_twitch_client_id
TWITCH_CLIENT_SECRET=your_twitch_client_secret

# Facebook
FACEBOOK_CLIENT_ID=your_facebook_app_id
FACEBOOK_CLIENT_SECRET=your_facebook_app_secret
```

## Platform-Specific Requirements

### Twitter/X
- **API Access Level**: Free tier works for basic metrics
- **Permissions**: Read user data, tweets
- **Metrics Available**: Followers, following, tweet count
- **Note**: Reach/impressions require Twitter Ads account

### Instagram
- **Account Type**: Requires Instagram Business or Creator account
- **Facebook Connection**: Must link Instagram to Facebook Page
- **Permissions**: instagram_basic, pages_read_engagement
- **Metrics Available**: Followers, following, media count

### YouTube
- **Google Cloud**: Create project in Google Cloud Console
- **API Enable**: Enable YouTube Data API v3
- **Permissions**: youtube.readonly
- **Metrics Available**: Subscribers, videos, views

### TikTok
- **Developer Account**: Apply for TikTok developer access
- **Approval**: May require business verification
- **Permissions**: user.info.basic, video.list
- **Metrics Available**: Followers, following, video count

### Twitch
- **App Type**: Select appropriate app category
- **Permissions**: user:read:email, channel:read:subscriptions
- **Metrics Available**: Followers, view count

### Facebook
- **Page Required**: Must have a Facebook Page (not personal profile)
- **Permissions**: pages_read_engagement
- **Metrics Available**: Page followers, fan count

## API Endpoints

### Check OAuth Configuration Status
```
GET /api/oauth/status
Returns: { platform: { configured: boolean, name: string, note?: string } }
```

### Initiate OAuth Flow
```
GET /api/oauth/init/:platform
Returns: { authUrl: string }
```

### OAuth Callback (handled automatically)
```
GET /api/oauth/callback/:platform?code=xxx&state=xxx
Redirects to: /marcom?oauth_success=true
```

### Sync Analytics Manually
```
POST /api/social/sync/:accountId
Returns: { success: true, metric: {...} }
```

### Get Aggregated Analytics
```
GET /api/social/analytics
Returns: {
  totalFollowers: number,
  totalReach: number,
  totalEngagement: number,
  avgEngagementRate: number,
  platforms: [...]
}
```

## Analytics Data Structure

The system tracks these metrics per account:

```typescript
{
  followers: number;        // Total followers/subscribers
  following: number;        // Accounts following (if available)
  posts: number;           // Total posts/videos/tweets
  reach: number;           // Total reach (if available)
  impressions: number;     // Total impressions (if available)
  engagement: number;      // Total engagement (likes, comments, shares)
  engagementRate: string;  // Engagement rate percentage
  profileViews: number;    // Profile/channel views
  websiteClicks: number;   // Website link clicks (if available)
  date: Date;             // Timestamp of sync
}
```

## Security Features

1. **State Tokens**: CSRF protection using cryptographically secure random tokens
2. **Session Storage**: State tokens stored server-side in sessions, not exposed to client
3. **Token Expiry**: OAuth state tokens expire after 10 minutes
4. **Automatic Cleanup**: Expired tokens cleaned up automatically
5. **Audit Logging**: All connections and syncs logged for accountability
6. **Secure Storage**: Access tokens encrypted in database

## Troubleshooting

### "OAuth Not Configured" Error
- Check environment variables are set correctly
- Verify CLIENT_ID and CLIENT_SECRET match platform credentials
- Restart the application after adding env vars

### "Token Exchange Failed" Error
- Verify redirect URI matches exactly in platform settings
- Check CLIENT_SECRET is correct
- Ensure platform app is in production mode (not development)

### "No Access Token" Error
- Platform may have denied access
- Check requested permissions/scopes are approved
- Verify app has necessary API access enabled

### Analytics Sync Fails
- Token may have expired (some platforms expire tokens)
- Account type may not support API access (e.g., Instagram personal account)
- Rate limits may be exceeded (wait and retry)

## Rate Limits & Best Practices

1. **Don't Over-Sync**: Most platforms have API rate limits
   - Recommended: Sync once per day for regular analytics
   - Manual sync available for immediate updates

2. **Token Refresh**: Some platforms provide refresh tokens
   - System stores refresh tokens for automatic renewal
   - Most tokens last 60-90 days before requiring re-authorization

3. **Error Handling**: Failed syncs don't disconnect accounts
   - Check audit logs for sync failures
   - Re-authorize if tokens expire

## User Experience Flow

1. **First Time Setup**:
   - Navigate to Marketing & Communications → Social Analytics tab
   - Click "Connect Account" button
   - Select platform from dialog
   - Redirected to platform login
   - Authorize the app
   - Redirected back to dashboard
   - Analytics automatically appear

2. **Daily Usage**:
   - View aggregated analytics on dashboard
   - Click "Sync" on any account to refresh
   - See last sync timestamp on each account
   - Disconnect accounts anytime

3. **Multi-Platform View**:
   - Total followers across all platforms
   - Combined reach and engagement
   - Average engagement rate
   - Per-platform breakdowns

## Future Enhancements

Potential improvements:
- Automatic scheduled syncs (hourly/daily)
- Historical trend charts
- Engagement rate benchmarks
- Post performance analytics
- Audience demographics (where available)
- Custom metric dashboards
