import { useState, useEffect } from 'react';
import { Users, Monitor, CheckSquare, DollarSign, AlertTriangle, TrendingUp, Upload, Mail, Send, Settings, Trash2, Eye, EyeOff, Plus, Edit, X, RefreshCw } from 'lucide-react';
import { AdminService, AdminMetrics } from '../../services/adminService';
import { useNotification } from '../../contexts/NotificationContext';
import RecentActivity from '../shared/RecentActivity';
import NotificationManager from './NotificationManager';
import QuickActionsSetup from './QuickActionsSetup';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { useNavigate } from 'react-router-dom';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState<Array<{ 
    action: string; 
    time: string; 
    type: 'success' | 'info' | 'warning' | 'error';
    adminName?: string;
    details?: any;
  }>>([]);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [systemNotices, setSystemNotices] = useState<Array<{
    id: string;
    title: string;
    message: string;
    type: 'info' | 'warning' | 'error' | 'success';
    priority: 'low' | 'normal' | 'high' | 'critical';
  }>>([]);
  const [showNotificationManager, setShowNotificationManager] = useState(false);
  const [showQuickActionsSetup, setShowQuickActionsSetup] = useState(false);
  const [customQuickActions, setCustomQuickActions] = useState<Array<{
    id: string;
    title: string;
    description: string;
    href?: string;
    onClick?: string;
    icon: string;
    color: 'blue' | 'green' | 'purple' | 'orange' | 'red';
    enabled: boolean;
  }>>([]);
  const [activityLimit, setActivityLimit] = useState<number | null>(null);
  const [showAllActivities, setShowAllActivities] = useState(false);
  const [refreshingActivities, setRefreshingActivities] = useState(false);
  const [activitiesCleared, setActivitiesCleared] = useState(false);
  const { addNotification } = useNotification();

  useEffect(() => {
    const initializeDashboard = async () => {
      await loadMetrics();
      await loadSystemNotices();
      await loadCustomQuickActions();
      await loadActivitySettings();
      // Load activities after settings are loaded so we know if they were cleared
      await loadRecentActivity();
    };
    
    initializeDashboard();
  }, []);

  // Separate useEffect to reload activities when cleared state changes
  useEffect(() => {
    if (activitiesCleared !== undefined) {
      loadRecentActivity();
    }
  }, [activitiesCleared]);

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
      // Check if activities were previously cleared
      if (activitiesCleared) {
        setActivities([]);
        return;
      }

      // Fetch real activity data from API
      const limit = showAllActivities ? 50 : (activityLimit || 5);
      const apiActivities = await AdminService.getRecentAdminActivity(limit);
      
      // Transform API data to match our format
      const transformedActivities = apiActivities.map(activity => ({
        action: activity.action,
        time: activity.time,
        type: activity.type,
        adminName: activity.adminName,
        details: activity.details
      }));
      
      setActivities(transformedActivities);
    } catch (error) {
      console.error('Error loading recent activity:', error);
      // Fallback to empty array if API fails
      setActivities([]);
    }
  };

  const loadSystemNotices = async () => {
    try {
      const notices = await AdminService.getSystemNotices();
      setSystemNotices(notices);
    } catch (error) {
      console.error('Error loading system notices:', error);
    }
  };

  const loadCustomQuickActions = async () => {
    try {
      const saved = localStorage.getItem('admin-custom-quick-actions');
      if (saved) {
        setCustomQuickActions(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Error loading custom quick actions:', error);
    }
  };

  const loadActivitySettings = async () => {
    try {
      const saved = localStorage.getItem('admin-activity-settings');
      if (saved) {
        const settings = JSON.parse(saved);
        setActivityLimit(settings.limit);
        setShowAllActivities(settings.showAll);
        setActivitiesCleared(settings.cleared || false);
      }
    } catch (error) {
      console.error('Error loading activity settings:', error);
    }
  };

  const saveCustomQuickActions = (actions: typeof customQuickActions) => {
    try {
      localStorage.setItem('admin-custom-quick-actions', JSON.stringify(actions));
      setCustomQuickActions(actions);
      addNotification('success', 'Success', 'Quick actions updated successfully');
    } catch (error) {
      console.error('Error saving custom quick actions:', error);
      addNotification('error', 'Error', 'Failed to save quick actions');
    }
  };

  const saveActivitySettings = (limit: number | null, showAll: boolean, cleared?: boolean) => {
    try {
      const settings = { 
        limit, 
        showAll, 
        cleared: cleared !== undefined ? cleared : activitiesCleared 
      };
      localStorage.setItem('admin-activity-settings', JSON.stringify(settings));
      setActivityLimit(limit);
      setShowAllActivities(showAll);
      if (cleared !== undefined) {
        setActivitiesCleared(cleared);
      }
      addNotification('success', 'Success', 'Activity settings updated successfully');
    } catch (error) {
      console.error('Error saving activity settings:', error);
      addNotification('error', 'Error', 'Failed to save activity settings');
    }
  };

  const clearRecentActivity = async () => {
    if (window.confirm('Are you sure you want to clear all recent activities? This action cannot be undone.')) {
      setActivities([]);
      setActivitiesCleared(true);
      saveActivitySettings(activityLimit, showAllActivities, true);
      // Log the admin action
      try {
        await AdminService.logAdminAction(
          'Recent activity cleared from dashboard',
          'dashboard',
          null,
          { type: 'clear_activity' }
        );
      } catch (error) {
        console.error('Error logging clear activity action:', error);
      }
      addNotification('success', 'Success', 'Recent activity cleared');
    }
  };

  const refreshActivities = async () => {
    try {
      setRefreshingActivities(true);
      setActivitiesCleared(false);
      saveActivitySettings(activityLimit, showAllActivities, false);
      await loadRecentActivity();
      // Log the admin action
      try {
        await AdminService.logAdminAction(
          'Recent activity refreshed on dashboard',
          'dashboard',
          null,
          { type: 'refresh_activity' }
        );
      } catch (error) {
        console.error('Error logging refresh activity action:', error);
      }
      addNotification('success', 'Success', 'Activities refreshed');
    } catch (error) {
      addNotification('error', 'Error', 'Failed to refresh activities');
    } finally {
      setRefreshingActivities(false);
    }
  };

  const getIconFromString = (iconName: string) => {
    const iconMap: { [key: string]: any } = {
      'Users': Users,
      'Monitor': Monitor,
      'CheckSquare': CheckSquare,
      'DollarSign': DollarSign,
      'AlertTriangle': AlertTriangle,
      'TrendingUp': TrendingUp,
      'Upload': Upload,
      'Mail': Mail,
      'Send': Send,
      'Settings': Settings,
      'Trash2': Trash2,
      'Eye': Eye,
      'EyeOff': EyeOff,
      'Plus': Plus,
      'Edit': Edit,
      'X': X
    };
    return iconMap[iconName] || Settings;
  };

  const getMetricColor = (color: string) => {
    const colorMap: { [key: string]: string } = {
      'purple': 'bg-gradient-to-br from-purple-500 to-purple-600',
      'blue': 'bg-gradient-to-br from-blue-500 to-blue-600',
      'orange': 'bg-gradient-to-br from-orange-500 to-orange-600',
      'green': 'bg-gradient-to-br from-green-500 to-green-600',
      'red': 'bg-gradient-to-br from-red-500 to-red-600'
    };
    return colorMap[color] || 'bg-gradient-to-br from-gray-500 to-gray-600';
  };

  const triggerDailyEmail = async () => {
    try {
      setIsSendingEmail(true);
      await AdminService.sendDailyPendingReviewEmail();
      // Log the admin action
      await AdminService.logAdminAction(
        'Daily pending review email sent to all users',
        'email',
        null,
        { type: 'daily_pending_review_email' }
      );
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
      color: 'purple',
      onClick: () => navigate('/admin/users'),
      clickable: true
    },
    {
      title: 'Active Kiosks',
      value: metrics.activeKiosks.toString(),
      change: 'Active kiosks',
      changeType: 'positive' as const,
      icon: Monitor,
      color: 'blue',
      onClick: () => navigate('/admin/kiosks'),
      clickable: true
    },
    {
      title: 'Pending Reviews',
      value: (metrics.pendingReviews + metrics.pendingHostAds).toString(),
      change: `${metrics.pendingReviews} client, ${metrics.pendingHostAds} host`,
      changeType: 'positive' as const,
      icon: CheckSquare,
      color: 'orange',
      onClick: () => navigate('/admin/review'),
      clickable: true
    },
    {
      title: 'Platform Revenue',
      value: `$${metrics.platformRevenue.toLocaleString()}`,
      change: `${metrics.monthlyGrowth > 0 ? '+' : ''}${metrics.monthlyGrowth.toFixed(1)}% this month`,
      changeType: metrics.monthlyGrowth >= 0 ? 'positive' as const : 'negative' as const,
      icon: DollarSign,
      color: 'green',
      onClick: () => navigate('/admin/revenue'),
      clickable: true
    },
    {
      title: 'Total Host Ads',
      value: metrics.totalHostAds.toString(),
      change: `${metrics.pendingHostAds} pending review`,
      changeType: 'positive' as const,
      icon: Upload,
      color: 'purple',
      onClick: () => navigate('/admin/host-ad-assignments'),
      clickable: true
    }
  ] : [];

  const defaultQuickActions = [
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
    },
    {
      title: 'Notification Manager',
      description: 'Manage system notices and clear notifications',
      onClick: () => setShowNotificationManager(true),
      icon: Settings,
      color: 'purple'
    }
  ];

  // Combine default and custom quick actions
  const quickActions = [
    ...defaultQuickActions,
    ...customQuickActions
      .filter(action => action.enabled)
      .map(action => ({
        title: action.title,
        description: action.description,
        href: action.href,
        onClick: action.onClick ? () => {
          if (action.href) {
            navigate(action.href);
          } else if (action.onClick === 'triggerDailyEmail') {
            triggerDailyEmail();
          } else if (action.onClick === 'showNotificationManager') {
            setShowNotificationManager(true);
          }
        } : undefined,
        icon: getIconFromString(action.icon),
        color: action.color,
        loading: false
      }))
  ];

  // Apply activity limit if set
  const recentActivities = showAllActivities 
    ? activities 
    : activityLimit 
      ? activities.slice(0, activityLimit)
      : activities.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="mt-2">Monitor platform activity and manage system operations</p>
      </div>

      {/* System Alerts */}
      {systemNotices.length > 0 && systemNotices.map((notice) => {
        const getNoticeColor = (type: string) => {
          switch (type) {
            case 'success': return 'bg-green-50/60 dark:bg-green-500/10 border-green-200/60 dark:border-green-600/30';
            case 'warning': return 'bg-yellow-50/60 dark:bg-yellow-500/10 border-yellow-200/60 dark:border-yellow-600/30';
            case 'error': return 'bg-red-50/60 dark:bg-red-500/10 border-red-200/60 dark:border-red-600/30';
            default: return 'bg-blue-50/60 dark:bg-blue-500/10 border-blue-200/60 dark:border-blue-600/30';
          }
        };
        
        const getNoticeIcon = (type: string) => {
          switch (type) {
            case 'success': return 'text-green-700 dark:text-green-400';
            case 'warning': return 'text-yellow-700 dark:text-yellow-400';
            case 'error': return 'text-red-700 dark:text-red-400';
            default: return 'text-blue-700 dark:text-blue-400';
          }
        };
        
        return (
          <Card key={notice.id} className={`animate-fade-in-up ${getNoticeColor(notice.type)}`} title={notice.title}>
            <div className="flex items-start gap-3">
              <AlertTriangle className={`h-5 w-5 ${getNoticeIcon(notice.type)} mt-0.5`} />
              <p className="text-sm">{notice.message}</p>
            </div>
          </Card>
        );
      })}

      {/* Top Metrics - Enhanced Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6">
        {loading ? (
          Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-4 sm:p-6 animate-pulse">
              <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-3/4 mb-2"></div>
              <div className="h-8 bg-gray-200 dark:bg-gray-600 rounded w-1/2 mb-2"></div>
              <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-full"></div>
            </div>
          ))
        ) : (
          metricsCards.map((metric, index) => (
            <div 
              key={index} 
              className={`animate-fade-in-up group ${metric.clickable ? 'cursor-pointer hover:scale-105 transition-transform duration-200' : ''}`}
              style={{ animationDelay: `${index * 60}ms` }}
              onClick={metric.clickable ? metric.onClick : undefined}
            >
              <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-4 sm:p-6 ${metric.clickable ? 'hover:shadow-xl hover:border-primary-300 dark:hover:border-primary-600 transition-all duration-200' : ''}`}>
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 rounded-lg ${getMetricColor(metric.color)}`}>
                    <metric.icon className="h-6 w-6 text-white" />
                  </div>
                  {metric.clickable && (
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <Eye className="h-4 w-4 text-gray-400" />
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                    {metric.value}
                  </h3>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">
                    {metric.title}
                  </p>
                  <p className={`text-xs ${metric.changeType === 'positive' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {metric.change}
                  </p>
                </div>
              </div>
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
                {qa.href ? (
                  <Button variant="secondary" size="sm" onClick={() => qa.href && navigate(qa.href)} className="flex-shrink-0 ml-2">Open</Button>
                ) : (
                  <Button variant="secondary" size="sm" onClick={qa.onClick} disabled={qa.loading} className="flex-shrink-0 ml-2">
                    {qa.loading ? 'Loading...' : 'Execute'}
                  </Button>
                )}
              </div>
            ))}
            <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
              <Button 
                variant="secondary" 
                size="sm" 
                onClick={() => setShowQuickActionsSetup(true)}
                className="w-full"
              >
                <Settings className="w-4 h-4 mr-2" />
                Setup Quick Actions
              </Button>
            </div>
          </div>
        </Card>
        <Card className="lg:col-span-2 animate-fade-in-up" title="Recent Activity" subtitle="Latest platform updates">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {activitiesCleared ? 'All activities cleared' : `Showing ${recentActivities.length} of ${activities.length} activities`}
                </span>
                {!showAllActivities && (
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    onClick={() => saveActivitySettings(activityLimit, true)}
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    Show All
                  </Button>
                )}
              </div>
              {!activitiesCleared && (
                <div className="flex items-center gap-2">
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    onClick={refreshActivities}
                    loading={refreshingActivities}
                    disabled={refreshingActivities}
                  >
                    <RefreshCw className={`w-4 h-4 mr-1 ${refreshingActivities ? 'animate-spin' : ''}`} />
                    {refreshingActivities ? 'Refreshing...' : 'Refresh'}
                  </Button>
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    onClick={() => saveActivitySettings(5, false)}
                  >
                    <EyeOff className="w-4 h-4 mr-1" />
                    Top 5
                  </Button>
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    onClick={clearRecentActivity}
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Clear
                  </Button>
                </div>
              )}
            </div>
            {activitiesCleared ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Trash2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No Recent Activities</p>
                <p className="text-sm mt-2">All activities have been cleared</p>
                <Button 
                  variant="secondary" 
                  size="sm" 
                  onClick={refreshActivities}
                  className="mt-4"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Restore Activities
                </Button>
              </div>
            ) : (
              <RecentActivity 
                activities={recentActivities}
                onViewAllClick={() => navigate('/admin/activity')}
              />
            )}
          </div>
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

      {/* Notification Manager Modal */}
      {showNotificationManager && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Notification Manager</h2>
                <Button
                  onClick={() => setShowNotificationManager(false)}
                  variant="secondary"
                  size="sm"
                >
                  Close
                </Button>
              </div>
              <NotificationManager />
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions Setup Modal */}
      {showQuickActionsSetup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Quick Actions Setup</h2>
                <Button
                  onClick={() => setShowQuickActionsSetup(false)}
                  variant="secondary"
                  size="sm"
                >
                  Close
                </Button>
              </div>
              <QuickActionsSetup 
                customActions={customQuickActions}
                onSave={saveCustomQuickActions}
                onClose={() => setShowQuickActionsSetup(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}