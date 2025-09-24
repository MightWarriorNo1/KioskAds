import React, { useState, useEffect } from 'react';
import { Plus, RefreshCw, ArrowRight, CheckCircle, MapPin, List, Layout } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/layouts/DashboardLayout';
import { CampaignService, Campaign } from '../services/campaignService';
import { MediaService } from '../services/mediaService';
import { useAuth } from '../contexts/AuthContext';
import LeafletMap from '../components/MapContainer';

interface CampaignsPageProps {
  wrapInDashboard?: boolean;
  basePath?: '/client' | '/host';
  enableDetails?: boolean;
}

export default function CampaignsPage({ wrapInDashboard = true, basePath = '/client', enableDetails = true }: CampaignsPageProps) {
  const location = useLocation() as { state?: { message?: string; campaignData?: any } };
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('All');
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'map' | 'split'>('split');
  const [mediaPreviews, setMediaPreviews] = useState<Record<string, { url: string; type: 'image' | 'video' }>>({});

  useEffect(() => {
    if (location.state?.message) {
      setSuccessMessage(location.state.message);
      setShowSuccessMessage(true);
      // Clear the state to prevent showing the message again on refresh
      window.history.replaceState({}, document.title);
      
      // Hide the message after 5 seconds
      const timer = setTimeout(() => {
        setShowSuccessMessage(false);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [location.state]);

  useEffect(() => {
    fetchCampaigns();
  }, [user]);

  // Load media previews for Draft, Pending, Active campaigns
  useEffect(() => {
    const loadPreviews = async () => {
      try {
        const candidates = campaigns.filter(c => ['draft', 'pending', 'active'].includes(c.status));
        const results: Record<string, { url: string; type: 'image' | 'video' }> = {};
        await Promise.all(
          candidates.map(async (c) => {
            try {
              const media = await MediaService.getCampaignAssets(c.id);
              if (media && media.length > 0) {
                const asset = media[0];
                const url = asset.metadata?.publicUrl || MediaService.getMediaPreviewUrl(asset.file_path);
                results[c.id] = { url, type: asset.file_type };
              }
            } catch (e) {
              // ignore per-campaign errors
            }
          })
        );
        setMediaPreviews(prev => ({ ...prev, ...results }));
      } catch (_) {
        // noop
      }
    };
    if (campaigns.length > 0) {
      void loadPreviews();
    }
  }, [campaigns]);

  const fetchCampaigns = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const userCampaigns = await CampaignService.getUserCampaigns(user.id);
      setCampaigns(userCampaigns);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchCampaigns();
    setRefreshing(false);
  };

  const tabs = ['All', 'Active', 'Draft', 'Pending', 'Completed'];

  const filteredCampaigns = campaigns.filter(campaign => {
    if (activeTab === 'All') return true;
    return campaign.status.toLowerCase() === activeTab.toLowerCase();
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-600';
      case 'pending':
        return 'bg-yellow-600';
      case 'completed':
        return 'bg-blue-600';
      case 'cancelled':
        return 'bg-red-600';
      default:
        return 'bg-gray-600';
    }
  };

  const content = (
    <>
      {/* Page Header */}
      {wrapInDashboard && (
        <></>
      )}
      
      <div className="sr-only"></div>
      {/* Success Message */}
      {showSuccessMessage && (
        <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
            <span className="text-green-800 dark:text-green-200 font-medium">{successMessage}</span>
          </div>
        </div>
      )}

      {/* Campaign Filters and View Toggle */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {/* Campaign Filters */}
          <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === tab
                    ? 'bg-white text-gray-900 dark:bg-white  shadow-sm'
                    : 'text-gray-600 dark:text-white hover:text-gray-900'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* View Mode Toggle */}
          <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center space-x-2 ${
                viewMode === 'list'
                  ? 'bg-white text-gray-900 dark:bg-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 dark:text-white'
              }`}
            >
              <List className="h-4 w-4" />
              <span>List</span>
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center space-x-2 ${
                viewMode === 'map'
                  ? 'bg-white text-gray-900 dark:bg-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 dark:text-white'
              }`}
            >
              <MapPin className="h-4 w-4" />
              <span>Map</span>
            </button>
            <button
              onClick={() => setViewMode('split')}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center space-x-2 ${
                viewMode === 'split'
                  ? 'bg-white text-gray-900 dark:bg-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 dark:text-white'
              }`}
            >
              <Layout className="h-4 w-4" />
              <span>Split</span>
            </button>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-4 mb-8">
        <button 
          onClick={() => navigate(`${basePath}/new-campaign`)}
          className="bg-black text-white px-4 py-2 rounded-lg font-semibold hover:bg-gray-800 transition-colors flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>New Campaign</span>
        </button>
        <button 
          onClick={handleRefresh}
          disabled={refreshing}
          className="bg-black text-white px-4 py-2 rounded-lg font-semibold hover:bg-gray-800 transition-colors flex items-center space-x-2 disabled:bg-gray-400"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
        </button>
      </div>

      {/* Campaigns Display */}
      {loading ? (
        // Loading state
        <div className="grid md:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-4"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-4"></div>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                </div>
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded mt-4"></div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredCampaigns.length === 0 ? (
        // Empty State
        <div className="text-center py-20">
          <div className="w-24 h-24 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-6">
            <Plus className="h-12 w-12 text-gray-400 dark:text-gray-500" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">No campaigns found</h3>
          <p className="text-gray-600 dark:text-gray-300 mb-8">
            {activeTab === 'All' 
              ? "You don't have any campaigns yet. Get started by creating your first advertising campaign."
              : `You don't have any ${activeTab.toLowerCase()} campaigns.`
            }
          </p>
          {activeTab === 'All' && (
            <button 
              onClick={() => navigate(`${basePath}/new-campaign`)}
              className="bg-black dark:bg-white text-white dark:text-black px-6 py-3 rounded-lg font-semibold hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
            >
              Create Campaign
            </button>
          )}
        </div>
      ) : (
        <>
          {viewMode === 'list' && (
            // List View
            <div className="grid md:grid-cols-2 gap-6">
              {filteredCampaigns.map((campaign) => (
                <div key={campaign.id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                  {/* Media Preview for Draft, Pending, Active */}
                  {['draft', 'pending', 'active'].includes(campaign.status) && mediaPreviews[campaign.id]?.url && (
                    <div className="mb-4 w-full aspect-[16/9] bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
                      {mediaPreviews[campaign.id].type === 'image' ? (
                        <img src={mediaPreviews[campaign.id].url} alt="Ad preview" className="w-full h-full object-cover" />
                      ) : (
                        <video src={mediaPreviews[campaign.id].url} className="w-full h-full object-cover" controls={false} muted playsInline />
                      )}
                    </div>
                  )}
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                        {campaign.name || `Campaign ${formatDate(campaign.start_date)} - ${formatDate(campaign.end_date)}`}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        {formatDate(campaign.start_date)} - {formatDate(campaign.end_date)}
                      </p>
                    </div>
                    <span className={`${getStatusColor(campaign.status)} text-white text-xs px-2 py-1 rounded capitalize`}>
                      {campaign.status}
                    </span>
                  </div>
                  
                  <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300 mb-4">
                    <div className="flex justify-between">
                      <span>Kiosks:</span>
                      <span>{campaign.kiosk_count}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Duration:</span>
                      <span>{campaign.total_slots * 15} seconds</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Price:</span>
                      <span>{formatCurrency(campaign.total_cost)}</span>
                    </div>
                  </div>
                  
                  {enableDetails && (
                    <button 
                      onClick={() => navigate(`${basePath}/campaigns/${campaign.id}`)}
                      className="w-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 py-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center justify-center space-x-2"
                    >
                      <span>View Details</span>
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {viewMode === 'map' && (
            // Map View
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Campaign Locations</h3>
              </div>
              <div className="h-[500px] lg:h-[600px] w-full">
                <LeafletMap 
                  center={[33.5689, -117.1865]}
                  zoom={11}
                  className="h-full w-full"
                  kioskData={[]}
                />
              </div>
            </div>
          )}

          {viewMode === 'split' && (
            // Split View - Map and List side by side
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Map Section */}
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden order-2 lg:order-1">
                <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Campaign Locations</h3>
                </div>
                <div className="h-[400px] lg:h-[500px] w-full">
                  <LeafletMap 
                    center={[33.5689, -117.1865]}
                    zoom={11}
                    className="h-full w-full"
                    kioskData={[]}
                  />
                </div>
              </div>

              {/* List Section */}
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden order-1 lg:order-2">
                <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Campaigns ({filteredCampaigns.length})</h3>
                </div>
                <div className="max-h-[400px] lg:max-h-[500px] overflow-y-auto">
                  {filteredCampaigns.length > 0 ? (
                    <div className="divide-y divide-gray-200 dark:divide-gray-700">
                      {filteredCampaigns.map((campaign) => (
                        <div key={campaign.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                          {/* Row Media Preview */}
                          {['draft', 'pending', 'active'].includes(campaign.status) && mediaPreviews[campaign.id]?.url && (
                            <div className="mb-3 w-full aspect-[16/9] bg-gray-100 dark:bg-gray-700 rounded-md overflow-hidden">
                              {mediaPreviews[campaign.id].type === 'image' ? (
                                <img src={mediaPreviews[campaign.id].url} alt="Ad preview" className="w-full h-full object-cover" />
                              ) : (
                                <video src={mediaPreviews[campaign.id].url} className="w-full h-full object-cover" controls={false} muted playsInline />
                              )}
                            </div>
                          )}
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-gray-900 dark:text-white truncate">
                                {campaign.name || `Campaign ${formatDate(campaign.start_date)} - ${formatDate(campaign.end_date)}`}
                              </h4>
                              <p className="text-sm text-gray-600 dark:text-gray-300">
                                {formatDate(campaign.start_date)} - {formatDate(campaign.end_date)}
                              </p>
                            </div>
                            <span className={`${getStatusColor(campaign.status)} text-white text-xs px-2 py-1 rounded capitalize ml-2 flex-shrink-0`}>
                              {campaign.status}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-3 gap-2 sm:gap-4 text-xs text-gray-600 dark:text-gray-300 mb-3">
                            <div>
                              <span className="block">Kiosks</span>
                              <span className="font-medium">{campaign.kiosk_count}</span>
                            </div>
                            <div>
                              <span className="block">Duration</span>
                              <span className="font-medium">{campaign.total_slots * 15}s</span>
                            </div>
                            <div>
                              <span className="block">Price</span>
                              <span className="font-medium">{formatCurrency(campaign.total_cost)}</span>
                            </div>
                          </div>
                          
                          {enableDetails && (
                            <button 
                              onClick={() => navigate(`${basePath}/campaigns/${campaign.id}`)}
                              className="w-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 py-2 px-3 rounded text-sm hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center justify-center space-x-2"
                            >
                              <span>View Details</span>
                              <ArrowRight className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                      <p>No campaigns found for the selected filter.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );

  if (wrapInDashboard) {
    return (
      <DashboardLayout title="Campaigns" subtitle="Manage your advertising campaigns">
        {content}
      </DashboardLayout>
    );
  }

  return content;
}
