import { useState, useEffect, useMemo } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  Users, 
  CreditCard, 
  Calendar,
  Download,
  Activity,
  Filter,
  Search,
  Eye,
  EyeOff,
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

interface Transaction {
  id: string;
  type: 'campaign' | 'custom_ad';
  amount: number;
  date: string;
  status: string;
  client: {
    id: string;
    name: string;
    email: string;
  };
  campaign?: {
    id: string;
    name: string;
  };
  customAd?: {
    id: string;
    service_key: string;
    details: string;
  };
  kiosks?: Array<{
    id: string;
    name: string;
    location: string;
  }>;
  adType?: 'ad' | 'photo' | 'video';
  host?: {
    id: string;
    name: string;
    email: string;
  };
  // Additional fields for better filtering
  service?: {
    id: string;
    name: string;
    category: string;
  };
  workflow_status?: string;
  payment_status?: string;
}

interface TransactionFilters {
  transactionType: 'all' | 'campaign' | 'custom_ad';
  adType: 'all' | 'ad' | 'photo' | 'video';
  kioskId: string;
  clientId: string;
  hostId: string;
  status: 'all' | 'succeeded' | 'completed' | 'pending' | 'in_progress' | 'failed' | 'cancelled';
  searchQuery: string;
}

export default function RevenueAnalytics() {
  const [metrics, setMetrics] = useState<RevenueMetrics | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [showTransactions, setShowTransactions] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange>({
    start: new Date(2020, 0, 1).toISOString().split('T')[0], // January 1, 2020 for "all" period
    end: new Date().toISOString().split('T')[0]
  });
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | '90d' | '1y' | 'all'>('all');
  const [filters, setFilters] = useState<TransactionFilters>({
    transactionType: 'all',
    adType: 'all',
    kioskId: '',
    clientId: '',
    hostId: '',
    status: 'all',
    searchQuery: ''
  });
  const [availableKiosks, setAvailableKiosks] = useState<Array<{id: string; name: string; location: string}>>([]);
  const [availableClients, setAvailableClients] = useState<Array<{id: string; name: string; email: string}>>([]);
  const [availableHosts, setAvailableHosts] = useState<Array<{id: string; name: string; email: string}>>([]);
  const { addNotification } = useNotification();

  // Debounced effect to prevent too many API calls
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadRevenueMetrics();
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [dateRange, selectedPeriod]);

  // Load transactions when date range changes
  useEffect(() => {
    if (showTransactions) {
      loadTransactions();
    }
  }, [dateRange, showTransactions]);

  // Load filter options
  useEffect(() => {
    loadFilterOptions();
  }, []);

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

  const loadTransactions = async () => {
    try {
      setTransactionsLoading(true);
      const data = await AdminService.getTransactions(dateRange, filters);
      setTransactions(data);
    } catch (error) {
      console.error('Error loading transactions:', error);
      addNotification('error', 'Error', 'Failed to load transactions');
      setTransactions([]);
    } finally {
      setTransactionsLoading(false);
    }
  };

  const loadFilterOptions = async () => {
    try {
      const [kiosks, clients, hosts] = await Promise.all([
        AdminService.getKiosks(),
        AdminService.getClients(),
        AdminService.getHosts()
      ]);
      setAvailableKiosks(kiosks);
      setAvailableClients(clients);
      setAvailableHosts(hosts);
    } catch (error) {
      console.error('Error loading filter options:', error);
    }
  };

  const handleFilterChange = (key: keyof TransactionFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const applyFilters = () => {
    loadTransactions();
  };

  const clearFilters = () => {
    setFilters({
      transactionType: 'all',
      adType: 'all',
      kioskId: '',
      clientId: '',
      hostId: '',
      status: 'all',
      searchQuery: ''
    });
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter(transaction => {
      // Search query filter
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        const matchesSearch = 
          transaction.client.name.toLowerCase().includes(query) ||
          transaction.client.email.toLowerCase().includes(query) ||
          transaction.campaign?.name.toLowerCase().includes(query) ||
          transaction.customAd?.details.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      // Transaction type filter
      if (filters.transactionType !== 'all' && transaction.type !== filters.transactionType) {
        return false;
      }

      // Ad type filter
      if (filters.adType !== 'all' && transaction.adType !== filters.adType) {
        return false;
      }

      // Kiosk filter
      if (filters.kioskId && transaction.kiosks) {
        const hasKiosk = transaction.kiosks.some(k => k.id === filters.kioskId);
        if (!hasKiosk) return false;
      }

      // Client filter
      if (filters.clientId && transaction.client.id !== filters.clientId) {
        return false;
      }

      // Host filter
      if (filters.hostId && transaction.host?.id !== filters.hostId) {
        return false;
      }

      // Status filter
      if (filters.status !== 'all' && transaction.status !== filters.status) {
        return false;
      }

      return true;
    });
  }, [transactions, filters]);

  const handlePeriodChange = (period: '7d' | '30d' | '90d' | '1y' | 'all') => {
    // Only update if the period actually changed
    if (selectedPeriod === period) return;
    
    setSelectedPeriod(period);
    
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
      case 'all':
        // Set start date to a very early date to get all data
        start.setFullYear(2020, 0, 1); // January 1, 2020
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
  };

  const exportData = async () => {
    try {
      let data: string;
      let filename: string;
      
      if (showTransactions && transactions.length > 0) {
        // Export filtered transactions
        data = await AdminService.exportFilteredTransactions(dateRange, filters, filteredTransactions);
        filename = `filtered-transactions-${dateRange.start}-to-${dateRange.end}.csv`;
      } else {
        // Export revenue analytics
        data = await AdminService.exportRevenueData(dateRange);
        filename = `revenue-analytics-${dateRange.start}-to-${dateRange.end}.csv`;
      }
      
      const blob = new Blob([data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      addNotification('success', 'Success', 'Data exported successfully');
    } catch (error) {
      console.error('Error exporting data:', error);
      addNotification('error', 'Error', 'Failed to export data');
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
            All sales data including Campaigns and Custom Ad orders from Stripe
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            onClick={() => setShowTransactions(!showTransactions)}
            variant="secondary"
            size="sm"
            className="flex items-center gap-2"
          >
            {showTransactions ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {showTransactions ? 'Hide Transactions' : 'View Transactions'}
          </Button>
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
            {(['7d', '30d', '90d', '1y', 'all'] as const).map((period) => (
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
                 period === '1y' ? '1 Year' : 
                 period === 'all' ? 'All' : 'Custom'}
              </Button>
            ))}
          </div>
          
          
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
          {/* <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
          </div> */}

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

          {/* Transactions Section */}
          {showTransactions && (
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Transaction Details
                </h3>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">
                    {filteredTransactions.length} transactions
                  </span>
                </div>
              </div>

              {/* Filters */}
              <div className="mb-6 space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <Filter className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filters:</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search transactions..."
                      value={filters.searchQuery}
                      onChange={(e) => handleFilterChange('searchQuery', e.target.value)}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                  </div>

                  {/* Transaction Type - Primary Filter */}
                  <select
                    value={filters.transactionType}
                    onChange={(e) => handleFilterChange('transactionType', e.target.value)}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-medium"
                  >
                    <option value="all">All Sales (Campaigns + Custom Ads)</option>
                    <option value="campaign">Campaign Sales Only</option>
                    <option value="custom_ad">Custom Ad Orders Only</option>
                  </select>

                  {/* Ad Type */}
                  <select
                    value={filters.adType}
                    onChange={(e) => handleFilterChange('adType', e.target.value)}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  >
                    <option value="all">All Ad Types</option>
                    <option value="ad">Ads</option>
                    <option value="photo">Photos</option>
                    <option value="video">Videos</option>
                  </select>

                  {/* Status */}
                  <select
                    value={filters.status}
                    onChange={(e) => handleFilterChange('status', e.target.value)}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  >
                    <option value="all">All Status</option>
                    <option value="succeeded">Succeeded</option>
                    <option value="completed">Completed</option>
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="failed">Failed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>

                  {/* Kiosk Filter */}
                  <select
                    value={filters.kioskId}
                    onChange={(e) => handleFilterChange('kioskId', e.target.value)}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  >
                    <option value="">All Kiosks</option>
                    {availableKiosks.map(kiosk => (
                      <option key={kiosk.id} value={kiosk.id}>
                        {kiosk.name} - {kiosk.location}
                      </option>
                    ))}
                  </select>

                  {/* Client Filter */}
                  <select
                    value={filters.clientId}
                    onChange={(e) => handleFilterChange('clientId', e.target.value)}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  >
                    <option value="">All Clients</option>
                    {availableClients.map(client => (
                      <option key={client.id} value={client.id}>
                        {client.name} ({client.email})
                      </option>
                    ))}
                  </select>

                  {/* Host Filter */}
                  <select
                    value={filters.hostId}
                    onChange={(e) => handleFilterChange('hostId', e.target.value)}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  >
                    <option value="">All Hosts</option>
                    {availableHosts.map(host => (
                      <option key={host.id} value={host.id}>
                        {host.name} ({host.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    onClick={applyFilters}
                    variant="primary"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    Apply Filters
                  </Button>
                  <Button
                    onClick={clearFilters}
                    variant="ghost"
                    size="sm"
                  >
                    Clear All
                  </Button>
                </div>
              </div>

              {/* Transactions Table */}
              {transactionsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span className="ml-2 text-gray-500">Loading transactions...</span>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Type
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Client
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Campaign/Service Details
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Ad Type
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Amount
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Kiosks
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                      {filteredTransactions.map((transaction) => (
                        <tr key={transaction.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {new Date(transaction.date).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              transaction.type === 'campaign' 
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                                : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            }`}>
                              {transaction.type === 'campaign' ? 'Campaign' : 'Custom Ad'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {transaction.client.name}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                {transaction.client.email}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {transaction.type === 'campaign' ? (
                              <div>
                                <div className="text-sm font-medium text-gray-900 dark:text-white">
                                  {transaction.campaign?.name || 'N/A'}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  Campaign
                                </div>
                              </div>
                            ) : (
                              <div>
                                <div className="text-sm font-medium text-gray-900 dark:text-white">
                                  {transaction.customAd?.service_key || 'N/A'}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-xs">
                                  {transaction.customAd?.details?.substring(0, 50)}...
                                </div>
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {transaction.adType && (
                              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                                {transaction.adType}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-white">
                            {formatCurrency(transaction.amount)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              transaction.status === 'succeeded' || transaction.status === 'completed'
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                : transaction.status === 'pending' || transaction.status === 'in_progress'
                                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                                : transaction.status === 'failed' || transaction.status === 'cancelled'
                                ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                            }`}>
                              {transaction.status.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {transaction.kiosks?.length || 0} kiosk(s)
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  {filteredTransactions.length === 0 && (
                    <div className="text-center py-8">
                      <p className="text-gray-500 dark:text-gray-400">No transactions found matching your filters.</p>
                    </div>
                  )}
                </div>
              )}
            </Card>
          )}
        </>
      )}
    </div>
  );
}
