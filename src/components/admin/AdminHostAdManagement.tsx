import { useState, useEffect, useCallback } from 'react';
import { 
  Edit, 
  Play, 
  Pause, 
  Calendar, 
  Upload, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertCircle,
  Filter,
  Search,
  MoreVertical,
  Monitor,
  RefreshCw,
  Trash2,
  Save,
  X,
  User,
  Building,
  Target
} from 'lucide-react';
import { useNotification } from '../../contexts/NotificationContext';
import { AdminService } from '../../services/adminService';
import Button from '../ui/Button';
import Card from '../ui/Card';

interface HostAd {
  id: string;
  host_id: string;
  name: string;
  description?: string;
  media_url: string;
  media_type: 'image' | 'video';
  duration: number;
  status: string;
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
  profiles: {
    id: string;
    full_name: string;
    email: string;
    company_name?: string;
  };
}

interface HostAdAssignment {
  id: string;
  kiosk_id: string;
  start_date: string;
  end_date: string;
  priority: number;
  status: string;
  created_at: string;
  kiosks: {
    id: string;
    name: string;
    location: string;
    city: string;
    state: string;
  };
}

interface Kiosk {
  id: string;
  name: string;
  location: string;
  city: string;
  state: string;
  status: string;
}

export default function AdminHostAdManagement() {
  const { addNotification } = useNotification();
  
  const [ads, setAds] = useState<HostAd[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [hostFilter, setHostFilter] = useState<string>('all');
  const [selectedAd, setSelectedAd] = useState<HostAd | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingAd, setDeletingAd] = useState<string | null>(null);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [editingAd, setEditingAd] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    duration: 15
  });
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assigningAd, setAssigningAd] = useState<string | null>(null);
  const [availableKiosks, setAvailableKiosks] = useState<Kiosk[]>([]);
  const [selectedKiosks, setSelectedKiosks] = useState<string[]>([]);
  const [assignmentDates, setAssignmentDates] = useState({
    startDate: '',
    endDate: ''
  });
  const [adAssignments, setAdAssignments] = useState<HostAdAssignment[]>([]);
  const [showAssignments, setShowAssignments] = useState<string | null>(null);
  const [showAssignmentsModal, setShowAssignmentsModal] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [hosts, setHosts] = useState<Array<{id: string, full_name: string, email: string}>>([]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [adsData, hostsData] = await Promise.all([
        AdminService.getAllHostAds(),
        AdminService.getAllUsers({ role: 'host' })
      ]);

      setAds(adsData);
      setHosts(hostsData);
    } catch (error) {
      console.error('Error loading data:', error);
      addNotification('error', 'Error', 'Failed to load host ads');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Remove addNotification dependency to prevent unnecessary reloads

  useEffect(() => {
    loadData();
  }, [loadData]);

  const loadKiosks = async () => {
    try {
      const kiosksData = await AdminService.getAllKiosks();
      setAvailableKiosks(kiosksData);
    } catch (error) {
      console.error('Error loading kiosks:', error);
      addNotification('error', 'Error', 'Failed to load kiosks');
    }
  };

  const loadAdAssignments = async (adId: string) => {
    try {
      const assignments = await AdminService.getHostAdAssignments(adId);
      setAdAssignments(assignments);
    } catch (error) {
      console.error('Error loading ad assignments:', error);
      addNotification('error', 'Error', 'Failed to load ad assignments');
    }
  };

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
                         ad.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ad.profiles.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ad.profiles.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || ad.status === statusFilter;
    const matchesHost = hostFilter === 'all' || ad.host_id === hostFilter;
    return matchesSearch && matchesStatus && matchesHost;
  });

  const handleDeleteAd = async (adId: string) => {
    try {
      setDeletingAd(adId);
      await AdminService.deleteHostAd(adId);
      
      setAds(prev => prev.filter(ad => ad.id !== adId));
      setShowDeleteModal(false);
      setSelectedAd(null);
      
      addNotification('success', 'Ad Deleted', 'Host ad has been deleted successfully');
    } catch (error) {
      console.error('Error deleting ad:', error);
      addNotification('error', 'Delete Failed', 'Failed to delete host ad');
    } finally {
      setDeletingAd(null);
    }
  };

  const handleUpdateStatus = async (adId: string, status: string, rejectionReason?: string) => {
    try {
      setUpdatingStatus(adId);
      await AdminService.updateHostAdStatus(adId, status, rejectionReason);
      
      // Update local state immediately for smooth UX
      setAds(prev => prev.map(ad => 
        ad.id === adId ? { ...ad, status, rejection_reason: rejectionReason, updated_at: new Date().toISOString() } : ad
      ));
      
      // Show success message with appropriate context
      if (status === 'active') {
        addNotification('success', 'Ad Approved', 'Host ad has been approved and is now active');
      } else if (status === 'paused') {
        addNotification('success', 'Ad Paused', 'Host ad has been paused');
      } else if (status === 'rejected') {
        addNotification('success', 'Ad Rejected', 'Host ad has been rejected');
      } else {
        addNotification('success', 'Status Updated', `Host ad status changed to ${status}`);
      }
    } catch (error) {
      console.error('Error updating status:', error);
      addNotification('error', 'Update Failed', 'Failed to update host ad status');
    } finally {
      setUpdatingStatus(null);
    }
  };

  const startEditing = (ad: HostAd) => {
    setEditingAd(ad.id);
    setEditForm({
      name: ad.name,
      description: ad.description || '',
      duration: ad.duration
    });
  };

  const cancelEditing = () => {
    setEditingAd(null);
    setEditForm({
      name: '',
      description: '',
      duration: 15
    });
  };

  const saveEdits = async (adId: string) => {
    try {
      await AdminService.updateHostAd(adId, editForm);
      
      setAds(prev => prev.map(ad => 
        ad.id === adId ? { ...ad, ...editForm } : ad
      ));
      
      setEditingAd(null);
      addNotification('success', 'Ad Updated', 'Host ad has been updated successfully');
    } catch (error) {
      console.error('Error updating ad:', error);
      addNotification('error', 'Update Failed', 'Failed to update host ad');
    }
  };

  const handleAssignToKiosks = async (adId: string) => {
    try {
      setAssigningAd(adId);
      await AdminService.assignHostAdToKiosks(
        adId, 
        selectedKiosks, 
        assignmentDates.startDate, 
        assignmentDates.endDate
      );
      
      setShowAssignModal(false);
      setSelectedKiosks([]);
      setAssignmentDates({ startDate: '', endDate: '' });
      
      addNotification('success', 'Ad Assigned', 'Host ad has been assigned to selected kiosks');
    } catch (error) {
      console.error('Error assigning ad:', error);
      addNotification('error', 'Assignment Failed', 'Failed to assign host ad to kiosks');
    } finally {
      setAssigningAd(null);
    }
  };

  const handleUnassignFromKiosks = async (adId: string, kioskIds: string[]) => {
    try {
      await AdminService.unassignHostAdFromKiosks(adId, kioskIds);
      await loadAdAssignments(adId);
      addNotification('success', 'Ad Unassigned', 'Host ad has been unassigned from selected kiosks');
    } catch (error) {
      console.error('Error unassigning ad:', error);
      addNotification('error', 'Unassignment Failed', 'Failed to unassign host ad from kiosks');
    }
  };

  const toggleDropdown = (adId: string) => {
    setOpenDropdownId(openDropdownId === adId ? null : adId);
  };

  const openAssignModal = async (adId: string) => {
    setSelectedAd(ads.find(ad => ad.id === adId) || null);
    setShowAssignModal(true);
    await loadKiosks();
  };

  const openAssignments = async (adId: string) => {
    setShowAssignments(adId);
    setShowAssignmentsModal(true);
    await loadAdAssignments(adId);
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Host Ad Management</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage all host ad uploads across the platform</p>
        </div>
        <Button
          onClick={loadData}
          className="flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
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
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Hosts</p>
              <p className="text-2xl font-bold text-purple-600">
                {new Set(ads.map(ad => ad.host_id)).size}
              </p>
            </div>
            <User className="h-8 w-8 text-purple-500" />
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search ads, hosts, or descriptions..."
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

          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-gray-400" />
            <select
              value={hostFilter}
              onChange={(e) => setHostFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="all">All Hosts</option>
              {hosts.map(host => (
                <option key={host.id} value={host.id}>
                  {host.full_name}
                </option>
              ))}
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
              {ads.length === 0 ? 'No host ads found' : 'No ads match your filters'}
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {ads.length === 0 
                ? 'No hosts have uploaded ads yet'
                : 'Try adjusting your search or filter criteria'
              }
            </p>
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
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    {editingAd === ad.id ? (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={editForm.name}
                          onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                          className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white"
                          placeholder="Ad name"
                        />
                        <textarea
                          value={editForm.description}
                          onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                          className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white"
                          placeholder="Description"
                          rows={2}
                        />
                        <input
                          type="number"
                          value={editForm.duration}
                          onChange={(e) => setEditForm(prev => ({ ...prev, duration: parseInt(e.target.value) || 15 }))}
                          className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white"
                          placeholder="Duration (seconds)"
                        />
                      </div>
                    ) : (
                      <>
                        <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                          {ad.name}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                          {ad.description || 'No description'}
                        </p>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-1 sm:ml-2 flex-shrink-0">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(ad.status)}`}>
                      {getStatusIcon(ad.status)}
                      <span className="hidden sm:inline">{ad.status.replace('_', ' ')}</span>
                      <span className="sm:hidden">{ad.status.replace('_', ' ').charAt(0).toUpperCase()}</span>
                    </span>
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <div className="flex items-center gap-1 min-w-0">
                    <User className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">{ad.profiles.full_name}</span>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Clock className="h-4 w-4" />
                    <span>{ad.duration}s</span>
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <div className="flex items-center gap-1 min-w-0">
                    <Calendar className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate text-xs sm:text-sm">
                      {new Date(ad.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 min-w-0">
                    <Building className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate text-xs sm:text-sm">{ad.profiles.company_name || ad.profiles.email}</span>
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                  {editingAd === ad.id ? (
                    <div className="flex flex-col sm:flex-row gap-2 w-full">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => saveEdits(ad.id)}
                        className="flex-1"
                      >
                        <Save className="h-4 w-4 mr-1" />
                        Save
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={cancelEditing}
                        className="flex-1"
                      >
                        <X className="h-4 w-4 mr-1" />
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => openAssignments(ad.id)}
                        className="flex-1 sm:flex-none"
                      >
                        <Monitor className="h-4 w-4 mr-1" />
                        <span className="hidden sm:inline">Assignments</span>
                        <span className="sm:hidden">Assign</span>
                      </Button>
                      
                      <div className="relative flex-shrink-0">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => toggleDropdown(ad.id)}
                          className="w-full sm:w-auto"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                        
                        {openDropdownId === ad.id && (
                          <div className="absolute right-0 bottom-full mb-1 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50">
                            <div className="py-1">
                              <button
                                onClick={() => {
                                  startEditing(ad);
                                  setOpenDropdownId(null);
                                }}
                                className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                              >
                                Edit Ad
                              </button>
                              
                              <button
                                onClick={() => {
                                  openAssignModal(ad.id);
                                  setOpenDropdownId(null);
                                }}
                                className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                              >
                                Assign to Kiosks
                              </button>
                              
                               {ad.status === 'pending_review' && (
                                 <>
                                   <button
                                     onClick={() => {
                                       handleUpdateStatus(ad.id, 'active');
                                       setOpenDropdownId(null);
                                     }}
                                     disabled={updatingStatus === ad.id}
                                     className={`w-full px-4 py-2 text-left text-sm hover:bg-green-50 dark:hover:bg-green-900/20 flex items-center gap-2 ${
                                       updatingStatus === ad.id 
                                         ? 'text-green-500 dark:text-green-500 cursor-not-allowed opacity-50' 
                                         : 'text-green-600 dark:text-green-400'
                                     }`}
                                   >
                                     {updatingStatus === ad.id ? (
                                       <>
                                         <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-green-500"></div>
                                         Approving...
                                       </>
                                     ) : (
                                       <>
                                         <CheckCircle className="h-3 w-3" />
                                         Approve
                                       </>
                                     )}
                                   </button>
                                   <button
                                     onClick={() => {
                                       const reason = prompt('Rejection reason:');
                                       if (reason) {
                                         handleUpdateStatus(ad.id, 'rejected', reason);
                                       }
                                       setOpenDropdownId(null);
                                     }}
                                     disabled={updatingStatus === ad.id}
                                     className={`w-full px-4 py-2 text-left text-sm hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 ${
                                       updatingStatus === ad.id 
                                         ? 'text-red-500 dark:text-red-500 cursor-not-allowed opacity-50' 
                                         : 'text-red-600 dark:text-red-400'
                                     }`}
                                   >
                                     {updatingStatus === ad.id ? (
                                       <>
                                         <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-red-500"></div>
                                         Rejecting...
                                       </>
                                     ) : (
                                       <>
                                         <XCircle className="h-3 w-3" />
                                         Reject
                                       </>
                                     )}
                                   </button>
                                 </>
                               )}
                              
                               {ad.status === 'active' && (
                                 <button
                                   onClick={() => {
                                     handleUpdateStatus(ad.id, 'paused');
                                     setOpenDropdownId(null);
                                   }}
                                   disabled={updatingStatus === ad.id}
                                   className={`w-full px-4 py-2 text-left text-sm hover:bg-yellow-50 dark:hover:bg-yellow-900/20 flex items-center gap-2 ${
                                     updatingStatus === ad.id 
                                       ? 'text-yellow-500 dark:text-yellow-500 cursor-not-allowed opacity-50' 
                                       : 'text-yellow-600 dark:text-yellow-400'
                                   }`}
                                 >
                                   {updatingStatus === ad.id ? (
                                     <>
                                       <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-yellow-500"></div>
                                       Pausing...
                                     </>
                                   ) : (
                                     <>
                                       <Pause className="h-3 w-3" />
                                       Pause
                                     </>
                                   )}
                                 </button>
                               )}
                               
                               {ad.status === 'paused' && (
                                 <button
                                   onClick={() => {
                                     handleUpdateStatus(ad.id, 'active');
                                     setOpenDropdownId(null);
                                   }}
                                   disabled={updatingStatus === ad.id}
                                   className={`w-full px-4 py-2 text-left text-sm hover:bg-green-50 dark:hover:bg-green-900/20 flex items-center gap-2 ${
                                     updatingStatus === ad.id 
                                       ? 'text-green-500 dark:text-green-500 cursor-not-allowed opacity-50' 
                                       : 'text-green-600 dark:text-green-400'
                                   }`}
                                 >
                                   {updatingStatus === ad.id ? (
                                     <>
                                       <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-green-500"></div>
                                       Resuming...
                                     </>
                                   ) : (
                                     <>
                                       <Play className="h-3 w-3" />
                                       Resume
                                     </>
                                   )}
                                 </button>
                               )}
                              
                              <hr className="my-1 border-gray-200 dark:border-gray-700" />
                              
                              <button
                                onClick={() => {
                                  setSelectedAd(ad);
                                  setShowDeleteModal(true);
                                  setOpenDropdownId(null);
                                }}
                                className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                              >
                                Delete Ad
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  )}
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
                  Delete Host Ad
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

      {/* Assignment Modal */}
      {showAssignModal && selectedAd && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-shrink-0">
                <Target className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Assign to Kiosks
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Assign "{selectedAd.name}" to selected kiosks
                </p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select Kiosks
                </label>
                <div className="max-h-48 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg">
                  {availableKiosks.map(kiosk => (
                    <label key={kiosk.id} className="flex items-center p-3 hover:bg-gray-50 dark:hover:bg-gray-700">
                      <input
                        type="checkbox"
                        checked={selectedKiosks.includes(kiosk.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedKiosks(prev => [...prev, kiosk.id]);
                          } else {
                            setSelectedKiosks(prev => prev.filter(id => id !== kiosk.id));
                          }
                        }}
                        className="mr-3"
                      />
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">{kiosk.name}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {kiosk.location} - {kiosk.city}, {kiosk.state}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={assignmentDates.startDate}
                    onChange={(e) => setAssignmentDates(prev => ({ ...prev, startDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={assignmentDates.endDate}
                    onChange={(e) => setAssignmentDates(prev => ({ ...prev, endDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowAssignModal(false);
                  setSelectedAd(null);
                  setSelectedKiosks([]);
                  setAssignmentDates({ startDate: '', endDate: '' });
                }}
                disabled={assigningAd === selectedAd.id}
              >
                Cancel
              </Button>
              <Button
                onClick={() => handleAssignToKiosks(selectedAd.id)}
                loading={assigningAd === selectedAd.id}
                disabled={selectedKiosks.length === 0}
              >
                Assign to {selectedKiosks.length} Kiosk{selectedKiosks.length !== 1 ? 's' : ''}
              </Button>
            </div>
          </div>
        </div>
      )}

       {/* Assignments Modal */}
       {showAssignmentsModal && showAssignments && (
         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
           <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto">
             <div className="flex items-center gap-3 mb-4">
               <div className="flex-shrink-0">
                 <Monitor className="h-6 w-6 text-blue-500" />
               </div>
               <div>
                 <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                   Ad Assignments
                 </h3>
                 <p className="text-sm text-gray-600 dark:text-gray-400">
                   Manage assignments for this ad
                 </p>
               </div>
             </div>
             
             {adAssignments.length === 0 ? (
               <div className="text-center py-8">
                 <Monitor className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                 <p className="text-gray-600 dark:text-gray-400 text-lg">
                   No assignments found for this ad.
                 </p>
                 <p className="text-gray-500 dark:text-gray-500 text-sm mt-2">
                   This ad is not currently assigned to any kiosks.
                 </p>
               </div>
             ) : (
               <div className="space-y-3">
                 {adAssignments.map(assignment => (
                   <div key={assignment.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                     <div className="flex-1">
                       <div className="font-medium text-gray-900 dark:text-white text-lg">
                         {assignment.kiosks.name}
                       </div>
                       <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                         {assignment.kiosks.location} - {assignment.kiosks.city}, {assignment.kiosks.state}
                       </div>
                       <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                         <Calendar className="h-4 w-4 inline mr-1" />
                         {assignment.start_date} to {assignment.end_date}
                       </div>
                     </div>
                     <div className="flex items-center gap-3">
                       <span className={`px-3 py-1 text-sm rounded-full font-medium ${
                         assignment.status === 'active' 
                           ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                           : 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                       }`}>
                         {assignment.status}
                       </span>
                       <Button
                         variant="danger"
                         size="sm"
                         onClick={() => handleUnassignFromKiosks(showAssignments, [assignment.kiosk_id])}
                       >
                         <Trash2 className="h-4 w-4 mr-1" />
                         Remove
                       </Button>
                     </div>
                   </div>
                 ))}
               </div>
             )}
             
             <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
               <Button
                 variant="secondary"
                 onClick={() => {
                   setShowAssignmentsModal(false);
                   setShowAssignments(null);
                 }}
               >
                 Close
               </Button>
               <Button
                 onClick={() => {
                   const ad = ads.find(ad => ad.id === showAssignments);
                   if (ad) {
                     openAssignModal(ad.id);
                   }
                   setShowAssignmentsModal(false);
                 }}
               >
                 <Target className="h-4 w-4 mr-2" />
                 Assign to More Kiosks
               </Button>
             </div>
           </div>
         </div>
       )}
    </div>
  );
}
