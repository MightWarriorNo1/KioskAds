import { supabase } from '../lib/supabaseClient';

// Types for admin operations
export interface AdminMetrics {
  totalUsers: number;
  activeKiosks: number;
  pendingReviews: number;
  platformRevenue: number;
  totalCampaigns: number;
  totalAds: number;
  recentSignups: number;
  monthlyGrowth: number;
  pendingHostAds: number;
  totalHostAds: number;
}

export interface AdReviewItem {
  id: string;
  user_id: string;
  campaign_id: string;
  file_name: string;
  file_path: string;
  file_type: 'image' | 'video';
  status: 'uploading' | 'processing' | 'approved' | 'rejected' | 'archived';
  created_at: string;
  updated_at: string;
  validation_errors: string[];
  user: {
    id: string;
    full_name: string;
    email: string;
    company_name?: string;
  };
  campaign: {
    id: string;
    name: string;
    start_date: string;
    end_date: string;
    budget: number;
  };
}

export interface CreativeOrder {
  id: string;
  user_id: string;
  service_id: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  requirements: any;
  final_delivery?: string;
  total_amount: number;
  created_at: string;
  updated_at: string;
  user: {
    id: string;
    full_name: string;
    email: string;
    company_name?: string;
  };
  service: {
    id: string;
    name: string;
    category: string;
    price: number;
    delivery_time: number;
  };
}

export interface CouponWithScopes {
  id: string;
  code: string;
  type: 'percentage' | 'fixed' | 'free';
  value: number;
  max_uses: number;
  current_uses: number;
  min_amount?: number;
  valid_from: string;
  valid_until: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  scopes: Array<{
    id: string;
    scope_type: 'role' | 'kiosk' | 'product' | 'subscription_tier';
    scope_value: string;
  }>;
}

export interface MarketingTool {
  id: string;
  type: 'announcement_bar' | 'popup' | 'testimonial' | 'sales_notification';
  title: string;
  content: string;
  settings: any;
  is_active: boolean;
  priority: number;
  target_audience: any;
  start_date?: string;
  end_date?: string;
  created_at: string;
  updated_at: string;
}

export interface Testimonial {
  id: string;
  client_name: string;
  client_company?: string;
  client_avatar_url?: string;
  content: string;
  rating?: number;
  is_featured: boolean;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SystemIntegration {
  id: string;
  name: string;
  type: 'stripe' | 'stripe_connect' | 'gmail' | 'google_drive' | 'google_oauth';
  status: 'connected' | 'disconnected' | 'error' | 'pending';
  config: any;
  last_sync?: string;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export interface AssetLifecycleItem {
  id: string;
  media_asset_id: string;
  campaign_id?: string;
  status: 'active' | 'archived' | 'deleted';
  google_drive_folder?: string;
  google_drive_file_id?: string;
  archived_at?: string;
  deleted_at?: string;
  restored_at?: string;
  created_at: string;
  updated_at: string;
  media_asset: {
    id: string;
    file_name: string;
    file_path: string;
    file_type: 'image' | 'video';
    user_id: string;
  };
  campaign?: {
    id: string;
    name: string;
    end_date: string;
  };
}

export interface EmailTemplate {
  id: string;
  name: string;
  type: 'ad_approval' | 'ad_rejection' | 'campaign_approved' | 'campaign_rejected' | 'welcome' | 'payment_confirmation';
  subject: string;
  body_html: string;
  body_text?: string;
  variables: any;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AdminCampaignItem {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  status: 'draft' | 'pending' | 'active' | 'paused' | 'completed' | 'rejected';
  start_date: string;
  end_date: string;
  budget: number;
  daily_budget?: number;
  target_locations?: string[];
  created_at: string;
  updated_at: string;
  total_spent?: number;
  total_cost?: number;
  total_slots?: number;
  impressions?: number;
  clicks?: number;
  max_video_duration?: number;
  user: {
    id: string;
    full_name: string;
    email: string;
    company_name?: string;
    role?: 'client' | 'host' | 'admin';
  };
}

export interface SystemSetting {
  id: string;
  key: string;
  value: any;
  description?: string;
  category: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export class AdminService {
  // Admin Analytics Methods
  // Returns metrics for admin analytics dashboard used by src/components/admin/Analytics.tsx
  static async getAnalyticsData(
    dateRange: { start: string; end: string },
    userType: 'all' | 'client' | 'host' = 'all'
  ): Promise<{
    totalPlays: number;
    totalImpressions: number;
    totalUsers: number;
    totalKiosks: number;
    playsGrowth: number;
    impressionsGrowth: number;
    averagePlayDuration: number;
    topPerformingKiosks: Array<{
      kioskId: string;
      kioskName: string;
      location: string;
      plays: number;
      impressions: number;
    }>;
    topPerformingUsers: Array<{
      userId: string;
      userName: string;
      userType: 'client' | 'host';
      plays: number;
      impressions: number;
    }>;
    playsByDay: Array<{ date: string; plays: number; impressions: number }>;
    playsByUserType: Array<{
      userType: 'client' | 'host';
      plays: number;
      impressions: number;
    }>;
  }> {
    try {
      const startIso = new Date(dateRange.start).toISOString();
      const endIso = new Date(dateRange.end).toISOString();

      // 1) Pull analytics events within range
      let eventsQuery = supabase
        .from('analytics_events')
        .select('campaign_id, event_type, timestamp')
        .gte('timestamp', startIso)
        .lte('timestamp', endIso);

      const { data: events, error: eventsError } = await eventsQuery;
      if (eventsError) throw eventsError;

      const campaignIds = [...new Set((events || []).map((e: any) => e.campaign_id).filter(Boolean))];

      // 2) Load related campaigns and their owners
      const { data: campaigns, error: campaignsError } = campaignIds.length > 0
        ? await supabase
            .from('campaigns')
            .select('id, name, user_id')
            .in('id', campaignIds)
        : { data: [], error: null } as any;
      if (campaignsError) throw campaignsError;

      const userIds = [...new Set((campaigns || []).map((c: any) => c.user_id).filter(Boolean))];
      const { data: profiles, error: profilesError } = userIds.length > 0
        ? await supabase
            .from('profiles')
            .select('id, full_name, role')
            .in('id', userIds)
        : { data: [], error: null } as any;
      if (profilesError) throw profilesError;

      const profileById = new Map((profiles || []).map((p: any) => [p.id, p]));
      const campaignById = new Map((campaigns || []).map((c: any) => [c.id, c]));

      // Optional filter by userType
      const filteredEvents = (events || []).filter((e: any) => {
        if (userType === 'all') return true;
        const campaign = campaignById.get(e.campaign_id);
        if (!campaign) return false;
        const owner = profileById.get(campaign.user_id);
        return owner?.role === userType;
      });

      // 3) Aggregate totals
      let totalPlays = 0;
      let totalImpressions = 0;
      const playsByDayMap = new Map<string, { plays: number; impressions: number }>();

      filteredEvents.forEach((e: any) => {
        const day = new Date(e.timestamp).toISOString().split('T')[0];
        const current = playsByDayMap.get(day) || { plays: 0, impressions: 0 };
        if (e.event_type === 'play') {
          totalPlays += 1;
          current.plays += 1;
        } else if (e.event_type === 'impression') {
          totalImpressions += 1;
          current.impressions += 1;
        }
        playsByDayMap.set(day, current);
      });

      const playsByDay = Array.from(playsByDayMap.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([date, v]) => ({ date, plays: v.plays, impressions: v.impressions }));

      // 4) Compute growth vs previous period
      const rangeMs = new Date(endIso).getTime() - new Date(startIso).getTime();
      const prevStart = new Date(new Date(startIso).getTime() - rangeMs).toISOString();
      const prevEnd = new Date(new Date(endIso).getTime() - rangeMs).toISOString();

      const { data: prevEvents } = await supabase
        .from('analytics_events')
        .select('campaign_id, event_type, timestamp')
        .gte('timestamp', prevStart)
        .lte('timestamp', prevEnd);

      let prevPlays = 0;
      let prevImpressions = 0;
      (prevEvents || []).forEach((e: any) => {
        if (e.event_type === 'play') prevPlays += 1;
        if (e.event_type === 'impression') prevImpressions += 1;
      });

      const playsGrowth = prevPlays > 0 ? ((totalPlays - prevPlays) / prevPlays) * 100 : 0;
      const impressionsGrowth = prevImpressions > 0 ? ((totalImpressions - prevImpressions) / prevImpressions) * 100 : 0;

      // 5) Average play duration (approximate): completions imply ~15s average
      const completions = filteredEvents.filter((e: any) => e.event_type === 'complete').length;
      const averagePlayDuration = totalPlays > 0 ? (completions / totalPlays) * 15 : 0;

      // 6) Top performing users by role
      const userAgg = new Map<string, { userId: string; userName: string; userType: 'client' | 'host'; plays: number; impressions: number }>();
      filteredEvents.forEach((e: any) => {
        const campaign = campaignById.get(e.campaign_id);
        if (!campaign) return;
        const owner = profileById.get(campaign.user_id);
        if (!owner) return;
        // Only client/host categorized
        const ownerRole = owner.role === 'host' ? 'host' : 'client';
        const current = userAgg.get(owner.id) || {
          userId: owner.id,
          userName: owner.full_name || 'Unknown',
          userType: ownerRole,
          plays: 0,
          impressions: 0
        };
        if (e.event_type === 'play') current.plays += 1;
        if (e.event_type === 'impression') current.impressions += 1;
        userAgg.set(owner.id, current);
      });

      const topPerformingUsers = Array.from(userAgg.values())
        .sort((a, b) => (b.plays + b.impressions) - (a.plays + a.impressions))
        .slice(0, 10);

      // 7) Plays by user type
      const playsByUserTypeMap = new Map<'client' | 'host', { plays: number; impressions: number }>([
        ['client', { plays: 0, impressions: 0 }],
        ['host', { plays: 0, impressions: 0 }]
      ]);
      topPerformingUsers.forEach(u => {
        const agg = playsByUserTypeMap.get(u.userType)!;
        agg.plays += u.plays;
        agg.impressions += u.impressions;
      });
      const playsByUserType = Array.from(playsByUserTypeMap.entries()).map(([userTypeKey, v]) => ({
        userType: userTypeKey,
        plays: v.plays,
        impressions: v.impressions
      }));

      // 8) Top performing kiosks - map campaigns to kiosks via kiosk_campaigns
      const kiosksByCampaign = await this.getKiosksByCampaignIds(campaignIds);
      const kioskAgg = new Map<string, { kioskId: string; kioskName: string; location: string; plays: number; impressions: number }>();
      filteredEvents.forEach((e: any) => {
        const kiosks = kiosksByCampaign[e.campaign_id] || [];
        kiosks.forEach((k: any) => {
          const current = kioskAgg.get(k.id) || {
            kioskId: k.id,
            kioskName: k.name || 'Kiosk',
            location: k.location || [k.city, k.state].filter(Boolean).join(', '),
            plays: 0,
            impressions: 0
          };
          if (e.event_type === 'play') current.plays += 1;
          if (e.event_type === 'impression') current.impressions += 1;
          kioskAgg.set(k.id, current);
        });
      });
      const topPerformingKiosks = Array.from(kioskAgg.values())
        .sort((a, b) => (b.plays + b.impressions) - (a.plays + a.impressions))
        .slice(0, 10);

      // 9) Totals independent of events
      const [usersCountRes, kiosksCountRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .maybeSingle()
          .eq('role', userType === 'all' ? undefined as any : userType),
        supabase
          .from('kiosks')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'active')
          .maybeSingle()
      ]);

      const totalUsers = (usersCountRes as any)?.count || 0;
      const totalKiosks = (kiosksCountRes as any)?.count || 0;

      return {
        totalPlays,
        totalImpressions,
        totalUsers,
        totalKiosks,
        playsGrowth,
        impressionsGrowth,
        averagePlayDuration,
        topPerformingKiosks,
        topPerformingUsers,
        playsByDay,
        playsByUserType
      };
    } catch (error) {
      console.error('Error building admin analytics data:', error);
      return {
        totalPlays: 0,
        totalImpressions: 0,
        totalUsers: 0,
        totalKiosks: 0,
        playsGrowth: 0,
        impressionsGrowth: 0,
        averagePlayDuration: 0,
        topPerformingKiosks: [],
        topPerformingUsers: [],
        playsByDay: [],
        playsByUserType: [
          { userType: 'client', plays: 0, impressions: 0 },
          { userType: 'host', plays: 0, impressions: 0 }
        ]
      };
    }
  }
  // Get admin dashboard metrics
  static async getDashboardMetrics(): Promise<AdminMetrics> {
    try {
      const [
        { count: totalUsers },
        { count: activeKiosks },
        { count: pendingReviews },
        { count: totalCampaigns },
        { count: totalAds },
        { count: recentSignups },
        { count: pendingHostAds },
        { count: totalHostAds }
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('kiosks').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('media_assets').select('*', { count: 'exact', head: true }).eq('status', 'processing'),
        supabase.from('campaigns').select('*', { count: 'exact', head: true }),
        supabase.from('media_assets').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
        supabase.from('host_ads').select('*', { count: 'exact', head: true }).eq('status', 'pending_review'),
        supabase.from('host_ads').select('*', { count: 'exact', head: true })
      ]);

      // Get platform revenue from invoices
      const { data: revenueData } = await supabase
        .from('invoices')
        .select('amount')
        .eq('status', 'paid');

      const platformRevenue = revenueData?.reduce((sum, invoice) => sum + Number(invoice.amount), 0) || 0;

      // Calculate monthly growth (simplified)
      const { count: lastMonthUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString())
        .lt('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      const monthlyGrowth = lastMonthUsers ? ((recentSignups || 0) - lastMonthUsers) / lastMonthUsers * 100 : 0;

      return {
        totalUsers: totalUsers || 0,
        activeKiosks: activeKiosks || 0,
        pendingReviews: pendingReviews || 0,
        platformRevenue,
        totalCampaigns: totalCampaigns || 0,
        totalAds: totalAds || 0,
        recentSignups: recentSignups || 0,
        monthlyGrowth: Math.round(monthlyGrowth * 100) / 100,
        pendingHostAds: pendingHostAds || 0,
        totalHostAds: totalHostAds || 0
      };
    } catch (error) {
      console.error('Error fetching admin metrics:', error);
      throw error;
    }
  }

  // Get kiosks linked to given campaign IDs
  static async getKiosksByCampaignIds(campaignIds: string[]): Promise<Record<string, any[]>> {
    if (!campaignIds || campaignIds.length === 0) return {};
    try {
      const { data, error } = await supabase
        .from('kiosk_campaigns')
        .select(`
          campaign_id,
          kiosk_id,
          kiosks: kiosks(*)
        `)
        .in('campaign_id', campaignIds);

      if (error) throw error;

      const result: Record<string, any[]> = {};
      (data || []).forEach((row: any) => {
        if (!result[row.campaign_id]) result[row.campaign_id] = [];
        if (row.kiosks) result[row.campaign_id].push(row.kiosks);
      });
      return result;
    } catch (error) {
      console.error('Error fetching kiosks by campaign IDs:', error);
      return {};
    }
  }

  // Get kiosks linked to given host ad IDs
  static async getKiosksByHostAdIds(hostAdIds: string[]): Promise<Record<string, any[]>> {
    if (!hostAdIds || hostAdIds.length === 0) return {};
    try {
      const { data, error } = await supabase
        .from('host_ad_assignments')
        .select(`
          ad_id,
          kiosk_id,
          kiosks: kiosks(*)
        `)
        .in('ad_id', hostAdIds);

      if (error) throw error;

      const result: Record<string, any[]> = {};
      (data || []).forEach((row: any) => {
        if (!result[row.ad_id]) result[row.ad_id] = [];
        if (row.kiosks) result[row.ad_id].push(row.kiosks);
      });
      return result;
    } catch (error) {
      console.error('Error fetching kiosks by host ad IDs:', error);
      return {};
    }
  }

  // Get all campaigns for admin view
  static async getAllCampaigns(): Promise<AdminCampaignItem[]> {
    try {
      // Step 1: get campaigns
      const { data: campaigns, error: campaignsError } = await supabase
        .from('campaigns')
        .select('*')
        .order('created_at', { ascending: false });

      if (campaignsError) throw campaignsError;

      if (!campaigns || campaigns.length === 0) return [];

      // Step 2: fetch user profiles for these campaigns
      const userIds = Array.from(new Set(campaigns.map((c: any) => c.user_id).filter(Boolean)));
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email, company_name, role')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      const profileById = new Map((profiles || []).map((p: any) => [p.id, p]));

      // Step 3: merge into AdminCampaignItem shape
      const merged: AdminCampaignItem[] = (campaigns as any[]).map((c) => {
        const user = profileById.get(c.user_id) || null;
        return {
          id: c.id,
          user_id: c.user_id,
          name: c.name,
          description: c.description,
          status: c.status,
          start_date: c.start_date,
          end_date: c.end_date,
          budget: Number(c.budget),
          daily_budget: c.daily_budget != null ? Number(c.daily_budget) : undefined,
          target_locations: c.target_locations,
          created_at: c.created_at,
          updated_at: c.updated_at,
          total_spent: c.total_spent != null ? Number(c.total_spent) : undefined,
          total_cost: c.total_cost != null ? Number(c.total_cost) : undefined,
          total_slots: c.total_slots != null ? Number(c.total_slots) : undefined,
          impressions: c.impressions != null ? Number(c.impressions) : undefined,
          clicks: c.clicks != null ? Number(c.clicks) : undefined,
          max_video_duration: c.max_video_duration != null ? Number(c.max_video_duration) : undefined,
          user: user
            ? {
                id: user.id,
                full_name: user.full_name,
                email: user.email,
                company_name: user.company_name,
                role: user.role
              }
            : undefined as any
        } as AdminCampaignItem;
      });

      return merged;
    } catch (error) {
      console.error('Error fetching all campaigns:', error);
      throw error;
    }
  }

  // Get ad review queue (client media assets)
  static async getAdReviewQueue(): Promise<AdReviewItem[]> {
    try {
      const { data, error } = await supabase
        .from('media_assets')
        .select(`
          *,
          user:profiles!media_assets_user_id_fkey(id, full_name, email, company_name),
          campaign:campaigns!media_assets_campaign_id_fkey(id, name, start_date, end_date, budget)
        `)
        .eq('status', 'pending_review')
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching ad review queue:', error);
      throw error;
    }
  }

  // Get host ads review queue
  static async getHostAdsReviewQueue(): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('host_ads')
        .select(`
          *,
          host:profiles!host_ads_host_id_fkey(id, full_name, email, company_name)
        `)
        .in('status', ['pending_review'])
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching host ads review queue:', error);
      throw error;
    }
  }

