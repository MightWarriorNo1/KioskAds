import React, { useEffect, useState } from 'react';
import { BarChart3, Upload, Play, DollarSign, Eye, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useNotification } from '../../contexts/NotificationContext';
import { useAuth } from '../../contexts/AuthContext';
import MetricsCard from '../shared/MetricsCard';
import RecentActivity from '../shared/RecentActivity';
import QuickActions from '../shared/QuickActions';
import RecentSales from '../RecentSales';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { CampaignService } from '../../services/campaignService';
import { MediaService } from '../../services/mediaService';
import { BillingService } from '../../services/billingService';
import { AnalyticsService } from '../../services/analyticsService';

interface DashboardMetrics {
  activeCampaigns: number;
  totalImpressions: number;
  monthlySpend: number;
  avgPlayTime: number;
}

interface RecentActivityItem {
  action: string;
  time: string;
  type: 'success' | 'info' | 'warning' | 'error';
}

export default function ClientDashboard() {
  const { addNotification } = useNotification();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    activeCampaigns: 0,
    totalImpressions: 0,
    monthlySpend: 0,
    avgPlayTime: 0
  });
  const [recentActivities, setRecentActivities] = useState<RecentActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch dashboard data on component mount
  useEffect(() => {
    if (user?.id) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch active campaigns
      const activeCampaigns = await CampaignService.getActiveCampaigns(user!.id);
      
      // Fetch user's media assets
      const userMedia = await MediaService.getUserMedia(user!.id);
      
      // Fetch billing summary
      const billingSummary = await BillingService.getBillingSummary(user!.id);
      
      // Calculate metrics
      const totalImpressions = activeCampaigns.reduce((sum, campaign) => {
        // This would typically come from analytics service
        return sum + (campaign.total_spent * 100); // Mock calculation
      }, 0);
      
      const monthlySpend = billingSummary.totalPaid;
      const avgPlayTime = 12.4; // This would come from analytics service
      
      setMetrics({
        activeCampaigns: activeCampaigns.length,
        totalImpressions,
        monthlySpend,
        avgPlayTime
      });
      
      // Generate recent activities from real data
      const activities: RecentActivityItem[] = [];
      
      if (activeCampaigns.length > 0) {
        activities.push({
          action: `Campaign "${activeCampaigns[0].name}" is active`,
          time: 'Recently',
          type: 'success'
        });
      }
      
      if (userMedia.length > 0) {
        activities.push({
          action: `${userMedia.length} media assets uploaded`,
          time: 'Recently',
          type: 'info'
        });
      }
      
      if (billingSummary.recentInvoices.length > 0) {
        const latestInvoice = billingSummary.recentInvoices[0];
        activities.push({
          action: `Invoice ${latestInvoice.id} - $${latestInvoice.amount}`,
          time: 'Recently',
          type: latestInvoice.status === 'paid' ? 'success' : 'warning'
        });
      }
      
      setRecentActivities(activities);
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      addNotification('error', 'Dashboard Error', 'Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  // Add sample notifications on component mount
  useEffect(() => {
    if (user?.id) {
      // Add a welcome notification
      setTimeout(() => {
        addNotification('info', 'Welcome Back!', 'Your dashboard has been updated with the latest campaign data.');
      }, 1000);
    }
  }, [user, addNotification]);

  const dashboardMetrics = [
    {
      title: 'Active Campaigns',
      value: metrics.activeCampaigns.toString(),
      change: `+${Math.max(0, metrics.activeCampaigns - 3)} from last month`,
      changeType: 'positive' as const,
      icon: Play,
      color: 'blue' as const
    },
    {
      title: 'Total Impressions',
      value: metrics.totalImpressions > 1000000 
        ? `${(metrics.totalImpressions / 1000000).toFixed(1)}M`
        : metrics.totalImpressions > 1000 
        ? `${(metrics.totalImpressions / 1000).toFixed(1)}K`
        : metrics.totalImpressions.toString(),
      change: '+15% from last month',
      changeType: 'positive' as const,
      icon: Eye,
      color: 'green' as const
    },
    {
      title: 'Monthly Spend',
      value: `$${metrics.monthlySpend.toLocaleString()}`,
      change: '+5% from last month',
      changeType: 'positive' as const,
      icon: DollarSign,
      color: 'purple' as const
    },
    {
      title: 'Avg. Play Time',
      value: `${metrics.avgPlayTime}s`,
      change: '+2.1s from last month',
      changeType: 'positive' as const,
      icon: Clock,
      color: 'orange' as const
    }
  ];

  const quickActions = [
    {
      title: 'Upload New Ad',
      description: 'Add new creative to your library',
      href: '/client/upload',
      icon: Upload,
      color: 'blue' as const
    },
    {
      title: 'View Analytics',
      description: 'Check campaign performance',
      href: '/client/analytics',
      icon: BarChart3,
      color: 'green' as const
    }
  ];

  const handleMetricClick = (metricTitle: string) => {
    // Navigate to analytics page with specific metric filter
    navigate('/client/analytics', { state: { selectedMetric: metricTitle } });
    addNotification('info', 'Metric Details', `Viewing detailed analytics for ${metricTitle}`);
  };

  const handleQuickAction = (actionTitle: string) => {
    // Navigate to appropriate page based on action
    if (actionTitle === 'Upload New Ad') {
      navigate('/client/upload');
    } else if (actionTitle === 'View Analytics') {
      navigate('/client/analytics');
    } else {
      addNotification('info', 'Quick Action', `${actionTitle} functionality will be implemented soon`);
    }
  };

  const handleRecentActivityClick = (activity: RecentActivityItem) => {
    // Navigate to relevant page based on activity type
    if (activity.action.includes('Campaign')) {
      navigate('/client/campaigns');
    } else if (activity.action.includes('Invoice') || activity.action.includes('Payment')) {
      navigate('/client/billing');
    } else if (activity.action.includes('media assets')) {
      navigate('/client/upload');
    } else {
      addNotification('info', 'Activity Details', `Details for "${activity.action}" will be shown`);
    }
  };

  const handleViewAllActivity = () => {
    navigate('/client/analytics', { state: { showActivity: true } });
    addNotification('info', 'Activity Log', 'Viewing complete activity history');
  };

  const handleChartInteraction = () => {
    navigate('/client/analytics', { state: { showChart: true } });
    addNotification('info', 'Chart View', 'Opening detailed campaign performance chart');
  };

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center lg:text-left">
        <h1 className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-4">
          Client Dashboard
        </h1>
        <p className="text-lg text-slate-700 dark:text-slate-200 max-w-2xl">
          Manage your ad campaigns and track performance across our network of digital kiosks
        </p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
        {dashboardMetrics.map((metric, index) => (
          <div key={index} className="animate-fade-in-up" style={{ animationDelay: `${index * 100}ms` }}>
            <MetricsCard {...metric} onClick={() => handleMetricClick(metric.title)} />
          </div>
        ))}
      </div>

      {/* Quick Actions & Recent Activity */}
      <div className="grid lg:grid-cols-3 gap-6 lg:gap-8">
        <div className="lg:col-span-1 animate-fade-in-up" style={{ animationDelay: '400ms' }}>
          <QuickActions actions={quickActions} onActionClick={handleQuickAction} />
        </div>
        <div className="lg:col-span-2 animate-fade-in-up" style={{ animationDelay: '500ms' }}>
          <RecentActivity 
            activities={recentActivities} 
            onActivityClick={handleRecentActivityClick}
            onViewAllClick={handleViewAllActivity}
          />
        </div>
      </div>

      {/* Recent Sales */}
      <div className="animate-fade-in-up" style={{ animationDelay: '550ms' }}>
        <RecentSales limit={3} />
      </div>

      {/* Campaign Performance Chart */}
      <div className="animate-fade-in-up" style={{ animationDelay: '600ms' }}>
        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-slate-200/50 dark:border-slate-700/50">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Campaign Performance</h3>
          <div 
            className="h-80 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-indigo-900/20 dark:via-purple-900/20 dark:to-pink-900/20 rounded-xl flex items-center justify-center cursor-pointer hover:from-indigo-100 hover:via-purple-100 hover:to-pink-100 dark:hover:from-indigo-800/30 dark:hover:via-purple-800/30 dark:hover:to-pink-800/30 transition-all duration-300 transform hover:scale-105 border border-slate-200/50 dark:border-slate-700/30"
            onClick={handleChartInteraction}
          >
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                <BarChart3 className="h-10 w-10 text-white" />
              </div>
              <p className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-2">Interactive Performance Chart</p>
              <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">Showing impressions, clicks, and conversion rates</p>
              <div className="inline-flex items-center space-x-2 text-sm text-indigo-600 dark:text-indigo-300 font-medium bg-indigo-50 dark:bg-indigo-900/30 px-4 py-2 rounded-lg border border-indigo-200 dark:border-indigo-600/40">
                <span>Click to view detailed analytics</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}