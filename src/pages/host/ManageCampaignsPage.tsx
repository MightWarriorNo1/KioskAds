import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, RefreshCw, Eye, Edit, Play, Pause, Calendar, DollarSign, MapPin, Users, TrendingUp } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { CampaignService, Campaign } from '../../services/campaignService';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';

export default function HostManageCampaignsPage() {
  const { user } = useAuth();
  const { addNotification } = useNotification();
  const navigate = useNavigate();
  
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'draft' | 'pending' | 'active' | 'paused' | 'completed' | 'rejected'>('all');

  useEffect(() => {
    if (user?.id) {
      loadCampaigns();
    }
  }, [user?.id]);

  const loadCampaigns = async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      const userCampaigns = await CampaignService.getUserCampaigns(user.id);
      setCampaigns(userCampaigns);
    } catch (error) {
      console.error('Error loading campaigns:', error);
      addNotification('error', 'Error', 'Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadCampaigns();
    setRefreshing(false);
  };

  const getStatusColor = (status: Campaign['status']) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'paused':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'completed':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getStatusIcon = (status: Campaign['status']) => {
    switch (status) {
      case 'draft':
        return <Edit className="w-4 h-4" />;
      case 'pending':
        return <Calendar className="w-4 h-4" />;
      case 'active':
        return <Play className="w-4 h-4" />;
      case 'paused':
        return <Pause className="w-4 h-4" />;
      case 'completed':
        return <TrendingUp className="w-4 h-4" />;
      case 'rejected':
        return <Edit className="w-4 h-4" />;
      default:
        return <Calendar className="w-4 h-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const filteredCampaigns = campaigns.filter(campaign => {
    if (filter === 'all') return true;
    return campaign.status === filter;
  });

  const handleViewCampaign = (campaign: Campaign) => {
    navigate(`/host/campaigns/${campaign.id}`);
  };

  const handleEditCampaign = (campaign: Campaign) => {
    if (campaign.status === 'draft') {
      navigate(`/host/campaigns/${campaign.id}/edit`);
    } else {
      addNotification('info', 'Cannot Edit', 'Only draft campaigns can be edited');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600 dark:text-gray-400">Loading campaigns...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Manage Campaigns
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">
            View and manage your advertising campaigns
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={handleRefresh}
            variant="secondary"
            className="flex items-center space-x-2"
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
          <Button
            onClick={() => navigate('/host/new-campaign')}
            className="flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>New Campaign</span>
          </Button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
        {[
          { key: 'all', label: 'All', count: campaigns.length },
          { key: 'draft', label: 'Draft', count: campaigns.filter(c => c.status === 'draft').length },
          { key: 'pending', label: 'Pending', count: campaigns.filter(c => c.status === 'pending').length },
          { key: 'active', label: 'Active', count: campaigns.filter(c => c.status === 'active').length },
          { key: 'paused', label: 'Paused', count: campaigns.filter(c => c.status === 'paused').length },
          { key: 'completed', label: 'Completed', count: campaigns.filter(c => c.status === 'completed').length },
          { key: 'rejected', label: 'Rejected', count: campaigns.filter(c => c.status === 'rejected').length },
        ].map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setFilter(key as any)}
            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              filter === key
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            {label} ({count})
          </button>
        ))}
      </div>

      {/* Campaigns List */}
      {filteredCampaigns.length === 0 ? (
        <Card className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <Calendar className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No Campaigns Found
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {filter === 'all' 
              ? "You haven't created any campaigns yet. Create your first campaign to get started."
              : `No campaigns with status "${filter}" found.`
            }
          </p>
          {filter === 'all' && (
            <Button
              onClick={() => navigate('/host/new-campaign')}
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create New Campaign
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid gap-6">
          {filteredCampaigns.map((campaign) => (
            <Card key={campaign.id} className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {campaign.name || `Campaign ${formatDate(campaign.start_date)} - ${formatDate(campaign.end_date)}`}
                    </h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${getStatusColor(campaign.status)}`}>
                      {getStatusIcon(campaign.status)}
                      {campaign.status.toUpperCase()}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-6 text-sm text-gray-600 dark:text-gray-400 mb-4">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>{formatDate(campaign.start_date)} - {formatDate(campaign.end_date)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <DollarSign className="w-4 h-4" />
                      <span>Budget: {formatCurrency(campaign.budget)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      <span>{campaign.kiosk_count} kiosk{campaign.kiosk_count !== 1 ? 's' : ''}</span>
                    </div>
                    {campaign.total_spent && campaign.total_spent > 0 && (
                      <div className="flex items-center gap-1">
                        <TrendingUp className="w-4 h-4" />
                        <span>Spent: {formatCurrency(campaign.total_spent)}</span>
                      </div>
                    )}
                  </div>

                  {campaign.description && (
                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-2">
                      {campaign.description}
                    </p>
                  )}

                  {/* Campaign Stats */}
                  <div className="flex items-center gap-6 text-sm">
                    {campaign.impressions && campaign.impressions > 0 && (
                      <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                        <Eye className="w-4 h-4" />
                        <span>{campaign.impressions.toLocaleString()} impressions</span>
                      </div>
                    )}
                    {campaign.clicks && campaign.clicks > 0 && (
                      <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                        <Users className="w-4 h-4" />
                        <span>{campaign.clicks.toLocaleString()} clicks</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <Button
                    onClick={() => handleViewCampaign(campaign)}
                    variant="secondary"
                    size="sm"
                    className="flex items-center gap-1"
                  >
                    <Eye className="w-4 h-4" />
                    View
                  </Button>
                  {campaign.status === 'draft' && (
                    <Button
                      onClick={() => handleEditCampaign(campaign)}
                      variant="secondary"
                      size="sm"
                      className="flex items-center gap-1"
                    >
                      <Edit className="w-4 h-4" />
                      Edit
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}


