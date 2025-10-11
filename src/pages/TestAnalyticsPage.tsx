import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { insertSampleAnalyticsData } from '../utils/sampleAnalyticsData';
import Button from '../components/ui/Button';

export default function TestAnalyticsPage() {
  const { user } = useAuth();
  const { addNotification } = useNotification();
  const [loading, setLoading] = useState(false);

  const handleInsertSampleData = async () => {
    if (!user) {
      addNotification('error', 'Error', 'User not found');
      return;
    }

    try {
      setLoading(true);
      await insertSampleAnalyticsData(user.id);
      addNotification('success', 'Success', 'Sample analytics data inserted successfully!');
    } catch (error) {
      console.error('Error inserting sample data:', error);
      addNotification('error', 'Error', 'Failed to insert sample data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Test Analytics Data</h1>
          
          <div className="space-y-4">
            <p className="text-gray-600">
              This page allows you to insert sample analytics data for testing the analytics functionality.
              The sample data includes:
            </p>
            
            <ul className="list-disc list-inside text-gray-600 space-y-2">
              <li>Two ad assets: ad1.mp4 and ad2.mp4</li>
              <li>10 days of data (January 1-10, 2024)</li>
              <li>Daily impressions, clicks, plays, and completions</li>
              <li>Different locations: Downtown Mall and Airport Terminal</li>
              <li>Realistic engagement rates and completion rates</li>
            </ul>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-blue-900 mb-2">Sample Data Summary</h3>
              <div className="text-sm text-blue-800 space-y-1">
                <p><strong>ad1.mp4:</strong> ~1,200 total impressions, ~150 total clicks</p>
                <p><strong>ad2.mp4:</strong> ~900 total impressions, ~140 total clicks</p>
                <p><strong>Total plays:</strong> ~1,500 across both assets</p>
                <p><strong>Date range:</strong> January 1-10, 2024</p>
              </div>
            </div>

            <Button
              onClick={handleInsertSampleData}
              disabled={loading}
              className="w-full"
            >
              {loading ? 'Inserting Sample Data...' : 'Insert Sample Analytics Data'}
            </Button>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-yellow-900 mb-2">Next Steps</h3>
              <ol className="text-sm text-yellow-800 space-y-1">
                <li>1. Click the button above to insert sample data</li>
                <li>2. Navigate to the Analytics page to see the data</li>
                <li>3. Test different date ranges (7, 30, 90 days)</li>
                <li>4. Check both client and admin analytics pages</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
