import { useState, useEffect } from 'react';
import { CheckSquare, X, Eye, Clock, AlertCircle, Check, RefreshCw } from 'lucide-react';
import { useNotification } from '../../contexts/NotificationContext';
import { AdminService, AdReviewItem } from '../../services/adminService';
import { MediaService } from '../../services/mediaService';

export default function AdReviewQueue() {
  const [ads, setAds] = useState<AdReviewItem[]>([]);
  const [hostAds, setHostAds] = useState<any[]>([]);
  const [pendingCampaigns, setPendingCampaigns] = useState<any[]>([]);
  const [selectedAd, setSelectedAd] = useState<AdReviewItem | null>(null);
  const [selectedHostAd, setSelectedHostAd] = useState<any | null>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'client' | 'host'>('client');
  const { addNotification } = useNotification();

  // Helper function to determine if an item is a campaign
  const isCampaign = (item: any): boolean => {
    return !!(item.budget && item.start_date && item.end_date && !item.file_name);
  };

  useEffect(() => {
    loadAdReviewQueue();
  }, []);

  const loadAdReviewQueue = async () => {
    try {
      setLoading(true);
      const { clientAds, hostAds, pendingCampaigns } = await AdminService.getAllAdsForReview();
      console.log('Loaded data:', { clientAds: clientAds.length, hostAds: hostAds.length, pendingCampaigns: pendingCampaigns.length });
      setAds(clientAds);
      setHostAds(hostAds);
      setPendingCampaigns(pendingCampaigns);
    } catch (error) {
      console.error('Error loading ad review queue:', error);
      addNotification('error', 'Error', 'Failed to load ad review queue');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (adId: string) => {
    try {
      setReviewing(adId);
      await AdminService.reviewAd(adId, 'approve');
      setAds(prev => prev.filter(ad => ad.id !== adId));
      addNotification('success', 'Ad Approved', 'The ad has been approved and is now live. Client has been notified via email.');
      setSelectedAd(null);
    } catch (error) {
      console.error('Error approving ad:', error);
      addNotification('error', 'Error', 'Failed to approve ad');
    } finally {
      setReviewing(null);
    }
  };

  const handleReject = async (adId: string, reason?: string) => {
    try {
      setReviewing(adId);
      await AdminService.reviewAd(adId, 'reject', reason);
      setAds(prev => prev.filter(ad => ad.id !== adId));
      addNotification('info', 'Ad Rejected', 'The ad has been rejected and client has been notified via email.');
      setSelectedAd(null);
      setShowRejectionModal(false);
      setRejectionReason('');
    } catch (error) {
      console.error('Error rejecting ad:', error);
      addNotification('error', 'Error', 'Failed to reject ad');
    } finally {
      setReviewing(null);
    }
  };

  const handleApproveHostAd = async (hostAdId: string) => {
    try {
      setReviewing(hostAdId);
      await AdminService.reviewHostAd(hostAdId, 'approve');
      setHostAds(prev => prev.filter(ad => ad.id !== hostAdId));
      addNotification('success', 'Host Ad Approved', 'The host ad has been approved and is now live. Host has been notified via email.');
      setSelectedHostAd(null);
    } catch (error) {
      console.error('Error approving host ad:', error);
      addNotification('error', 'Error', 'Failed to approve host ad');
    } finally {
      setReviewing(null);
    }
  };

  const handleRejectHostAd = async (hostAdId: string, reason?: string) => {
    try {
      setReviewing(hostAdId);
      await AdminService.reviewHostAd(hostAdId, 'reject', reason);
      setHostAds(prev => prev.filter(ad => ad.id !== hostAdId));
      addNotification('success', 'Host Ad Rejected', 'The host ad has been rejected. Host has been notified via email.');
      setSelectedHostAd(null);
      setShowRejectionModal(false);
      setRejectionReason('');
    } catch (error) {
      console.error('Error rejecting host ad:', error);
      addNotification('error', 'Error', 'Failed to reject host ad');
    } finally {
      setReviewing(null);
    }
  };

  const handleApproveCampaign = async (campaignId: string) => {
    try {
      setReviewing(campaignId);
      await AdminService.reviewCampaign(campaignId, 'approve');
      setPendingCampaigns(prev => prev.filter(campaign => campaign.id !== campaignId));
      addNotification('success', 'Campaign Approved', 'The campaign has been approved and is now active. Client has been notified via email.');
      setSelectedCampaign(null);
    } catch (error) {
      console.error('Error approving campaign:', error);
      addNotification('error', 'Error', 'Failed to approve campaign');
    } finally {
      setReviewing(null);
    }
  };

  const handleRejectCampaign = async (campaignId: string, reason?: string) => {
    try {
      setReviewing(campaignId);
      await AdminService.reviewCampaign(campaignId, 'reject', reason);
      setPendingCampaigns(prev => prev.filter(campaign => campaign.id !== campaignId));
      addNotification('info', 'Campaign Rejected', 'The campaign has been rejected and client has been notified via email.');
      setSelectedCampaign(null);
      setShowRejectionModal(false);
      setRejectionReason('');
    } catch (error) {
      console.error('Error rejecting campaign:', error);
      addNotification('error', 'Error', 'Failed to reject campaign');
    } finally {
      setReviewing(null);
    }
  };

  const openRejectionModal = () => {
    setShowRejectionModal(true);
  };

  const closeRejectionModal = () => {
    setShowRejectionModal(false);
    setRejectionReason('');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'uploading': return 'bg-blue-100 text-blue-800';
      case 'processing': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'archived': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getFilePreview = (fileType: string, filePath: string) => {
    if (fileType === 'image') {
      return MediaService.getMediaPreviewUrl(filePath);
    } else {
      // For videos, we could show a thumbnail or placeholder
      return 'https://images.pexels.com/photos/3945313/pexels-photo-3945313.jpeg?auto=compress&cs=tinysrgb&w=400';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Ad Review Queue</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Review and approve submitted advertisements</p>
        </div>
        <button
          onClick={loadAdReviewQueue}
          disabled={loading}
          className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Queue Stats */}
      <div className="grid md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Client Ads</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">{ads.filter(a => a.status === 'processing').length}</p>
            </div>
            <div className="p-3 bg-yellow-50 rounded-lg">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Pending Campaigns</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">{pendingCampaigns.length}</p>
            </div>
            <div className="p-3 bg-orange-50 rounded-lg">
              <CheckSquare className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Host Ads</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">{hostAds.length}</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <Eye className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Queue</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">{ads.length + hostAds.length + pendingCampaigns.length}</p>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg">
              <AlertCircle className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Review Queue */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Queue List */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Review Queue</h3>
                <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setActiveTab('client')}
                    className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                      activeTab === 'client'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Client Ads ({ads.length + pendingCampaigns.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('host')}
                    className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                      activeTab === 'host'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Host Ads ({hostAds.length})
                  </button>
                </div>
              </div>
            </div>
            
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <div className="p-6 text-center">
                  <RefreshCw className="h-8 w-8 text-gray-400 animate-spin mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">Loading ad review queue...</p>
                </div>
              ) : (activeTab === 'client' ? [...ads, ...pendingCampaigns] : hostAds).length === 0 ? (
                <div className="p-6 text-center">
                  <CheckSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No {activeTab + ' ads'} to review</h3>
                  <p className="text-gray-500 dark:text-gray-400">All caught up! Check back later for new submissions.</p>
                </div>
              ) : (
                (activeTab === 'client' ? [...ads, ...pendingCampaigns] : hostAds).map((item) => (
                  <div
                    key={item.id}
                    className={`p-6 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors ${
                      (activeTab === 'client' ? (selectedAd?.id === item.id || selectedCampaign?.id === item.id) : 
                       selectedHostAd?.id === item.id) ? 'bg-purple-50 dark:bg-purple-900/20 border-l-4 border-purple-500' : ''
                    }`}
                    onClick={() => {
                      try {
                        console.log('Item clicked:', item);
                        if (activeTab === 'client') {
                          // Check if it's a campaign or an ad
                          if (isCampaign(item)) {
                            console.log('Selected campaign:', item);
                            // It's a campaign
                            setSelectedCampaign(item);
                            setSelectedAd(null);
                          } else {
                            console.log('Selected ad:', item);
                            // It's an ad
                            setSelectedAd(item);
                            setSelectedCampaign(null);
                          }
                          setSelectedHostAd(null);
                        } else {
                          console.log('Selected host ad:', item);
                          setSelectedHostAd(item);
                          setSelectedAd(null);
                          setSelectedCampaign(null);
                        }
                      } catch (error) {
                        console.error('Error handling item click:', error);
                        addNotification('error', 'Error', 'Failed to select item');
                      }
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        {(activeTab === 'client' && isCampaign(item)) ? (
                          <div className="w-16 h-28 bg-gradient-to-br from-purple-100 to-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <CheckSquare className="h-8 w-8 text-purple-600" />
                          </div>
                        ) : (
                          <div className="w-16 h-28 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                            <img 
                              src={activeTab === 'client' ? getFilePreview(item.file_type, item.file_path) : item.media_url} 
                              alt="Preview" 
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        <div>
                          <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {(activeTab === 'client' && isCampaign(item)) ? item.name : 
                             (activeTab === 'client' ? item.file_name : item.name)}
                          </h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            by {(activeTab === 'client' && isCampaign(item)) ? item.user.full_name :
                                (activeTab === 'client' ? item.user.full_name : item.host.full_name)} 
                            ({(activeTab === 'client' && isCampaign(item)) ? (item.user.company_name || item.user.email) :
                              (activeTab === 'client' ? (item.user.company_name || item.user.email) : (item.host.company_name || item.host.email))})
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {(activeTab === 'client' && isCampaign(item)) ? 'Created' : 'Uploaded'} {new Date(item.created_at).toLocaleDateString()}
                          </p>
                          <div className="flex items-center space-x-2 mt-2">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(item.status)}`}>
                              {item.status}
                            </span>
                            {(activeTab === 'client' && isCampaign(item)) ? (
                              <>
                                <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                  ${item.budget}
                                </span>
                                <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                                  {new Date(item.start_date).toLocaleDateString()} - {new Date(item.end_date).toLocaleDateString()}
                                </span>
                              </>
                            ) : (
                              <>
                                <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                                  {activeTab === 'client' ? item.file_type : item.media_type}
                                </span>
                                {activeTab === 'client' && item.campaign && (
                                  <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                    {item.campaign.name}
                                  </span>
                                )}
                                {activeTab === 'host' && item.duration && (
                                  <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                                    {item.duration}s
                                  </span>
                                )}
                              </>
                            )}
                          </div>
                          {activeTab === 'client' && !isCampaign(item) && item.validation_errors && item.validation_errors.length > 0 && (
                            <div className="mt-2">
                              <span className="text-xs text-red-600 font-medium">Validation Errors:</span>
                              <ul className="text-xs text-red-600 mt-1">
                                {item.validation_errors.map((error: string, index: number) => (
                                  <li key={index}>• {error}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Review Panel */}
        <div className="lg:col-span-1">
          {(selectedAd || selectedHostAd || selectedCampaign) ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 sticky top-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Review Details</h3>
              
              {/* Preview */}
              <div className="w-full h-48 bg-gray-200 rounded-lg overflow-hidden mb-4">
                {selectedCampaign ? (
                  <div className="w-full h-full bg-gradient-to-br from-purple-100 to-blue-100 flex items-center justify-center">
                    <CheckSquare className="h-16 w-16 text-purple-600" />
                  </div>
                ) : (
                  <img 
                    src={activeTab === 'client' ? getFilePreview(selectedAd!.file_type, selectedAd!.file_path) : selectedHostAd!.media_url} 
                    alt="Preview" 
                    className="w-full h-full object-cover"
                  />
                )}
              </div>

              <div className="space-y-3 mb-6">
                <div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Name:</span>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {selectedCampaign ? selectedCampaign!.name : 
                     (activeTab === 'client' ? selectedAd!.file_name : selectedHostAd!.name)}
                  </p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {selectedCampaign ? 'Client:' : (activeTab === 'client' ? 'Client:' : 'Host:')}
                  </span>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {selectedCampaign ? selectedCampaign!.user.full_name :
                     (activeTab === 'client' ? selectedAd!.user.full_name : selectedHostAd!.host.full_name)}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {selectedCampaign ? selectedCampaign!.user.email :
                     (activeTab === 'client' ? selectedAd!.user.email : selectedHostAd!.host.email)}
                  </p>
                  {(selectedCampaign ? selectedCampaign!.user.company_name :
                    (activeTab === 'client' ? selectedAd!.user.company_name : selectedHostAd!.host.company_name)) && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {selectedCampaign ? selectedCampaign!.user.company_name :
                       (activeTab === 'client' ? selectedAd!.user.company_name : selectedHostAd!.host.company_name)}
                    </p>
                  )}
                </div>
                {selectedCampaign ? (
                  <>
                    <div>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Budget:</span>
                      <p className="text-sm text-gray-900 dark:text-white">${selectedCampaign!.budget}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Duration:</span>
                      <p className="text-sm text-gray-900 dark:text-white">
                        {new Date(selectedCampaign!.start_date).toLocaleDateString()} - {new Date(selectedCampaign!.end_date).toLocaleDateString()}
                      </p>
                    </div>
                    {selectedCampaign!.description && (
                      <div>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Description:</span>
                        <p className="text-sm text-gray-900 dark:text-white">{selectedCampaign!.description}</p>
                      </div>
                    )}
                    <div>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Target Locations:</span>
                      <p className="text-sm text-gray-900 dark:text-white">
                        {selectedCampaign!.target_locations && selectedCampaign!.target_locations.length > 0 
                          ? selectedCampaign!.target_locations.join(', ') 
                          : 'All locations'}
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Type:</span>
                      <p className="text-sm text-gray-900 dark:text-white capitalize">
                        {activeTab === 'client' ? selectedAd!.file_type : selectedHostAd!.media_type}
                      </p>
                    </div>
                    {activeTab === 'client' && selectedAd!.campaign && (
                      <div>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Campaign:</span>
                        <p className="text-sm text-gray-900 dark:text-white">{selectedAd!.campaign.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(selectedAd!.campaign.start_date).toLocaleDateString()} - {new Date(selectedAd!.campaign.end_date).toLocaleDateString()}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Budget: ${selectedAd!.campaign.budget}</p>
                      </div>
                    )}
                    {activeTab === 'host' && selectedHostAd!.duration && (
                      <div>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Duration:</span>
                        <p className="text-sm text-gray-900 dark:text-white">{selectedHostAd!.duration} seconds</p>
                      </div>
                    )}
                    {activeTab === 'host' && selectedHostAd!.description && (
                      <div>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Description:</span>
                        <p className="text-sm text-gray-900 dark:text-white">{selectedHostAd!.description}</p>
                      </div>
                    )}
                  </>
                )}
                <div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {selectedCampaign ? 'Created Date:' : 'Upload Date:'}
                  </span>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {new Date((selectedCampaign ? selectedCampaign! : 
                               activeTab === 'client' ? selectedAd! : selectedHostAd!).created_at).toLocaleDateString()}
                  </p>
                </div>
                {activeTab === 'client' && selectedAd && selectedAd.validation_errors && selectedAd.validation_errors.length > 0 && (
                  <div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Validation Errors:</span>
                    <ul className="text-sm text-red-600 dark:text-red-400 mt-1">
                      {selectedAd.validation_errors.map((error: string, index: number) => (
                        <li key={index}>• {error}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {activeTab === 'host' && selectedHostAd!.rejection_reason && (
                  <div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Previous Rejection Reason:</span>
                    <p className="text-sm text-red-600 dark:text-red-400 mt-1">{selectedHostAd!.rejection_reason}</p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <button
                  onClick={() => {
                    if (selectedCampaign) {
                      handleApproveCampaign(selectedCampaign!.id);
                    } else if (activeTab === 'client') {
                      handleApprove(selectedAd!.id);
                    } else {
                      handleApproveHostAd(selectedHostAd!.id);
                    }
                  }}
                  disabled={reviewing === (selectedCampaign ? selectedCampaign!.id :
                                          activeTab === 'client' ? selectedAd!.id : selectedHostAd!.id)}
                  className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  {reviewing === (selectedCampaign ? selectedCampaign!.id :
                                 activeTab === 'client' ? selectedAd!.id : selectedHostAd!.id) ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  <span>Approve</span>
                </button>
                <button
                  onClick={openRejectionModal}
                  disabled={reviewing === (selectedCampaign ? selectedCampaign!.id :
                                          activeTab === 'client' ? selectedAd!.id : selectedHostAd!.id)}
                  className="w-full bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  <X className="h-4 w-4" />
                  <span>Reject</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 text-center">
              <CheckSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Select an Ad</h3>
              <p className="text-gray-500 dark:text-gray-400">Choose an ad from the queue to review</p>
            </div>
          )}
        </div>
      </div>

      {/* Rejection Modal */}
      {showRejectionModal && (selectedAd || selectedHostAd || selectedCampaign) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Reject {selectedCampaign ? 'Campaign' : (activeTab === 'client' ? 'Ad' : 'Host Ad')}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Please provide a reason for rejecting this {selectedCampaign ? 'campaign' : (activeTab === 'client' ? 'ad' : 'host ad')}. 
              The {selectedCampaign ? 'client' : (activeTab === 'client' ? 'client' : 'host')} will be notified via email.
            </p>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Enter rejection reason..."
              className="w-full p-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg resize-none h-24 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
            <div className="flex space-x-3 mt-6">
              <button
                onClick={closeRejectionModal}
                className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-600 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (selectedCampaign) {
                    handleRejectCampaign(selectedCampaign!.id, rejectionReason);
                  } else if (activeTab === 'client') {
                    handleReject(selectedAd!.id, rejectionReason);
                  } else {
                    handleRejectHostAd(selectedHostAd!.id, rejectionReason);
                  }
                }}
                disabled={!rejectionReason.trim() || reviewing === (selectedCampaign ? selectedCampaign!.id :
                                                                    activeTab === 'client' ? selectedAd!.id : selectedHostAd!.id)}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                {reviewing === (selectedCampaign ? selectedCampaign!.id :
                               activeTab === 'client' ? selectedAd!.id : selectedHostAd!.id) ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <X className="h-4 w-4" />
                )}
                <span>Reject {selectedCampaign ? 'Campaign' : (activeTab === 'client' ? 'Ad' : 'Host Ad')}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}