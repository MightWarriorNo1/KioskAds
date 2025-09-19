import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, MapPin, DollarSign, Activity, Eye, Play, Pause, Edit, Trash2, Save, X, Upload, Image as ImageIcon, Video } from 'lucide-react';
import DashboardLayout from '../components/layouts/DashboardLayout';
import { CampaignService, Campaign } from '../services/campaignService';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { MediaService } from '../services/mediaService';
import { validateFile } from '../utils/fileValidation';

export default function CampaignDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addNotification } = useNotification();
  
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    budget: 0,
    daily_budget: 0,
    start_date: '',
    end_date: '',
    target_locations: [] as string[]
  });
  const [campaignAssets, setCampaignAssets] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useState<HTMLInputElement | null>(null)[0] as React.MutableRefObject<HTMLInputElement | null>;

  useEffect(() => {
    if (id && user) {
      loadCampaignDetails();
    }
  }, [id, user]);

  const loadCampaignDetails = async () => {
    if (!id || !user) return;
    
    try {
      setLoading(true);
      const campaigns = await CampaignService.getUserCampaigns(user.id);
      const foundCampaign = campaigns.find(c => c.id === id);
      
      if (foundCampaign) {
        setCampaign(foundCampaign);
        try {
          const assets = await MediaService.getCampaignAssets(foundCampaign.id);
          setCampaignAssets(assets);
        } catch (e) {
          console.warn('Could not load campaign assets:', e);
        }
      } else {
        addNotification('error', 'Campaign Not Found', 'The requested campaign could not be found.');
        navigate('/client/campaigns');
      }
    } catch (error) {
      console.error('Error loading campaign details:', error);
      addNotification('error', 'Error', 'Failed to load campaign details.');
    } finally {
      setLoading(false);
    }
  };

  const handleAssetUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!campaign || !user) return;
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const validation = await validateFile(file, {
        maxVideoDuration: campaign.max_video_duration ?? 15
      });
      if (!validation.isValid) {
        throw new Error(validation.errors.join(', '));
      }

      const media = await MediaService.uploadMediaToCampaign(file, validation, user.id, campaign.id);
      setCampaignAssets(prev => [media, ...prev]);
      // Submitted media goes into processing; admin review queue already fetches uploading/processing
      // Notify user
      addNotification('success', 'Asset Submitted', 'Your asset was uploaded and sent for review.');
    } catch (error) {
      console.error('Asset upload failed:', error);
      addNotification('error', 'Upload Failed', error instanceof Error ? error.message : 'Failed to upload asset');
    } finally {
      setUploading(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!campaign) return;
    
    setActionLoading(newStatus);
    try {
      const success = await CampaignService.updateCampaignStatus(campaign.id, newStatus as Campaign['status']);
      
      if (success) {
        setCampaign({ ...campaign, status: newStatus as Campaign['status'] });
        addNotification('success', 'Campaign Updated', `Campaign ${newStatus === 'paused' ? 'paused' : 'resumed'} successfully.`);
      } else {
        addNotification('error', 'Error', 'Failed to update campaign status.');
      }
    } catch (error) {
      console.error('Error updating campaign status:', error);
      addNotification('error', 'Error', 'Failed to update campaign status.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleEdit = () => {
    if (!campaign) return;
    
    setEditForm({
      name: campaign.name,
      description: campaign.description || '',
      budget: campaign.budget,
      daily_budget: campaign.daily_budget || 0,
      start_date: campaign.start_date.split('T')[0], // Convert to YYYY-MM-DD format
      end_date: campaign.end_date.split('T')[0],
      target_locations: campaign.target_locations || []
    });
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!campaign) return;
    
    setActionLoading('edit');
    try {
      // Locking rules: pending is locked; draft can only change dates and ad asset
      const updatePayload = campaign.status === 'draft'
        ? {
            start_date: editForm.start_date,
            end_date: editForm.end_date
          }
        : campaign.status === 'pending'
          ? {}
          : {
              name: editForm.name,
              description: editForm.description,
              budget: editForm.budget,
              daily_budget: editForm.daily_budget || undefined,
              start_date: editForm.start_date,
              end_date: editForm.end_date,
              target_locations: editForm.target_locations
            };

      if (campaign.status === 'pending') {
        addNotification('warning', 'Locked', 'Pending campaigns are locked and cannot be edited.');
        setActionLoading(null);
        return;
      }

      const success = await CampaignService.updateCampaign(campaign.id, updatePayload);

      if (success) {
        // Update local campaign state
        setCampaign({
          ...campaign,
          name: campaign.status === 'draft' ? campaign.name : editForm.name,
          description: campaign.status === 'draft' ? campaign.description : editForm.description,
          budget: campaign.status === 'draft' ? campaign.budget : editForm.budget,
          daily_budget: campaign.status === 'draft' ? campaign.daily_budget : (editForm.daily_budget || undefined),
          start_date: editForm.start_date,
          end_date: editForm.end_date,
          target_locations: campaign.status === 'draft' ? (campaign.target_locations || []) : editForm.target_locations,
          updated_at: new Date().toISOString()
        });
        
        setIsEditing(false);
        addNotification('success', 'Campaign Updated', 'Campaign has been updated successfully.');
      } else {
        addNotification('error', 'Error', 'Failed to update campaign.');
      }
    } catch (error) {
      console.error('Error updating campaign:', error);
      addNotification('error', 'Error', 'Failed to update campaign.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditForm({
      name: '',
      description: '',
      budget: 0,
      daily_budget: 0,
      start_date: '',
      end_date: '',
      target_locations: []
    });
  };

  const handleDelete = async () => {
    if (!campaign) return;
    if (campaign.status !== 'draft') {
      addNotification('warning', 'Locked', 'Only draft campaigns can be deleted.');
      return;
    }
    if (window.confirm(`Are you sure you want to delete "${campaign.name}"? This action cannot be undone.`)) {
      setActionLoading('delete');
      try {
        const success = await CampaignService.deleteCampaign(campaign.id);
        if (success) {
          addNotification('success', 'Deleted', 'Draft campaign deleted.');
          navigate('/client/campaigns');
        } else {
          addNotification('error', 'Deletion Failed', 'Failed to delete draft campaign.');
        }
      } finally {
        setActionLoading(null);
      }
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'pending': return 'bg-yellow-500';
      case 'paused': return 'bg-gray-500';
      case 'completed': return 'bg-blue-500';
      case 'rejected': return 'bg-red-500';
      default: return 'bg-gray-400';
    }
  };

  const getStatusText = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  if (loading) {
    return (
      <DashboardLayout title="Campaign Details" subtitle="">
        <div className="animate-pulse">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!campaign) {
    return (
      <DashboardLayout title="Campaign Details" subtitle="">
        <div className="text-center py-12">
          <div className="text-gray-500 dark:text-gray-400">Campaign not found.</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Campaign Details" subtitle="">
      {/* Back Button */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/client/campaigns')}
          className="inline-flex items-center text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Campaigns
        </button>
      </div>

      {/* Campaign Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            {isEditing ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Campaign Name
                  </label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter campaign name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Description
                  </label>
                  <textarea
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="Enter campaign description"
                  />
                </div>
              </div>
            ) : (
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  {campaign.name}
                </h1>
                <p className="text-gray-600 dark:text-gray-300">
                  {campaign.description || 'No description provided'}
                </p>
              </div>
            )}
          </div>
          <div className="flex items-center space-x-3 ml-4">
            <span className={`${getStatusColor(campaign.status)} text-white text-sm px-3 py-1 rounded-full`}>
              {getStatusText(campaign.status)}
            </span>
            
            {/* Action Buttons */}
            <div className="flex space-x-2">
              {isEditing ? (
                <>
                  <button
                    onClick={handleSaveEdit}
                    disabled={actionLoading === 'edit'}
                    className="p-2 text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                    title="Save Changes"
                  >
                    <Save className="h-5 w-5" />
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    title="Cancel Edit"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </>
              ) : (
                <>
                  {campaign.status === 'active' && (
                    <button
                      onClick={() => handleStatusChange('paused')}
                      disabled={actionLoading === 'paused'}
                      className="p-2 text-yellow-600 dark:text-yellow-400 hover:text-yellow-800 dark:hover:text-yellow-300 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 rounded-lg transition-colors"
                      title="Pause Campaign"
                    >
                      <Pause className="h-5 w-5" />
                    </button>
                  )}
                  
                  {campaign.status === 'paused' && (
                    <button
                      onClick={() => handleStatusChange('active')}
                      disabled={actionLoading === 'active'}
                      className="p-2 text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                      title="Resume Campaign"
                    >
                      <Play className="h-5 w-5" />
                    </button>
                  )}
                  
                  {campaign.status === 'draft' && (
                    <button
                      onClick={handleEdit}
                      className="p-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                      title="Edit Draft"
                    >
                      <Edit className="h-5 w-5" />
                    </button>
                  )}
                  
                  <button
                    onClick={handleDelete}
                    className="p-2 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                    title={campaign.status === 'draft' ? 'Delete Draft' : 'Only drafts can be deleted'}
                    disabled={campaign.status !== 'draft' || actionLoading === 'delete'}
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Campaign Stats */}
      <div className="grid md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Calendar className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600 dark:text-gray-300">Duration</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {Math.ceil((new Date(campaign.end_date).getTime() - new Date(campaign.start_date).getTime()) / (1000 * 60 * 60 * 24))} days
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <MapPin className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600 dark:text-gray-300">Kiosks</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">{campaign.kiosk_count}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <DollarSign className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600 dark:text-gray-300">Total Cost</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">{formatCurrency(campaign.total_cost)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
              <Activity className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600 dark:text-gray-300">Ad Duration</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">{campaign.total_slots * 15}s</p>
            </div>
          </div>
        </div>
      </div>

      {/* Campaign Details */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Campaign Information */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Campaign Information</h3>
          <div className="space-y-4">
            {isEditing ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={editForm.start_date}
                    onChange={(e) => setEditForm({ ...editForm, start_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={editForm.end_date}
                    onChange={(e) => setEditForm({ ...editForm, end_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Budget
                  </label>
                  <input
                    type="number"
                    value={editForm.budget}
                    onChange={(e) => setEditForm({ ...editForm, budget: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    step="0.01"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Daily Budget
                  </label>
                  <input
                    type="number"
                    value={editForm.daily_budget}
                    onChange={(e) => setEditForm({ ...editForm, daily_budget: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    step="0.01"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Target Locations
                  </label>
                  <input
                    type="text"
                    value={editForm.target_locations.join(', ')}
                    onChange={(e) => setEditForm({ ...editForm, target_locations: e.target.value.split(',').map(loc => loc.trim()).filter(loc => loc) })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter locations separated by commas"
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Start Date</label>
                  <p className="text-gray-900 dark:text-white">{formatDate(campaign.start_date)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">End Date</label>
                  <p className="text-gray-900 dark:text-white">{formatDate(campaign.end_date)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Budget</label>
                  <p className="text-gray-900 dark:text-white">{formatCurrency(campaign.budget)}</p>
                </div>
                {campaign.daily_budget && (
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Daily Budget</label>
                    <p className="text-gray-900 dark:text-white">{formatCurrency(campaign.daily_budget)}</p>
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Target Locations</label>
                  <p className="text-gray-900 dark:text-white">
                    {campaign.target_locations?.join(', ') || 'Not specified'}
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Ad Assets (Active Campaigns) */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Ad Assets</h3>
            {campaign.status === 'active' && (
              <label className="inline-flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer">
                <Upload className="h-4 w-4 mr-2" />
                Upload New Asset
                <input type="file" accept="image/jpeg,image/png,video/mp4" className="hidden" onChange={handleAssetUpload} />
              </label>
            )}
          </div>

          {campaignAssets.length === 0 ? (
            <div className="text-gray-500 dark:text-gray-400 text-sm">No assets uploaded yet.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {campaignAssets.map(asset => (
                <div key={asset.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 flex items-center gap-3">
                  <div className="flex-shrink-0">
                    {asset.file_type === 'image' ? (
                      <ImageIcon className="h-6 w-6 text-blue-500" />
                    ) : (
                      <Video className="h-6 w-6 text-purple-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 dark:text-white truncate">{asset.file_name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Status: {asset.status}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {uploading && (
            <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">Uploading...</div>
          )}
          {campaign.status !== 'active' && (
            <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">Asset uploads are available when the campaign is active.</div>
          )}
        </div>

        {/* Performance Metrics */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Performance Metrics</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Eye className="h-5 w-5 text-gray-400 dark:text-gray-500 mr-2" />
                <span className="text-gray-700 dark:text-gray-300">Impressions</span>
              </div>
              <span className="font-semibold text-gray-900 dark:text-white">
                {campaign.impressions?.toLocaleString() || '0'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
