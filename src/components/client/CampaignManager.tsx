import React, { useState, useEffect } from 'react';
import { Calendar, Play, Pause, Edit, Trash2, Plus, Filter, RefreshCw } from 'lucide-react';
import NewCampaignModal from './NewCampaignModal';
import { useNotification } from '../../contexts/NotificationContext';
import { useAuth } from '../../contexts/AuthContext';
import { CampaignService } from '../../services/campaignService';
import { Campaign } from '../../types/database';

export default function CampaignManager() {
  const { addNotification } = useNotification();
  const { user } = useAuth();
  const [isNewCampaignModalOpen, setIsNewCampaignModalOpen] = useState(false);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);

  // Fetch campaigns on component mount
  useEffect(() => {
    if (user?.id) {
      fetchCampaigns();
    }
  }, [user]);

  const fetchCampaigns = async () => {
    try {
      setIsLoading(true);
      const userCampaigns = await CampaignService.getUserCampaigns(user!.id);
      setCampaigns(userCampaigns);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      addNotification('error', 'Campaign Error', 'Failed to load campaigns');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: Campaign['status']) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'paused': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'pending': return 'bg-orange-100 text-orange-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleNewCampaign = () => {
    setIsNewCampaignModalOpen(true);
  };

  const handleCreateCampaign = async (campaignData: any) => {
    try {
      const newCampaignData = {
        user_id: user!.id,
        name: campaignData.name,
        description: campaignData.description || '',
        status: 'draft' as const,
        start_date: campaignData.startDate,
        end_date: campaignData.endDate,
        budget: campaignData.budget,
        daily_budget: campaignData.dailyBudget || null,
        target_locations: campaignData.targetLocations || [],
        target_demographics: campaignData.targetDemographics || {},
        total_spent: 0
      };

      const newCampaign = await CampaignService.createCampaign(newCampaignData);
      
      setCampaigns(prev => [newCampaign, ...prev]);
      addNotification('success', 'Campaign Created', `Campaign "${campaignData.name}" has been created successfully`);
      addNotification('info', 'Next Steps', 'Upload your ad creatives and assign them to this campaign to get started.');
      
      setIsNewCampaignModalOpen(false);
    } catch (error) {
      console.error('Error creating campaign:', error);
      addNotification('error', 'Creation Failed', 'Failed to create campaign');
    }
  };

  const handlePauseCampaign = async (campaignId: string, campaignName: string) => {
    try {
      await CampaignService.pauseCampaign(campaignId);
      setCampaigns(prev => prev.map(campaign => 
        campaign.id === campaignId 
          ? { ...campaign, status: 'paused' as const }
          : campaign
      ));
      addNotification('warning', 'Campaign Paused', `Campaign "${campaignName}" has been paused`);
    } catch (error) {
      console.error('Error pausing campaign:', error);
      addNotification('error', 'Pause Failed', 'Failed to pause campaign');
    }
  };

  const handlePlayCampaign = async (campaignId: string, campaignName: string) => {
    try {
      await CampaignService.resumeCampaign(campaignId);
      setCampaigns(prev => prev.map(campaign => 
        campaign.id === campaignId 
          ? { ...campaign, status: 'active' as const }
          : campaign
      ));
      addNotification('success', 'Campaign Activated', `Campaign "${campaignName}" is now active`);
    } catch (error) {
      console.error('Error activating campaign:', error);
      addNotification('error', 'Activation Failed', 'Failed to activate campaign');
    }
  };

  const handleEditCampaign = (campaignId: string, campaignName: string) => {
    addNotification('info', 'Edit Campaign', `Edit functionality for "${campaignName}" will be implemented soon`);
    // In a real app, this would open an edit modal
  };

  const handleDeleteCampaign = async (campaignId: string, campaignName: string) => {
    try {
      if (window.confirm(`Are you sure you want to delete campaign "${campaignName}"? This action cannot be undone.`)) {
        await CampaignService.deleteCampaign(campaignId);
        setCampaigns(prev => prev.filter(campaign => campaign.id !== campaignId));
        addNotification('success', 'Campaign Deleted', `Campaign "${campaignName}" has been successfully deleted`);
      }
    } catch (error) {
      console.error('Error deleting campaign:', error);
      addNotification('error', 'Deletion Failed', 'Failed to delete campaign');
    }
  };

  const handleFilterChange = (newFilter: string) => {
    setFilterStatus(newFilter);
    addNotification('info', 'Filter Applied', `Showing campaigns with status: ${newFilter}`);
  };

  const handleRefresh = () => {
    fetchCampaigns();
    addNotification('info', 'Refreshing', 'Campaign data is being refreshed...');
  };

  const filteredCampaigns = filterStatus === 'all' 
    ? campaigns 
    : campaigns.filter(c => c.status === filterStatus);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading campaigns...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Campaign Manager</h1>
          <p className="text-gray-600 mt-2">Create and manage your advertising campaigns</p>
        </div>
        <div className="flex items-center space-x-3">
          <button 
            onClick={handleRefresh}
            className="text-gray-600 hover:text-gray-800 transition-colors p-2 rounded-lg hover:bg-gray-100"
            title="Refresh campaigns"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
          <button 
            onClick={handleNewCampaign}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>New Campaign</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex items-center space-x-4">
          <Filter className="h-5 w-5 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Filter by status:</span>
          <select
            value={filterStatus}
            onChange={(e) => handleFilterChange(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Campaigns</option>
            <option value="draft">Draft</option>
            <option value="pending">Pending</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="completed">Completed</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Campaigns List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Your Campaigns ({filteredCampaigns.length})</h3>
        </div>
        
        {filteredCampaigns.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Campaign</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Schedule</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Budget</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Performance</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredCampaigns.map((campaign) => (
                  <tr key={campaign.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{campaign.name}</div>
                        <div className="text-sm text-gray-500">{campaign.description || 'No description'}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(campaign.status)}`}>
                        {campaign.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {new Date(campaign.start_date).toLocaleDateString()} - {new Date(campaign.end_date).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">${campaign.total_spent.toLocaleString()} / ${campaign.budget.toLocaleString()}</div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                        <div 
                          className="bg-blue-500 h-2 rounded-full" 
                          style={{ width: `${Math.min((campaign.total_spent / campaign.budget) * 100, 100)}%` }}
                        />
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {/* This would come from analytics service */}
                        {Math.floor(campaign.total_spent * 100).toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-500">impressions</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        {campaign.status === 'active' ? (
                          <button 
                            onClick={() => handlePauseCampaign(campaign.id, campaign.name)}
                            className="text-yellow-600 hover:text-yellow-800"
                            title="Pause campaign"
                          >
                            <Pause className="h-4 w-4" />
                          </button>
                        ) : campaign.status === 'paused' ? (
                          <button 
                            onClick={() => handlePlayCampaign(campaign.id, campaign.name)}
                            className="text-green-600 hover:text-green-800"
                            title="Resume campaign"
                          >
                            <Play className="h-4 w-4" />
                          </button>
                        ) : null}
                        {campaign.status === 'draft' && (
                          <>
                            <button 
                              onClick={() => handleEditCampaign(campaign.id, campaign.name)}
                              className="text-blue-600 hover:text-blue-800"
                              title="Edit campaign"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button 
                              onClick={() => handleDeleteCampaign(campaign.id, campaign.name)}
                              className="text-red-600 hover:text-red-800"
                              title="Delete draft"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-6 py-12 text-center">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No campaigns found</h3>
            <p className="text-gray-500 mb-4">
              {filterStatus === 'all' 
                ? "You haven't created any campaigns yet. Get started by creating your first campaign."
                : `No campaigns with status "${filterStatus}" found.`
              }
            </p>
            {filterStatus === 'all' && (
              <button
                onClick={handleNewCampaign}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Create Your First Campaign
              </button>
            )}
          </div>
        )}
      </div>

      {/* New Campaign Modal */}
      <NewCampaignModal
        isOpen={isNewCampaignModalOpen}
        onClose={() => setIsNewCampaignModalOpen(false)}
        onSubmit={handleCreateCampaign}
      />
    </div>
  );
}