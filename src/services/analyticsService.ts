import { supabase } from '../lib/supabaseClient';
import { AnalyticsEvent, Inserts } from '../types/database';

export class AnalyticsService {
  // Track an analytics event
  static async trackEvent(eventData: Inserts<'analytics_events'>): Promise<AnalyticsEvent> {
    try {
      const { data, error } = await supabase
        .from('analytics_events')
        .insert(eventData)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to track event: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Error tracking analytics event:', error);
      throw error;
    }
  }

  // Track impression
  static async trackImpression(
    campaignId: string,
    mediaId: string,
    location: string,
    deviceInfo: Record<string, any> = {},
    userAgent?: string,
    ipAddress?: string
  ): Promise<AnalyticsEvent> {
    const eventData: Inserts<'analytics_events'> = {
      campaign_id: campaignId,
      media_id: mediaId,
      event_type: 'impression',
      location,
      device_info: deviceInfo,
      user_agent: userAgent,
      ip_address: ipAddress
    };

    return this.trackEvent(eventData);
  }

  // Track click
  static async trackClick(
    campaignId: string,
    mediaId: string,
    location: string,
    deviceInfo: Record<string, any> = {},
    userAgent?: string,
    ipAddress?: string
  ): Promise<AnalyticsEvent> {
    const eventData: Inserts<'analytics_events'> = {
      campaign_id: campaignId,
      media_id: mediaId,
      event_type: 'click',
      location,
      device_info: deviceInfo,
      user_agent: userAgent,
      ip_address: ipAddress
    };

    return this.trackEvent(eventData);
  }

  // Track video play
  static async trackVideoPlay(
    campaignId: string,
    mediaId: string,
    location: string,
    deviceInfo: Record<string, any> = {},
    userAgent?: string,
    ipAddress?: string
  ): Promise<AnalyticsEvent> {
    const eventData: Inserts<'analytics_events'> = {
      campaign_id: campaignId,
      media_id: mediaId,
      event_type: 'play',
      location,
      device_info: deviceInfo,
      user_agent: userAgent,
      ip_address: ipAddress
    };

    return this.trackEvent(eventData);
  }

  // Track video completion
  static async trackVideoComplete(
    campaignId: string,
    mediaId: string,
    location: string,
    deviceInfo: Record<string, any> = {},
    userAgent?: string,
    ipAddress?: string
  ): Promise<AnalyticsEvent> {
    const eventData: Inserts<'analytics_events'> = {
      campaign_id: campaignId,
      media_id: mediaId,
      event_type: 'complete',
      location,
      device_info: deviceInfo,
      user_agent: userAgent,
      ip_address: ipAddress
    };

    return this.trackEvent(eventData);
  }

  // Get campaign analytics summary
  static async getCampaignAnalytics(
    campaignId: string,
    startDate?: string,
    endDate?: string
  ): Promise<{
    impressions: number;
    clicks: number;
    plays: number;
    completions: number;
    ctr: number;
    playRate: number;
    completionRate: number;
    totalEvents: number;
  }> {
    try {
      let query = supabase
        .from('analytics_events')
        .select('*')
        .eq('campaign_id', campaignId);

      if (startDate) {
        query = query.gte('timestamp', startDate);
      }
      if (endDate) {
        query = query.lte('timestamp', endDate);
      }

      const { data: events, error } = await query;

      if (error) {
        throw new Error(`Failed to fetch campaign analytics: ${error.message}`);
      }

      const impressions = events?.filter(e => e.event_type === 'impression').length || 0;
      const clicks = events?.filter(e => e.event_type === 'click').length || 0;
      const plays = events?.filter(e => e.event_type === 'play').length || 0;
      const completions = events?.filter(e => e.event_type === 'complete').length || 0;
      const totalEvents = events?.length || 0;

      const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
      const playRate = impressions > 0 ? (plays / impressions) * 100 : 0;
      const completionRate = plays > 0 ? (completions / plays) * 100 : 0;

      return {
        impressions,
        clicks,
        plays,
        completions,
        ctr,
        playRate,
        completionRate,
        totalEvents
      };
    } catch (error) {
      console.error('Error getting campaign analytics:', error);
      throw error;
    }
  }

