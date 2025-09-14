import { useState, useEffect } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  Users, 
  CreditCard, 
  Calendar,
  Download,
  BarChart3,
  PieChart,
  Activity
} from 'lucide-react';
import { useNotification } from '../../contexts/NotificationContext';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { AdminService } from '../../services/adminService';

interface RevenueMetrics {
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
}

interface DateRange {
  start: string;
  end: string;
}

export default function RevenueAnalytics() {
  const [metrics, setMetrics] = useState<RevenueMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange>({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | '90d' | '1y' | 'custom'>('30d');
  const { addNotification } = useNotification();

  // Debounced effect to prevent too many API calls
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadRevenueMetrics();
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [dateRange, selectedPeriod]);

  const loadRevenueMetrics = async () => {
    try {
      setLoading(true);
      const data = await AdminService.getRevenueAnalytics(dateRange);
      setMetrics(data);
    } catch (error) {
      console.error('Error loading revenue metrics:', error);
      addNotification('error', 'Error', 'Failed to load revenue analytics');
      
      // Set empty metrics to prevent UI crashes
      setMetrics({
        totalRevenue: 0,
        monthlyRevenue: 0,
        revenueGrowth: 0,
        totalTransactions: 0,
        averageTransactionValue: 0,
        topClients: [],
        revenueByMonth: [],
        paymentMethodBreakdown: [],
        stripeConnectStats: {
          totalPayouts: 0,
          totalPayoutAmount: 0,
          activeHosts: 0,
          pendingPayouts: 0
        }
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePeriodChange = (period: '7d' | '30d' | '90d' | '1y' | 'custom') => {
    // Only update if the period actually changed
    if (selectedPeriod === period) return;
    
    setSelectedPeriod(period);
    
    if (period !== 'custom') {
      const end = new Date();
      const start = new Date();
      
      switch (period) {
        case '7d':
          start.setDate(start.getDate() - 7);
          break;
        case '30d':
          start.setDate(start.getDate() - 30);
          break;
        case '90d':
          start.setDate(start.getDate() - 90);
          break;
        case '1y':
          start.setFullYear(start.getFullYear() - 1);
          break;
      }
      
      const newDateRange = {
        start: start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0]
      };
      
      // Only update date range if it actually changed
      if (newDateRange.start !== dateRange.start || newDateRange.end !== dateRange.end) {
        setDateRange(newDateRange);
      }
    }
  };

  const exportData = async () => {
    try {
      const data = await AdminService.exportRevenueData(dateRange);
      const blob = new Blob([data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `revenue-analytics-${dateRange.start}-to-${dateRange.end}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      addNotification('success', 'Success', 'Revenue data exported successfully');
    } catch (error) {
      console.error('Error exporting data:', error);
      addNotification('error', 'Error', 'Failed to export revenue data');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-96 bg-gray-200 rounded-lg"></div>
            <div className="h-96 bg-gray-200 rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Revenue Analytics
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Comprehensive revenue performance and Stripe analytics
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            onClick={exportData}
            variant="secondary"
            size="sm"
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export Data
          </Button>
        </div>
      </div>

      {/* Date Range Selector */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className={`h-5 w-5 ${loading ? 'text-blue-500 animate-pulse' : 'text-gray-500'}`} />
            <span className="font-medium text-gray-700 dark:text-gray-300">
              Period: {loading && <span className="text-blue-500 text-sm">(Loading...)</span>}
            </span>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {(['7d', '30d', '90d', '1y', 'custom'] as const).map((period) => (
              <Button
                key={period}
                onClick={() => handlePeriodChange(period)}
                variant={selectedPeriod === period ? 'primary' : 'ghost'}
                size="sm"
                className={`transition-colors ${
                  selectedPeriod === period 
                    ? 'bg-blue-600 text-white hover:bg-blue-700' 
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {period === '7d' ? '7 Days' : 
                 period === '30d' ? '30 Days' :
                 period === '90d' ? '90 Days' :
                 period === '1y' ? '1 Year' : 'Custom'}
              </Button>
            ))}
          </div>
          
          {selectedPeriod === 'custom' && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => {
                  const newStart = e.target.value;
                  setDateRange(prev => ({ ...prev, start: newStart }));
                }}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
              <span className="text-gray-500 dark:text-gray-400">to</span>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => {
                  const newEnd = e.target.value;
                  setDateRange(prev => ({ ...prev, end: newEnd }));
                }}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
          )}
        </div>
      </Card>

      {metrics && (
        <>
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Total Revenue
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {formatCurrency(metrics.totalRevenue)}
                  </p>
                </div>
                <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-full">
                  <DollarSign className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
              <div className="mt-4 flex items-center">
                <span className={`text-sm font-medium ${
                  metrics.revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {formatPercentage(metrics.revenueGrowth)}
                </span>
                <span className="text-sm text-gray-500 ml-2">vs previous period</span>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Monthly Revenue
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {formatCurrency(metrics.monthlyRevenue)}
                  </p>
                </div>
                <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-full">
                  <TrendingUp className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <div className="mt-4">
                <span className="text-sm text-gray-500">
                  {metrics.totalTransactions} transactions
                </span>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Avg Transaction
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {formatCurrency(metrics.averageTransactionValue)}
                  </p>
                </div>
                <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-full">
                  <CreditCard className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
              <div className="mt-4">
                <span className="text-sm text-gray-500">
                  Per transaction
                </span>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Active Hosts
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {metrics.stripeConnectStats.activeHosts}
                  </p>
                </div>
                <div className="p-3 bg-orange-100 dark:bg-orange-900/20 rounded-full">
                  <Users className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                </div>
              </div>
              <div className="mt-4">
                <span className="text-sm text-gray-500">
                  {metrics.stripeConnectStats.pendingPayouts} pending payouts
                </span>
              </div>
            </Card>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue Trend Chart */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Revenue Trend
                </h3>
                <BarChart3 className="h-5 w-5 text-gray-500" />
              </div>
              <div className="h-64 flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="text-center">
                  <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500">Revenue trend chart will be implemented</p>
                </div>
              </div>
            </Card>

            {/* Payment Methods Breakdown */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Payment Methods
                </h3>
                <PieChart className="h-5 w-5 text-gray-500" />
              </div>
              <div className="space-y-4">
                {metrics.paymentMethodBreakdown.map((method, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${
                        index === 0 ? 'bg-blue-500' :
                        index === 1 ? 'bg-green-500' :
                        index === 2 ? 'bg-purple-500' : 'bg-orange-500'
                      }`}></div>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {method.method}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(method.amount)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {method.percentage.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Top Clients Table */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Top Clients
              </h3>
              <Users className="h-5 w-5 text-gray-500" />
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Client
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Total Spent
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Transactions
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Avg per Transaction
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                  {metrics.topClients.map((client) => (
                    <tr key={client.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {client.name}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {client.email}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(client.totalSpent)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {client.transactionCount}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {formatCurrency(client.totalSpent / client.transactionCount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Stripe Connect Stats */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Stripe Connect Analytics
              </h3>
              <Activity className="h-5 w-5 text-gray-500" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {metrics.stripeConnectStats.totalPayouts}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Total Payouts
                </p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(metrics.stripeConnectStats.totalPayoutAmount)}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Total Payout Amount
                </p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {metrics.stripeConnectStats.activeHosts}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Active Hosts
                </p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {metrics.stripeConnectStats.pendingPayouts}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Pending Payouts
                </p>
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
