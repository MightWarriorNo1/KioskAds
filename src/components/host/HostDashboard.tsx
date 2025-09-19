import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Monitor, DollarSign, MapPin, TrendingUp, Eye, Upload, Calendar, Play } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { HostService, HostStats } from '../../services/hostService';
import { ProofOfPlayService } from '../../services/proofOfPlayService';
import MetricsCard from '../shared/MetricsCard';
import RecentActivity from '../shared/RecentActivity';
import ProofOfPlayWidget from '../shared/ProofOfPlayWidget';
import Card from '../ui/Card';
import Button from '../ui/Button';

export default function HostDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState<HostStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [popSummary, setPopSummary] = useState({
    totalPlays: 0,
    uniqueScreens: 0,
    uniqueAssets: 0,
    totalDuration: 0,
    averageDuration: 0
  });

  useEffect(() => {
    const loadDashboardData = async () => {
      if (!user?.id) return;
      
      try {
        setLoading(true);
        const [statsData, popData] = await Promise.all([
          HostService.getHostStats(user.id),
          ProofOfPlayService.getProofOfPlaySummary({ 
            accountId: user.id,
            startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            endDate: new Date().toISOString().split('T')[0]
          })
        ]);
        setStats(statsData);
        setPopSummary(popData);
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [user?.id]);

  const metrics = stats ? [
    {
      title: 'Active Kiosks',
      value: stats.active_kiosks.toString(),
      change: `${stats.total_kiosks} total`,
      changeType: 'positive' as const,
      icon: Monitor,
      color: 'green' as const
    },
    {
      title: 'Monthly Revenue',
      value: `$${stats.monthly_revenue.toLocaleString()}`,
      change: 'This month',
      changeType: 'positive' as const,
      icon: DollarSign,
      color: 'blue' as const
    },
    {
      title: 'Total Impressions',
      value: stats.total_impressions.toLocaleString(),
      change: 'All time',
      changeType: 'positive' as const,
      icon: Eye,
      color: 'purple' as const
    },
    {
      title: 'Pending Ads',
      value: stats.pending_ads.toString(),
      change: 'Awaiting review',
      changeType: 'positive' as const,
      icon: Upload,
      color: stats.pending_ads > 0 ? 'orange' as const : 'green' as const
    },
    {
      title: 'Total Plays (30d)',
      value: popSummary.totalPlays.toLocaleString(),
      change: `${popSummary.uniqueScreens} screens`,
      changeType: 'positive' as const,
      icon: Play,
      color: 'purple' as const
    }
  ] : [];

  const quickActions = [
    {
      title: 'Manage Kiosks',
      description: 'View and configure your kiosks',
      href: '/host/kiosks',
      icon: Monitor,
      color: 'green' as const
    },
    {
      title: 'Upload Ads',
      description: 'Upload new ads for review',
      href: '/host/ads/upload',
      icon: Upload,
      color: 'blue' as const
    },
    {
      title: 'Assign Ads',
      description: 'Schedule ads to specific kiosks',
      href: '/host/ads',
      icon: Calendar,
      color: 'purple' as const
    },
    {
      title: 'Revenue Dashboard',
      description: 'View detailed revenue analytics',
      href: '/host/revenue',
      icon: TrendingUp,
      color: 'orange' as const
    }
  ];

  const recentActivities = [
    { action: 'System initialized', time: new Date().toLocaleString(), type: 'success' as const },
    { action: 'Dashboard loaded', time: new Date().toLocaleString(), type: 'info' as const }
  ];

  const handleMetricClick = (metricTitle: string) => {
    // Navigate to relevant page based on metric
    switch (metricTitle) {
      case 'Active Kiosks':
        navigate('/host/kiosks');
        break;
      case 'Monthly Revenue':
        navigate('/host/revenue');
        break;
      case 'Total Impressions':
        navigate('/host/revenue');
        break;
      case 'Pending Ads':
        navigate('/host/ads');
        break;
      default:
        console.log(`Detailed view for ${metricTitle} will be displayed`);
    }
  };

  const handleQuickAction = (actionTitle: string) => {
    // Navigate to relevant page based on action
    switch (actionTitle) {
      case 'Manage Kiosks':
        navigate('/host/kiosks');
        break;
      case 'Upload Ads':
        navigate('/host/ads/upload');
        break;
      case 'Assign Ads':
        navigate('/host/ads');
        break;
      case 'Revenue Dashboard':
        navigate('/host/revenue');
        break;
      default:
        console.log(`${actionTitle} functionality will be implemented soon`);
    }
  };

  const handleChartInteraction = () => {
    // Navigate to revenue page for chart interactions
    navigate('/host/revenue');
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Host Dashboard</h1>
          <p className="mt-2">Loading your dashboard...</p>
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
      <div>
        <h1 className="text-3xl font-bold">Host Dashboard</h1>
        <p className="mt-2">Monitor your kiosks and track revenue performance</p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric, index) => (
          <div 
            key={index} 
            className="animate-fade-in-up cursor-pointer" 
            style={{ animationDelay: `${index * 60}ms` }}
            onClick={() => handleMetricClick(metric.title)}
          >
            <MetricsCard {...metric} />
          </div>
        ))}
      </div>

      {/* Quick Actions & Recent Activity */}
      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1 animate-fade-in-up" title="Quick Actions" subtitle="Common host tasks">
          <div className="space-y-3">
            {quickActions.map((qa) => (
              <div key={qa.title} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <qa.icon className="w-5 h-5 text-primary-600" />
                  <div>
                    <div className="font-medium">{qa.title}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{qa.description}</div>
                  </div>
                </div>
                <Button 
                  variant="secondary" 
                  size="sm"
                  onClick={() => handleQuickAction(qa.title)}
                >
                  Open
                </Button>
              </div>
            ))}
          </div>
        </Card>
        <Card className="lg:col-span-2 animate-fade-in-up" title="Recent Activity" subtitle="Latest updates across your kiosks">
          <RecentActivity activities={recentActivities} />
        </Card>
      </div>

      {/* Revenue Chart & PoP Widget */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="animate-fade-in-up" title="Revenue Trends">
          <div 
            className="h-64 bg-gradient-to-br from-success-50 to-primary-50 dark:from-gray-800 dark:to-gray-800 rounded-lg flex items-center justify-center cursor-pointer hover:shadow-md transition-shadow"
            onClick={handleChartInteraction}
          >
            <div className="text-center">
              <DollarSign className="h-12 w-12 text-success-600 mx-auto mb-4" />
              <p>Revenue tracking chart</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Daily, weekly, and monthly earnings breakdown</p>
            </div>
          </div>
        </Card>
        
        <ProofOfPlayWidget
          accountId={user?.id}
          compact={true}
          title="Recent Analytics"
          maxRecords={5}
          dateRange={{
            startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            endDate: new Date().toISOString().split('T')[0]
          }}
        />
      </div>

      {/* Kiosk Status Map */}
      <Card className="animate-fade-in-up" title="Kiosk Locations">
        <div 
          className="h-64 bg-gradient-to-br from-primary-50 to-success-50 dark:from-gray-800 dark:to-gray-800 rounded-lg flex items-center justify-center cursor-pointer hover:shadow-md transition-shadow"
          onClick={handleChartInteraction}
        >
          <div className="text-center">
            <MapPin className="h-12 w-12 text-primary-600 mx-auto mb-4" />
            <p>Interactive map interface</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Real-time kiosk status and performance data</p>
          </div>
        </div>
      </Card>
    </div>
  );
}