  // Get swapped assets for review (both media assets and host ads)
  static async getSwappedAssetsForReview(): Promise<any[]> {
    try {
      const [swappedMediaAssets, swappedHostAds] = await Promise.all([
        // Get swapped media assets
        supabase
          .from('media_assets')
          .select(`
            *,
            user:profiles!media_assets_user_id_fkey(id, full_name, email, company_name)
          `)
          .eq('status', 'swapped')
          .order('updated_at', { ascending: true }),
        
        // Get swapped host ads
        supabase
          .from('host_ads')
          .select(`
            *,
            host:profiles!host_ads_host_id_fkey(id, full_name, email, company_name)
          `)
          .eq('status', 'swapped')
          .order('updated_at', { ascending: true })
      ]);

      if (swappedMediaAssets.error) throw swappedMediaAssets.error;
      if (swappedHostAds.error) throw swappedHostAds.error;

      // Combine and format the results
      const mediaAssets = (swappedMediaAssets.data || []).map(asset => ({
        ...asset,
        type: 'media_asset',
        asset_type: 'Client Media Asset'
      }));

      const hostAds = (swappedHostAds.data || []).map(ad => ({
        ...ad,
        type: 'host_ad',
        asset_type: 'Host Ad'
      }));

      return [...mediaAssets, ...hostAds].sort((a, b) => 
        new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime()
      );
    } catch (error) {
      console.error('Error fetching swapped assets for review:', error);
      throw error;
    }
  }

