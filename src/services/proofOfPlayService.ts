import { supabase } from '../lib/supabaseClient';
import { toCaliforniaTime, formatCaliforniaDate, formatCaliforniaTime } from '../utils/dateUtils';

export interface ProofOfPlayRecord {
  reportDateUTC: string;
  accountId: string;
  screenUUID: string;
  screenName: string;
  screenTags: string;
  assetId: string;
  assetName: string;
  assetTags: string;
  startTimeUTC: string;
  deviceLocalTime: string;
  duration: number; // in seconds
}

export interface ProofOfPlayFilters {
  startDate?: string;
  endDate?: string;
  campaignId?: string;
  screenId?: string;
  assetId?: string;
  accountId?: string;
  kioskId?: string;
  orgId?: string;
  useNewPlaysTable?: boolean; // Flag to use the new plays table instead of analytics_events
}

export class ProofOfPlayService {
  // Shows counts from MV (fallback to raw plays)
  static async getShowsCount(params: { orgId: string; assetId: string; campaignId?: string; kioskId?: string; period: 'daily' | 'weekly' | 'monthly' }): Promise<number> {
    const { orgId, assetId, campaignId, kioskId, period } = params
    const now = new Date()
    let since: string
    if (period === 'daily') {
      since = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString()
    } else if (period === 'weekly') {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
      d.setUTCDate(d.getUTCDate() - 6)
      since = d.toISOString()
    } else {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
      d.setUTCDate(d.getUTCDate() - 29)
      since = d.toISOString()
    }

    // Try MV
    try {
      const { data, error } = await supabase
        .from('plays_daily')
        .select('shows, day')
        .eq('org_id', orgId)
        .eq('asset_id', assetId)
        .gte('day', since)
      if (error) throw error

      const sum = (data ?? []).reduce((acc: number, r: any) => acc + (r.shows ?? 0), 0)
      if (kioskId || campaignId) {
        // plays_daily is not per kiosk/campaign; if filters provided, fallback to raw plays
        throw new Error('need raw plays for kiosk/campaign filter')
      }
      return sum
    } catch (_) {
      // Fallback to raw plays
      let query = supabase
        .from('plays')
        .select('id, played_at, kiosk_id, campaign_id', { count: 'exact', head: true })
        .eq('org_id', orgId)
        .eq('asset_id', assetId)
        .gte('played_at', since)
      if (kioskId) query = query.eq('kiosk_id', kioskId)
      if (campaignId) query = query.eq('campaign_id', campaignId)
      const { count, error } = await query
      if (error) throw error
      return count ?? 0
    }
  }

  // Get Proof-of-Play records with filters (supports both old and new tables)
  static async getProofOfPlayRecords(
    filters: ProofOfPlayFilters = {}
  ): Promise<ProofOfPlayRecord[]> {
    try {
      // Use new plays table if specified or if we have orgId
      if (filters.useNewPlaysTable || filters.orgId) {
        return await this.getProofOfPlayRecordsFromPlays(filters);
      }
      
      // Try legacy analytics_events table first
      return await this.getProofOfPlayRecordsFromAnalytics(filters);
    } catch (error) {
      console.error('Error in getProofOfPlayRecords:', error);
      
      // If analytics_events fails and we haven't tried plays table yet, try it
      if (!filters.useNewPlaysTable && !filters.orgId) {
        console.log('Falling back to plays table...');
        try {
          return await this.getProofOfPlayRecordsFromPlays(filters);
        } catch (playsError) {
          console.error('Plays table also failed:', playsError);
        }
      }
      
      // If all else fails, return empty array
      console.warn('No PoP data available, returning empty array');
      return [];
    }
  }

