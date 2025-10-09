import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  MessageSquare, 
  Send, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  FileText,
  Calendar,
  DollarSign,
  Eye,
  RefreshCw,
  Users,
  Play
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { CustomAdsService, CustomAdOrder } from '../../services/customAdsService';
import Button from '../../components/ui/Button';
import ModalFileUpload from '../../components/shared/ModalFileUpload';

export default function HostManageMyCustomAdPage() {
  const { user } = useAuth();
  const { addNotification } = useNotification();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [customAds, setCustomAds] = useState<CustomAdOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAd, setSelectedAd] = useState<CustomAdOrder | null>(null);
  const [showNotes] = useState(true);
  const [newNote, setNewNote] = useState('');
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [filter, setFilter] = useState<'all' | 'submitted' | 'in_review' | 'designer_assigned' | 'proofs_ready' | 'client_review' | 'approved' | 'rejected' | 'completed' | 'cancelled'>('all');
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showChangeRequestModal, setShowChangeRequestModal] = useState(false);
  const [approvalFeedback, setApprovalFeedback] = useState('');
  const [changeRequest, setChangeRequest] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<Array<{
    id: string;
    file: File;
    preview?: string;
    name: string;
    size: number;
    type: string;
  }>>([]);

  const loadCustomAds = useCallback(async () => {
    try {
      setLoading(true);
      if (!user?.id) {
        console.log('No user ID available');
        return;
      }
      console.log('Loading custom ad orders for user:', user.id);
      const ads = await CustomAdsService.getUserOrders(user.id);
      console.log('Loaded custom ad orders:', ads);
      setCustomAds(ads);
    } catch (error) {
      console.error('Error loading custom ad orders:', error);
      addNotification('error', 'Load Failed', 'Failed to load custom ad orders');
    } finally {
      setLoading(false);
    }
  }, [user?.id, addNotification]);

  useEffect(() => {
    loadCustomAds();
  }, [loadCustomAds]);

  // Refresh data when page becomes visible (user navigates back)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && user?.id) {
        loadCustomAds();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [user?.id, loadCustomAds]);

  // Refresh data when location changes (user navigates to this page)
  useEffect(() => {
    if (location.pathname === '/manage-custom-ads' && user?.id) {
      loadCustomAds();
    }
  }, [location.pathname, user?.id, loadCustomAds]);

  const handleAddNote = async () => {
    if (!selectedAd || !newNote.trim() || !user?.id) return;

    try {
      setIsAddingNote(true);
      await CustomAdsService.addComment(
        selectedAd.id,
        newNote.trim(),
        user.id
      );
      setNewNote('');
      addNotification('success', 'Comment Added', 'Comment added successfully');
      loadCustomAds(); // Reload to get updated comments
      if (selectedAd) {
        const updatedAd = await CustomAdsService.getOrder(selectedAd.id);
        if (updatedAd) {
          setSelectedAd(updatedAd);
        }
      }
    } catch (error) {
      console.error('Error adding note:', error);
      addNotification('error', 'Failed', 'Failed to add note');
    } finally {
      setIsAddingNote(false);
    }
  };

  const handleApproveOrder = async () => {
    if (!selectedAd || isProcessing) return;

    setIsProcessing(true);
    try {
      await CustomAdsService.approveOrder(selectedAd.id, approvalFeedback.trim() || undefined);
      addNotification('success', 'Order Approved', 'Order approved successfully!');
      setShowApprovalModal(false);
      setApprovalFeedback('');
      loadCustomAds(); // Refresh to get updated status
    } catch (error) {
      console.error('Error approving order:', error);
      addNotification('error', 'Approval Failed', 'Failed to approve order. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRequestChanges = async () => {
    if (!selectedAd || !changeRequest.trim() || isProcessing) return;

    setIsProcessing(true);
    try {
      const filesToUpload = attachedFiles.map(f => f.file);
      await CustomAdsService.requestChanges(selectedAd.id, changeRequest.trim(), filesToUpload);
      addNotification('success', 'Change Request Sent', 'Change request sent successfully!');
      setShowChangeRequestModal(false);
      setChangeRequest('');
      setAttachedFiles([]);
      loadCustomAds(); // Refresh to get updated status
    } catch (error) {
      console.error('Error requesting changes:', error);
      addNotification('error', 'Request Failed', 'Failed to request changes. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCreateCampaign = () => {
    if (!selectedAd) return;
    
    // Navigate to kiosk selection to start the campaign creation flow
    // This is the same flow as "Upload Your Own Vertical Ad"
    navigate('/host/kiosk-selection');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'submitted':
        return <Clock className="w-4 h-4 text-blue-500" />;
      case 'in_review':
        return <Eye className="w-4 h-4 text-yellow-500" />;
      case 'designer_assigned':
        return <Users className="w-4 h-4 text-purple-500" />;
      case 'proofs_ready':
        return <FileText className="w-4 h-4 text-indigo-500" />;
      case 'client_review':
        return <Eye className="w-4 h-4 text-orange-500" />;
      case 'approved':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'rejected':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4 text-gray-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'submitted':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'in_review':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'designer_assigned':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      case 'proofs_ready':
        return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300';
      case 'client_review':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
      case 'approved':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'rejected':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const filteredAds = customAds.filter(ad => filter === 'all' || ad.workflow_status === filter);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Manage My Custom Ads
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">
            Communicate with designers for proof and approval
          </p>
        </div>
        <Button
          onClick={loadCustomAds}
          variant="secondary"
          className="flex items-center space-x-2"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Refresh</span>
        </Button>
      </div>

      {/* Filter Tabs */}
      <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
        {[
          { key: 'all', label: 'All', count: customAds.length },
          { key: 'submitted', label: 'Submitted', count: customAds.filter(ad => ad.workflow_status === 'submitted').length },
          { key: 'in_review', label: 'In Review', count: customAds.filter(ad => ad.workflow_status === 'in_review').length },
          { key: 'designer_assigned', label: 'Designer Assigned', count: customAds.filter(ad => ad.workflow_status === 'designer_assigned').length },
          { key: 'proofs_ready', label: 'Proofs Ready', count: customAds.filter(ad => ad.workflow_status === 'proofs_ready').length },
          { key: 'client_review', label: 'Client Review', count: customAds.filter(ad => ad.workflow_status === 'client_review').length },
          { key: 'approved', label: 'Approved', count: customAds.filter(ad => ad.workflow_status === 'approved').length },
          { key: 'rejected', label: 'Rejected', count: customAds.filter(ad => ad.workflow_status === 'rejected').length },
          { key: 'completed', label: 'Completed', count: customAds.filter(ad => ad.workflow_status === 'completed').length },
        ].map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setFilter(key as typeof filter)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              filter === key
                ? 'bg-white text-gray-900 dark:bg-gray-700 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            {label} ({count})
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ads List */}
        <div className="lg:col-span-1 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Your Custom Ads ({filteredAds.length})
          </h2>
          
          {filteredAds.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">
                No custom ads found for the selected filter.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredAds.map((ad) => (
                <div
                  key={ad.id}
                  onClick={() => setSelectedAd(ad)}
                  className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                    selectedAd?.id === ad.id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-medium text-gray-900 dark:text-white truncate">
                      Order #{ad.id.slice(-8)}
                    </h3>
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(ad.workflow_status)}
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(ad.workflow_status)}`}>
                        {ad.workflow_status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 mb-2">
                    {ad.details || 'No details provided.'}
                  </p>
                  
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{new Date(ad.created_at).toLocaleDateString()}</span>
                    <span>{ad.comments?.length || 0} comments</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Selected Ad Details */}
        <div className="lg:col-span-2">
          {selectedAd ? (
            <div className="space-y-6">
              {/* Ad Header */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Order #{selectedAd.id.slice(-8)}
                  </h2>
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(selectedAd.workflow_status)}
                    <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(selectedAd.workflow_status)}`}>
                      {selectedAd.workflow_status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
                
                <p className="text-gray-700 dark:text-gray-300 mb-4">
                  {selectedAd.details || 'No details provided.'}
                </p>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="flex items-center text-gray-600 dark:text-gray-400">
                    <Calendar className="w-4 h-4 mr-2" />
                    <span>Created: {new Date(selectedAd.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center text-gray-600 dark:text-gray-400">
                    <DollarSign className="w-4 h-4 mr-2" />
                    <span>Amount: ${selectedAd.total_amount}</span>
                  </div>
                  <div className="flex items-center text-gray-600 dark:text-gray-400">
                    <Users className="w-4 h-4 mr-2" />
                    <span>Service: {selectedAd.service_key}</span>
                  </div>
                  <div className="flex items-center text-gray-600 dark:text-gray-400">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    <span>Payment: {selectedAd.payment_status}</span>
                  </div>
                </div>
              </div>

              {/* Communication Section */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                    <MessageSquare className="w-5 h-5 mr-2" />
                    Communication with Designer
                  </h3>
                </div>

                {showNotes && (
                  <div className="space-y-4">
                    {/* Add Note Form */}
                    {selectedAd.workflow_status !== 'completed' && (
                      <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                        <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                          Send Message to Designer
                        </h4>
                        <textarea
                          value={newNote}
                          onChange={(e) => setNewNote(e.target.value)}
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white mb-3"
                          placeholder="Ask questions, provide feedback, or request changes..."
                        />
                        <Button
                          onClick={handleAddNote}
                          disabled={!newNote.trim() || isAddingNote}
                          size="sm"
                          className="flex items-center space-x-2"
                        >
                          <Send className="w-4 h-4" />
                          <span>{isAddingNote ? 'Sending...' : 'Send Message'}</span>
                        </Button>
                      </div>
                    )}

                    {/* Messages List */}
                    {selectedAd.comments && selectedAd.comments.length > 0 ? (
                      <div className="space-y-3">
                        {selectedAd.comments.map((comment) => (
                            <div
                              key={comment.id}
                              className={`border rounded-lg p-4 ${
                                comment.author === user?.id
                                  ? 'border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800'
                                  : 'border-gray-200 dark:border-gray-600'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-gray-900 dark:text-white">
                                  {comment.author === user?.id ? 'You' : comment.author}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {new Date(comment.created_at).toLocaleDateString()} at {new Date(comment.created_at).toLocaleTimeString()}
                                </span>
                              </div>
                              <p className="text-gray-700 dark:text-gray-300 text-sm">
                                {comment.content}
                              </p>
                            </div>
                          ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500 dark:text-gray-400">
                          No messages yet. Start a conversation with your designer.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Media Files */}
              {selectedAd.files && selectedAd.files.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                    <FileText className="w-5 h-5 mr-2" />
                    Media Files ({selectedAd.files.length})
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedAd.files.map((file) => (
                      <div
                        key={file.name}
                        className="border border-gray-200 dark:border-gray-600 rounded-lg p-4"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <span className="text-2xl">📁</span>
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-gray-900 dark:text-white truncate">
                                {file.name}
                              </p>
                              <p className="text-sm text-gray-500">
                                {file.type?.includes('image') ? 'Image' : 
                                 file.type?.includes('video') ? 'Video' : 'File'} • 
                                {Math.round(file.size / 1024)} KB
                              </p>
                            </div>
                          </div>
                          
                          {file.url && (
                            <Button
                              onClick={() => window.open(file.url, '_blank')}
                              variant="secondary"
                              size="sm"
                              className="flex items-center space-x-1"
                            >
                              <Eye className="w-4 h-4" />
                              <span>View</span>
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                )}

                {/* Designer Proofs */}
                {selectedAd.proofs && selectedAd.proofs.length > 0 && (
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                      <FileText className="w-5 h-5 mr-2" />
                      Designer Proofs ({selectedAd.proofs.length})
                    </h3>

                    <div className="space-y-4">
                      {selectedAd.proofs.map((proof) => (
                        <div key={proof.id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h4 className="font-medium text-gray-900 dark:text-white">
                                {proof.title || 'Proof'} - Version {proof.version_number}
                              </h4>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                Created by {proof.designer?.full_name || 'Designer'} on{' '}
                                {new Date(proof.created_at).toLocaleDateString()}
                              </p>
                            </div>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              proof.status === 'approved' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                              proof.status === 'rejected' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                              proof.status === 'submitted' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                              'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                            }`}>
                              {proof.status.replace('_', ' ').toUpperCase()}
                            </span>
                          </div>

                          {proof.description && (
                            <p className="text-gray-700 dark:text-gray-300 mb-3">
                              {proof.description}
                            </p>
                          )}

                          {proof.designer_notes && (
                            <div className="mb-3 p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg">
                              <h5 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">Designer Notes:</h5>
                              <p className="text-sm text-gray-700 dark:text-gray-300">{proof.designer_notes}</p>
                            </div>
                          )}

                          {proof.client_feedback && (
                            <div className="mb-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
                              <h5 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">Client Feedback:</h5>
                              <p className="text-sm text-blue-800 dark:text-blue-200">{proof.client_feedback}</p>
                            </div>
                          )}

                          {/* Proof Files */}
                          {Array.isArray(proof.files) && proof.files.length > 0 ? (
                            <div className="grid gap-3">
                              {proof.files.map((file: any, idx: number) => (
                                <div key={idx} className="border border-gray-200 dark:border-gray-600 rounded p-3">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium text-gray-900 dark:text-white">{file.name}</span>
                                    <Button
                                      onClick={() => window.open(file.url, '_blank')}
                                      variant="secondary"
                                      size="sm"
                                      className="flex items-center space-x-1"
                                    >
                                      <Eye className="w-4 h-4" />
                                      <span>View</span>
                                    </Button>
                                  </div>
                                  {file.type?.startsWith('image/') ? (
                                    <img src={file.url} alt={file.name} className="max-h-[300px] rounded mx-auto" />
                                  ) : file.type?.startsWith('video/') ? (
                                    <video src={file.url} controls className="max-h-[300px] rounded mx-auto" />
                                  ) : (
                                    <div className="text-sm text-gray-600 dark:text-gray-400">
                                      <a href={file.url} className="text-blue-600 hover:text-blue-800 underline">
                                        Download {file.name}
                                      </a>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-sm text-gray-600 dark:text-gray-400">No files attached to this proof.</div>
                          )}

                          {/* Proof Actions */}
                          {(proof.status === 'submitted' || proof.status === 'revision_requested') && (
                            <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-600">
                              <Button
                                onClick={async () => {
                                  try {
                                    await CustomAdsService.approveProof(proof.id);
                                    addNotification('success', 'Proof Approved', 'Proof has been approved successfully!');
                                    loadCustomAds(); // Refresh to get updated data
                                  } catch (error) {
                                    console.error('Error approving proof:', error);
                                    addNotification('error', 'Approval Failed', 'Failed to approve proof. Please try again.');
                                  }
                                }}
                                className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white"
                                size="sm"
                              >
                                <CheckCircle className="w-4 h-4" />
                                <span>Approve</span>
                              </Button>
                              <Button
                                onClick={() => {
                                  const feedback = prompt('Please provide feedback for the requested changes:');
                                  if (feedback && feedback.trim()) {
                                    CustomAdsService.rejectProof(proof.id, feedback.trim())
                                      .then(() => {
                                        addNotification('success', 'Feedback Sent', 'Your feedback has been sent to the designer.');
                                        loadCustomAds(); // Refresh to get updated data
                                      })
                                      .catch((error) => {
                                        console.error('Error rejecting proof:', error);
                                        addNotification('error', 'Request Failed', 'Failed to send feedback. Please try again.');
                                      });
                                  }
                                }}
                                variant="secondary"
                                className="flex items-center space-x-2"
                                size="sm"
                              >
                                <XCircle className="w-4 h-4" />
                                <span>Request Changes</span>
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Buttons for Designer Assigned Orders */}
              {selectedAd.workflow_status === 'designer_assigned' && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                    <CheckCircle className="w-5 h-5 mr-2" />
                    Review & Actions
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-4">
                    Review the work and provide feedback to your designer.
                  </p>
                  
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button
                      onClick={() => setShowApprovalModal(true)}
                      className="flex items-center justify-center space-x-2 bg-green-600 hover:bg-green-700 text-white"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>Approve Order</span>
                    </Button>
                    
                    <Button
                      onClick={() => setShowChangeRequestModal(true)}
                      variant="secondary"
                      className="flex items-center justify-center space-x-2"
                    >
                      <AlertCircle className="w-4 h-4" />
                      <span>Request Changes</span>
                    </Button>
                  </div>
                </div>
              )}

              {/* Create Campaign Button for Approved Orders */}
              {selectedAd.workflow_status === 'approved' && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                    <Play className="w-5 h-5 mr-2" />
                    Ready to Launch Campaign
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-4">
                    Your custom ad has been approved! You can now create a campaign to start running your ad.
                  </p>
                  
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button
                      onClick={handleCreateCampaign}
                      className="flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <Play className="w-4 h-4" />
                      <span>Create Campaign</span>
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <MessageSquare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Select a Custom Ad
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                Choose a custom ad from the list to view details and communicate with your designer.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Approval Modal */}
      {showApprovalModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Approve Order
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Are you satisfied with the work? You can optionally provide feedback.
            </p>
            
            <textarea
              value={approvalFeedback}
              onChange={(e) => setApprovalFeedback(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white mb-4"
              placeholder="Optional feedback for the designer..."
            />
            
            <div className="flex justify-end space-x-3">
              <Button
                onClick={() => {
                  setShowApprovalModal(false);
                  setApprovalFeedback('');
                }}
                variant="secondary"
                disabled={isProcessing}
              >
                Cancel
              </Button>
              <Button
                onClick={handleApproveOrder}
                disabled={isProcessing}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {isProcessing ? 'Approving...' : 'Approve Order'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Change Request Modal */}
      {showChangeRequestModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Request Changes
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              What changes would you like the designer to make?
            </p>
            
            <textarea
              value={changeRequest}
              onChange={(e) => setChangeRequest(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white mb-4"
              placeholder="Describe the changes you'd like to see..."
              required
            />

            {/* File Upload Component */}
            <div className="mb-4">
              <ModalFileUpload
                files={attachedFiles}
                onFilesChange={setAttachedFiles}
                maxFiles={5}
                maxFileSize={100}
                className="mb-4"
              />
            </div>
            
            <div className="flex justify-end space-x-3">
              <Button
                onClick={() => {
                  setShowChangeRequestModal(false);
                  setChangeRequest('');
                  setAttachedFiles([]);
                }}
                variant="secondary"
                disabled={isProcessing}
              >
                Cancel
              </Button>
              <Button
                onClick={handleRequestChanges}
                disabled={!changeRequest.trim() || isProcessing}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isProcessing ? 'Sending...' : 'Send Request'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
