import type { InsertSocialMetric } from "@shared/schema";

interface PlatformMetrics {
  followers?: number;
  following?: number;
  posts?: number;
  reach?: number;
  impressions?: number;
  engagement?: number;
  engagementRate?: string;
  profileViews?: number;
  websiteClicks?: number;
}

export async function fetchTwitterAnalytics(accessToken: string, accountId: string): Promise<PlatformMetrics> {
  try {
    // Twitter API v2 - Get user info and metrics
    const userResponse = await fetch('https://api.twitter.com/2/users/me?user.fields=public_metrics', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!userResponse.ok) {
      throw new Error(`Twitter API error: ${userResponse.status}`);
    }

    const userData = await userResponse.json();
    const metrics = userData.data?.public_metrics || {};

    return {
      followers: metrics.followers_count || 0,
      following: metrics.following_count || 0,
      posts: metrics.tweet_count || 0,
      // Twitter doesn't provide reach/impressions in basic API without ads account
      reach: 0,
      impressions: 0,
      engagement: 0,
      engagementRate: "0",
      profileViews: 0,
      websiteClicks: 0,
    };
  } catch (error) {
    console.error('Error fetching Twitter analytics:', error);
    throw error;
  }
}

export async function fetchInstagramAnalytics(accessToken: string, accountId: string): Promise<PlatformMetrics> {
  try {
    // Instagram Graph API - Requires Business/Creator account
    // First get the Instagram Business Account ID
    const igAccountResponse = await fetch(
      `https://graph.facebook.com/v18.0/me/accounts?fields=instagram_business_account&access_token=${accessToken}`
    );

    if (!igAccountResponse.ok) {
      throw new Error(`Instagram API error: ${igAccountResponse.status}`);
    }

    const accountData = await igAccountResponse.json();
    const igBusinessAccountId = accountData.data?.[0]?.instagram_business_account?.id;

    if (!igBusinessAccountId) {
      throw new Error('No Instagram Business Account found');
    }

    // Get insights
    const insightsResponse = await fetch(
      `https://graph.facebook.com/v18.0/${igBusinessAccountId}?fields=followers_count,follows_count,media_count&access_token=${accessToken}`
    );

    if (!insightsResponse.ok) {
      throw new Error(`Instagram insights API error: ${insightsResponse.status}`);
    }

    const insightsData = await insightsResponse.json();

    return {
      followers: insightsData.followers_count || 0,
      following: insightsData.follows_count || 0,
      posts: insightsData.media_count || 0,
      reach: 0, // Requires additional API calls with metrics permissions
      impressions: 0,
      engagement: 0,
      engagementRate: "0",
      profileViews: 0,
      websiteClicks: 0,
    };
  } catch (error) {
    console.error('Error fetching Instagram analytics:', error);
    throw error;
  }
}

export async function fetchYouTubeAnalytics(accessToken: string, accountId: string): Promise<PlatformMetrics> {
  try {
    // YouTube Data API v3 - Get channel info
    const channelResponse = await fetch(
      'https://www.googleapis.com/youtube/v3/channels?part=statistics&mine=true',
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (!channelResponse.ok) {
      throw new Error(`YouTube API error: ${channelResponse.status}`);
    }

    const channelData = await channelResponse.json();
    const stats = channelData.items?.[0]?.statistics || {};

    return {
      followers: parseInt(stats.subscriberCount) || 0,
      following: 0, // YouTube doesn't have "following"
      posts: parseInt(stats.videoCount) || 0,
      reach: 0,
      impressions: 0,
      engagement: parseInt(stats.commentCount) || 0,
      engagementRate: "0",
      profileViews: parseInt(stats.viewCount) || 0,
      websiteClicks: 0,
    };
  } catch (error) {
    console.error('Error fetching YouTube analytics:', error);
    throw error;
  }
}

export async function fetchTikTokAnalytics(accessToken: string, accountId: string): Promise<PlatformMetrics> {
  try {
    // TikTok Research API - Get user info
    const userResponse = await fetch(
      'https://open.tiktokapis.com/v2/user/info/?fields=follower_count,following_count,video_count',
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (!userResponse.ok) {
      throw new Error(`TikTok API error: ${userResponse.status}`);
    }

    const userData = await userResponse.json();
    const user = userData.data?.user || {};

    return {
      followers: user.follower_count || 0,
      following: user.following_count || 0,
      posts: user.video_count || 0,
      reach: 0, // Requires additional permissions
      impressions: 0,
      engagement: user.likes_count || 0,
      engagementRate: "0",
      profileViews: 0,
      websiteClicks: 0,
    };
  } catch (error) {
    console.error('Error fetching TikTok analytics:', error);
    throw error;
  }
}

export async function fetchTwitchAnalytics(accessToken: string, accountId: string): Promise<PlatformMetrics> {
  try {
    // Twitch API - Get user info first
    const userResponse = await fetch('https://api.twitch.tv/helix/users', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Client-Id': process.env.TWITCH_CLIENT_ID || '',
      },
    });

    if (!userResponse.ok) {
      throw new Error(`Twitch API error: ${userResponse.status}`);
    }

    const userData = await userResponse.json();
    const userId = userData.data?.[0]?.id;

    if (!userId) {
      throw new Error('Twitch user ID not found');
    }

    // Get follower count
    const followersResponse = await fetch(
      `https://api.twitch.tv/helix/channels/followers?broadcaster_id=${userId}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Client-Id': process.env.TWITCH_CLIENT_ID || '',
        },
      }
    );

    const followersData = await followersResponse.json();

    return {
      followers: followersData.total || 0,
      following: 0, // Twitch doesn't expose following count via API
      posts: 0, // Would need to count videos/clips
      reach: 0,
      impressions: 0,
      engagement: 0,
      engagementRate: "0",
      profileViews: parseInt(userData.data?.[0]?.view_count) || 0,
      websiteClicks: 0,
    };
  } catch (error) {
    console.error('Error fetching Twitch analytics:', error);
    throw error;
  }
}

export async function fetchFacebookAnalytics(accessToken: string, accountId: string): Promise<PlatformMetrics> {
  try {
    // Facebook Graph API - Get page info
    const pageResponse = await fetch(
      `https://graph.facebook.com/v18.0/me?fields=followers_count,fan_count&access_token=${accessToken}`
    );

    if (!pageResponse.ok) {
      throw new Error(`Facebook API error: ${pageResponse.status}`);
    }

    const pageData = await pageResponse.json();

    return {
      followers: pageData.followers_count || pageData.fan_count || 0,
      following: 0, // Facebook pages don't have "following"
      posts: 0, // Requires additional API call
      reach: 0, // Requires insights permissions
      impressions: 0,
      engagement: 0,
      engagementRate: "0",
      profileViews: 0,
      websiteClicks: 0,
    };
  } catch (error) {
    console.error('Error fetching Facebook analytics:', error);
    throw error;
  }
}

export async function fetchPlatformAnalytics(
  platform: string,
  accessToken: string,
  accountId: string
): Promise<PlatformMetrics> {
  switch (platform.toLowerCase()) {
    case 'twitter':
      return fetchTwitterAnalytics(accessToken, accountId);
    case 'instagram':
      return fetchInstagramAnalytics(accessToken, accountId);
    case 'youtube':
      return fetchYouTubeAnalytics(accessToken, accountId);
    case 'tiktok':
      return fetchTikTokAnalytics(accessToken, accountId);
    case 'twitch':
      return fetchTwitchAnalytics(accessToken, accountId);
    case 'facebook':
      return fetchFacebookAnalytics(accessToken, accountId);
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
}