  // Get analytics by time period
  static async getAnalyticsByTimePeriod(
    campaignId: string,
    period: 'hourly' | 'daily' | 'weekly' | 'monthly' = 'daily',
    days: number = 30
  ): Promise<Array<{
    period: string;
    impressions: number;
    clicks: number;
    plays: number;
    completions: number;
  }>> {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data: events, error } = await supabase
        .from('analytics_events')
        .select('*')
        .eq('campaign_id', campaignId)
        .gte('timestamp', startDate.toISOString())
        .lte('timestamp', endDate.toISOString())
        .order('timestamp', { ascending: true });

      if (error) {
        throw new Error(`Failed to fetch analytics by time period: ${error.message}`);
      }

      // Group events by time period
      const analyticsByPeriod = new Map<string, {
        impressions: number;
        clicks: number;
        plays: number;
        completions: number;
      }>();

      events?.forEach(event => {
        let periodKey: string;
        const eventDate = new Date(event.timestamp);

        switch (period) {
          case 'hourly':
            periodKey = eventDate.toISOString().slice(0, 13); // YYYY-MM-DDTHH
            break;
          case 'daily':
            periodKey = eventDate.toISOString().split('T')[0]; // YYYY-MM-DD
            break;
          case 'weekly':
            const weekStart = new Date(eventDate);
            weekStart.setDate(eventDate.getDate() - eventDate.getDay());
            periodKey = weekStart.toISOString().split('T')[0];
            break;
          case 'monthly':
            periodKey = eventDate.toISOString().slice(0, 7); // YYYY-MM
            break;
          default:
            periodKey = eventDate.toISOString().split('T')[0];
        }

        const current = analyticsByPeriod.get(periodKey) || {
          impressions: 0,
          clicks: 0,
          plays: 0,
          completions: 0
        };

        switch (event.event_type) {
          case 'impression':
            current.impressions++;
            break;
          case 'click':
            current.clicks++;
            break;
          case 'play':
            current.plays++;
            break;
          case 'complete':
            current.completions++;
            break;
        }

        analyticsByPeriod.set(periodKey, current);
      });

      // Convert to array and sort
      const result = Array.from(analyticsByPeriod.entries()).map(([period, data]) => ({
        period,
        ...data
      }));

