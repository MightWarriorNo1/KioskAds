import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Eye, 
  Edit, 
  Trash2, 
  Play, 
  Pause, 
  Calendar, 
  MapPin, 
  Upload, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertCircle,
  Filter,
  Search,
  MoreVertical,
  Monitor,
  TrendingUp,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { HostService, HostAd, HostAdAssignment, HostKiosk } from '../../services/hostService';
import { AdminService } from '../../services/adminService';
import Button from '../ui/Button';
import Card from '../ui/Card';
import AssetSwapModal from './AssetSwapModal';

interface AdWithAssignments extends HostAd {
  assignments: HostAdAssignment[];
  totalImpressions: number;
  totalRevenue: number;
}

export default function AdManagement() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addNotification } = useNotification();
  
  const [ads, setAds] = useState<AdWithAssignments[]>([]);
  const [kiosks, setKiosks] = useState<HostKiosk[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedAd, setSelectedAd] = useState<AdWithAssignments | null>(null);
  const [swapModalOpen, setSwapModalOpen] = useState(false);
  const [selectedAdForSwap, setSelectedAdForSwap] = useState<HostAd | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingAd, setDeletingAd] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      if (!user?.id) return;
      
      try {
        setLoading(true);
        const [adsData, kiosksData, assignmentsData] = await Promise.all([
          HostService.getHostAds(user.id),
          HostService.getHostKiosks(user.id),
          HostService.getHostAdAssignments(user.id)
        ]);

        // Enrich ads with assignment data and metrics
        const enrichedAds = adsData.map(ad => {
          const adAssignments = assignmentsData.filter(assignment => assignment.ad_id === ad.id);
          const totalImpressions = adAssignments.reduce((sum, assignment) => sum + (assignment.impressions || 0), 0);
          const totalRevenue = adAssignments.reduce((sum, assignment) => sum + (assignment.revenue || 0), 0);
          
          return {
            ...ad,
            assignments: adAssignments,
            totalImpressions,
            totalRevenue
          };
        });

        setAds(enrichedAds);
        setKiosks(kiosksData);
      } catch (error) {
        console.error('Error loading ads:', error);
        addNotification('error', 'Error', 'Failed to load ads');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user?.id, addNotification]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'pending_review': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'approved': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'rejected': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'paused': return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
      case 'draft': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400';
      case 'swapped': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <Play className="h-4 w-4" />;
      case 'pending_review': return <Clock className="h-4 w-4" />;
      case 'approved': return <CheckCircle className="h-4 w-4" />;
      case 'rejected': return <XCircle className="h-4 w-4" />;
      case 'paused': return <Pause className="h-4 w-4" />;
      case 'draft': return <Edit className="h-4 w-4" />;
      case 'swapped': return <RefreshCw className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  const filteredAds = ads.filter(ad => {
    const matchesSearch = ad.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ad.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || ad.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleDeleteAd = async (adId: string) => {
    if (!user?.id) return;
    
    try {
      setDeletingAd(adId);
      await HostService.deleteAd(adId);
      
      setAds(prev => prev.filter(ad => ad.id !== adId));
      setShowDeleteModal(false);
      setSelectedAd(null);
      
      addNotification('success', 'Ad Deleted', 'Ad has been deleted successfully');
    } catch (error) {
      console.error('Error deleting ad:', error);
      addNotification('error', 'Delete Failed', 'Failed to delete ad');
    } finally {
      setDeletingAd(null);
    }
  };

  const handleSubmitForReview = async (adId: string) => {
    try {
      await HostService.submitAdForReview(adId);
      
      setAds(prev => prev.map(ad => 
        ad.id === adId ? { ...ad, status: 'pending_review' as const } : ad
      ));
      
      addNotification('success', 'Submitted for Review', 'Ad has been submitted for review');
    } catch (error) {
      console.error('Error submitting ad:', error);
      addNotification('error', 'Submission Failed', 'Failed to submit ad for review');
    }
  };

  const handleSwapAsset = (ad: HostAd) => {
    setSelectedAdForSwap(ad);
    setSwapModalOpen(true);
  };

  const handleSwapComplete = () => {
    // Reload ads to reflect the new status
    loadData();
  };

  const handlePauseAd = async (adId: string) => {
    try {
      await HostService.pauseAd(adId);
      
      setAds(prev => prev.map(ad => 
        ad.id === adId ? { ...ad, status: 'paused' as const } : ad
      ));
      
      addNotification('success', 'Ad Paused', 'Ad has been paused');
    } catch (error) {
      console.error('Error pausing ad:', error);
      addNotification('error', 'Pause Failed', 'Failed to pause ad');
    }
  };

  const handleResumeAd = async (adId: string) => {
    try {
      await HostService.resumeAd(adId);
      
      setAds(prev => prev.map(ad => 
        ad.id === adId ? { ...ad, status: 'active' as const } : ad
      ));
      
      addNotification('success', 'Ad Resumed', 'Ad has been resumed');
    } catch (error) {
      console.error('Error resuming ad:', error);
      addNotification('error', 'Resume Failed', 'Failed to resume ad');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Ad Management</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage your uploaded advertisements</p>
        </div>
        <Button
          onClick={() => navigate('/host/ads/upload')}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Upload New Ad
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Ads</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{ads.length}</p>
            </div>
            <Upload className="h-8 w-8 text-blue-500" />
          </div>
        </Card>
        
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Ads</p>
              <p className="text-2xl font-bold text-green-600">
                {ads.filter(ad => ad.status === 'active').length}
              </p>
            </div>
            <Play className="h-8 w-8 text-green-500" />
          </div>
        </Card>
        
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Pending Review</p>
              <p className="text-2xl font-bold text-yellow-600">
                {ads.filter(ad => ad.status === 'pending_review').length}
              </p>
            </div>
            <Clock className="h-8 w-8 text-yellow-500" />
          </div>
        </Card>
        
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Impressions</p>
              <p className="text-2xl font-bold text-purple-600">
                {ads.reduce((sum, ad) => sum + ad.totalImpressions, 0).toLocaleString()}
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-purple-500" />
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search ads..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="pending_review">Pending Review</option>
              <option value="approved">Approved</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Ads Grid */}
      {filteredAds.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {ads.length === 0 ? 'No ads uploaded yet' : 'No ads match your filters'}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {ads.length === 0 
                ? 'Upload your first ad to get started with your kiosk advertising'
                : 'Try adjusting your search or filter criteria'
              }
            </p>
            {ads.length === 0 && (
              <Button onClick={() => navigate('/host/ads/upload')}>
                Upload Your First Ad
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAds.map((ad) => (
            <Card key={ad.id} className="overflow-hidden">
              <div className="aspect-[9/16] bg-gray-100 dark:bg-gray-800 rounded-lg mb-4 overflow-hidden">
                {ad.media_type === 'image' ? (
                  <img
                    src={ad.media_url}
                    alt={ad.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <video
                    src={ad.media_url}
                    className="w-full h-full object-cover"
                    muted
                  />
                )}
              </div>
              
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                      {ad.name}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                      {ad.description || 'No description'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(ad.status)}`}>
                      {getStatusIcon(ad.status)}
                      {ad.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                  <div className="flex items-center gap-1">
                    <Monitor className="h-4 w-4" />
                    <span>{ad.assignments.length} kiosk{ad.assignments.length !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <TrendingUp className="h-4 w-4" />
                    <span>{ad.totalImpressions.toLocaleString()}</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>{ad.duration}s</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>{new Date(ad.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => navigate(`/host/ads/${ad.id}/preview`)}
                    className="flex-1"
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Preview
                  </Button>
                  
                  <div className="relative">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setSelectedAd(ad)}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                    
                    {selectedAd?.id === ad.id && (
                      <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10">
                        <div className="py-1">
                          {ad.status === 'draft' && (
                            <button
                              onClick={() => handleSubmitForReview(ad.id)}
                              className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                              Submit for Review
                            </button>
                          )}
                          
                          {ad.status === 'active' && (
                            <>
                              <button
                                onClick={() => handleSwapAsset(ad)}
                                className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                              >
                                Swap Asset
                              </button>
                              <button
                                onClick={() => handlePauseAd(ad.id)}
                                className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                              >
                                Pause Ad
                              </button>
                            </>
                          )}
                          
                          {ad.status === 'paused' && (
                            <button
                              onClick={() => handleResumeAd(ad.id)}
                              className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                              Resume Ad
                            </button>
                          )}
                          
                          <button
                            onClick={() => navigate(`/host/ads/${ad.id}/assign`)}
                            className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                          >
                            Assign to Kiosks
                          </button>
                          
                          <button
                            onClick={() => navigate(`/host/ads/${ad.id}/edit`)}
                            className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                          >
                            Edit Ad
                          </button>
                          
                          <hr className="my-1 border-gray-200 dark:border-gray-700" />
                          
                          <button
                            onClick={() => {
                              setSelectedAd(ad);
                              setShowDeleteModal(true);
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                          >
                            Delete Ad
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedAd && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-shrink-0">
                <XCircle className="h-6 w-6 text-red-500" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Delete Ad
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  This action cannot be undone.
                </p>
              </div>
            </div>
            
            <p className="text-gray-700 dark:text-gray-300 mb-6">
              Are you sure you want to delete "{selectedAd.name}"? This will also remove all assignments to kiosks.
            </p>
            
            <div className="flex justify-end gap-3">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedAd(null);
                }}
                disabled={deletingAd === selectedAd.id}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={() => handleDeleteAd(selectedAd.id)}
                loading={deletingAd === selectedAd.id}
              >
                Delete Ad
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Asset Swap Modal */}
      {selectedAdForSwap && (
        <AssetSwapModal
          isOpen={swapModalOpen}
          onClose={() => {
            setSwapModalOpen(false);
            setSelectedAdForSwap(null);
          }}
          assetId={selectedAdForSwap.id}
          assetType="host_ad"
          currentAsset={{
            name: selectedAdForSwap.name,
            media_url: selectedAdForSwap.media_url,
            media_type: selectedAdForSwap.media_type,
            duration: selectedAdForSwap.duration
          }}
          onSwapComplete={handleSwapComplete}
        />
      )}
    </div>
  );
}
