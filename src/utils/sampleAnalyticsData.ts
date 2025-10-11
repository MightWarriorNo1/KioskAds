import { supabase } from '../lib/supabaseClient';

// Function to insert sample CSV analytics data for testing
export async function insertSampleAnalyticsData(userId: string) {
  try {
    const sampleData = [
      // Week 1 data
      {
        user_id: userId,
        file_name: 'ad1.mp4',
        data_date: '2024-01-01',
        campaign_id: null,
        kiosk_id: null,
        location: 'Downtown Mall',
        impressions: 100,
        clicks: 15,
        plays: 85,
        completions: 70,
        engagement_rate: 15.0,
        play_rate: 85.0,
        completion_rate: 82.4
      },
      {
        user_id: userId,
        file_name: 'ad1.mp4',
        data_date: '2024-01-02',
        campaign_id: null,
        kiosk_id: null,
        location: 'Downtown Mall',
        impressions: 120,
        clicks: 18,
        plays: 95,
        completions: 80,
        engagement_rate: 15.0,
        play_rate: 79.2,
        completion_rate: 84.2
      },
      {
        user_id: userId,
        file_name: 'ad1.mp4',
        data_date: '2024-01-03',
        campaign_id: null,
        kiosk_id: null,
        location: 'Downtown Mall',
        impressions: 110,
        clicks: 16,
        plays: 88,
        completions: 75,
        engagement_rate: 14.5,
        play_rate: 80.0,
        completion_rate: 85.2
      },
      {
        user_id: userId,
        file_name: 'ad1.mp4',
        data_date: '2024-01-04',
        campaign_id: null,
        kiosk_id: null,
        location: 'Downtown Mall',
        impressions: 105,
        clicks: 14,
        plays: 82,
        completions: 70,
        engagement_rate: 13.3,
        play_rate: 78.1,
        completion_rate: 85.4
      },
      {
        user_id: userId,
        file_name: 'ad1.mp4',
        data_date: '2024-01-05',
        campaign_id: null,
        kiosk_id: null,
        location: 'Downtown Mall',
        impressions: 115,
        clicks: 17,
        plays: 90,
        completions: 78,
        engagement_rate: 14.8,
        play_rate: 78.3,
        completion_rate: 86.7
      },
      {
        user_id: userId,
        file_name: 'ad1.mp4',
        data_date: '2024-01-06',
        campaign_id: null,
        kiosk_id: null,
        location: 'Downtown Mall',
        impressions: 108,
        clicks: 15,
        plays: 85,
        completions: 72,
        engagement_rate: 13.9,
        play_rate: 78.7,
        completion_rate: 84.7
      },
      {
        user_id: userId,
        file_name: 'ad1.mp4',
        data_date: '2024-01-07',
        campaign_id: null,
        kiosk_id: null,
        location: 'Downtown Mall',
        impressions: 125,
        clicks: 19,
        plays: 95,
        completions: 82,
        engagement_rate: 15.2,
        play_rate: 76.0,
        completion_rate: 86.3
      },
      // Week 2 data
      {
        user_id: userId,
        file_name: 'ad1.mp4',
        data_date: '2024-01-08',
        campaign_id: null,
        kiosk_id: null,
        location: 'Downtown Mall',
        impressions: 130,
        clicks: 20,
        plays: 98,
        completions: 85,
        engagement_rate: 15.4,
        play_rate: 75.4,
        completion_rate: 86.7
      },
      {
        user_id: userId,
        file_name: 'ad1.mp4',
        data_date: '2024-01-09',
        campaign_id: null,
        kiosk_id: null,
        location: 'Downtown Mall',
        impressions: 135,
        clicks: 21,
        plays: 100,
        completions: 88,
        engagement_rate: 15.6,
        play_rate: 74.1,
        completion_rate: 88.0
      },
      {
        user_id: userId,
        file_name: 'ad1.mp4',
        data_date: '2024-01-10',
        campaign_id: null,
        kiosk_id: null,
        location: 'Downtown Mall',
        impressions: 140,
        clicks: 22,
        plays: 105,
        completions: 92,
        engagement_rate: 15.7,
        play_rate: 75.0,
        completion_rate: 87.6
      },
      // Second ad asset
      {
        user_id: userId,
        file_name: 'ad2.mp4',
        data_date: '2024-01-01',
        campaign_id: null,
        kiosk_id: null,
        location: 'Airport Terminal',
        impressions: 80,
        clicks: 12,
        plays: 65,
        completions: 55,
        engagement_rate: 15.0,
        play_rate: 81.3,
        completion_rate: 84.6
      },
      {
        user_id: userId,
        file_name: 'ad2.mp4',
        data_date: '2024-01-02',
        campaign_id: null,
        kiosk_id: null,
        location: 'Airport Terminal',
        impressions: 85,
        clicks: 13,
        plays: 68,
        completions: 58,
        engagement_rate: 15.3,
        play_rate: 80.0,
        completion_rate: 85.3
      },
      {
        user_id: userId,
        file_name: 'ad2.mp4',
        data_date: '2024-01-03',
        campaign_id: null,
        kiosk_id: null,
        location: 'Airport Terminal',
        impressions: 90,
        clicks: 14,
        plays: 72,
        completions: 62,
        engagement_rate: 15.6,
        play_rate: 80.0,
        completion_rate: 86.1
      },
      {
        user_id: userId,
        file_name: 'ad2.mp4',
        data_date: '2024-01-04',
        campaign_id: null,
        kiosk_id: null,
        location: 'Airport Terminal',
        impressions: 88,
        clicks: 13,
        plays: 70,
        completions: 60,
        engagement_rate: 14.8,
        play_rate: 79.5,
        completion_rate: 85.7
      },
      {
        user_id: userId,
        file_name: 'ad2.mp4',
        data_date: '2024-01-05',
        campaign_id: null,
        kiosk_id: null,
        location: 'Airport Terminal',
        impressions: 92,
        clicks: 14,
        plays: 74,
        completions: 64,
        engagement_rate: 15.2,
        play_rate: 80.4,
        completion_rate: 86.5
      },
      {
        user_id: userId,
        file_name: 'ad2.mp4',
        data_date: '2024-01-06',
        campaign_id: null,
        kiosk_id: null,
        location: 'Airport Terminal',
        impressions: 95,
        clicks: 15,
        plays: 76,
        completions: 66,
        engagement_rate: 15.8,
        play_rate: 80.0,
        completion_rate: 86.8
      },
      {
        user_id: userId,
        file_name: 'ad2.mp4',
        data_date: '2024-01-07',
        campaign_id: null,
        kiosk_id: null,
        location: 'Airport Terminal',
        impressions: 98,
        clicks: 16,
        plays: 78,
        completions: 68,
        engagement_rate: 16.3,
        play_rate: 79.6,
        completion_rate: 87.2
      },
      {
        user_id: userId,
        file_name: 'ad2.mp4',
        data_date: '2024-01-08',
        campaign_id: null,
        kiosk_id: null,
        location: 'Airport Terminal',
        impressions: 100,
        clicks: 17,
        plays: 80,
        completions: 70,
        engagement_rate: 17.0,
        play_rate: 80.0,
        completion_rate: 87.5
      },
      {
        user_id: userId,
        file_name: 'ad2.mp4',
        data_date: '2024-01-09',
        campaign_id: null,
        kiosk_id: null,
        location: 'Airport Terminal',
        impressions: 105,
        clicks: 18,
        plays: 84,
        completions: 74,
        engagement_rate: 17.1,
        play_rate: 80.0,
        completion_rate: 88.1
      },
      {
        user_id: userId,
        file_name: 'ad2.mp4',
        data_date: '2024-01-10',
        campaign_id: null,
        kiosk_id: null,
        location: 'Airport Terminal',
        impressions: 110,
        clicks: 19,
        plays: 88,
        completions: 78,
        engagement_rate: 17.3,
        play_rate: 80.0,
        completion_rate: 88.6
      }
    ];

    const { data, error } = await supabase
      .from('csv_analytics_data')
      .insert(sampleData);

    if (error) {
      throw new Error(`Failed to insert sample data: ${error.message}`);
    }

    console.log('Sample analytics data inserted successfully');
    return data;
  } catch (error) {
    console.error('Error inserting sample analytics data:', error);
    throw error;
  }
}