  // Get pending campaigns for review
  static async getPendingCampaigns(): Promise<any[]> {
    try {
      // Fetch pending campaigns with user role
      const { data: campaigns, error: campaignsError } = await supabase
        .from('campaigns')
        .select(`
          *,
          user:profiles!campaigns_user_id_fkey(id, full_name, email, company_name, role)
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: true });

      if (campaignsError) throw campaignsError;
      const list = campaigns || [];

      if (list.length === 0) return [];

      // Fetch media assets linked to these campaigns via media_assets.campaign_id
      const campaignIds = list.map((c: any) => c.id);
      const { data: assets, error: assetsError } = await supabase
        .from('media_assets')
        .select('id, file_type, file_path, status, campaign_id')
        .in('campaign_id', campaignIds);

      if (assetsError) throw assetsError;
      const assetsByCampaign = new Map<string, any[]>([]);
      (assets || []).forEach((a: any) => {
        const arr = assetsByCampaign.get(a.campaign_id) || [];
        arr.push(a);
        assetsByCampaign.set(a.campaign_id, arr);
      });

      // Attach assets array to each campaign
      const enriched = list.map((c: any) => ({
        ...c,
        assets: assetsByCampaign.get(c.id) || []
      }));

      return enriched;
    } catch (error) {
      console.error('Error fetching pending campaigns:', error);
      throw error;
    }
  }

  // Get all ads for review (both client and host ads)
  static async getAllAdsForReview(): Promise<{
    clientAds: AdReviewItem[];
    hostAds: any[];
    pendingClientCampaigns: any[];
    pendingHostCampaigns: any[];
    swappedAssets: any[];
  }> {
    try {
      const [clientAds, hostAds, pendingCampaigns, swappedAssets] = await Promise.all([
        this.getAdReviewQueue(),
        this.getHostAdsReviewQueue(),
        this.getPendingCampaigns(),
        this.getSwappedAssetsForReview()
      ]);

      const pendingClientCampaigns = (pendingCampaigns || []).filter((c: any) => c?.user?.role !== 'host');
      const pendingHostCampaigns = (pendingCampaigns || []).filter((c: any) => c?.user?.role === 'host');

      return { clientAds, hostAds, pendingClientCampaigns, pendingHostCampaigns, swappedAssets };
    } catch (error) {
      console.error('Error fetching all ads for review:', error);
      throw error;
    }
  }

  // Approve or reject client ad (media asset)
  static async reviewAd(mediaAssetId: string, action: 'approve' | 'reject', rejectionReason?: string): Promise<void> {
    try {
      const status = action === 'approve' ? 'approved' : 'rejected';
      
      const { error, data } = await supabase
        .from('media_assets')
        .update({ 
          status,
          updated_at: new Date().toISOString(),
          ...(action === 'reject' && rejectionReason ? { validation_errors: [rejectionReason] } : {})
        })
        .eq('id', mediaAssetId)
        .select('id')
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        throw new Error('Ad review update failed: media asset not found or not permitted');
      }

      // Log admin action
      await this.logAdminAction('review_ad', 'media_asset', mediaAssetId, {
        action,
        rejection_reason: rejectionReason
      });

      // Send email notification
      if (action === 'approve') {
        await this.sendAdApprovalEmail(mediaAssetId);
      } else {
        await this.sendAdRejectionEmail(mediaAssetId, rejectionReason);
      }
    } catch (error) {
      console.error('Error reviewing ad:', error);
      throw error;
    }
  }

  // Approve or reject host ad
  static async reviewHostAd(hostAdId: string, action: 'approve' | 'reject', rejectionReason?: string): Promise<void> {
    try {
      const status = action === 'approve' ? 'approved' : 'rejected';
      
      const { error, data } = await supabase
        .from('host_ads')
        .update({ 
          status,
          updated_at: new Date().toISOString(),
          ...(action === 'reject' && rejectionReason ? { rejection_reason: rejectionReason } : {})
        })
        .eq('id', hostAdId)
        .select('id')
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        throw new Error('Host ad review update failed: host ad not found or not permitted');
      }

      // If approved, reactivate ads that were previously active (due to asset change) and have current assignments
      if (action === 'approve') {
        // Check if the ad has any active window assignments (now to future)
        const nowIso = new Date().toISOString();
        const { data: assignments } = await supabase
          .from('host_ad_assignments')
          .select('id')
          .eq('ad_id', hostAdId)
          .lte('start_date', nowIso)
          .gte('end_date', nowIso);

        if (assignments && assignments.length > 0) {
          // Set ad status to active
          await supabase
            .from('host_ads')
            .update({ status: 'active', updated_at: new Date().toISOString() })
            .eq('id', hostAdId);
        }
      }

      // Log admin action
      await this.logAdminAction('review_host_ad', 'host_ad', hostAdId, {
        action,
        rejection_reason: rejectionReason
      });

      // Send email notification to host
      if (action === 'approve') {
        await this.sendHostAdApprovalEmail(hostAdId);
      } else {
        await this.sendHostAdRejectionEmail(hostAdId, rejectionReason);
      }
    } catch (error) {
      console.error('Error reviewing host ad:', error);
      throw error;
    }
  }

  // Review swapped asset (media asset or host ad)
  static async reviewSwappedAsset(
    assetId: string, 
    assetType: 'media_asset' | 'host_ad', 
    action: 'approve' | 'reject', 
    rejectionReason?: string
  ): Promise<void> {
    try {
      if (assetType === 'media_asset') {
        await this.reviewSwappedMediaAsset(assetId, action, rejectionReason);
      } else if (assetType === 'host_ad') {
        await this.reviewSwappedHostAd(assetId, action, rejectionReason);
      } else {
        throw new Error('Invalid asset type for review');
      }
    } catch (error) {
      console.error('Error reviewing swapped asset:', error);
      throw error;
    }
  }

  // Review swapped media asset
  private static async reviewSwappedMediaAsset(
    mediaAssetId: string, 
    action: 'approve' | 'reject', 
    rejectionReason?: string
  ): Promise<void> {
    try {
      const status = action === 'approve' ? 'approved' : 'rejected';
      
      const { error, data } = await supabase
        .from('media_assets')
        .update({ 
          status,
          updated_at: new Date().toISOString(),
          ...(action === 'reject' && rejectionReason ? { validation_errors: [rejectionReason] } : {})
        })
        .eq('id', mediaAssetId)
        .select('id')
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        throw new Error('Media asset review update failed: asset not found or not permitted');
      }

      // Log admin action
      await this.logAdminAction('review_swapped_media_asset', 'media_asset', mediaAssetId, {
        action,
        rejection_reason: rejectionReason
      });

      // Send email notification
      if (action === 'approve') {
        await this.sendAdApprovalEmail(mediaAssetId);
      } else {
        await this.sendAdRejectionEmail(mediaAssetId, rejectionReason);
      }
    } catch (error) {
      console.error('Error reviewing swapped media asset:', error);
      throw error;
    }
  }

  // Review swapped host ad
  private static async reviewSwappedHostAd(
    hostAdId: string, 
    action: 'approve' | 'reject', 
    rejectionReason?: string
  ): Promise<void> {
    try {
      const status = action === 'approve' ? 'approved' : 'rejected';
      
      const { error, data } = await supabase
        .from('host_ads')
        .update({ 
          status,
          updated_at: new Date().toISOString(),
          ...(action === 'reject' && rejectionReason ? { rejection_reason: rejectionReason } : {})
        })
        .eq('id', hostAdId)
        .select('id')
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        throw new Error('Host ad review update failed: ad not found or not permitted');
      }

      // Log admin action
      await this.logAdminAction('review_swapped_host_ad', 'host_ad', hostAdId, {
        action,
        rejection_reason: rejectionReason
      });

      // Send email notification
      if (action === 'approve') {
        await this.sendHostAdApprovalEmail(hostAdId);
      } else {
        await this.sendHostAdRejectionEmail(hostAdId, rejectionReason);
      }

      // If approved, check if there are active assignments and set ad to active
      if (action === 'approve') {
        const nowIso = new Date().toISOString();
        const { data: assignments } = await supabase
          .from('host_ad_assignments')
          .select('id')
          .eq('ad_id', hostAdId)
          .eq('status', 'approved')
          .lte('start_date', nowIso)
          .gte('end_date', nowIso);

        if (assignments && assignments.length > 0) {
          // Set ad status to active
          await supabase
            .from('host_ads')
            .update({ status: 'active', updated_at: new Date().toISOString() })
            .eq('id', hostAdId);
        }
      }
    } catch (error) {
      console.error('Error reviewing swapped host ad:', error);
      throw error;
    }
  }

  // Approve or reject campaign
  static async reviewCampaign(campaignId: string, action: 'approve' | 'reject', rejectionReason?: string): Promise<void> {
    try {
      const status = action === 'approve' ? 'active' : 'rejected';
      
      const { error, data } = await supabase
        .from('campaigns')
        .update({ 
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', campaignId)
        .select('id')
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        throw new Error('Campaign review update failed: campaign not found or not permitted');
      }

      // Log admin action
      await this.logAdminAction('review_campaign', 'campaign', campaignId, {
        action,
        rejection_reason: rejectionReason
      });

      // Send email notification to client
      if (action === 'approve') {
        await this.sendCampaignApprovalEmail(campaignId);
      } else {
        await this.sendCampaignRejectionEmail(campaignId, rejectionReason);
      }
    } catch (error) {
      console.error('Error reviewing campaign:', error);
      throw error;
    }
  }

  // Get creative orders
  static async getCreativeOrders(): Promise<CreativeOrder[]> {
    try {
      const { data, error } = await supabase
        .from('service_orders')
        .select(`
          *,
          user:profiles!service_orders_user_id_fkey(id, full_name, email, company_name),
          service:creative_services!service_orders_service_id_fkey(id, name, category, price, delivery_time)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching creative orders:', error);
      throw error;
    }
  }

  // Update creative order status
  static async updateCreativeOrderStatus(orderId: string, status: string, finalDelivery?: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('service_orders')
        .update({ 
          status,
          final_delivery: finalDelivery,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (error) throw error;

      await this.logAdminAction('update_creative_order', 'service_order', orderId, {
        status,
        final_delivery: finalDelivery
      });
    } catch (error) {
      console.error('Error updating creative order:', error);
      throw error;
    }
  }

  // Get coupons with scopes
  static async getCoupons(): Promise<CouponWithScopes[]> {
    try {
      const { data: coupons, error } = await supabase
        .from('coupon_codes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get scopes for each coupon
      const couponsWithScopes = await Promise.all(
        (coupons || []).map(async (coupon) => {
          const { data: scopes } = await supabase
            .from('coupon_scopes')
            .select('*')
            .eq('coupon_id', coupon.id);

          return {
            ...coupon,
            scopes: scopes || []
          };
        })
      );

      return couponsWithScopes;
    } catch (error) {
      console.error('Error fetching coupons:', error);
      throw error;
    }
  }

  // Create coupon
  static async createCoupon(couponData: any): Promise<string> {
    try {
      const { data, error } = await supabase
        .from('coupon_codes')
        .insert(couponData)
        .select('id')
        .single();

      if (error) throw error;

      await this.logAdminAction('create_coupon', 'coupon_code', data.id, couponData);
      return data.id;
    } catch (error) {
      console.error('Error creating coupon:', error);
      throw error;
    }
  }

  // Update coupon
  static async updateCoupon(couponId: string, updates: any): Promise<void> {
    try {
      const { error } = await supabase
        .from('coupon_codes')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', couponId);

      if (error) throw error;

      await this.logAdminAction('update_coupon', 'coupon_code', couponId, updates);
    } catch (error) {
      console.error('Error updating coupon:', error);
      throw error;
    }
  }

  // Get marketing tools
  static async getMarketingTools(): Promise<MarketingTool[]> {
    try {
      const { data, error } = await supabase
        .from('marketing_tools')
        .select('*')
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching marketing tools:', error);
      throw error;
    }
  }

  // Create marketing tool
  static async createMarketingTool(toolData: any): Promise<string> {
    try {
      const { data, error } = await supabase
        .from('marketing_tools')
        .insert(toolData)
        .select('id')
        .single();

      if (error) throw error;

      await this.logAdminAction('create_marketing_tool', 'marketing_tool', data.id, toolData);
      return data.id;
    } catch (error) {
      console.error('Error creating marketing tool:', error);
      throw error;
    }
  }

  // Update marketing tool
  static async updateMarketingTool(toolId: string, updates: any): Promise<void> {
    try {
      const { error } = await supabase
        .from('marketing_tools')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', toolId);

      if (error) throw error;

      await this.logAdminAction('update_marketing_tool', 'marketing_tool', toolId, updates);
    } catch (error) {
      console.error('Error updating marketing tool:', error);
      throw error;
    }
  }

  // Delete marketing tool
  static async deleteMarketingTool(toolId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('marketing_tools')
        .delete()
        .eq('id', toolId);

      if (error) throw error;

      await this.logAdminAction('delete_marketing_tool', 'marketing_tool', toolId, {});
    } catch (error) {
      console.error('Error deleting marketing tool:', error);
      throw error;
    }
  }

  // Get testimonials
  static async getTestimonials(): Promise<Testimonial[]> {
    try {
      const { data, error } = await supabase
        .from('testimonials')
        .select('*')
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching testimonials:', error);
      throw error;
    }
  }

  // Create testimonial
  static async createTestimonial(testimonialData: any): Promise<string> {
    try {
      const { data, error } = await supabase
        .from('testimonials')
        .insert(testimonialData)
        .select('id')
        .single();

      if (error) throw error;

      await this.logAdminAction('create_testimonial', 'testimonial', data.id, testimonialData);
      return data.id;
    } catch (error) {
      console.error('Error creating testimonial:', error);
      throw error;
    }
  }

  // Update testimonial
  static async updateTestimonial(testimonialId: string, updates: any): Promise<void> {
    try {
      const { error } = await supabase
        .from('testimonials')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', testimonialId);

      if (error) throw error;

      await this.logAdminAction('update_testimonial', 'testimonial', testimonialId, updates);
    } catch (error) {
      console.error('Error updating testimonial:', error);
      throw error;
    }
  }

  // Delete testimonial
  static async deleteTestimonial(testimonialId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('testimonials')
        .delete()
        .eq('id', testimonialId);

      if (error) throw error;

      await this.logAdminAction('delete_testimonial', 'testimonial', testimonialId, {});
    } catch (error) {
      console.error('Error deleting testimonial:', error);
      throw error;
    }
  }

  // Get system integrations
  static async getSystemIntegrations(): Promise<SystemIntegration[]> {
    try {
      const { data, error } = await supabase
        .from('system_integrations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching system integrations:', error);
      throw error;
    }
  }

  // Update integration status
  static async updateIntegrationStatus(integrationId: string, status: string, config?: any): Promise<void> {
    try {
      const { error } = await supabase
        .from('system_integrations')
        .update({ 
          status,
          config: config || {},
          last_sync: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', integrationId);

      if (error) throw error;

      await this.logAdminAction('update_integration', 'system_integration', integrationId, {
        status,
        config
      });
    } catch (error) {
      console.error('Error updating integration:', error);
      throw error;
    }
  }

  // Get asset lifecycle items
  static async getAssetLifecycle(): Promise<AssetLifecycleItem[]> {
    try {
      const { data, error } = await supabase
        .from('asset_lifecycle')
        .select(`
          *,
          media_asset:media_assets!asset_lifecycle_media_asset_id_fkey(id, file_name, file_path, file_type, user_id),
          campaign:campaigns!asset_lifecycle_campaign_id_fkey(id, name, end_date)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Filter out records where media_asset is null (deleted media assets)
      const validData = (data || []).filter(item => item.media_asset !== null);
      
      if (validData.length !== (data || []).length) {
        console.warn(`Filtered out ${(data || []).length - validData.length} asset lifecycle records with missing media assets`);
      }
      
      return validData;
    } catch (error) {
      console.error('Error fetching asset lifecycle:', error);
      throw error;
    }
  }

  // Restore archived asset
  static async restoreAsset(assetId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('asset_lifecycle')
        .update({ 
          status: 'active',
          google_drive_folder: 'active',
          restored_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', assetId);

      if (error) throw error;

      await this.logAdminAction('restore_asset', 'asset_lifecycle', assetId);
    } catch (error) {
      console.error('Error restoring asset:', error);
      throw error;
    }
  }

  // Get email templates
  static async getEmailTemplates(): Promise<EmailTemplate[]> {
    try {
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .order('type', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching email templates:', error);
      throw error;
    }
  }

  // Get system settings
  static async getSystemSettings(): Promise<SystemSetting[]> {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .order('category', { ascending: true })
        .order('key', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching system settings:', error);
      throw error;
    }
  }

  // Update system setting
  static async updateSystemSetting(key: string, value: any): Promise<void> {
    try {
      const { error } = await supabase
        .from('system_settings')
        .update({ 
          value,
          updated_at: new Date().toISOString()
        })
        .eq('key', key);

      if (error) throw error;

      await this.logAdminAction('update_system_setting', 'system_setting', null, {
        key,
        value
      });
    } catch (error) {
      console.error('Error updating system setting:', error);
      throw error;
    }
  }

  // Export users to CSV
  static async exportUsers(): Promise<string> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const csvHeaders = 'ID,Email,Full Name,Role,Company,Subscription Tier,Created At\n';
      const csvRows = (data || []).map(user => 
        `${user.id},${user.email},${user.full_name},${user.role},${user.company_name || ''},${user.subscription_tier},${user.created_at}`
      ).join('\n');

      return csvHeaders + csvRows;
    } catch (error) {
      console.error('Error exporting users:', error);
      throw error;
    }
  }

  // Export kiosks to CSV
  static async exportKiosks(): Promise<string> {
    try {
      const { data, error } = await supabase
        .from('kiosks')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const csvHeaders = 'ID,Name,Location,Address,City,State,Traffic Level,Base Rate,Price,Status,Created At\n';
      const csvRows = (data || []).map(kiosk => 
        `${kiosk.id},${kiosk.name},${kiosk.location},${kiosk.address},${kiosk.city},${kiosk.state},${kiosk.traffic_level},${kiosk.base_rate},${kiosk.price},${kiosk.status},${kiosk.created_at}`
      ).join('\n');

      return csvHeaders + csvRows;
    } catch (error) {
      console.error('Error exporting kiosks:', error);
      throw error;
    }
  }

  // Import users from CSV
  static async importUsers(csvData: string): Promise<{ success: number; errors: string[] }> {
    try {
      const lines = csvData.split('\n').filter(line => line.trim());
      const headers = lines[0].split(',');
      const errors: string[] = [];
      let success = 0;

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',');
        if (values.length !== headers.length) {
          errors.push(`Row ${i + 1}: Invalid number of columns`);
          continue;
        }

        const userData = {
          email: values[0],
          full_name: values[1],
          role: values[2] || 'client',
          company_name: values[3] || null,
          subscription_tier: values[4] || 'free'
        };

        try {
          const { error } = await supabase
            .from('profiles')
            .insert(userData);

          if (error) {
            errors.push(`Row ${i + 1}: ${error.message}`);
          } else {
            success++;
          }
        } catch (err) {
          errors.push(`Row ${i + 1}: ${err}`);
        }
      }

      await this.logAdminAction('import_users', 'profiles', null, {
        success_count: success,
        error_count: errors.length
      });

      return { success, errors };
    } catch (error) {
      console.error('Error importing users:', error);
      throw error;
    }
  }

  // Log admin action
  static async logAdminAction(
    action: string,
    resourceType: string,
    resourceId: string | null,
    details: any = {},
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('admin_audit_log')
        .insert({
          admin_id: user.id,
          action,
          resource_type: resourceType,
          resource_id: resourceId,
          details,
          ip_address: ipAddress,
          user_agent: userAgent
        });

      if (error) {
        console.error('Error logging admin action:', error);
      }
    } catch (error) {
      console.error('Error logging admin action:', error);
    }
  }

  // Get recent admin activity
  static async getRecentAdminActivity(limit: number = 10): Promise<Array<{ action: string; time: string; type: 'success' | 'info' | 'warning' | 'error'; }>> {
    try {
      const { data, error } = await supabase
        .from('admin_audit_log')
        .select(`
          action,
          created_at,
          details,
          admin:profiles!admin_audit_log_admin_id_fkey(full_name, email)
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching recent admin activity:', error);
        return [];
      }

      return data?.map(activity => ({
        action: activity.action,
        time: new Date(activity.created_at).toLocaleString(),
        type: this.getActivityType(activity.action)
      })) || [];
    } catch (error) {
      console.error('Error fetching recent admin activity:', error);
      return [];
    }
  }

  // Helper method to determine activity type based on action
  private static getActivityType(action: string): 'success' | 'info' | 'warning' | 'error' {
    const lowerAction = action.toLowerCase();
    
    if (lowerAction.includes('approve') || lowerAction.includes('create') || lowerAction.includes('update')) {
      return 'success';
    } else if (lowerAction.includes('reject') || lowerAction.includes('delete') || lowerAction.includes('remove')) {
      return 'error';
    } else if (lowerAction.includes('warning') || lowerAction.includes('alert')) {
      return 'warning';
    } else {
      return 'info';
    }
  }

  // Send ad approval email
  private static async sendAdApprovalEmail(mediaAssetId: string): Promise<void> {
    try {
      // Get media asset and campaign details
      const { data: mediaAsset } = await supabase
        .from('media_assets')
        .select(`
          *,
          user:profiles!media_assets_user_id_fkey(id, full_name, email),
          campaign:campaigns!media_assets_campaign_id_fkey(id, name, start_date, end_date, budget)
        `)
        .eq('id', mediaAssetId)
        .single();

      if (!mediaAsset) return;

      // Get email template
      const { data: template } = await supabase
        .from('email_templates')
        .select('*')
        .eq('type', 'ad_approval')
        .eq('is_active', true)
        .single();

      if (!template) return;

      // Queue email
      await supabase
        .from('email_queue')
        .insert({
          template_id: template.id,
          recipient_email: mediaAsset.user.email,
          recipient_name: mediaAsset.user.full_name,
          subject: template.subject.replace('{{campaign_name}}', mediaAsset.campaign.name),
          body_html: template.body_html
            .replace('{{campaign_name}}', mediaAsset.campaign.name)
            .replace('{{start_date}}', new Date(mediaAsset.campaign.start_date).toLocaleDateString())
            .replace('{{end_date}}', new Date(mediaAsset.campaign.end_date).toLocaleDateString())
            .replace('{{budget}}', mediaAsset.campaign.budget.toString()),
          body_text: template.body_text
            ?.replace('{{campaign_name}}', mediaAsset.campaign.name)
            .replace('{{start_date}}', new Date(mediaAsset.campaign.start_date).toLocaleDateString())
            .replace('{{end_date}}', new Date(mediaAsset.campaign.end_date).toLocaleDateString())
            .replace('{{budget}}', mediaAsset.campaign.budget.toString())
        });
    } catch (error) {
      console.error('Error sending ad approval email:', error);
    }
  }

  // Send ad rejection email
  private static async sendAdRejectionEmail(mediaAssetId: string, rejectionReason?: string): Promise<void> {
    try {
      // Get media asset and campaign details
      const { data: mediaAsset } = await supabase
        .from('media_assets')
        .select(`
          *,
          user:profiles!media_assets_user_id_fkey(id, full_name, email),
          campaign:campaigns!media_assets_campaign_id_fkey(id, name)
        `)
        .eq('id', mediaAssetId)
        .single();

      if (!mediaAsset) return;

      // Get email template
      const { data: template } = await supabase
        .from('email_templates')
        .select('*')
        .eq('type', 'ad_rejection')
        .eq('is_active', true)
        .single();

      if (!template) return;

      // Queue email
      await supabase
        .from('email_queue')
        .insert({
          template_id: template.id,
          recipient_email: mediaAsset.user.email,
          recipient_name: mediaAsset.user.full_name,
          subject: template.subject.replace('{{campaign_name}}', mediaAsset.campaign.name),
          body_html: template.body_html
            .replace('{{campaign_name}}', mediaAsset.campaign.name)
            .replace('{{rejection_reason}}', rejectionReason || 'Content does not meet our guidelines'),
          body_text: template.body_text
            ?.replace('{{campaign_name}}', mediaAsset.campaign.name)
            .replace('{{rejection_reason}}', rejectionReason || 'Content does not meet our guidelines')
        });
    } catch (error) {
      console.error('Error sending ad rejection email:', error);
    }
  }

  // Send host ad approval email
  private static async sendHostAdApprovalEmail(hostAdId: string): Promise<void> {
    try {
      // Get host ad and host details
      const { data: hostAd } = await supabase
        .from('host_ads')
        .select(`
          *,
          host:profiles!host_ads_host_id_fkey(id, full_name, email)
        `)
        .eq('id', hostAdId)
        .single();

      if (!hostAd) return;

      // Get email template
      const { data: template } = await supabase
        .from('email_templates')
        .select('*')
        .eq('type', 'host_ad_approval')
        .eq('is_active', true)
        .single();

      if (!template) return;

      // Send email
      await supabase.functions.invoke('send-email', {
        body: {
          to: hostAd.host.email,
          subject: template.subject.replace('{{ad_name}}', hostAd.name),
          body_html: template.body_html.replace('{{ad_name}}', hostAd.name),
          body_text: template.body_text?.replace('{{ad_name}}', hostAd.name)
        }
      });
    } catch (error) {
      console.error('Error sending host ad approval email:', error);
    }
  }

  // Send host ad rejection email
  private static async sendHostAdRejectionEmail(hostAdId: string, rejectionReason?: string): Promise<void> {
    try {
      // Get host ad and host details
      const { data: hostAd } = await supabase
        .from('host_ads')
        .select(`
          *,
          host:profiles!host_ads_host_id_fkey(id, full_name, email)
        `)
        .eq('id', hostAdId)
        .single();

      if (!hostAd) return;

      // Get email template
      const { data: template } = await supabase
        .from('email_templates')
        .select('*')
        .eq('type', 'host_ad_rejection')
        .eq('is_active', true)
        .single();

      if (!template) return;

      // Send email
      await supabase.functions.invoke('send-email', {
        body: {
          to: hostAd.host.email,
          subject: template.subject.replace('{{ad_name}}', hostAd.name),
          body_html: template.body_html
            .replace('{{ad_name}}', hostAd.name)
            .replace('{{rejection_reason}}', rejectionReason || 'Content does not meet our guidelines'),
          body_text: template.body_text
            ?.replace('{{ad_name}}', hostAd.name)
            .replace('{{rejection_reason}}', rejectionReason || 'Content does not meet our guidelines')
        }
      });
    } catch (error) {
      console.error('Error sending host ad rejection email:', error);
    }
  }

  // Send campaign approval email
  private static async sendCampaignApprovalEmail(campaignId: string): Promise<void> {
    try {
      // Get campaign and user details
      const { data: campaign } = await supabase
        .from('campaigns')
        .select(`
          *,
          user:profiles!campaigns_user_id_fkey(id, full_name, email)
        `)
        .eq('id', campaignId)
        .single();

      if (!campaign) return;

      // Get email template
      const { data: template } = await supabase
        .from('email_templates')
        .select('*')
        .eq('type', 'campaign_approved')
        .eq('is_active', true)
        .single();

      if (!template) return;

      // Queue email
      await supabase
        .from('email_queue')
        .insert({
          template_id: template.id,
          recipient_email: campaign.user.email,
          recipient_name: campaign.user.full_name,
          subject: template.subject.replace('{{campaign_name}}', campaign.name),
          body_html: template.body_html
            .replace('{{campaign_name}}', campaign.name)
            .replace('{{start_date}}', new Date(campaign.start_date).toLocaleDateString())
            .replace('{{end_date}}', new Date(campaign.end_date).toLocaleDateString())
            .replace('{{budget}}', campaign.budget.toString()),
          body_text: template.body_text
            ?.replace('{{campaign_name}}', campaign.name)
            .replace('{{start_date}}', new Date(campaign.start_date).toLocaleDateString())
            .replace('{{end_date}}', new Date(campaign.end_date).toLocaleDateString())
            .replace('{{budget}}', campaign.budget.toString())
        });
    } catch (error) {
      console.error('Error sending campaign approval email:', error);
    }
  }

  // Send campaign rejection email
  private static async sendCampaignRejectionEmail(campaignId: string, rejectionReason?: string): Promise<void> {
    try {
      // Get campaign and user details
      const { data: campaign } = await supabase
        .from('campaigns')
        .select(`
          *,
          user:profiles!campaigns_user_id_fkey(id, full_name, email)
        `)
        .eq('id', campaignId)
        .single();

      if (!campaign) return;

      // Get email template
      const { data: template } = await supabase
        .from('email_templates')
        .select('*')
        .eq('type', 'campaign_rejected')
        .eq('is_active', true)
        .single();

      if (!template) return;

      // Queue email
      await supabase
        .from('email_queue')
        .insert({
          template_id: template.id,
          recipient_email: campaign.user.email,
          recipient_name: campaign.user.full_name,
          subject: template.subject.replace('{{campaign_name}}', campaign.name),
          body_html: template.body_html
            .replace('{{campaign_name}}', campaign.name)
            .replace('{{rejection_reason}}', rejectionReason || 'Campaign does not meet our guidelines'),
          body_text: template.body_text
            ?.replace('{{campaign_name}}', campaign.name)
            .replace('{{rejection_reason}}', rejectionReason || 'Campaign does not meet our guidelines')
        });
    } catch (error) {
      console.error('Error sending campaign rejection email:', error);
    }
  }

  // Get all kiosks
  static async getAllKiosks(): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('kiosks')
        .select('*')
        .order('name');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching kiosks:', error);
      throw error;
    }
  }

  // Create new kiosk
  static async createKiosk(kioskData: {
    name: string;
    location: string;
    address: string;
    city: string;
    state: string;
    traffic_level: 'low' | 'medium' | 'high';
    base_rate: number;
    price: number;
    status?: 'active' | 'inactive' | 'maintenance';
    coordinates: {
      lat: number;
      lng: number;
    };
    description?: string;
  }): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('kiosks')
        .insert([{
          name: kioskData.name,
          location: kioskData.location,
          address: kioskData.address,
          city: kioskData.city,
          state: kioskData.state,
          traffic_level: kioskData.traffic_level,
          base_rate: kioskData.base_rate,
          price: kioskData.price,
          status: kioskData.status || 'active',
          coordinates: kioskData.coordinates,
          description: kioskData.description
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating kiosk:', error);
      throw error;
    }
  }

  // Get Google Drive configurations
  static async getGoogleDriveConfigs(): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('google_drive_configs')
        .select('*')
        .order('name');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching Google Drive configs:', error);
      throw error;
    }
  }