      return result.sort((a, b) => a.period.localeCompare(b.period));
    } catch (error) {
      console.error('Error getting analytics by time period:', error);
      throw error;
    }
  }

  // Get location-based analytics
  static async getLocationAnalytics(
    campaignId: string,
    startDate?: string,
    endDate?: string
  ): Promise<Array<{
    location: string;
    impressions: number;
    clicks: number;
    ctr: number;
  }>> {
    try {
      let query = supabase
        .from('analytics_events')
        .select('location, event_type')
        .eq('campaign_id', campaignId);

      if (startDate) {
        query = query.gte('timestamp', startDate);
      }
      if (endDate) {
        query = query.lte('timestamp', endDate);
      }

      const { data: events, error } = await query;

      if (error) {
        throw new Error(`Failed to fetch location analytics: ${error.message}`);
      }

      // Group events by location
      const locationAnalytics = new Map<string, {
        impressions: number;
        clicks: number;
      }>();

      events?.forEach(event => {
        const current = locationAnalytics.get(event.location) || {
          impressions: 0,
          clicks: 0
        };

        if (event.event_type === 'impression') {
          current.impressions++;
        } else if (event.event_type === 'click') {
          current.clicks++;
        }

        locationAnalytics.set(event.location, current);
      });

      // Convert to array and calculate CTR
      const result = Array.from(locationAnalytics.entries()).map(([location, data]) => ({
        location,
        ...data,
        ctr: data.impressions > 0 ? (data.clicks / data.impressions) * 100 : 0
      }));

      return result.sort((a, b) => b.impressions - a.impressions);
    } catch (error) {
      console.error('Error getting location analytics:', error);
      throw error;
    }
  }

  // Get device analytics
  static async getDeviceAnalytics(
    campaignId: string,
    startDate?: string,
    endDate?: string
  ): Promise<Array<{
    deviceType: string;
    impressions: number;
    clicks: number;
    ctr: number;
  }>> {
    try {
      let query = supabase
        .from('analytics_events')
        .select('device_info, event_type')
        .eq('campaign_id', campaignId);

      if (startDate) {
        query = query.gte('timestamp', startDate);
      }
      if (endDate) {
        query = query.lte('timestamp', endDate);
      }

      const { data: events, error } = await query;

      if (error) {
        throw new Error(`Failed to fetch device analytics: ${error.message}`);
      }

      // Group events by device type
      const deviceAnalytics = new Map<string, {
        impressions: number;
        clicks: number;
      }>();

      events?.forEach(event => {
        const deviceType = this.getDeviceType(event.device_info);
        const current = deviceAnalytics.get(deviceType) || {
          impressions: 0,
          clicks: 0
        };

        if (event.event_type === 'impression') {
          current.impressions++;
        } else if (event.event_type === 'click') {
          current.clicks++;
        }

        deviceAnalytics.set(deviceType, current);
      });

      // Convert to array and calculate CTR
      const result = Array.from(deviceAnalytics.entries()).map(([deviceType, data]) => ({
        deviceType,
        ...data,
        ctr: data.impressions > 0 ? (data.clicks / data.impressions) * 100 : 0
      }));

      return result.sort((a, b) => b.impressions - a.impressions);
    } catch (error) {
      console.error('Error getting device analytics:', error);
      throw error;
    }
  }

  // Get media performance comparison
  static async getMediaPerformanceComparison(
    campaignId: string,
    startDate?: string,
    endDate?: string
  ): Promise<Array<{
    mediaId: string;
    mediaName: string;
    impressions: number;
    clicks: number;
    plays: number;
    completions: number;
    ctr: number;
    playRate: number;
    completionRate: number;
  }>> {
    try {
      let query = supabase
        .from('analytics_events')
        .select(`
          media_id,
          event_type,
          media_assets!inner(file_name)
        `)
        .eq('campaign_id', campaignId);

      if (startDate) {
        query = query.gte('timestamp', startDate);
      }
      if (endDate) {
        query = query.lte('timestamp', endDate);
      }

      const { data: events, error } = await query;

      if (error) {
        throw new Error(`Failed to fetch media performance: ${error.message}`);
      }

      // Group events by media
      const mediaPerformance = new Map<string, {
        mediaName: string;
        impressions: number;
        clicks: number;
        plays: number;
        completions: number;
      }>();

      events?.forEach(event => {
        const mediaId = event.media_id;
        const mediaName = (event.media_assets as any)?.file_name || 'Unknown';
        
        const current = mediaPerformance.get(mediaId) || {
          mediaName,
          impressions: 0,
          clicks: 0,
          plays: 0,
          completions: 0
        };

        switch (event.event_type) {
          case 'impression':
            current.impressions++;
            break;
          case 'click':
            current.clicks++;
            break;
          case 'play':
            current.plays++;
            break;
          case 'complete':
            current.completions++;
            break;
        }

        mediaPerformance.set(mediaId, current);
      });

      // Convert to array and calculate rates
      const result = Array.from(mediaPerformance.entries()).map(([mediaId, data]) => ({
        mediaId,
        ...data,
        ctr: data.impressions > 0 ? (data.clicks / data.impressions) * 100 : 0,
        playRate: data.impressions > 0 ? (data.plays / data.impressions) * 100 : 0,
        completionRate: data.plays > 0 ? (data.completions / data.plays) * 100 : 0
      }));

      return result.sort((a, b) => b.impressions - a.impressions);
    } catch (error) {
      console.error('Error getting media performance comparison:', error);
      throw error;
    }
  }

  // Get real-time analytics (last hour)
  static async getRealTimeAnalytics(campaignId: string): Promise<{
    lastHour: {
      impressions: number;
      clicks: number;
      plays: number;
      completions: number;
    };
    last24Hours: {
      impressions: number;
      clicks: number;
      plays: number;
      completions: number;
    };
  }> {
    try {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // Get last hour data
      const { data: lastHourEvents, error: lastHourError } = await supabase
        .from('analytics_events')
        .select('event_type')
        .eq('campaign_id', campaignId)
        .gte('timestamp', oneHourAgo.toISOString());

      if (lastHourError) {
        throw new Error(`Failed to fetch last hour analytics: ${lastHourError.message}`);
      }

      // Get last 24 hours data
      const { data: last24HoursEvents, error: last24HoursError } = await supabase
        .from('analytics_events')
        .select('event_type')
        .eq('campaign_id', campaignId)
        .gte('timestamp', oneDayAgo.toISOString());

      if (last24HoursError) {
        throw new Error(`Failed to fetch last 24 hours analytics: ${last24HoursError.message}`);
      }

      const calculateMetrics = (events: any[]) => ({
        impressions: events?.filter(e => e.event_type === 'impression').length || 0,
        clicks: events?.filter(e => e.event_type === 'click').length || 0,
        plays: events?.filter(e => e.event_type === 'play').length || 0,
        completions: events?.filter(e => e.event_type === 'complete').length || 0
      });

      return {
        lastHour: calculateMetrics(lastHourEvents),
        last24Hours: calculateMetrics(last24HoursEvents)
      };
    } catch (error) {
      console.error('Error getting real-time analytics:', error);
      throw error;
    }
  }

  // Helper method to determine device type from device info
  private static getDeviceType(deviceInfo: Record<string, any>): string {
    if (!deviceInfo) return 'Unknown';

    const userAgent = deviceInfo.userAgent || '';
    const screenWidth = deviceInfo.screenWidth || 0;
    const screenHeight = deviceInfo.screenHeight || 0;

    if (userAgent.includes('Mobile') || screenWidth < 768) {
      return 'Mobile';
    } else if (userAgent.includes('Tablet') || (screenWidth >= 768 && screenWidth < 1024)) {
      return 'Tablet';
    } else {
      return 'Desktop';
    }
  }

  // Export analytics data
  static async exportAnalyticsData(
    campaignId: string,
    startDate: string,
    endDate: string,
    format: 'csv' | 'json' = 'json'
  ): Promise<string | object> {
    try {
      const { data: events, error } = await supabase
        .from('analytics_events')
        .select('*')
        .eq('campaign_id', campaignId)
        .gte('timestamp', startDate)
        .lte('timestamp', endDate)
        .order('timestamp', { ascending: true });

      if (error) {
        throw new Error(`Failed to fetch analytics data for export: ${error.message}`);
      }

      if (format === 'csv') {
        return this.convertToCSV(events || []);
      } else {
        return events || [];
      }
    } catch (error) {
      console.error('Error exporting analytics data:', error);
      throw error;
    }
  }

  // Convert data to CSV format
  private static convertToCSV(data: any[]): string {
    if (data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')];

    for (const row of data) {
      const values = headers.map(header => {
        const value = row[header];
        if (typeof value === 'object') {
          return JSON.stringify(value);
        }
        return value;
      });
      csvRows.push(values.join(','));
    }

    return csvRows.join('\n');
  }

  // Get CSV analytics data for a user
  static async getCSVAnalyticsData(
    userId: string,
    startDate?: string,
    endDate?: string
  ): Promise<Array<{
    id: string;
    file_name: string;
    data_date: string;
    campaign_id: string | null;
    kiosk_id: string | null;
    location: string | null;
    impressions: number;
    clicks: number;
    plays: number;
    completions: number;
    engagement_rate: number;
    play_rate: number;
    completion_rate: number;
    created_at: string;
  }>> {
    try {
      let query = supabase
        .from('csv_analytics_data')
        .select('*')
        .eq('user_id', userId)
        .order('data_date', { ascending: false });

      if (startDate) {
        query = query.gte('data_date', startDate);
      }
      if (endDate) {
        query = query.lte('data_date', endDate);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to fetch CSV analytics data: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error getting CSV analytics data:', error);
      throw error;
    }
  }

  // Get aggregated analytics data by media asset (file_name)
  static async getMediaAnalyticsData(
    userId: string,
    startDate?: string,
    endDate?: string
  ): Promise<Array<{
    file_name: string;
    total_impressions: number;
    total_clicks: number;
    total_plays: number;
    total_completions: number;
    avg_engagement_rate: number;
    avg_play_rate: number;
    avg_completion_rate: number;
    days_active: number;
    date_range: string;
  }>> {
    try {
      let query = supabase
        .from('csv_analytics_data')
        .select('file_name, impressions, clicks, plays, completions, engagement_rate, play_rate, completion_rate, data_date')
        .eq('user_id', userId);

      if (startDate) {
        query = query.gte('data_date', startDate);
      }
      if (endDate) {
        query = query.lte('data_date', endDate);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to fetch media analytics data: ${error.message}`);
      }

      if (!data || data.length === 0) {
        return [];
      }

      // Group by file_name and aggregate
      const groupedData = new Map<string, {
        file_name: string;
        total_impressions: number;
        total_clicks: number;
        total_plays: number;
        total_completions: number;
        engagement_rates: number[];
        play_rates: number[];
        completion_rates: number[];
        dates: string[];
      }>();

      data.forEach(row => {
        const fileName = row.file_name;
        if (!groupedData.has(fileName)) {
          groupedData.set(fileName, {
            file_name: fileName,
            total_impressions: 0,
            total_clicks: 0,
            total_plays: 0,
            total_completions: 0,
            engagement_rates: [],
            play_rates: [],
            completion_rates: [],
            dates: []
          });
        }

        const group = groupedData.get(fileName)!;
        group.total_impressions += row.impressions || 0;
        group.total_clicks += row.clicks || 0;
        group.total_plays += row.plays || 0;
        group.total_completions += row.completions || 0;
        group.engagement_rates.push(row.engagement_rate || 0);
        group.play_rates.push(row.play_rate || 0);
        group.completion_rates.push(row.completion_rate || 0);
        group.dates.push(row.data_date);
      });

      // Convert to array and calculate averages
      const result = Array.from(groupedData.values()).map(group => ({
        file_name: group.file_name,
        total_impressions: group.total_impressions,
        total_clicks: group.total_clicks,
        total_plays: group.total_plays,
        total_completions: group.total_completions,
        avg_engagement_rate: group.engagement_rates.length > 0 
          ? group.engagement_rates.reduce((a, b) => a + b, 0) / group.engagement_rates.length 
          : 0,
        avg_play_rate: group.play_rates.length > 0 
          ? group.play_rates.reduce((a, b) => a + b, 0) / group.play_rates.length 
          : 0,
        avg_completion_rate: group.completion_rates.length > 0 
          ? group.completion_rates.reduce((a, b) => a + b, 0) / group.completion_rates.length 
          : 0,
        days_active: new Set(group.dates).size,
        date_range: `${Math.min(...group.dates.map(d => new Date(d).getTime()))} to ${Math.max(...group.dates.map(d => new Date(d).getTime()))}`
      }));

      return result.sort((a, b) => b.total_impressions - a.total_impressions);
    } catch (error) {
      console.error('Error getting media analytics data:', error);
      throw error;
    }
  }

  // Get CSV analytics summary for a user
  static async getCSVAnalyticsSummary(
    userId: string,
    startDate?: string,
    endDate?: string
  ): Promise<{
    total_impressions: number;
    total_clicks: number;
    total_plays: number;
    total_completions: number;
    avg_engagement_rate: number;
    avg_play_rate: number;
    avg_completion_rate: number;
    data_points_count: number;
  }> {
    try {
      const { data, error } = await supabase.rpc('get_csv_analytics_summary', {
        p_user_id: userId,
        p_start_date: startDate || null,
        p_end_date: endDate || null
      });

      if (error) {
        throw new Error(`Failed to fetch CSV analytics summary: ${error.message}`);
      }

      return data?.[0] || {
        total_impressions: 0,
        total_clicks: 0,
        total_plays: 0,
        total_completions: 0,
        avg_engagement_rate: 0,
        avg_play_rate: 0,
        avg_completion_rate: 0,
        data_points_count: 0
      };
    } catch (error) {
      console.error('Error getting CSV analytics summary:', error);
      throw error;
    }
  }

  // Get CSV analytics data by location
  static async getCSVAnalyticsByLocation(
    userId: string,
    startDate?: string,
    endDate?: string
  ): Promise<Array<{
    location: string;
    impressions: number;
    clicks: number;
    plays: number;
    completions: number;
    engagement_rate: number;
    play_rate: number;
    completion_rate: number;
  }>> {
    try {
      let query = supabase
        .from('csv_analytics_data')
        .select('location, impressions, clicks, plays, completions, engagement_rate, play_rate, completion_rate')
        .eq('user_id', userId)
        .not('location', 'is', null);

      if (startDate) {
        query = query.gte('data_date', startDate);
      }
      if (endDate) {
        query = query.lte('data_date', endDate);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to fetch CSV analytics by location: ${error.message}`);
      }

      // Group by location and aggregate
      const locationMap = new Map<string, {
        impressions: number;
        clicks: number;
        plays: number;
        completions: number;
        engagement_rate: number;
        play_rate: number;
        completion_rate: number;
      }>();

      data?.forEach(row => {
        const location = row.location || 'Unknown';
        const existing = locationMap.get(location) || {
          impressions: 0,
          clicks: 0,
          plays: 0,
          completions: 0,
          engagement_rate: 0,
          play_rate: 0,
          completion_rate: 0
        };

        existing.impressions += row.impressions;
        existing.clicks += row.clicks;
        existing.plays += row.plays;
        existing.completions += row.completions;
        existing.engagement_rate = existing.impressions > 0 ? (existing.clicks / existing.impressions) * 100 : 0;
        existing.play_rate = existing.impressions > 0 ? (existing.plays / existing.impressions) * 100 : 0;
        existing.completion_rate = existing.plays > 0 ? (existing.completions / existing.plays) * 100 : 0;

        locationMap.set(location, existing);
      });

      return Array.from(locationMap.entries())
        .map(([location, data]) => ({ location, ...data }))
        .sort((a, b) => b.impressions - a.impressions);
    } catch (error) {
      console.error('Error getting CSV analytics by location:', error);
      throw error;
    }
  }

  // Get CSV analytics data by campaign
  static async getCSVAnalyticsByCampaign(
    userId: string,
    startDate?: string,
    endDate?: string
  ): Promise<Array<{
    campaign_id: string;
    campaign_name: string;
    impressions: number;
    clicks: number;
    plays: number;
    completions: number;
    engagement_rate: number;
    play_rate: number;
    completion_rate: number;
  }>> {
    try {
      let query = supabase
        .from('csv_analytics_data')
        .select(`
          campaign_id,
          impressions,
          clicks,
          plays,
          completions,
          engagement_rate,
          play_rate,
          completion_rate,
          campaigns!inner(name)
        `)
        .eq('user_id', userId)
        .not('campaign_id', 'is', null);

      if (startDate) {
        query = query.gte('data_date', startDate);
      }
      if (endDate) {
        query = query.lte('data_date', endDate);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to fetch CSV analytics by campaign: ${error.message}`);
      }

      // Group by campaign and aggregate
      const campaignMap = new Map<string, {
        campaign_name: string;
        impressions: number;
        clicks: number;
        plays: number;
        completions: number;
        engagement_rate: number;
        play_rate: number;
        completion_rate: number;
      }>();

      data?.forEach(row => {
        const campaignId = row.campaign_id;
        const campaignName = (row.campaigns as any)?.name || 'Unknown Campaign';
        const existing = campaignMap.get(campaignId) || {
          campaign_name: campaignName,
          impressions: 0,
          clicks: 0,
          plays: 0,
          completions: 0,
          engagement_rate: 0,
          play_rate: 0,
          completion_rate: 0
        };

        existing.impressions += row.impressions;
        existing.clicks += row.clicks;
        existing.plays += row.plays;
        existing.completions += row.completions;
        existing.engagement_rate = existing.impressions > 0 ? (existing.clicks / existing.impressions) * 100 : 0;
        existing.play_rate = existing.impressions > 0 ? (existing.plays / existing.impressions) * 100 : 0;
        existing.completion_rate = existing.plays > 0 ? (existing.completions / existing.plays) * 100 : 0;

        campaignMap.set(campaignId, existing);
      });

      return Array.from(campaignMap.entries())
        .map(([campaign_id, data]) => ({ campaign_id, ...data }))
        .sort((a, b) => b.impressions - a.impressions);
    } catch (error) {
      console.error('Error getting CSV analytics by campaign:', error);
      throw error;
    }
  }
}