  // Get Proof-of-Play records from the new plays table
  static async getProofOfPlayRecordsFromPlays(
    filters: ProofOfPlayFilters = {}
  ): Promise<ProofOfPlayRecord[]> {
    try {
      let query = supabase
        .from('plays')
        .select(`
          id,
          played_at,
          ended_at,
          duration_sec,
          kiosks!inner(
            id,
            name,
            location
          ),
          assets!inner(
            id,
            asset_name,
            duration_sec
          ),
          campaigns(
            id,
            name
          ),
          orgs!inner(
            id,
            name
          )
        `)
        .order('played_at', { ascending: false });

      // Apply filters
      if (filters.startDate) {
        query = query.gte('played_at', filters.startDate);
      }
      if (filters.endDate) {
        query = query.lte('played_at', filters.endDate);
      }
      if (filters.campaignId) {
        query = query.eq('campaign_id', filters.campaignId);
      }
      if (filters.kioskId) {
        query = query.eq('kiosk_id', filters.kioskId);
      }
      if (filters.assetId) {
        query = query.eq('asset_id', filters.assetId);
      }
      if (filters.orgId) {
        query = query.eq('org_id', filters.orgId);
      }

      const { data: plays, error } = await query;

      if (error) {
        console.error('Plays table query error:', error);
        throw new Error(`Failed to fetch Proof-of-Play records: ${error.message}`);
      }

      // Transform data to match PoP record structure
      const proofOfPlayRecords: ProofOfPlayRecord[] = (plays || []).map(play => {
        const playedAt = new Date(play.played_at);
        const localTime = new Date(playedAt.getTime() - (playedAt.getTimezoneOffset() * 60000));
        
        return {
          reportDateUTC: playedAt.toISOString().split('T')[0],
          accountId: filters.accountId || '',
          screenUUID: (play.kiosks as any)?.id || '',
          screenName: (play.kiosks as any)?.name || 'Unknown Screen',
          screenTags: (play.kiosks as any)?.location || '',
          assetId: (play.assets as any)?.id || '',
          assetName: (play.assets as any)?.asset_name || 'Unknown Asset',
          assetTags: '',
          startTimeUTC: playedAt.toISOString(),
          deviceLocalTime: localTime.toISOString(),
          duration: play.duration_sec || (play.assets as any)?.duration_sec || 15
        };
      });

      return proofOfPlayRecords;
    } catch (error) {
      console.error('Error fetching Proof-of-Play records from plays table:', error);
      // Fallback to legacy table if new table fails
      return this.getProofOfPlayRecordsFromAnalytics(filters);
    }
  }