  // Get kiosk Google Drive folder assignments
  static async getKioskGDriveFolderAssignments(): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('kiosk_gdrive_folders')
        .select(`
          *,
          kiosk:kiosks(*),
          gdrive_config:google_drive_configs(*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching kiosk Google Drive folder assignments:', error);
      throw error;
    }
  }

  // Create kiosk Google Drive folder assignment
  static async createKioskGDriveFolderAssignment(assignment: {
    kiosk_id: string;
    gdrive_config_id: string;
    active_folder_id: string;
    archive_folder_id: string;
  }): Promise<string> {
    try {
      const { data, error } = await supabase
        .from('kiosk_gdrive_folders')
        .insert(assignment)
        .select('id')
        .single();

      if (error) throw error;
      return data.id;
    } catch (error) {
      console.error('Error creating kiosk Google Drive folder assignment:', error);
      throw error;
    }
  }

  // Update kiosk Google Drive folder assignment
  static async updateKioskGDriveFolderAssignment(
    assignmentId: string,
    assignment: {
      kiosk_id: string;
      gdrive_config_id: string;
      active_folder_id: string;
      archive_folder_id: string;
    }
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('kiosk_gdrive_folders')
        .update(assignment)
        .eq('id', assignmentId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating kiosk Google Drive folder assignment:', error);
      throw error;
    }
  }

  // Delete kiosk Google Drive folder assignment
  static async deleteKioskGDriveFolderAssignment(assignmentId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('kiosk_gdrive_folders')
        .delete()
        .eq('id', assignmentId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting kiosk Google Drive folder assignment:', error);
      throw error;
    }
  }

  // Delete user (handles cascading deletes properly)
  static async deleteUser(userId: string): Promise<void> {
    try {
      // First, check if user exists and is not an admin
      const { data: user, error: fetchError } = await supabase
        .from('profiles')
        .select('id, role')
        .eq('id', userId)
        .single();

      if (fetchError) throw fetchError;
      if (!user) throw new Error('User not found');

      // Prevent deletion of admin users
      if (user.role === 'admin') {
        throw new Error('Cannot delete admin users');
      }

      // Try direct deletion first (should work with the new RLS policy)
      const { error: deleteError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);

      if (deleteError) {
        // If direct deletion fails, try using the RPC function as fallback
        console.warn('Direct delete failed, trying RPC function:', deleteError);
        
        const { error: rpcError } = await supabase.rpc('delete_user_profile', {
          user_id: userId
        });

        if (rpcError) {
          // If both methods fail, throw the original error
          throw deleteError;
        }
      }

      // Log the admin action
      await this.logAdminAction('delete_user', 'profiles', userId, {
        user_role: user.role
      });

    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }

  // Revenue Analytics Methods
  static async getRevenueAnalytics(dateRange: { start: string; end: string }): Promise<{
    totalRevenue: number;
    monthlyRevenue: number;
    revenueGrowth: number;
    totalTransactions: number;
    averageTransactionValue: number;
    topClients: Array<{
      id: string;
      name: string;
      email: string;
      totalSpent: number;
      transactionCount: number;
    }>;
    revenueByMonth: Array<{
      month: string;
      revenue: number;
      transactions: number;
    }>;
    paymentMethodBreakdown: Array<{
      method: string;
      count: number;
      amount: number;
      percentage: number;
    }>;
    stripeConnectStats: {
      totalPayouts: number;
      totalPayoutAmount: number;
      activeHosts: number;
      pendingPayouts: number;
    };
  }> {
    try {
      const startDate = new Date(dateRange.start);
      const endDate = new Date(dateRange.end);
      
      // Get payment history for the date range - use separate queries to avoid join issues
      const { data: paymentsOnly, error: paymentsOnlyError } = await supabase
        .from('payment_history')
        .select('*')
        .gte('payment_date', startDate.toISOString())
        .lte('payment_date', endDate.toISOString())
        .eq('status', 'succeeded');

      if (paymentsOnlyError) throw paymentsOnlyError;

      // Get user profiles separately
      const userIds = [...new Set(paymentsOnly?.map(p => p.user_id) || [])];
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      // Get campaigns separately
      const campaignIds = [...new Set(paymentsOnly?.map(p => p.campaign_id).filter(Boolean) || [])];
      const { data: campaigns, error: campaignsError } = await supabase
        .from('campaigns')
        .select('id, name')
        .in('id', campaignIds);

      if (campaignsError) throw campaignsError;

      // Combine the data
      const paymentsData = paymentsOnly?.map(payment => ({
        ...payment,
        profiles: profiles?.find(p => p.id === payment.user_id),
        campaigns: campaigns?.find(c => c.id === payment.campaign_id)
      })) || [];

      // Get previous period for growth calculation
      const previousStartDate = new Date(startDate);
      const previousEndDate = new Date(endDate);
      const periodLength = endDate.getTime() - startDate.getTime();
      previousStartDate.setTime(previousStartDate.getTime() - periodLength);
      previousEndDate.setTime(previousEndDate.getTime() - periodLength);

      const { data: previousPayments, error: previousPaymentsError } = await supabase
        .from('payment_history')
        .select('amount')
        .gte('payment_date', previousStartDate.toISOString())
        .lte('payment_date', previousEndDate.toISOString())
        .eq('status', 'succeeded');

      if (previousPaymentsError) throw previousPaymentsError;

      // Calculate basic metrics
      const totalRevenue = paymentsData?.reduce((sum, payment) => sum + payment.amount, 0) || 0;
      const previousRevenue = previousPayments?.reduce((sum, payment) => sum + payment.amount, 0) || 0;
      const revenueGrowth = previousRevenue > 0 ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 : 0;
      const totalTransactions = paymentsData?.length || 0;
      const averageTransactionValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

      // Calculate monthly revenue (current month)
      const currentMonth = new Date();
      const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
      
      const { data: monthlyPayments, error: monthlyPaymentsError } = await supabase
        .from('payment_history')
        .select('amount')
        .gte('payment_date', monthStart.toISOString())
        .lte('payment_date', monthEnd.toISOString())
        .eq('status', 'succeeded');

      if (monthlyPaymentsError) throw monthlyPaymentsError;
      const monthlyRevenue = monthlyPayments?.reduce((sum, payment) => sum + payment.amount, 0) || 0;

      // Get top clients
      const clientSpending = new Map<string, { id: string; name: string; email: string; totalSpent: number; transactionCount: number }>();
      
      paymentsData?.forEach(payment => {
        const userId = payment.user_id;
        const user = payment.profiles;
        const current = clientSpending.get(userId) || {
          id: userId,
          name: user?.full_name || 'Unknown',
          email: user?.email || 'unknown@example.com',
          totalSpent: 0,
          transactionCount: 0
        };
        
        current.totalSpent += payment.amount;
        current.transactionCount += 1;
        clientSpending.set(userId, current);
      });

      const topClients = Array.from(clientSpending.values())
        .sort((a, b) => b.totalSpent - a.totalSpent)
        .slice(0, 10);

      // Get revenue by month for the last 12 months
      const revenueByMonth = [];
      for (let i = 11; i >= 0; i--) {
        const month = new Date();
        month.setMonth(month.getMonth() - i);
        const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
        const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0);
        
        const { data: monthPayments } = await supabase
          .from('payment_history')
          .select('amount')
          .gte('payment_date', monthStart.toISOString())
          .lte('payment_date', monthEnd.toISOString())
          .eq('status', 'succeeded');

        const monthRevenue = monthPayments?.reduce((sum, payment) => sum + payment.amount, 0) || 0;
        const monthTransactions = monthPayments?.length || 0;
        
        revenueByMonth.push({
          month: month.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          revenue: monthRevenue,
          transactions: monthTransactions
        });
      }

      // Get payment method breakdown - simplified approach
      const { data: paymentMethods, error: paymentMethodsError } = await supabase
        .from('payment_methods')
        .select('type, user_id')
        .in('user_id', Array.from(clientSpending.keys()));

      if (paymentMethodsError) {
        console.warn('Could not fetch payment methods, using default breakdown:', paymentMethodsError);
      }

      const methodBreakdown = new Map<string, { count: number; amount: number }>();
      paymentsData?.forEach(payment => {
        const userMethods = paymentMethods?.filter(pm => pm.user_id === payment.user_id);
        const method = userMethods && userMethods.length > 0 ? userMethods[0].type : 'card';
        const current = methodBreakdown.get(method) || { count: 0, amount: 0 };
        current.count += 1;
        current.amount += payment.amount;
        methodBreakdown.set(method, current);
      });

    const totalMethodAmount = Array.from(methodBreakdown.values()).reduce((sum, method) => sum + method.amount, 0);
      const paymentMethodBreakdown = Array.from(methodBreakdown.entries()).map(([method, data]) => ({
        method: method === 'card' ? 'Credit Card' : method === 'bank_account' ? 'Bank Account' : method,
        count: data.count,
        amount: data.amount,
        percentage: totalMethodAmount > 0 ? (data.amount / totalMethodAmount) * 100 : 0
      }));

      // Get Stripe Connect stats - with error handling
      let totalPayouts = 0;
      let totalPayoutAmount = 0;
      let pendingPayouts = 0;
      let activeHosts = 0;

      try {
        const { data: stripeStats, error: stripeStatsError } = await supabase
          .from('host_payouts')
          .select('amount, status');

        if (!stripeStatsError && stripeStats) {
          totalPayouts = stripeStats.length;
          totalPayoutAmount = stripeStats.reduce((sum, payout) => sum + payout.amount, 0);
          pendingPayouts = stripeStats.filter(payout => payout.status === 'pending').length;
        }
      } catch (error) {
        console.warn('Could not fetch host payouts:', error);
      }

      try {
        const { data: hosts, error: activeHostsError } = await supabase
          .from('profiles')
          .select('id')
          .eq('stripe_connect_enabled', true)
          .not('stripe_connect_account_id', 'is', null);

        if (!activeHostsError && hosts) {
          activeHosts = hosts.length;
        }
      } catch (error) {
        console.warn('Could not fetch active hosts:', error);
      }

      return {
        totalRevenue,
        monthlyRevenue,
        revenueGrowth,
        totalTransactions,
        averageTransactionValue,
        topClients,
        revenueByMonth,
        paymentMethodBreakdown,
        stripeConnectStats: {
          totalPayouts,
          totalPayoutAmount,
          activeHosts,
          pendingPayouts
        }
      };
    } catch (error) {
      console.error('Error fetching revenue analytics:', error);
      throw error;
    }
  }

  static async exportRevenueData(dateRange: { start: string; end: string }): Promise<string> {
    try {
      // Get payment history for the date range - use separate queries to avoid join issues
      const { data: paymentsOnly, error: paymentsOnlyError } = await supabase
        .from('payment_history')
        .select('*')
        .gte('payment_date', dateRange.start)
        .lte('payment_date', dateRange.end)
        .eq('status', 'succeeded')
        .order('payment_date', { ascending: false });

      if (paymentsOnlyError) throw paymentsOnlyError;

      // Get user profiles separately
      const userIds = [...new Set(paymentsOnly?.map(p => p.user_id) || [])];
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      // Get campaigns separately
      const campaignIds = [...new Set(paymentsOnly?.map(p => p.campaign_id).filter(Boolean) || [])];
      const { data: campaigns, error: campaignsError } = await supabase
        .from('campaigns')
        .select('id, name')
        .in('id', campaignIds);

      if (campaignsError) throw campaignsError;

      // Combine the data
      const paymentsData = paymentsOnly?.map(payment => ({
        ...payment,
        profiles: profiles?.find(p => p.id === payment.user_id),
        campaigns: campaigns?.find(c => c.id === payment.campaign_id)
      })) || [];

      // Create CSV content
      const headers = ['Date', 'Client Name', 'Client Email', 'Campaign', 'Amount', 'Status', 'Description'];
      const rows = paymentsData?.map(payment => [
        new Date(payment.payment_date).toLocaleDateString(),
        payment.profiles?.full_name || 'Unknown',
        payment.profiles?.email || 'unknown@example.com',
        payment.campaigns?.name || 'N/A',
        payment.amount.toString(),
        payment.status,
        payment.description || ''
      ]) || [];

      const csvContent = [headers, ...rows]
        .map(row => row.map(field => `"${field}"`).join(','))
        .join('\n');

      return csvContent;
    } catch (error) {
      console.error('Error exporting revenue data:', error);
      throw error;
    }
  }

  // Admin Campaign Modification Methods

  // Update campaign status (Draft, Pending, Active, Paused, Completed, Rejected)
  static async updateCampaignStatus(campaignId: string, status: 'draft' | 'pending' | 'active' | 'paused' | 'completed' | 'rejected', rejectionReason?: string): Promise<void> {
    try {
      // Get campaign data before updating
      const { data: campaignData, error: fetchError } = await supabase
        .from('campaigns')
        .select(`
          *,
          profiles!inner(email, full_name, role)
        `)
        .eq('id', campaignId)
        .single();

      if (fetchError) throw fetchError;
      if (!campaignData) {
        throw new Error('Campaign not found');
      }

      const { error, data } = await supabase
        .from('campaigns')
        .update({ 
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', campaignId)
        .select('id')
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        throw new Error('Campaign update failed: campaign not found or not permitted');
      }

      // Log admin action
      await this.logAdminAction('update_campaign_status', 'campaign', campaignId, {
        status,
        rejection_reason: rejectionReason
      });

      // Send email notification based on status change
      await this.sendCampaignStatusEmail(campaignData, status, rejectionReason);
    } catch (error) {
      console.error('Error updating campaign status:', error);
      throw error;
    }
  }

  // Send email notification for campaign status change
  private static async sendCampaignStatusEmail(
    campaignData: any, 
    status: 'draft' | 'pending' | 'active' | 'paused' | 'completed' | 'rejected',
    rejectionReason?: string
  ): Promise<void> {
    try {
      // Import the campaign email service dynamically to avoid circular dependencies
      const { CampaignEmailService } = await import('./campaignEmailService');
      
      const emailData = {
        campaign_id: campaignData.id,
        campaign_name: campaignData.name,
        user_id: campaignData.user_id,
        user_email: campaignData.profiles.email,
        user_name: campaignData.profiles.full_name,
        user_role: campaignData.profiles.role,
        status: campaignData.status,
        start_date: campaignData.start_date,
        end_date: campaignData.end_date,
        budget: campaignData.budget,
        total_spent: campaignData.total_spent,
        impressions: campaignData.impressions,
        clicks: campaignData.clicks,
        target_locations: campaignData.target_locations,
        rejection_reason: rejectionReason
      };

      // Map internal status to email status
      let emailStatus: 'approved' | 'rejected' | 'active' | 'expiring' | 'expired' | 'paused' | 'resumed';
      
      switch (status) {
        case 'active':
          emailStatus = 'active';
          break;
        case 'rejected':
          emailStatus = 'rejected';
          break;
        case 'paused':
          emailStatus = 'paused';
          break;
        case 'completed':
          emailStatus = 'expired';
          break;
        default:
          // For other statuses, don't send email
          return;
      }

      await CampaignEmailService.sendCampaignStatusNotification(emailData, emailStatus);
    } catch (error) {
      console.error('Error sending campaign status email:', error);
      // Don't throw error to avoid breaking the main workflow
    }
  }

  // Update campaign budget and daily budget
  static async updateCampaignBudget(campaignId: string, budget: number, dailyBudget?: number): Promise<void> {
    try {
      const updateData: any = {
        budget,
        updated_at: new Date().toISOString()
      };

      if (dailyBudget !== undefined) {
        updateData.daily_budget = dailyBudget;
      }

      const { error, data } = await supabase
        .from('campaigns')
        .update(updateData)
        .eq('id', campaignId)
        .select('id')
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        throw new Error('Campaign budget update failed: campaign not found or not permitted');
      }

      // Log admin action
      await this.logAdminAction('update_campaign_budget', 'campaign', campaignId, {
        budget,
        daily_budget: dailyBudget
      });
    } catch (error) {
      console.error('Error updating campaign budget:', error);
      throw error;
    }
  }

  // Update campaign dates
  static async updateCampaignDates(campaignId: string, startDate: string, endDate: string): Promise<void> {
    try {
      const { error, data } = await supabase
        .from('campaigns')
        .update({ 
          start_date: startDate,
          end_date: endDate,
          updated_at: new Date().toISOString()
        })
        .eq('id', campaignId)
        .select('id')
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        throw new Error('Campaign dates update failed: campaign not found or not permitted');
      }

      // Log admin action
      await this.logAdminAction('update_campaign_dates', 'campaign', campaignId, {
        start_date: startDate,
        end_date: endDate
      });
    } catch (error) {
      console.error('Error updating campaign dates:', error);
      throw error;
    }
  }

  // Update campaign details (name, description, target locations, demographics)
  static async updateCampaignDetails(campaignId: string, updates: {
    name?: string;
    description?: string;
    target_locations?: string[];
    target_demographics?: Record<string, any>;
  }): Promise<void> {
    try {
      const { error, data } = await supabase
        .from('campaigns')
        .update({ 
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', campaignId)
        .select('id')
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        throw new Error('Campaign details update failed: campaign not found or not permitted');
      }

      // Log admin action
      await this.logAdminAction('update_campaign_details', 'campaign', campaignId, updates);
    } catch (error) {
      console.error('Error updating campaign details:', error);
      throw error;
    }
  }

  // Set campaign max video duration
  static async setCampaignMaxVideoDuration(campaignId: string, maxDuration: number): Promise<void> {
    try {
      const { error, data } = await supabase
        .from('campaigns')
        .update({ 
          max_video_duration: maxDuration,
          updated_at: new Date().toISOString()
        })
        .eq('id', campaignId)
        .select('id')
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        throw new Error('Campaign max video duration update failed: campaign not found or not permitted');
      }

      // Log admin action
      await this.logAdminAction('update_campaign_max_video_duration', 'campaign', campaignId, {
        max_video_duration: maxDuration
      });
    } catch (error) {
      console.error('Error updating campaign max video duration:', error);
      throw error;
    }
  }

  // Admin Host Ad Assignment Modification Methods

  // Get all host ad assignments for admin management
  static async getAllHostAdAssignments(): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('host_ad_assignments')
        .select(`
          *,
          ad:host_ads(*),
          kiosk:kiosks(id, name, location, city, state),
          host:profiles!host_ad_assignments_host_id_fkey(id, full_name, email, company_name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching host ad assignments:', error);
      throw error;
    }
  }

