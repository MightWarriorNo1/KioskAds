import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
  const [transactionsLoading] = useState(false);
  const [showTransactions] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange>({
    start: new Date(2020, 0, 1).toISOString().split('T')[0], // January 1, 2020 for "all" period
    end: new Date().toISOString().split('T')[0]
  });
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | '90d' | '1y' | 'all'>('all');
  
  // Store all data for client-side filtering
  const [allData, setAllData] = useState<{
    allPayments: Array<{
      id: string;
      amount: number;
      payment_date: string;
      user_id: string;
      campaign_id?: string;
      status: string;
      profiles?: {
        id: string;
        full_name: string;
        email: string;
      };
      campaigns?: {
        id: string;
        name: string;
      };
    }>;
    allProfiles: Array<{
      id: string;
      full_name: string;
      email: string;
    }>;
    allCampaigns: Array<{
      id: string;
      name: string;
    }>;
    stripeConnectStats: {
      totalPayouts: number;
      totalPayoutAmount: number;
      activeHosts: number;
      pendingPayouts: number;
    };
  } | null>(null);
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
  
  // Use refs to avoid dependency issues
  const dateRangeRef = useRef(dateRange);
  const filtersRef = useRef(filters);
  
  // Update refs when values change
  useEffect(() => {
    dateRangeRef.current = dateRange;
  }, [dateRange]);
  
  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  // Load all data once on component mount
  const loadAllData = useCallback(async () => {
    try {
      setLoading(true);
      console.log('Loading all revenue data...');
      const data = await AdminService.getAllRevenueData();
      console.log('All revenue data loaded:', data);
      setAllData(data);
    } catch (error) {
      console.error('Error loading all revenue data:', error);
      addNotification('error', 'Error', 'Failed to load revenue data');
    } finally {
      setLoading(false);
    }
  }, [addNotification]);

  // Client-side filtering function
  const filterDataByPeriod = useCallback((period: '7d' | '30d' | '90d' | '1y' | 'all', allPayments: Array<{
    id: string;
    amount: number;
    payment_date: string;
    user_id: string;
    campaign_id?: string;
    status: string;
    profiles?: {
      id: string;
      full_name: string;
      email: string;
    };
    campaigns?: {
      id: string;
      name: string;
    };
  }>) => {
    if (!allPayments || allPayments.length === 0) return [];
    
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
        start.setFullYear(2020, 0, 1);
        break;
    }
    
    return allPayments.filter(payment => {
      const paymentDate = new Date(payment.payment_date);
      return paymentDate >= start && paymentDate <= end;
    });
  }, []);

  // Calculate metrics from filtered data
  const calculateMetrics = useCallback((filteredPayments: Array<{
    id: string;
    amount: number;
    payment_date: string;
    user_id: string;
    campaign_id?: string;
    status: string;
    profiles?: {
      id: string;
      full_name: string;
      email: string;
    };
    campaigns?: {
      id: string;
      name: string;
    };
  }>, allData: {
    allPayments: Array<{
      id: string;
      amount: number;
      payment_date: string;
      user_id: string;
      campaign_id?: string;
      status: string;
      profiles?: {
        id: string;
        full_name: string;
        email: string;
      };
      campaigns?: {
        id: string;
        name: string;
      };
    }>;
    allProfiles: Array<{
      id: string;
      full_name: string;
      email: string;
    }>;
    allCampaigns: Array<{
      id: string;
      name: string;
    }>;
    stripeConnectStats: {
      totalPayouts: number;
      totalPayoutAmount: number;
      activeHosts: number;
      pendingPayouts: number;
    };
  }) => {
    if (!filteredPayments || filteredPayments.length === 0) {
      return {
        totalRevenue: 0,
        monthlyRevenue: 0,
        revenueGrowth: 0,
        totalTransactions: 0,
        averageTransactionValue: 0,
        topClients: [],
        revenueByMonth: [],
        paymentMethodBreakdown: [],
        stripeConnectStats: allData.stripeConnectStats
      };
    }

    const totalRevenue = filteredPayments.reduce((sum, payment) => sum + payment.amount, 0);
    const totalTransactions = filteredPayments.length;
    const averageTransactionValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

    // Calculate monthly revenue (current month)
    const currentMonth = new Date();
    const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
    
    const monthlyPayments = filteredPayments.filter(payment => {
      const paymentDate = new Date(payment.payment_date);
      return paymentDate >= monthStart && paymentDate <= monthEnd;
    });
    const monthlyRevenue = monthlyPayments.reduce((sum, payment) => sum + payment.amount, 0);

    // Calculate growth (compare with previous period)
    const previousStart = new Date();
    const previousEnd = new Date();
    const periodLength = new Date().getTime() - new Date(dateRange.start).getTime();
    previousStart.setTime(previousStart.getTime() - periodLength);
    previousEnd.setTime(previousEnd.getTime() - periodLength);
    
    const previousPayments = allData.allPayments.filter((payment) => {
      const paymentDate = new Date(payment.payment_date);
      return paymentDate >= previousStart && paymentDate <= previousEnd;
    });
    const previousRevenue = previousPayments.reduce((sum, payment) => sum + payment.amount, 0);
    const revenueGrowth = previousRevenue > 0 ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 : 0;

    // Get top clients
    const clientSpending = new Map();
    filteredPayments.forEach(payment => {
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

    // Calculate revenue by month for the last 12 months
    const revenueByMonth = [];
    for (let i = 11; i >= 0; i--) {
      const month = new Date();
      month.setMonth(month.getMonth() - i);
      const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
      const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0);
      
      const monthPayments = filteredPayments.filter(payment => {
        const paymentDate = new Date(payment.payment_date);
        return paymentDate >= monthStart && paymentDate <= monthEnd;
      });

      const monthRevenue = monthPayments.reduce((sum, payment) => sum + payment.amount, 0);
      const monthTransactions = monthPayments.length;
      
      revenueByMonth.push({
        month: month.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        revenue: monthRevenue,
        transactions: monthTransactions
      });
    }

    // Payment method breakdown (simplified)
    const paymentMethodBreakdown = [
      { method: 'Credit Card', count: filteredPayments.length, amount: totalRevenue, percentage: 100 }
    ];

    return {
      totalRevenue,
      monthlyRevenue,
      revenueGrowth,
      totalTransactions,
      averageTransactionValue,
      topClients,
      revenueByMonth,
      paymentMethodBreakdown,
      stripeConnectStats: allData.stripeConnectStats
    };
  }, [dateRange.start]);


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

  const handleFilterChange = useCallback((key: keyof TransactionFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const applyFilters = useCallback(() => {
    // Client-side filtering is handled automatically by the useEffect
    // No need to make database calls
    console.log('Filters applied - client-side filtering will update data');
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({
      transactionType: 'all',
      adType: 'all',
      kioskId: '',
      clientId: '',
      hostId: '',
      status: 'all',
      searchQuery: ''
    });
  }, []);

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


  const handlePeriodChange = useCallback((period: '7d' | '30d' | '90d' | '1y' | 'all') => {
    console.log('Period changed to:', period);
    
    // Only update the selected period - no database calls needed
    setSelectedPeriod(period);
    
    // Update date range for display purposes
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
        start.setFullYear(2020, 0, 1);
        break;
    }
    
    const newDateRange = {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    };
    
    console.log('New date range:', newDateRange);
    setDateRange(newDateRange);
    
    // The useEffect will handle the client-side filtering automatically
  }, []);

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

  // Load all data once on component mount
  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Update metrics when period changes (client-side filtering)
  useEffect(() => {
    if (allData) {
      const filteredPayments = filterDataByPeriod(selectedPeriod, allData.allPayments);
      const newMetrics = calculateMetrics(filteredPayments, allData);
      setMetrics(newMetrics);
      
      // Also update transactions for the filtered period
      if (showTransactions) {
        setTransactions(filteredPayments.map(payment => ({
          id: payment.id,
          type: payment.campaign_id ? 'campaign' : 'custom_ad',
          amount: payment.amount,
          date: payment.payment_date,
          status: payment.status,
          client: {
            id: payment.user_id,
            name: payment.profiles?.full_name || 'Unknown',
            email: payment.profiles?.email || 'unknown@example.com'
          },
          campaign: payment.campaigns ? {
            id: payment.campaigns.id,
            name: payment.campaigns.name
          } : undefined,
          customAd: !payment.campaign_id ? {
            id: payment.id,
            service_key: 'Custom Ad',
            details: 'Custom advertisement order'
          } : undefined
        })));
      }
    }
  }, [selectedPeriod, allData, filterDataByPeriod, calculateMetrics, showTransactions]);

  // Load filter options
  useEffect(() => {
    loadFilterOptions();
  }, []);

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
                <div className="w-full">
                  {/* Mobile/Tablet View - Card Layout */}
                  <div className="block lg:hidden">
                    <div className="space-y-4">
                      {filteredTransactions.map((transaction) => (
                        <div key={transaction.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  transaction.type === 'campaign' 
                                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                                    : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                }`}>
                                  {transaction.type === 'campaign' ? 'Campaign' : 'Custom Ad'}
                                </span>
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
                              </div>
                              <div className="text-lg font-semibold text-gray-900 dark:text-white">
                                {formatCurrency(transaction.amount)}
                              </div>
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {new Date(transaction.date).toLocaleDateString()}
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <div>
                              <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Client</div>
                              <div className="text-sm text-gray-900 dark:text-white">{transaction.client.name}</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">{transaction.client.email}</div>
                            </div>
                            
                            <div>
                              <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                {transaction.type === 'campaign' ? 'Campaign' : 'Service'}
                              </div>
                              <div className="text-sm text-gray-900 dark:text-white">
                                {transaction.type === 'campaign' 
                                  ? (transaction.campaign?.name || 'N/A')
                                  : (transaction.customAd?.service_key || 'N/A')
                                }
                              </div>
                              {transaction.type === 'custom_ad' && transaction.customAd?.details && (
                                <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                  {transaction.customAd.details.substring(0, 50)}...
                                </div>
                              )}
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Ad Type</div>
                                <div className="text-sm text-gray-900 dark:text-white">
                                  {transaction.adType ? (
                                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                                      {transaction.adType}
                                    </span>
                                  ) : 'N/A'}
                                </div>
                              </div>
                              <div>
                                <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Kiosks</div>
                                <div className="text-sm text-gray-900 dark:text-white">
                                  {transaction.kiosks?.length || 0}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Desktop View - Table Layout */}
                  <div className="hidden lg:block overflow-x-auto">
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
                            Details
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
                            <td className="px-6 py-4">
                              {transaction.type === 'campaign' ? (
                                <div>
                                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                                    {transaction.campaign?.name || 'N/A'}
                                  </div>
                                  <div className="text-sm text-gray-500 dark:text-gray-400">
                                    Campaign
                                  </div>
                                </div>
                              ) : (
                                <div>
                                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                                    {transaction.customAd?.service_key || 'N/A'}
                                  </div>
                                  <div className="text-sm text-gray-500 dark:text-gray-400">
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
                              {transaction.kiosks?.length || 0}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
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