  // Get Proof-of-Play records from legacy analytics_events table
  static async getProofOfPlayRecordsFromAnalytics(
    filters: ProofOfPlayFilters = {}
  ): Promise<ProofOfPlayRecord[]> {
    try {
      let query = supabase
        .from('analytics_events')
        .select(`
          timestamp,
          campaign_id,
          media_id,
          location,
          device_info,
          media_assets!inner(
            id,
            file_name,
            file_type
          ),
          campaigns!inner(
            id,
            user_id,
            name
          )
        `)
        .eq('event_type', 'play')
        .order('timestamp', { ascending: false });

      // Apply filters
      if (filters.startDate) {
        query = query.gte('timestamp', filters.startDate);
      }
      if (filters.endDate) {
        query = query.lte('timestamp', filters.endDate);
      }
      if (filters.campaignId) {
        query = query.eq('campaign_id', filters.campaignId);
      }
      if (filters.screenId) {
        query = query.eq('location', filters.screenId);
      }
      if (filters.assetId) {
        query = query.eq('media_id', filters.assetId);
      }
      if (filters.accountId) {
        query = query.eq('campaigns.user_id', filters.accountId);
      }

      const { data: events, error } = await query;

      if (error) {
        console.error('Analytics events query error:', error);
        throw new Error(`Failed to fetch Proof-of-Play records: ${error.message}`);
      }

      // Transform data to match CSV structure
      const proofOfPlayRecords: ProofOfPlayRecord[] = (events || []).map(event => {
        const timestamp = new Date(event.timestamp);
        const californiaTime = toCaliforniaTime(timestamp);
        
        return {
          reportDateUTC: formatCaliforniaDate(timestamp, { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-'), // YYYY-MM-DD format in California timezone
          accountId: (event.campaigns as any)?.user_id || '',
          screenUUID: event.location || 'unknown',
          screenName: event.location || 'Unknown Screen',
          screenTags: '',
          assetId: event.media_id || '',
          assetName: (event.media_assets as any)?.file_name || 'Unknown Asset',
          assetTags: (event.media_assets as any)?.file_type || '',
          startTimeUTC: timestamp.toISOString(),
          deviceLocalTime: californiaTime.toISOString(),
          duration: this.calculateDuration(event.device_info)
        };
      });

      return proofOfPlayRecords;
    } catch (error) {
      console.error('Error fetching Proof-of-Play records:', error);
      throw error;
    }
  }

  // Calculate duration from device info or use default
  private static calculateDuration(deviceInfo: any): number {
    // In a real implementation, this would come from the device tracking
    // For now, we'll use a default duration or extract from device info
    if (deviceInfo?.duration) {
      return deviceInfo.duration;
    }
    
    // Default duration based on media type (this would be more sophisticated in production)
    return 15; // 15 seconds default
  }

  // Get available campaigns for filtering
  static async getAvailableCampaigns(accountId?: string): Promise<Array<{
    id: string;
    name: string;
    user_id: string;
  }>> {
    try {
      let query = supabase
        .from('campaigns')
        .select('id, name, user_id')
        .order('name', { ascending: true });

      if (accountId) {
        query = query.eq('user_id', accountId);
      }

      const { data: campaigns, error } = await query;

      if (error) {
        throw new Error(`Failed to fetch campaigns: ${error.message}`);
      }

      return campaigns || [];
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      throw error;
    }
  }

  // Get available screens/locations for filtering
  static async getAvailableScreens(): Promise<Array<{
    id: string;
    name: string;
    location: string;
    tags: string;
  }>> {
    try {
      // Get unique locations from analytics_events
      const { data: events, error } = await supabase
        .from('analytics_events')
        .select('location')
        .eq('event_type', 'play');

      if (error) {
        throw new Error(`Failed to fetch screen locations: ${error.message}`);
      }

      // Extract unique locations and create screen objects
      const uniqueLocations = [...new Set((events || []).map(event => event.location))];
      
      return uniqueLocations.map((location) => ({
        id: location,
        name: location,
        location: location,
        tags: ''
      }));
    } catch (error) {
      console.error('Error fetching screens:', error);
      throw error;
    }
  }

  // Get PoP information for a specific asset
  static async getAssetProofOfPlay(
    assetId: string,
    filters: Omit<ProofOfPlayFilters, 'assetId'> = {}
  ): Promise<{
    asset: {
      id: string;
      name: string;
      type: string;
      duration?: number;
    };
    summary: {
      totalPlays: number;
      uniqueScreens: number;
      totalDuration: number;
      averageDuration: number;
      dateRange: { start: string; end: string };
    };
    records: ProofOfPlayRecord[];
  }> {
    try {
      // Get asset information
      const { data: asset, error: assetError } = await supabase
        .from('media_assets')
        .select('id, file_name, file_type, duration')
        .eq('id', assetId)
        .single();

      if (assetError || !asset) {
        throw new Error(`Asset not found: ${assetError?.message || 'Unknown error'}`);
      }

      // Get PoP records for this asset
      const assetFilters = { ...filters, assetId };
      const [records, summary] = await Promise.all([
        this.getProofOfPlayRecords(assetFilters),
        this.getProofOfPlaySummary(assetFilters)
      ]);

      return {
        asset: {
          id: asset.id,
          name: asset.file_name,
          type: asset.file_type,
          duration: asset.duration
        },
        summary,
        records
      };
    } catch (error) {
      console.error('Error getting asset Proof-of-Play:', error);
      throw error;
    }
  }

  // Get available assets for filtering
  static async getAvailableAssets(accountId?: string): Promise<Array<{
    id: string;
    file_name: string;
    file_type: string;
  }>> {
    try {
      let query = supabase
        .from('media_assets')
        .select('id, file_name, file_type, user_id')
        .order('file_name', { ascending: true });

      if (accountId) {
        query = query.eq('user_id', accountId);
      }

      const { data: assets, error } = await query;

      if (error) {
        throw new Error(`Failed to fetch assets: ${error.message}`);
      }

      return (assets || []).map(asset => ({
        id: asset.id,
        file_name: asset.file_name,
        file_type: asset.file_type
      }));
    } catch (error) {
      console.error('Error fetching assets:', error);
      throw error;
    }
  }

  // Export Proof-of-Play data to CSV
  static async exportProofOfPlayToCSV(
    filters: ProofOfPlayFilters = {}
  ): Promise<string> {
    try {
      const records = await this.getProofOfPlayRecords(filters);
      
      // Create CSV header matching the image structure
      const headers = [
        'Report Date UTC',
        'Account ID',
        'Screen UUID',
        'Screen Name',
        'Screen Tags',
        'Asset ID',
        'Asset Name',
        'Asset Tags',
        'Start Time UTC',
        'Device Local Time',
        'Duration'
      ];

      // Create CSV rows
      const csvRows = [headers.join(',')];
      
      records.forEach(record => {
        const row = [
          record.reportDateUTC,
          record.accountId,
          record.screenUUID,
          `"${record.screenName}"`,
          `"${record.screenTags}"`,
          record.assetId,
          `"${record.assetName}"`,
          `"${record.assetTags}"`,
          record.startTimeUTC,
          record.deviceLocalTime,
          record.duration.toString()
        ];
        csvRows.push(row.join(','));
      });

      return csvRows.join('\n');
    } catch (error) {
      console.error('Error exporting Proof-of-Play to CSV:', error);
      throw error;
    }
  }

  // Get Proof-of-Play summary statistics
  static async getProofOfPlaySummary(
    filters: ProofOfPlayFilters = {}
  ): Promise<{
    totalPlays: number;
    uniqueScreens: number;
    uniqueAssets: number;
    totalDuration: number;
    averageDuration: number;
    dateRange: {
      start: string;
      end: string;
    };
  }> {
    try {
      const records = await this.getProofOfPlayRecords(filters);
      
      // Handle empty records gracefully
      if (!records || records.length === 0) {
        return {
          totalPlays: 0,
          uniqueScreens: 0,
          uniqueAssets: 0,
          totalDuration: 0,
          averageDuration: 0,
          dateRange: { start: '', end: '' }
        };
      }
      
      const uniqueScreens = new Set(records.map(r => r.screenUUID)).size;
      const uniqueAssets = new Set(records.map(r => r.assetId)).size;
      const totalDuration = records.reduce((sum, r) => sum + r.duration, 0);
      const averageDuration = records.length > 0 ? totalDuration / records.length : 0;
      
      const dates = records.map(r => new Date(r.startTimeUTC)).sort();
      const dateRange = {
        start: dates.length > 0 ? dates[0].toISOString().split('T')[0] : '',
        end: dates.length > 0 ? dates[dates.length - 1].toISOString().split('T')[0] : ''
      };

      return {
        totalPlays: records.length,
        uniqueScreens,
        uniqueAssets,
        totalDuration,
        averageDuration,
        dateRange
      };
    } catch (error) {
      console.error('Error getting Proof-of-Play summary:', error);
      // Return empty summary instead of throwing
      return {
        totalPlays: 0,
        uniqueScreens: 0,
        uniqueAssets: 0,
        totalDuration: 0,
        averageDuration: 0,
        dateRange: { start: '', end: '' }
      };
    }
  }
}
