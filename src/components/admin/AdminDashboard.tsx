import React, { useState, useEffect } from 'react';
import { Users, Monitor, CheckSquare, DollarSign, AlertTriangle, TrendingUp, Upload, Mail, Send } from 'lucide-react';
import { AdminService, AdminMetrics } from '../../services/adminService';
import { useNotification } from '../../contexts/NotificationContext';
import MetricsCard from '../shared/MetricsCard';
import RecentActivity from '../shared/RecentActivity';
import QuickActions from '../shared/QuickActions';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { useNavigate } from 'react-router-dom';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState<Array<{ action: string; time: string; type: 'success' | 'info' | 'warning' | 'error'; }>>([]);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const { addNotification } = useNotification();

  useEffect(() => {
    loadMetrics();
    loadRecentActivity();
  }, []);

  const loadMetrics = async () => {
    try {
      setLoading(true);
      const data = await AdminService.getDashboardMetrics();
      setMetrics(data);
    } catch (error) {
      console.error('Error loading admin metrics:', error);
      addNotification('error', 'Error', 'Failed to load dashboard metrics');
    } finally {
      setLoading(false);
    }
  };

  const loadRecentActivity = async () => {
    try {
      const data = await AdminService.getRecentAdminActivity(10);
      setActivities(data);
    } catch (error) {
      console.error('Error loading recent activity:', error);
    }
  };

  const triggerDailyEmail = async () => {
    try {
      setIsSendingEmail(true);
      await AdminService.sendDailyPendingReviewEmail();
      addNotification('success', 'Success', 'Daily pending review email sent successfully');
    } catch (error) {
      console.error('Error sending daily email:', error);
      addNotification('error', 'Error', 'Failed to send daily email');
    } finally {
      setIsSendingEmail(false);
    }
  };

  const metricsCards = metrics ? [
    {
      title: 'Total Users',
      value: metrics.totalUsers.toLocaleString(),
      change: `+${metrics.recentSignups} new this month`,
      changeType: 'positive' as const,
      icon: Users,
      color: 'purple'
    },
    {
      title: 'Active Kiosks',
      value: metrics.activeKiosks.toString(),
      change: 'Active kiosks',
      changeType: 'positive' as const,
      icon: Monitor,
      color: 'blue'
    },
    {
      title: 'Pending Reviews',
      value: (metrics.pendingReviews + metrics.pendingHostAds).toString(),
      change: `${metrics.pendingReviews} client, ${metrics.pendingHostAds} host`,
      changeType: 'positive' as const,
      icon: CheckSquare,
      color: 'orange'
    },
    {
      title: 'Platform Revenue',
      value: `$${metrics.platformRevenue.toLocaleString()}`,
      change: `${metrics.monthlyGrowth > 0 ? '+' : ''}${metrics.monthlyGrowth.toFixed(1)}% this month`,
      changeType: metrics.monthlyGrowth >= 0 ? 'positive' as const : 'negative' as const,
      icon: DollarSign,
      color: 'green'
    },
    {
      title: 'Total Host Ads',
      value: metrics.totalHostAds.toString(),
      change: `${metrics.pendingHostAds} pending review`,
      changeType: 'positive' as const,
      icon: Upload,
      color: 'purple'
    }
  ] : [];

  const quickActions = [
    {
      title: 'Review Queue',
      description: 'Process pending ad approvals',
      href: '/admin/review',
      icon: CheckSquare,
      color: 'purple'
    },
    {
      title: 'User Management',
      description: 'Manage client and host accounts',
      href: '/admin/users',
      icon: Users,
      color: 'blue'
    },
    {
      title: 'Send Daily Email',
      description: 'Trigger daily pending review email',
      onClick: triggerDailyEmail,
      icon: Send,
      color: 'green',
      loading: isSendingEmail
    }
  ];

  const recentActivities = [
    { action: 'New host "Travel Media" registered', time: '15 minutes ago', type: 'info' },
    { action: '12 ads approved in batch review', time: '1 hour ago', type: 'success' },
    { action: 'System maintenance completed', time: '3 hours ago', type: 'success' },
    { action: 'New kiosk K-025 added to network', time: '5 hours ago', type: 'info' },
    { action: '5 new coupons created for Q1 promotions', time: '1 day ago', type: 'info' },
    { action: 'Monthly revenue target exceeded by 15%', time: '2 days ago', type: 'success' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="mt-2">Monitor platform activity and manage system operations</p>
      </div>

      {/* System Alerts */}
      <Card className="animate-fade-in-up bg-yellow-50/60 dark:bg-yellow-500/10 border-yellow-200/60 dark:border-yellow-600/30" title="System Notice">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-yellow-700 dark:text-yellow-400 mt-0.5" />
          <p className="text-sm">Scheduled maintenance window: Jan 25, 2025 at 2:00 AM - 4:00 AM PST</p>
        </div>
      </Card>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6">
        {loading ? (
          Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-full"></div>
            </div>
          ))
        ) : (
          metricsCards.map((metric, index) => (
            <div key={index} className="animate-fade-in-up" style={{ animationDelay: `${index * 60}ms` }}>
              <MetricsCard {...metric} />
            </div>
          ))
        )}
      </div>

      {/* Quick Actions & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <Card className="lg:col-span-1 animate-fade-in-up" title="Quick Actions" subtitle="Administrative tasks">
          <div className="space-y-3">
            {quickActions.map((qa) => (
              <div key={qa.title} className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <qa.icon className="w-5 h-5 text-primary-600 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">{qa.title}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 truncate">{qa.description}</div>
                  </div>
                </div>
                <Button variant="secondary" size="sm" onClick={() => navigate(qa.href)} className="flex-shrink-0 ml-2">Open</Button>
              </div>
            ))}
          </div>
        </Card>
        <Card className="lg:col-span-2 animate-fade-in-up" title="Recent Activity" subtitle="Latest platform updates">
          <RecentActivity 
            activities={activities}
            onViewAllClick={() => navigate('/admin/activity')}
          />
        </Card>
      </div>

      {/* Platform Overview Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* User Growth */}
        <Card className="animate-fade-in-up" title="User Growth">
          <div className="h-48 sm:h-64 bg-gradient-to-br from-primary-50 to-accent-50 dark:from-gray-800 dark:to-gray-800 rounded-lg flex items-center justify-center">
            <div className="text-center px-4">
              <Users className="h-10 w-10 sm:h-12 sm:w-12 text-primary-600 mx-auto mb-3 sm:mb-4" />
              <p className="text-sm sm:text-base">User registration trends</p>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-2">Clients, hosts, and total platform growth</p>
            </div>
          </div>
        </Card>

        {/* Revenue Analytics */}
        <Card className="animate-fade-in-up" title="Platform Revenue">
          <div className="h-48 sm:h-64 bg-gradient-to-br from-success-50 to-primary-50 dark:from-gray-800 dark:to-gray-800 rounded-lg flex items-center justify-center">
            <div className="text-center px-4">
              <TrendingUp className="h-10 w-10 sm:h-12 sm:w-12 text-success-600 mx-auto mb-3 sm:mb-4" />
              <p className="text-sm sm:text-base">Revenue breakdown and trends</p>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-2">Commission, fees, and marketplace sales</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}