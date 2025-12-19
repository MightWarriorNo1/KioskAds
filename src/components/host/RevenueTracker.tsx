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
  const [stripeOverview, setStripeOverview] = useState<Awaited<ReturnType<typeof HostService.getStripeConnectOverview>> | null>(null);
  const [useStripeData, setUseStripeData] = useState<boolean>(true);
  const [stripeSeries, setStripeSeries] = useState<Array<{ date: string; net: number }>>([]);

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

        // Always pull Stripe overview for live numbers
        const overview = await HostService.getStripeConnectOverview(user.id, 50);
        setStripeOverview(overview);
        // Build daily net series from Stripe transactions (USD only), fill missing days with 0
        if (overview?.recent_balance_transactions) {
          const byDay = new Map<string, number>();
          for (const t of overview.recent_balance_transactions) {
            if (t.currency !== 'usd') continue;
            const d = new Date(t.created * 1000);
            const day = new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString().split('T')[0];
            byDay.set(day, (byDay.get(day) || 0) + (Number(t.net) || 0));
          }
          // Determine range from timeRange selector
          const end = new Date();
          const start = new Date(end);
          const daysBack = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : timeRange === '90d' ? 90 : 30;
          start.setDate(end.getDate() - (daysBack - 1));
          const series: Array<{ date: string; net: number }> = [];
          const cur = new Date(start);
          while (cur <= end) {
            const key = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate()).toISOString().split('T')[0];
            series.push({ date: key, net: byDay.get(key) || 0 });
            cur.setDate(cur.getDate() + 1);
          }
          setStripeSeries(series);
        } else {
          setStripeSeries([]);
        }

        // Fetch revenue data once for kiosk table enrichment
        const revenueDataResult = await HostService.getHostRevenue(user.id, startDate, endDate);
        
        // Calculate summary from revenue data
        const summaryResult = revenueDataResult.reduce(
          (acc, record) => ({
            total_revenue: acc.total_revenue + (Number(record.revenue) || 0),
            total_commission: acc.total_commission + (Number(record.commission) || 0),
            total_impressions: acc.total_impressions + (Number(record.impressions) || 0),
            total_clicks: acc.total_clicks + (Number(record.clicks) || 0)
          }),
          {
            total_revenue: 0,
            total_commission: 0,
            total_impressions: 0,
            total_clicks: 0
          }
        );

        setRevenueData(revenueDataResult);
        setRevenueSummary(summaryResult);

        // Use Stripe data only as fallback if database data is empty
        setUseStripeData(!!overview && (!revenueDataResult || revenueDataResult.length === 0));
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
      if (!record.kiosk) return; // Skip records without kiosk data
      
      const existing = kioskStats.get(record.kiosk_id) || {
        name: record.kiosk?.name || 'Unknown Kiosk',
        revenue: 0,
        impressions: 0,
        clicks: 0
      };
      
      existing.revenue += Number(record.revenue) || 0;
      existing.impressions += Number(record.impressions) || 0;
      existing.clicks += Number(record.clicks) || 0;
      
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
        record.kiosk?.name || 'Unknown Kiosk',
        Number(record.impressions) || 0,
        Number(record.clicks) || 0,
        Number(record.revenue) || 0,
        Number(record.commission) || 0
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
                {(() => {
                  // Always prefer database data if available (even if zero)
                  if (revenueData && revenueData.length > 0) {
                    return `$${revenueSummary.total_revenue.toFixed(2)}`;
                  } else if (stripeOverview) {
                    // For Stripe fallback, use gross amount (amount field) for total revenue
                    // Filter by date range
                    const daysBack = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : timeRange === '90d' ? 90 : 365;
                    const cutoffDate = new Date();
                    cutoffDate.setDate(cutoffDate.getDate() - daysBack);
                    const tx = (stripeOverview.recent_balance_transactions || [])
                      .filter(t => t.currency === 'usd' && new Date(t.created * 1000) >= cutoffDate);
                    const totalGross = tx.reduce((s, t) => s + (Number(t.amount) || 0), 0);
                    return `$${totalGross.toFixed(2)}`;
                  }
                  return '$0.00';
                })()}
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
                {(() => {
                  // Always prefer database data if available (even if zero)
                  if (revenueData && revenueData.length > 0) {
                    return `$${revenueSummary.total_commission.toFixed(2)}`;
                  } else if (stripeOverview) {
                    // For Stripe fallback, use net amount (net field) for commission
                    // Filter by date range
                    const daysBack = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : timeRange === '90d' ? 90 : 365;
                    const cutoffDate = new Date();
                    cutoffDate.setDate(cutoffDate.getDate() - daysBack);
                    const tx = (stripeOverview.recent_balance_transactions || [])
                      .filter(t => t.currency === 'usd' && new Date(t.created * 1000) >= cutoffDate);
                    const totalNet = tx.reduce((s, t) => s + (Number(t.net) || 0), 0);
                    return `$${totalNet.toFixed(2)}`;
                  }
                  return '$0.00';
                })()}
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
                {(() => {
                  const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : timeRange === '90d' ? 90 : 365;
                  
                  // Always prefer database data if available (even if zero)
                  if (revenueData && revenueData.length > 0) {
                    const avgDaily = revenueSummary.total_revenue / days;
                    return `$${avgDaily.toFixed(2)}`;
                  } else if (stripeOverview) {
                    // For Stripe fallback, use gross amount (amount field) for total revenue
                    // Filter by date range
                    const daysBack = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : timeRange === '90d' ? 90 : 365;
                    const cutoffDate = new Date();
                    cutoffDate.setDate(cutoffDate.getDate() - daysBack);
                    const tx = (stripeOverview.recent_balance_transactions || [])
                      .filter(t => t.currency === 'usd' && new Date(t.created * 1000) >= cutoffDate);
                    const totalGross = tx.reduce((s, t) => s + (Number(t.amount) || 0), 0);
                    const avgDaily = totalGross / days;
                    return `$${avgDaily.toFixed(2)}`;
                  }
                  return '$0.00';
                })()}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{getTimeRangeLabel()}</p>
            </div>
            <div className="p-3 bg-pink-50 dark:bg-pink-900/20 rounded-lg">
              <Clock className="h-6 w-6 text-pink-600 dark:text-pink-400" />
            </div>
          </div>
        </Card>
      </div>


      {/* Revenue Trends (Stripe-based summary text for now) */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Revenue Trends</h3>
        <div className="h-64 bg-gradient-to-br from-green-50 to-blue-50 dark:from-gray-800 dark:to-gray-800 rounded-lg p-4">
          {useStripeData && stripeSeries.length > 0 ? (
            <svg viewBox="0 0 1000 260" className="w-full h-full">
              {(() => {
                const chartW = 940;   // left/right padding for y-labels
                const chartH = 200;   // top/bottom padding for x-labels
                const offsetX = 40;
                const offsetY = 30;
                const max = Math.max(...stripeSeries.map(d => d.net), 1);
                const min = Math.min(...stripeSeries.map(d => d.net), 0);
                const span = Math.max(max - min, 1);
                const stepX = chartW / Math.max(stripeSeries.length - 1, 1);
                const points = stripeSeries.map((d, i) => {
                  const x = offsetX + i * stepX;
                  const y = offsetY + (chartH - ((d.net - min) / span) * chartH);
                  return `${x},${y}`;
                }).join(' ');
                // Build ticks
                const yTicks = 5;
                const yTickEls = Array.from({ length: yTicks + 1 }, (_, i) => {
                  const v = min + (span * i) / yTicks;
                  const y = offsetY + (chartH - (i / yTicks) * chartH);
                  return (
                    <g key={`yt-${i}`}>
                      <line x1={offsetX} y1={y} x2={offsetX + chartW} y2={y} stroke="#2d3645" strokeDasharray="2,4" />
                      <text x={4} y={y + 4} fontSize="10" fill="#9ca3af">${v.toFixed(2)}</text>
                    </g>
                  );
                });
                const xTicks = Math.min(6, Math.max(2, Math.floor(stripeSeries.length / 5)));
                const xStep = Math.max(1, Math.floor(stripeSeries.length / (xTicks - 1)));
                const xTickEls = stripeSeries.filter((_, i) => i % xStep === 0 || i === stripeSeries.length - 1)
                  .map((d, idx, arr) => {
                    const i = stripeSeries.indexOf(d);
                    const x = offsetX + i * stepX;
                    return (
                      <g key={`xt-${idx}`}>
                        <line x1={x} y1={offsetY + chartH} x2={x} y2={offsetY + chartH + 6} stroke="#64748b" />
                        <text x={x} y={offsetY + chartH + 18} fontSize="10" fill="#9ca3af" textAnchor={idx === 0 ? 'start' : idx === arr.length - 1 ? 'end' : 'middle'}>
                          {new Date(d.date).toLocaleDateString()}
                        </text>
                      </g>
                    );
                  });
                return (
                  <>
                    {/* Axes */}
                    <line x1={offsetX} y1={offsetY} x2={offsetX} y2={offsetY + chartH} stroke="#94a3b8" />
                    <line x1={offsetX} y1={offsetY + chartH} x2={offsetX + chartW} y2={offsetY + chartH} stroke="#94a3b8" />
                    {yTickEls}
                    {xTickEls}
                    <polyline
                      fill="none"
                      stroke="url(#grad)"
                      strokeWidth="3"
                      points={points}
                    />
                    <defs>
                      <linearGradient id="grad" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#22c55e" />
                        <stop offset="100%" stopColor="#3b82f6" />
                      </linearGradient>
                    </defs>
                  </>
                );
              })()}
            </svg>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-600 dark:text-gray-400">
              No Stripe trend data available
            </div>
          )}
        </div>
      </Card>

      {/* Recent Revenue Data (Stripe transactions if preferred) */}
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
              {useStripeData && stripeOverview ? (
                (stripeOverview.recent_balance_transactions || []).slice(0, 10).map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                      {new Date(t.created * 1000).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                      Stripe (Connected)
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                      0
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                      0
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                      ${Number(t.amount || 0).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-sm text-green-600 dark:text-green-400">
                      ${Number(t.net || 0).toFixed(2)}
                    </td>
                  </tr>
                ))
              ) : revenueData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-sm text-center text-gray-500 dark:text-gray-400">
                    No revenue data available for the selected time range
                  </td>
                </tr>
              ) : (
                revenueData.slice(0, 10).map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                      {new Date(record.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                      {record.kiosk?.name || 'Unknown Kiosk'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                      {(Number(record.impressions) || 0).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                      {(Number(record.clicks) || 0).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                      ${(Number(record.revenue) || 0).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-sm text-green-600 dark:text-green-400">
                      ${(Number(record.commission) || 0).toFixed(2)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Stripe Connect Fallback - visible only when DB revenue is empty */}
      {(!revenueData || revenueData.length === 0) && stripeOverview && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Stripe Connect (Live)</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800">
              <div className="text-sm text-gray-600 dark:text-gray-300">Available Balance (USD)</div>
              <div className="text-xl font-semibold text-gray-900 dark:text-white">
                ${Number(stripeOverview.balances.available.find(b => b.currency === 'usd')?.amount || 0).toFixed(2)}
              </div>
            </div>
            <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800">
              <div className="text-sm text-gray-600 dark:text-gray-300">Pending Balance (USD)</div>
              <div className="text-xl font-semibold text-gray-900 dark:text-white">
                ${Number(stripeOverview.balances.pending.find(b => b.currency === 'usd')?.amount || 0).toFixed(2)}
              </div>
            </div>
            <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800">
              <div className="text-sm text-gray-600 dark:text-gray-300">Recent Payouts</div>
              <div className="text-xl font-semibold text-gray-900 dark:text-white">
                {stripeOverview.recent_payouts?.length || 0}
              </div>
            </div>
          </div>
          <div className="mt-6">
            <div className="text-sm text-gray-600 dark:text-gray-300 mb-2">Recent Transfers From Platform</div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead>
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                  {(stripeOverview.recent_transfers_from_platform || []).slice(0, 5).map(t => (
                    <tr key={t.id}>
                      <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">
                        {new Date(t.created * 1000).toLocaleString()}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">
                        ${Number(t.amount || 0).toFixed(2)}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300">
                        {t.description || '-'}
                      </td>
                    </tr>
                  ))}
                  {(!stripeOverview.recent_transfers_from_platform || stripeOverview.recent_transfers_from_platform.length === 0) && (
                    <tr>
                      <td className="px-4 py-4 text-sm text-gray-500 dark:text-gray-400" colSpan={3}>No recent transfers</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      )}

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