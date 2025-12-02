import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Monitor, DollarSign, TrendingUp, Eye, Upload, Calendar, Play, Clock, CheckCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { HostService, HostStats, HostAd, HostKiosk } from '../../services/hostService';
import { ProofOfPlayService } from '../../services/proofOfPlayService';
import MetricsCard from '../shared/MetricsCard';
import RecentActivity from '../shared/RecentActivity';
import ProofOfPlayWidget from '../shared/ProofOfPlayWidget';
import DynamicMap from '../DynamicMap';
import MapErrorBoundary from '../MapErrorBoundary';
import Card from '../ui/Card';
import Button from '../ui/Button';

export default function HostDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState<HostStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [ads, setAds] = useState<HostAd[]>([]);
  const [kiosks, setKiosks] = useState<HostKiosk[]>([]);
  const [popSummary, setPopSummary] = useState({
    totalPlays: 0,
    uniqueScreens: 0,
    uniqueAssets: 0,
    totalDuration: 0,
    averageDuration: 0
  });
  const [stripeOverview, setStripeOverview] = useState<Awaited<ReturnType<typeof HostService.getStripeConnectOverview>> | null>(null);
  const [useStripeData, setUseStripeData] = useState<boolean>(true);
  const [stripeSeries, setStripeSeries] = useState<Array<{ date: string; net: number }>>([]);

  useEffect(() => {
    const loadDashboardData = async () => {
      if (!user?.id) return;
      
      try {
        setLoading(true);
        const [statsData, adsData, kiosksData, popData, overview] = await Promise.all([
          HostService.getHostStats(user.id),
          HostService.getHostAds(user.id),
          HostService.getHostKiosks(user.id),
          ProofOfPlayService.getProofOfPlaySummary({ 
            accountId: user.id,
            startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            endDate: new Date().toISOString().split('T')[0]
          }),
          HostService.getStripeConnectOverview(user.id, 50)
        ]);
        setStats(statsData);
        setAds(adsData);
        setKiosks(kiosksData);
        setPopSummary(popData);
        setStripeOverview(overview);
        setUseStripeData(!!overview);
        if (overview?.recent_balance_transactions) {
          const byDay = new Map<string, number>();
          for (const t of overview.recent_balance_transactions) {
            if (t.currency !== 'usd') continue;
            const d = new Date(t.created * 1000);
            const day = new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString().split('T')[0];
            byDay.set(day, (byDay.get(day) || 0) + (Number(t.net) || 0));
          }
          // Fill last 30 days window
          const end = new Date();
          const start = new Date(end);
          start.setDate(end.getDate() - 29);
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
      value: useStripeData && stripeOverview
        ? (() => {
            const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
            const tx = (stripeOverview.recent_balance_transactions || [])
              .filter(t => t.currency === 'usd' && (t.created * 1000) >= cutoff);
            const totalNet = tx.reduce((s, t) => s + (Number(t.net) || 0), 0);
            return `$${totalNet.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
          })()
        : `$${stats.monthly_revenue.toLocaleString()}`,
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
    },
    {
      title: 'My Ads',
      value: ads.length.toString(),
      change: `${ads.filter(ad => ad.status === 'active').length} active`,
      changeType: 'positive' as const,
      icon: CheckCircle,
      color: 'green' as const
    },
    {
      title: 'Pending Review',
      value: ads.filter(ad => ad.status === 'pending_review').length.toString(),
      change: 'Awaiting approval',
      changeType: ads.filter(ad => ad.status === 'pending_review').length > 0 ? 'negative' as const : 'positive' as const,
      icon: Clock,
      color: ads.filter(ad => ad.status === 'pending_review').length > 0 ? 'orange' as const : 'green' as const
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
      title: 'Manage Ads',
      description: 'View, edit, and assign your ads',
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
      case 'My Ads':
      case 'Pending Review':
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
      case 'Manage Ads':
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

  // Transform kiosk data for map display
  const mapKioskData = kiosks.map(kiosk => ({
    id: kiosk.kiosk.id,
    name: kiosk.kiosk.name,
    city: kiosk.kiosk.city,
    price: `$${kiosk.kiosk.price}/month`,
    position: [kiosk.kiosk.coordinates.lat, kiosk.kiosk.coordinates.lng] as [number, number],
    address: kiosk.kiosk.address,
    description: kiosk.kiosk.description
  }));


  const handleKioskSelect = () => {
    // Navigate to kiosk management page
    navigate('/host/kiosks');
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
            className="h-64 bg-gradient-to-br from-success-50 to-primary-50 dark:from-gray-800 dark:to-gray-800 rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow"
            onClick={handleChartInteraction}
          >
            {useStripeData && stripeSeries.length > 0 ? (
              <svg viewBox="0 0 1000 260" className="w-full h-full">
                {(() => {
                  const chartW = 940;
                  const chartH = 200;
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
                  // Ticks
                  const yTicks = 5;
                  const yTickEls = Array.from({ length: yTicks + 1 }, (_, i) => {
                    const v = min + (span * i) / yTicks;
                    const y = offsetY + (chartH - (i / yTicks) * chartH);
                    return (
                      <g key={`dyt-${i}`}>
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
                        <g key={`dxt-${idx}`}>
                          <line x1={x} y1={offsetY + chartH} x2={x} y2={offsetY + chartH + 6} stroke="#64748b" />
                          <text x={x} y={offsetY + chartH + 18} fontSize="10" fill="#9ca3af" textAnchor={idx === 0 ? 'start' : idx === arr.length - 1 ? 'end' : 'middle'}>
                            {new Date(d.date).toLocaleDateString()}
                          </text>
                        </g>
                      );
                    });
                  return (
                    <>
                      <line x1={offsetX} y1={offsetY} x2={offsetX} y2={offsetY + chartH} stroke="#94a3b8" />
                      <line x1={offsetX} y1={offsetY + chartH} x2={offsetX + chartW} y2={offsetY + chartH} stroke="#94a3b8" />
                      {yTickEls}
                      {xTickEls}
                      <polyline
                        fill="none"
                        stroke="url(#gradDash)"
                        strokeWidth="3"
                        points={points}
                      />
                      <defs>
                        <linearGradient id="gradDash" x1="0" y1="0" x2="1" y2="0">
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
        <div className="h-96 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 map-container">
          <MapErrorBoundary>
            <DynamicMap
              kioskData={mapKioskData}
              onKioskSelect={handleKioskSelect}
              center={mapKioskData[0]?.position || [33.5689, -117.1865]}
              zoom={11}
              className="h-full w-full"
            />
          </MapErrorBoundary>
        </div>
      </Card>

    </div>
  );
}