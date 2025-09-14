import React, { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, Calendar, BarChart3, Eye, MousePointer, Target, Clock, Download } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { HostService, HostRevenue } from '../../services/hostService';
import ProofOfPlayWidget from '../shared/ProofOfPlayWidget';
import Card from '../ui/Card';
import Button from '../ui/Button';

export default function RevenueTracker() {
  const { user } = useAuth();
  const { addNotification } = useNotification();
  const [timeRange, setTimeRange] = useState('30d');
  const [revenueData, setRevenueData] = useState<HostRevenue[]>([]);
  const [revenueSummary, setRevenueSummary] = useState({
    total_revenue: 0,
    total_commission: 0,
    total_impressions: 0,
    total_clicks: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadRevenueData = async () => {
      if (!user?.id) return;
      
      try {
        setLoading(true);
        
        // Calculate date range
        const endDate = new Date().toISOString().split('T')[0];
        let startDate: string;
        
        switch (timeRange) {
          case '7d':
            startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            break;
          case '30d':
            startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            break;
          case '90d':
            startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            break;
          case '1y':
            startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            break;
          default:
            startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        }

        const [revenueDataResult, summaryResult] = await Promise.all([
          HostService.getHostRevenue(user.id, startDate, endDate),
          HostService.getHostRevenueSummary(user.id, startDate, endDate)
        ]);

        setRevenueData(revenueDataResult);
        setRevenueSummary(summaryResult);
      } catch (error) {
        console.error('Error loading revenue data:', error);
        addNotification('error', 'Error', 'Failed to load revenue data');
      } finally {
        setLoading(false);
      }
    };

    loadRevenueData();
  }, [user?.id, timeRange, addNotification]);

  const getTimeRangeLabel = () => {
    switch (timeRange) {
      case '7d': return 'Last 7 days';
      case '30d': return 'Last 30 days';
      case '90d': return 'Last 90 days';
      case '1y': return 'Last year';
      default: return 'Last 30 days';
    }
  };

  const calculateCTR = () => {
    if (revenueSummary.total_impressions === 0) return 0;
    return (revenueSummary.total_clicks / revenueSummary.total_impressions) * 100;
  };

  const calculateCPM = () => {
    if (revenueSummary.total_impressions === 0) return 0;
    return (revenueSummary.total_revenue / revenueSummary.total_impressions) * 1000;
  };

  const getTopPerformingKiosks = () => {
    const kioskStats = new Map<string, { name: string; revenue: number; impressions: number; clicks: number }>();
    
    revenueData.forEach(record => {
      const existing = kioskStats.get(record.kiosk_id) || {
        name: record.kiosk.name,
        revenue: 0,
        impressions: 0,
        clicks: 0
      };
      
      existing.revenue += record.revenue;
      existing.impressions += record.impressions;
      existing.clicks += record.clicks;
      
      kioskStats.set(record.kiosk_id, existing);
    });

    return Array.from(kioskStats.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  };

  const exportRevenueData = () => {
    if (revenueData.length === 0) {
      addNotification('warning', 'No Data', 'No revenue data available to export');
      return;
    }

    const csvContent = [
      ['Date', 'Kiosk', 'Impressions', 'Clicks', 'Revenue', 'Commission'].join(','),
      ...revenueData.map(record => [
        record.date,
        record.kiosk.name,
        record.impressions,
        record.clicks,
        record.revenue,
        record.commission
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `revenue-data-${timeRange}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    addNotification('success', 'Export Complete', 'Revenue data has been exported to CSV');
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Revenue Tracker</h1>
          <p className="mt-2">Loading revenue data...</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 animate-pulse">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2"></div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Revenue Tracker</h1>
          <p className="mt-2">Monitor your earnings and track performance</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm" onClick={exportRevenueData}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <div className="flex items-center space-x-2">
            <Calendar className="h-5 w-5 text-gray-400" />
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="1y">Last year</option>
            </select>
          </div>
        </div>
      </div>

      {/* Revenue Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                ${revenueSummary.total_revenue.toLocaleString()}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{getTimeRangeLabel()}</p>
            </div>
            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <DollarSign className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Your Commission</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                ${revenueSummary.total_commission.toLocaleString()}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{getTimeRangeLabel()}</p>
            </div>
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <TrendingUp className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Avg. Daily Revenue</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                ${(revenueSummary.total_revenue / (timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : timeRange === '90d' ? 90 : 365)).toFixed(2)}
              </p>
            </div>
            <Clock className="h-8 w-8 text-pink-600 dark:text-pink-400" />
          </div>
        </Card>
      </div>


      {/* Revenue Chart Placeholder */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Revenue Trends</h3>
        <div className="h-64 bg-gradient-to-br from-green-50 to-blue-50 dark:from-gray-800 dark:to-gray-800 rounded-lg flex items-center justify-center">
          <div className="text-center">
            <BarChart3 className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">Revenue trends chart</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              Daily, weekly, and monthly earnings breakdown
            </p>
          </div>
        </div>
      </Card>

      {/* Recent Revenue Data */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Recent Revenue Data</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Kiosk</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Impressions</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Clicks</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Revenue</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Commission</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
              {revenueData.slice(0, 10).map((record) => (
                <tr key={record.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                    {new Date(record.date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{record.kiosk.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{record.impressions.toLocaleString()}</td>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{record.clicks.toLocaleString()}</td>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">${record.revenue.toFixed(2)}</td>
                  <td className="px-6 py-4 text-sm text-green-600 dark:text-green-400">${record.commission.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* PoP Information for Revenue Analysis */}
      <ProofOfPlayWidget
        accountId={user?.id}
        title="Play Activity & Revenue Correlation"
        showTable={true}
        showExport={true}
        maxRecords={20}
        dateRange={{
          startDate: timeRange === '7d' 
            ? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
            : timeRange === '30d'
            ? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
            : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          endDate: new Date().toISOString().split('T')[0]
        }}
      />
    </div>
  );
}