  // Update host ad assignment status
  static async updateHostAdAssignmentStatus(assignmentId: string, status: 'pending' | 'approved' | 'rejected' | 'active' | 'paused' | 'completed'): Promise<void> {
    try {
      const { error, data } = await supabase
        .from('host_ad_assignments')
        .update({ 
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', assignmentId)
        .select('id')
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        throw new Error('Host ad assignment status update failed: assignment not found or not permitted');
      }

      // Log admin action
      await this.logAdminAction('update_host_ad_assignment_status', 'host_ad_assignment', assignmentId, {
        status
      });
    } catch (error) {
      console.error('Error updating host ad assignment status:', error);
      throw error;
    }
  }

  // Update host ad assignment dates
  static async updateHostAdAssignmentDates(assignmentId: string, startDate: string, endDate: string): Promise<void> {
    try {
      const { error, data } = await supabase
        .from('host_ad_assignments')
        .update({ 
          start_date: startDate,
          end_date: endDate,
          updated_at: new Date().toISOString()
        })
        .eq('id', assignmentId)
        .select('id')
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        throw new Error('Host ad assignment dates update failed: assignment not found or not permitted');
      }

      // Log admin action
      await this.logAdminAction('update_host_ad_assignment_dates', 'host_ad_assignment', assignmentId, {
        start_date: startDate,
        end_date: endDate
      });
    } catch (error) {
      console.error('Error updating host ad assignment dates:', error);
      throw error;
    }
  }

  // Update host ad assignment priority
  static async updateHostAdAssignmentPriority(assignmentId: string, priority: number): Promise<void> {
    try {
      const { error, data } = await supabase
        .from('host_ad_assignments')
        .update({ 
          priority,
          updated_at: new Date().toISOString()
        })
        .eq('id', assignmentId)
        .select('id')
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        throw new Error('Host ad assignment priority update failed: assignment not found or not permitted');
      }

      // Log admin action
      await this.logAdminAction('update_host_ad_assignment_priority', 'host_ad_assignment', assignmentId, {
        priority
      });
    } catch (error) {
      console.error('Error updating host ad assignment priority:', error);
      throw error;
    }
  }

  // Delete host ad assignment
  static async deleteHostAdAssignment(assignmentId: string): Promise<void> {
    try {
      const { error, data } = await supabase
        .from('host_ad_assignments')
        .delete()
        .eq('id', assignmentId)
        .select('id')
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        throw new Error('Host ad assignment deletion failed: assignment not found or not permitted');
      }

      // Log admin action
      await this.logAdminAction('delete_host_ad_assignment', 'host_ad_assignment', assignmentId, {});
    } catch (error) {
      console.error('Error deleting host ad assignment:', error);
      throw error;
    }
  }

  // Host-Kiosk Assignment Management Methods

  // Get all host-kiosk assignments
  static async getAllHostKioskAssignments(): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('host_kiosks')
        .select(`
          *,
          kiosk:kiosks(id, name, location, city, state, status),
          host:profiles!host_kiosks_host_id_fkey(id, full_name, email, company_name, role)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching host-kiosk assignments:', error);
      throw error;
    }
  }

  // Assign kiosk to host
  static async assignKioskToHost(kioskId: string, hostId: string, commissionRate: number = 70.00): Promise<void> {
    try {
      // First check if the current user is an admin
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Verify admin role
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profileError || !profile || profile.role !== 'admin') {
        throw new Error('Insufficient permissions: Admin role required');
      }

      const { error } = await supabase
        .from('host_kiosks')
        .insert({
          kiosk_id: kioskId,
          host_id: hostId,
          commission_rate: commissionRate,
          status: 'active'
        });

      if (error) throw error;

      await this.logAdminAction('assign_kiosk_to_host', 'host_kiosk', kioskId, { hostId, commissionRate });
    } catch (error) {
      console.error('Error assigning kiosk to host:', error);
      throw error;
    }
  }

  // Unassign kiosk from host
  static async unassignKioskFromHost(assignmentId: string): Promise<void> {
    try {
      // First check if the current user is an admin
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Verify admin role
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profileError || !profile || profile.role !== 'admin') {
        throw new Error('Insufficient permissions: Admin role required');
      }

      const { error } = await supabase
        .from('host_kiosks')
        .delete()
        .eq('id', assignmentId);

      if (error) throw error;

      await this.logAdminAction('unassign_kiosk_from_host', 'host_kiosk', assignmentId, {});
    } catch (error) {
      console.error('Error unassigning kiosk from host:', error);
      throw error;
    }
  }

  // Update host-kiosk assignment
  static async updateHostKioskAssignment(assignmentId: string, updates: {
    status?: 'active' | 'inactive' | 'suspended';
    commission_rate?: number;
  }): Promise<void> {
    try {
      const { error } = await supabase
        .from('host_kiosks')
        .update(updates)
        .eq('id', assignmentId);

      if (error) throw error;

      await this.logAdminAction('update_host_kiosk_assignment', 'host_kiosk', assignmentId, updates);
    } catch (error) {
      console.error('Error updating host-kiosk assignment:', error);
      throw error;
    }
  }

  // Get all hosts (for assignment dropdown)
  static async getAllHosts(): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, company_name, role')
        .eq('role', 'host')
        .order('full_name');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching hosts:', error);
      throw error;
    }
  }

  // Get kiosks with their assigned hosts
  static async getKiosksWithHosts(): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('kiosks')
        .select(`
          *,
          host_assignments:host_kiosks(
            id,
            host_id,
            status,
            commission_rate,
            assigned_at,
            host:profiles!host_kiosks_host_id_fkey(id, full_name, email, company_name)
          )
        `)
        .order('name');

      if (error) throw error;

      // Ensure admin is assigned as default for unassigned kiosks
      await this.ensureAdminAsDefaultForUnassigned();

      return data || [];
    } catch (error) {
      console.error('Error fetching kiosks with hosts:', error);
      throw error;
    }
  }

  // Ensure admin is assigned as default for unassigned kiosks
  static async ensureAdminAsDefaultForUnassigned(): Promise<void> {
    try {
      // Get admin user ID
      const { data: adminData, error: adminError } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'admin')
        .single();

      if (adminError || !adminData) return; // No admin found, skip

      // Get all kiosks that don't have any host assignments
      const { data: assignedKioskIds, error: assignedError } = await supabase
        .from('host_kiosks')
        .select('kiosk_id');

      if (assignedError) return;

      const assignedIds = assignedKioskIds?.map(item => item.kiosk_id) || [];

      // Get unassigned kiosks
      let query = supabase
        .from('kiosks')
        .select('id');
      
      // Only apply the not.in filter if there are assigned IDs
      if (assignedIds.length > 0) {
        query = query.not('id', 'in', assignedIds);
      }
      
      const { data: unassignedKiosks, error: kiosksError } = await query;

      if (kiosksError || !unassignedKiosks || unassignedKiosks.length === 0) return;

      // Assign admin to all unassigned kiosks
      const assignments = unassignedKiosks.map(kiosk => ({
        kiosk_id: kiosk.id,
        host_id: adminData.id,
        commission_rate: 100.00, // Admin gets 100% since they're the platform owner
        status: 'active'
      }));

      await supabase
        .from('host_kiosks')
        .insert(assignments);

    } catch (error) {
      console.error('Error ensuring admin as default for unassigned kiosks:', error);
      // Don't throw error as this is a background process
    }
  }

  // Daily Pending Ad Review Email Methods
  static async sendDailyPendingReviewEmail(): Promise<void> {
    try {
      // Get notification settings
      const settings = await this.getSystemSettings();
      const enabledSetting = settings.find(s => s.key === 'daily_pending_review_email_enabled');
      const timeSetting = settings.find(s => s.key === 'daily_pending_review_email_time');
      const recipientsSetting = settings.find(s => s.key === 'daily_pending_review_email_recipients');

      // Check if daily emails are enabled
      if (!enabledSetting?.value || enabledSetting.value === 'false') {
        return;
      }

      // Get recipients
      const recipients = Array.isArray(recipientsSetting?.value) 
        ? recipientsSetting.value 
        : (recipientsSetting?.value ? JSON.parse(recipientsSetting.value) : []);

      if (recipients.length === 0) {
        console.log('No recipients configured for daily pending review emails');
        return;
      }

      // Get all pending items for review
      const { clientAds, hostAds, pendingClientCampaigns, pendingHostCampaigns } = await this.getAllAdsForReview();

      // Get email template
      const { data: template } = await supabase
        .from('email_templates')
        .select('*')
        .eq('type', 'daily_pending_review')
        .eq('is_active', true)
        .single();

      if (!template) {
        console.error('Daily pending review email template not found');
        return;
      }

      // Format the data for the email
      const today = new Date().toLocaleDateString();
      const totalCount = clientAds.length + hostAds.length + pendingClientCampaigns.length + pendingHostCampaigns.length;

      // Format client ads list
      const clientAdsList = clientAds.length > 0 
        ? clientAds.map(ad => `• ${ad.campaign_name} - ${ad.user_name} (${ad.created_at})`).join('<br>')
        : 'No pending client ads';

      // Format host ads list
      const hostAdsList = hostAds.length > 0 
        ? hostAds.map(ad => `• ${ad.campaign_name || 'Host Ad'} - ${ad.host_name || 'Host'} (${ad.created_at})`).join('<br>')
        : 'No pending host ads';

      // Format campaigns list
      const campaignsList = [...pendingClientCampaigns, ...pendingHostCampaigns].length > 0 
        ? [...pendingClientCampaigns, ...pendingHostCampaigns].map(campaign => `• ${campaign.name} - ${campaign.user?.full_name || 'User'} (${campaign.created_at})`).join('<br>')
        : 'No pending campaigns';

      // Replace template variables
      const subject = template.subject.replace('{{date}}', today);
      const bodyHtml = template.body_html
        .replace('{{date}}', today)
        .replace('{{client_ads_count}}', clientAds.length.toString())
        .replace('{{host_ads_count}}', hostAds.length.toString())
        .replace('{{campaigns_count}}', (pendingClientCampaigns.length + pendingHostCampaigns.length).toString())
        .replace('{{total_count}}', totalCount.toString())
        .replace('{{client_ads_list}}', clientAdsList)
        .replace('{{host_ads_list}}', hostAdsList)
        .replace('{{campaigns_list}}', campaignsList);

      const bodyText = template.body_text
        ?.replace('{{date}}', today)
        .replace('{{client_ads_count}}', clientAds.length.toString())
        .replace('{{host_ads_count}}', hostAds.length.toString())
        .replace('{{campaigns_count}}', (pendingClientCampaigns.length + pendingHostCampaigns.length).toString())
        .replace('{{total_count}}', totalCount.toString())
        .replace('{{client_ads_list}}', clientAdsList.replace(/<br>/g, '\n'))
        .replace('{{host_ads_list}}', hostAdsList.replace(/<br>/g, '\n'))
        .replace('{{campaigns_list}}', campaignsList.replace(/<br>/g, '\n'));

      // Queue emails for all recipients
      const emailQueue = recipients.map(recipient => ({
        template_id: template.id,
        recipient_email: recipient,
        recipient_name: 'Admin',
        subject,
        body_html: bodyHtml,
        body_text: bodyText
      }));

      await supabase
        .from('email_queue')
        .insert(emailQueue);

      console.log(`Daily pending review email queued for ${recipients.length} recipients`);
    } catch (error) {
      console.error('Error sending daily pending review email:', error);
    }
  }

  static async sendTestPendingReviewEmail(): Promise<void> {
    try {
      // Get notification settings
      const settings = await this.getSystemSettings();
      const recipientsSetting = settings.find(s => s.key === 'daily_pending_review_email_recipients');

      // Get recipients
      const recipients = Array.isArray(recipientsSetting?.value) 
        ? recipientsSetting.value 
        : (recipientsSetting?.value ? JSON.parse(recipientsSetting.value) : []);

      if (recipients.length === 0) {
        throw new Error('No recipients configured for daily pending review emails');
      }

      // Get email template
      const { data: template } = await supabase
        .from('email_templates')
        .select('*')
        .eq('type', 'daily_pending_review')
        .eq('is_active', true)
        .single();

      if (!template) {
        throw new Error('Daily pending review email template not found');
      }

      // Create test data
      const today = new Date().toLocaleDateString();
      const testData = {
        date: today,
        client_ads_count: 3,
        host_ads_count: 1,
        campaigns_count: 2,
        total_count: 6,
        client_ads_list: '• Test Campaign 1 - John Doe (2024-01-15)<br>• Test Campaign 2 - Jane Smith (2024-01-14)<br>• Test Campaign 3 - Bob Johnson (2024-01-13)',
        host_ads_list: '• Host Ad 1 - Host User (2024-01-15)',
        campaigns_list: '• Test Campaign A - Alice Brown (2024-01-15)<br>• Test Campaign B - Charlie Wilson (2024-01-14)'
      };

      // Replace template variables
      const subject = template.subject.replace('{{date}}', testData.date);
      const bodyHtml = template.body_html
        .replace('{{date}}', testData.date)
        .replace('{{client_ads_count}}', testData.client_ads_count.toString())
        .replace('{{host_ads_count}}', testData.host_ads_count.toString())
        .replace('{{campaigns_count}}', testData.campaigns_count.toString())
        .replace('{{total_count}}', testData.total_count.toString())
        .replace('{{client_ads_list}}', testData.client_ads_list)
        .replace('{{host_ads_list}}', testData.host_ads_list)
        .replace('{{campaigns_list}}', testData.campaigns_list);

      const bodyText = template.body_text
        ?.replace('{{date}}', testData.date)
        .replace('{{client_ads_count}}', testData.client_ads_count.toString())
        .replace('{{host_ads_count}}', testData.host_ads_count.toString())
        .replace('{{campaigns_count}}', testData.campaigns_count.toString())
        .replace('{{total_count}}', testData.total_count.toString())
        .replace('{{client_ads_list}}', testData.client_ads_list.replace(/<br>/g, '\n'))
        .replace('{{host_ads_list}}', testData.host_ads_list.replace(/<br>/g, '\n'))
        .replace('{{campaigns_list}}', testData.campaigns_list.replace(/<br>/g, '\n'));

      // Queue test emails for all recipients
      const emailQueue = recipients.map(recipient => ({
        template_id: template.id,
        recipient_email: recipient,
        recipient_name: 'Admin',
        subject: `[TEST] ${subject}`,
        body_html: bodyHtml,
        body_text: bodyText
      }));

      await supabase
        .from('email_queue')
        .insert(emailQueue);

      console.log(`Test pending review email queued for ${recipients.length} recipients`);
    } catch (error) {
      console.error('Error sending test pending review email:', error);
      throw error;
    }
  }

  // Custom Ad Management Methods

  // Get all custom ad orders for admin management
  static async getCustomAdOrders(): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('custom_ad_orders')
        .select(`
          *,
          user:profiles!custom_ad_orders_user_id_fkey(id, full_name, email, company_name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get comments and proofs for each order
      const ordersWithDetails = await Promise.all(
        (data || []).map(async (order) => {
          const [commentsRes, proofsRes] = await Promise.all([
            supabase
              .from('custom_ad_order_comments')
              .select('*')
              .eq('order_id', order.id)
              .order('created_at', { ascending: true }),
            supabase
              .from('custom_ad_order_proofs')
              .select('*')
              .eq('order_id', order.id)
              .order('created_at', { ascending: true })
          ]);

          return {
            ...order,
            comments: commentsRes.data || [],
            proofs: proofsRes.data || []
          };
        })
      );

      return ordersWithDetails;
    } catch (error) {
      console.error('Error fetching custom ad orders:', error);
      throw error;
    }
  }

  // Update custom ad order status
  static async updateCustomAdOrderStatus(orderId: string, status: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('custom_ad_orders')
        .update({ 
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (error) throw error;

      await this.logAdminAction('update_custom_ad_order_status', 'custom_ad_order', orderId, {
        status
      });

      // Send email notification
      await this.sendCustomAdOrderStatusEmail(orderId, status);
    } catch (error) {
      console.error('Error updating custom ad order status:', error);
      throw error;
    }
  }

  // Add comment to custom ad order
  static async addCustomAdOrderComment(orderId: string, content: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Get user profile for author name
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();

      const { error } = await supabase
        .from('custom_ad_order_comments')
        .insert({
          order_id: orderId,
          content,
          author: profile?.full_name || 'Admin',
          created_at: new Date().toISOString()
        });

      if (error) throw error;

      await this.logAdminAction('add_custom_ad_order_comment', 'custom_ad_order_comment', orderId, {
        content
      });
    } catch (error) {
      console.error('Error adding custom ad order comment:', error);
      throw error;
    }
  }

  // Submit proof for custom ad order
  static async submitCustomAdOrderProof(orderId: string, files: File[]): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Upload files to storage
      const uploadedFiles = [];
      for (const file of files) {
        const path = `custom-ad-proofs/${orderId}/${Date.now()}-${Math.random().toString(36).slice(2)}-${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from('custom-ad-proofs')
          .upload(path, file, {
            cacheControl: '3600',
            upsert: false,
            contentType: file.type,
          });

        if (uploadError) throw uploadError;

        const { data: pubUrl } = supabase.storage
          .from('custom-ad-proofs')
          .getPublicUrl(path);

        uploadedFiles.push({
          file_name: file.name,
          file_url: pubUrl.publicUrl,
          file_type: file.type,
          file_size: file.size
        });
      }

      // Save proof records
      const proofRecords = uploadedFiles.map(file => ({
        order_id: orderId,
        file_name: file.file_name,
        file_url: file.file_url,
        file_type: file.file_type,
        file_size: file.file_size,
        created_at: new Date().toISOString()
      }));

      const { error } = await supabase
        .from('custom_ad_order_proofs')
        .insert(proofRecords);

      if (error) throw error;

      await this.logAdminAction('submit_custom_ad_order_proof', 'custom_ad_order_proof', orderId, {
        file_count: files.length
      });

      // Send email notification
      await this.sendCustomAdOrderProofEmail(orderId);
    } catch (error) {
      console.error('Error submitting custom ad order proof:', error);
      throw error;
    }
  }

  // Send custom ad order status email
  private static async sendCustomAdOrderStatusEmail(orderId: string, status: string): Promise<void> {
    try {
      // Get order details
      const { data: order } = await supabase
        .from('custom_ad_orders')
        .select(`
          *,
          user:profiles!custom_ad_orders_user_id_fkey(id, full_name, email)
        `)
        .eq('id', orderId)
        .single();

      if (!order) return;

      // Get email template
      const { data: template } = await supabase
        .from('email_templates')
        .select('*')
        .eq('type', 'custom_ad_order_status_update')
        .eq('is_active', true)
        .single();

      if (!template) return;

      // Queue email
      await supabase
        .from('email_queue')
        .insert({
          template_id: template.id,
          recipient_email: order.user.email,
          recipient_name: order.user.full_name,
          subject: template.subject
            .replace('{{order_id}}', order.id)
            .replace('{{status}}', status),
          body_html: template.body_html
            .replace('{{order_id}}', order.id)
            .replace('{{status}}', status)
            .replace('{{service_key}}', order.service_key)
            .replace('{{total_amount}}', order.total_amount.toString()),
          body_text: template.body_text
            ?.replace('{{order_id}}', order.id)
            .replace('{{status}}', status)
            .replace('{{service_key}}', order.service_key)
            .replace('{{total_amount}}', order.total_amount.toString())
        });
    } catch (error) {
      console.error('Error sending custom ad order status email:', error);
    }
  }

  // Send custom ad order proof email
  private static async sendCustomAdOrderProofEmail(orderId: string): Promise<void> {
    try {
      // Get order details
      const { data: order } = await supabase
        .from('custom_ad_orders')
        .select(`
          *,
          user:profiles!custom_ad_orders_user_id_fkey(id, full_name, email)
        `)
        .eq('id', orderId)
        .single();

      if (!order) return;

      // Get email template
      const { data: template } = await supabase
        .from('email_templates')
        .select('*')
        .eq('type', 'custom_ad_order_proof_submitted')
        .eq('is_active', true)
        .single();

      if (!template) return;

      // Queue email
      await supabase
        .from('email_queue')
        .insert({
          template_id: template.id,
          recipient_email: order.user.email,
          recipient_name: order.user.full_name,
          subject: template.subject
            .replace('{{order_id}}', order.id),
          body_html: template.body_html
            .replace('{{order_id}}', order.id)
            .replace('{{service_key}}', order.service_key),
          body_text: template.body_text
            ?.replace('{{order_id}}', order.id)
            .replace('{{service_key}}', order.service_key)
        });
    } catch (error) {
      console.error('Error sending custom ad order proof email:', error);
    }
  }

  // Host Ad Limit Management Methods
  
  // Update ad limit for a specific host-kiosk assignment
  static async updateHostAdLimit(assignmentId: string, adLimit: number): Promise<void> {
    try {
      // First check if the current user is an admin
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Verify admin role
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profileError || !profile || profile.role !== 'admin') {
        throw new Error('Insufficient permissions: Admin role required');
      }

      // Validate ad limit
      if (adLimit < 0) {
        throw new Error('Ad limit cannot be negative');
      }

      const { error } = await supabase
        .from('host_kiosks')
        .update({ ad_limit: adLimit })
        .eq('id', assignmentId);

      if (error) throw error;

      await this.logAdminAction('update_ad_limit', 'host_kiosk', assignmentId, { adLimit });
    } catch (error) {
      console.error('Error updating host ad limit:', error);
      throw error;
    }
  }

  // Get host ad usage statistics
  static async getHostAdUsage(hostId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase.rpc('get_host_total_ad_usage', {
        p_host_id: hostId
      });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting host ad usage:', error);
      throw error;
    }
  }

  // Get all host-kiosk assignments with ad limits
  static async getAllHostKioskAssignmentsWithLimits(): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('host_kiosks')
        .select(`
          id,
          host_id,
          kiosk_id,
          ad_limit,
          status,
          commission_rate,
          assigned_at,
          host:profiles!host_kiosks_host_id_fkey(
            id,
            full_name,
            email,
            company_name
          ),
          kiosk:kiosks!host_kiosks_kiosk_id_fkey(
            id,
            name,
            location,
            status
          )
        `)
        .order('assigned_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting host kiosk assignments with limits:', error);
      throw error;
    }
  }

  // Bulk update ad limits for multiple host-kiosk assignments
  static async bulkUpdateAdLimits(updates: Array<{ assignmentId: string; adLimit: number }>): Promise<void> {
    try {
      // First check if the current user is an admin
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Verify admin role
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profileError || !profile || profile.role !== 'admin') {
        throw new Error('Insufficient permissions: Admin role required');
      }

      // Validate all ad limits
      for (const update of updates) {
        if (update.adLimit < 0) {
          throw new Error(`Ad limit cannot be negative for assignment ${update.assignmentId}`);
        }
      }

      // Update each assignment
      for (const update of updates) {
        const { error } = await supabase
          .from('host_kiosks')
          .update({ ad_limit: update.adLimit })
          .eq('id', update.assignmentId);

        if (error) throw error;

        await this.logAdminAction('bulk_update_ad_limit', 'host_kiosk', update.assignmentId, { adLimit: update.adLimit });
      }
    } catch (error) {
      console.error('Error bulk updating ad limits:', error);
      throw error;
    }
  }

  // Ad Upload Limits Management
  static async getAdUploadLimits(): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('ad_upload_limits')
        .select(`
          *,
          host:profiles!ad_upload_limits_host_id_fkey(id, full_name, email, company_name),
          kiosk:kiosks!ad_upload_limits_kiosk_id_fkey(id, name, location, city, state)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting ad upload limits:', error);
      throw error;
    }
  }

  static async createAdUploadLimit(limitData: {
    limit_type: 'global' | 'host' | 'kiosk';
    host_id?: string;
    kiosk_id?: string;
    max_ads: number;
    is_active: boolean;
  }): Promise<any> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Verify admin role
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profileError || !profile || profile.role !== 'admin') {
        throw new Error('Insufficient permissions: Admin role required');
      }

      // Validate limit data
      if (limitData.max_ads < 1) {
        throw new Error('Max ads must be at least 1');
      }

      if (limitData.limit_type === 'host' && !limitData.host_id) {
        throw new Error('Host ID is required for host-specific limits');
      }

      if (limitData.limit_type === 'kiosk' && !limitData.kiosk_id) {
        throw new Error('Kiosk ID is required for kiosk-specific limits');
      }

      // Check for existing limits
      let existingQuery = supabase
        .from('ad_upload_limits')
        .select('id');

      if (limitData.limit_type === 'host') {
        existingQuery = existingQuery.eq('host_id', limitData.host_id);
      } else if (limitData.limit_type === 'kiosk') {
        existingQuery = existingQuery.eq('kiosk_id', limitData.kiosk_id);
      } else {
        existingQuery = existingQuery.is('host_id', null).is('kiosk_id', null);
      }

      const { data: existing, error: existingError } = await existingQuery;

      if (existingError) throw existingError;

      if (existing && existing.length > 0) {
        throw new Error(`A ${limitData.limit_type} limit already exists`);
      }

      // Create the limit
      const { data, error } = await supabase
        .from('ad_upload_limits')
        .insert({
          limit_type: limitData.limit_type,
          host_id: limitData.host_id || null,
          kiosk_id: limitData.kiosk_id || null,
          max_ads: limitData.max_ads,
          current_ads: 0,
          is_active: limitData.is_active
        })
        .select()
        .single();

      if (error) throw error;

      await this.logAdminAction('create_ad_upload_limit', 'ad_upload_limits', data.id, limitData);
      return data;
    } catch (error) {
      console.error('Error creating ad upload limit:', error);
      throw error;
    }
  }

  static async updateAdUploadLimit(limitId: string, updateData: {
    max_ads?: number;
    is_active?: boolean;
  }): Promise<any> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Verify admin role
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profileError || !profile || profile.role !== 'admin') {
        throw new Error('Insufficient permissions: Admin role required');
      }

      // Validate update data
      if (updateData.max_ads !== undefined && updateData.max_ads < 1) {
        throw new Error('Max ads must be at least 1');
      }

      const { data, error } = await supabase
        .from('ad_upload_limits')
        .update(updateData)
        .eq('id', limitId)
        .select()
        .single();

      if (error) throw error;

      await this.logAdminAction('update_ad_upload_limit', 'ad_upload_limits', limitId, updateData);
      return data;
    } catch (error) {
      console.error('Error updating ad upload limit:', error);
      throw error;
    }
  }

  static async deleteAdUploadLimit(limitId: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Verify admin role
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profileError || !profile || profile.role !== 'admin') {
        throw new Error('Insufficient permissions: Admin role required');
      }

      const { error } = await supabase
        .from('ad_upload_limits')
        .delete()
        .eq('id', limitId);

      if (error) throw error;

      await this.logAdminAction('delete_ad_upload_limit', 'ad_upload_limits', limitId, {});
    } catch (error) {
      console.error('Error deleting ad upload limit:', error);
      throw error;
    }
  }

  static async checkAdUploadLimit(hostId: string, kioskId?: string): Promise<{
    canUpload: boolean;
    currentAds: number;
    maxAds: number;
    limitType: string;
  }> {
    try {
      // First check for kiosk-specific limit
      if (kioskId) {
        const { data: kioskLimit, error: kioskError } = await supabase
          .from('ad_upload_limits')
          .select('*')
          .eq('kiosk_id', kioskId)
          .eq('is_active', true)
          .single();

        if (!kioskError && kioskLimit) {
          return {
            canUpload: kioskLimit.current_ads < kioskLimit.max_ads,
            currentAds: kioskLimit.current_ads,
            maxAds: kioskLimit.max_ads,
            limitType: 'kiosk'
          };
        }
      }

      // Check for host-specific limit
      const { data: hostLimit, error: hostError } = await supabase
        .from('ad_upload_limits')
        .select('*')
        .eq('host_id', hostId)
        .eq('is_active', true)
        .single();

      if (!hostError && hostLimit) {
        return {
          canUpload: hostLimit.current_ads < hostLimit.max_ads,
          currentAds: hostLimit.current_ads,
          maxAds: hostLimit.max_ads,
          limitType: 'host'
        };
      }

      // Check for global limit
      const { data: globalLimit, error: globalError } = await supabase
        .from('ad_upload_limits')
        .select('*')
        .eq('limit_type', 'global')
        .eq('is_active', true)
        .single();

      if (!globalError && globalLimit) {
        return {
          canUpload: globalLimit.current_ads < globalLimit.max_ads,
          currentAds: globalLimit.current_ads,
          maxAds: globalLimit.max_ads,
          limitType: 'global'
        };
      }

      // No limits configured - allow unlimited uploads
      return {
        canUpload: true,
        currentAds: 0,
        maxAds: Infinity,
        limitType: 'none'
      };
    } catch (error) {
      console.error('Error checking ad upload limit:', error);
      // On error, allow upload to prevent blocking users
      return {
        canUpload: true,
        currentAds: 0,
        maxAds: Infinity,
        limitType: 'error'
      };
    }
  }

  static async incrementAdUploadCount(hostId: string, kioskId?: string): Promise<void> {
    try {
      // Update kiosk-specific limit if exists
      if (kioskId) {
        const { error: kioskError } = await supabase
          .from('ad_upload_limits')
          .update({ current_ads: supabase.raw('current_ads + 1') })
          .eq('kiosk_id', kioskId)
          .eq('is_active', true);

        if (!kioskError) return; // Successfully updated kiosk limit
      }

      // Update host-specific limit if exists
      const { error: hostError } = await supabase
        .from('ad_upload_limits')
        .update({ current_ads: supabase.raw('current_ads + 1') })
        .eq('host_id', hostId)
        .eq('is_active', true);

      if (!hostError) return; // Successfully updated host limit

      // Update global limit if exists
      await supabase
        .from('ad_upload_limits')
        .update({ current_ads: supabase.raw('current_ads + 1') })
        .eq('limit_type', 'global')
        .eq('is_active', true);
    } catch (error) {
      console.error('Error incrementing ad upload count:', error);
      // Don't throw error to prevent blocking ad uploads
    }
  }

  static async decrementAdUploadCount(hostId: string, kioskId?: string): Promise<void> {
    try {
      // Update kiosk-specific limit if exists
      if (kioskId) {
        const { error: kioskError } = await supabase
          .from('ad_upload_limits')
          .update({ current_ads: supabase.raw('GREATEST(current_ads - 1, 0)') })
          .eq('kiosk_id', kioskId)
          .eq('is_active', true);

        if (!kioskError) return; // Successfully updated kiosk limit
      }

      // Update host-specific limit if exists
      const { error: hostError } = await supabase
        .from('ad_upload_limits')
        .update({ current_ads: supabase.raw('GREATEST(current_ads - 1, 0)') })
        .eq('host_id', hostId)
        .eq('is_active', true);

      if (!hostError) return; // Successfully updated host limit

      // Update global limit if exists
      await supabase
        .from('ad_upload_limits')
        .update({ current_ads: supabase.raw('GREATEST(current_ads - 1, 0)') })
        .eq('limit_type', 'global')
        .eq('is_active', true);
    } catch (error) {
      console.error('Error decrementing ad upload count:', error);
      // Don't throw error to prevent blocking ad operations
    }
  }

  // Clear system notices
  static async clearSystemNotices(): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Update admin notification settings to mark when notices were cleared
      const { error: settingsError } = await supabase
        .from('admin_notification_settings')
        .upsert({
          admin_id: user.id,
          cleared_system_notices_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'admin_id'
        });

      if (settingsError) {
        console.error('Error updating notification settings:', settingsError);
      }

      // Deactivate all system notices
      const { error: updateError } = await supabase
        .from('system_notices')
        .update({ 
          is_active: false, 
          updated_at: new Date().toISOString() 
        })
        .eq('is_active', true);

      if (updateError) {
        console.error('Error clearing system notices:', updateError);
        throw new Error('Failed to clear system notices');
      }

      // Log the action
      await this.logAdminAction(
        'clear_system_notices',
        'system_notices',
        null,
        'All system notices cleared'
      );
    } catch (error) {
      console.error('Error clearing system notices:', error);
      throw error;
    }
  }

  // Clear recent activity
  static async clearRecentActivity(): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Update admin notification settings to mark when activity was cleared
      const { error: settingsError } = await supabase
        .from('admin_notification_settings')
        .upsert({
          admin_id: user.id,
          cleared_recent_activity_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'admin_id'
        });

      if (settingsError) {
        console.error('Error updating notification settings:', settingsError);
      }

      // Log the action
      await this.logAdminAction(
        'clear_recent_activity',
        'admin_audit_log',
        null,
        'Recent activity cleared'
      );
    } catch (error) {
      console.error('Error clearing recent activity:', error);
      throw error;
    }
  }

  // Clear user activity notifications
  static async clearUserActivityNotifications(userType: 'client' | 'host' | 'designer'): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Validate user type
      if (!['client', 'host', 'designer'].includes(userType)) {
        throw new Error('Invalid user type. Must be client, host, or designer.');
      }

      // Update admin notification settings based on user type
      const updateField = `cleared_${userType}_activity_at`;
      const { error: settingsError } = await supabase
        .from('admin_notification_settings')
        .upsert({
          admin_id: user.id,
          [updateField]: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'admin_id'
        });

      if (settingsError) {
        console.error('Error updating notification settings:', settingsError);
      }

      // Log the action
      await this.logAdminAction(
        'clear_user_activity',
        userType,
        null,
        `User activity cleared for ${userType}`
      );
    } catch (error) {
      console.error(`Error clearing ${userType} activity notifications:`, error);
      throw error;
    }
  }

  // Get system notices
  static async getSystemNotices(): Promise<Array<{
    id: string;
    title: string;
    message: string;
    type: 'info' | 'warning' | 'error' | 'success';
    priority: 'low' | 'normal' | 'high' | 'critical';
    is_active: boolean;
    show_on_dashboard: boolean;
    show_on_login: boolean;
    target_roles: string[];
    created_at: string;
    expires_at?: string;
  }>> {
    try {
      const { data, error } = await supabase
        .from('system_notices')
        .select('*')
        .eq('is_active', true)
        .or('expires_at.is.null,expires_at.gt.now()')
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching system notices:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching system notices:', error);
      return [];
    }
  }

  // Get admin notification settings
  static async getAdminNotificationSettings(): Promise<{
    cleared_system_notices_at?: string;
    cleared_recent_activity_at?: string;
    cleared_client_activity_at?: string;
    cleared_host_activity_at?: string;
    cleared_designer_activity_at?: string;
  } | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('admin_notification_settings')
        .select('*')
        .eq('admin_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
        console.error('Error fetching admin notification settings:', error);
        return null;
      }

      return data || null;
    } catch (error) {
      console.error('Error fetching admin notification settings:', error);
      return null;
    }
  }

}
