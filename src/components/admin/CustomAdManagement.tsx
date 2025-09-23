import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  Filter, 
  Download, 
  Upload, 
  MessageSquare, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Eye, 
  Edit, 
  Trash2,
  Mail,
  FileText,
  Image,
  Video,
  Plus,
  Send,
  AlertCircle,
  Calendar,
  User,
  Phone,
  MapPin,
  DollarSign,
  RefreshCw
} from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { useNotification } from '../../contexts/NotificationContext';
import { AdminService } from '../../services/adminService';
import { CustomAdsService } from '../../services/customAdsService';
import { supabase } from '../../lib/supabaseClient';

interface CustomAdOrder {
  id: string;
  user_id: string;
  service_key: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address: string;
  details: string;
  files: Array<{ name: string; url: string; size: number; type: string }>;
  total_amount: number;
  payment_status: 'pending' | 'succeeded' | 'failed';
  workflow_status?: 'submitted' | 'in_review' | 'designer_assigned' | 'proofs_ready' | 'client_review' | 'approved' | 'rejected' | 'completed' | 'cancelled';
  assigned_designer_id?: string | null;
  created_at: string;
  updated_at: string;
  user: {
    id: string;
    full_name: string;
    email: string;
    company_name?: string;
  };
  comments: Array<{
    id: string;
    content: string;
    author: string;
    created_at: string;
  }>;
  proofs: Array<{
    id: string;
    file_name: string;
    file_url: string;
    file_type: string;
    created_at: string;
  }>;
}

interface Comment {
  id: string;
  content: string;
  author: string;
  created_at: string;
}

interface Proof {
  id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  created_at: string;
}

export default function CustomAdManagement() {
  const [orders, setOrders] = useState<CustomAdOrder[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<CustomAdOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<CustomAdOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [showProofModal, setShowProofModal] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [proofFiles, setProofFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [designers, setDesigners] = useState<Array<{ id: string; full_name: string; email: string }>>([]);
  const [assigning, setAssigning] = useState(false);
  const [selectedDesignerId, setSelectedDesignerId] = useState<string>('');
  const { addNotification } = useNotification();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadCustomAdOrders();
    loadDesigners();
  }, []);

  useEffect(() => {
    filterOrders();
  }, [orders, searchTerm, statusFilter]);

  const loadCustomAdOrders = async () => {
    try {
      setLoading(true);
      const data = await AdminService.getCustomAdOrders();
      setOrders(data);
    } catch (error) {
      console.error('Error loading custom ad orders:', error);
      addNotification('error', 'Error', 'Failed to load custom ad orders');
    } finally {
      setLoading(false);
    }
  };

  const loadDesigners = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, role')
        .eq('role', 'designer')
        .order('full_name', { ascending: true });
      if (error) throw error;
      setDesigners((data as any[])?.map(d => ({ id: d.id, full_name: d.full_name, email: d.email })) || []);
    } catch (e) {
      console.error('Error loading designers:', e);
    }
  };

  const filterOrders = () => {
    let filtered = orders;

    if (searchTerm) {
      filtered = filtered.filter(order => 
        order.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.user?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.user?.company_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => (order.workflow_status || 'submitted') === statusFilter);
    }

    setFilteredOrders(filtered);
  };

  const handleStatusUpdate = async (orderId: string, newStatus: CustomAdOrder['workflow_status']) => {
    try {
      await CustomAdsService.updateOrderStatus(orderId, (newStatus as any) || 'in_review');
      await loadCustomAdOrders();
      addNotification('success', 'Success', 'Order status updated successfully');
    } catch (error) {
      console.error('Error updating order status:', error);
      addNotification('error', 'Error', 'Failed to update order status');
    }
  };

  const handleAddComment = async () => {
    if (!selectedOrder || !newComment.trim()) return;

    try {
      await AdminService.addCustomAdOrderComment(selectedOrder.id, newComment);
      setNewComment('');
      await loadCustomAdOrders();
      addNotification('success', 'Success', 'Comment added successfully');
    } catch (error) {
      console.error('Error adding comment:', error);
      addNotification('error', 'Error', 'Failed to add comment');
    }
  };

  const handleSubmitProof = async () => {
    if (!selectedOrder || proofFiles.length === 0) return;

    try {
      setIsUploading(true);
      await AdminService.submitCustomAdOrderProof(selectedOrder.id, proofFiles);
      setProofFiles([]);
      setShowProofModal(false);
      await loadCustomAdOrders();
      addNotification('success', 'Success', 'Proof submitted successfully');
    } catch (error) {
      console.error('Error submitting proof:', error);
      addNotification('error', 'Error', 'Failed to submit proof');
    } finally {
      setIsUploading(false);
    }
  };

  const handleAssignDesigner = async () => {
    if (!selectedOrder || !selectedDesignerId) return;
    try {
      setAssigning(true);
      await CustomAdsService.assignDesigner(selectedOrder.id, selectedDesignerId);
      addNotification('success', 'Assigned', 'Designer assigned to order');
      await loadCustomAdOrders();
    } catch (e) {
      console.error('Error assigning designer:', e);
      addNotification('error', 'Error', 'Failed to assign designer');
    } finally {
      setAssigning(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setProofFiles(prev => [...prev, ...files]);
  };

  const removeProofFile = (index: number) => {
    setProofFiles(prev => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusColor = (status?: CustomAdOrder['workflow_status']) => {
    switch (status) {
      case 'submitted': return 'text-yellow-700 bg-yellow-100';
      case 'in_review': return 'text-blue-700 bg-blue-100';
      case 'designer_assigned': return 'text-purple-700 bg-purple-100';
      case 'proofs_ready': return 'text-indigo-700 bg-indigo-100';
      case 'client_review': return 'text-amber-700 bg-amber-100';
      case 'approved': return 'text-green-700 bg-green-100';
      case 'rejected': return 'text-red-700 bg-red-100';
      case 'completed': return 'text-emerald-700 bg-emerald-100';
      case 'cancelled': return 'text-gray-700 bg-gray-200';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'succeeded': return 'text-green-600 bg-green-100';
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      case 'failed': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Custom Ad Management</h1>
          <p className="text-gray-600 dark:text-gray-300">Manage custom ad orders, uploads, and communications</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={() => loadCustomAdOrders()}
            variant="secondary"
            size="sm"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              placeholder="Search orders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              icon={Search}
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input"
            >
              <option value="all">All Statuses</option>
              <option value="submitted">Submitted</option>
              <option value="in_review">In Review</option>
              <option value="designer_assigned">Designer Assigned</option>
              <option value="proofs_ready">Proofs Ready</option>
              <option value="client_review">Client Review</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <Button
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
              }}
              variant="secondary"
              className="w-full"
            >
              Clear Filters
            </Button>
          </div>
        </div>
      </Card>

      {/* Orders List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Orders Table */}
        <Card>
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">Custom Ad Orders ({filteredOrders.length})</h2>
            <div className="space-y-4">
              {filteredOrders.map((order) => (
                <div
                  key={order.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedOrder?.id === order.id 
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                  onClick={() => setSelectedOrder(order)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{order.first_name} {order.last_name}</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.workflow_status)}`}>
                        {(order.workflow_status || 'submitted').replace('_',' ')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPaymentStatusColor(order.payment_status)}`}>
                        {order.payment_status}
                      </span>
                      <span className="text-sm text-gray-500">
                        ${order.total_amount}
                      </span>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">
                    <p>{order.user?.company_name || order.user?.full_name}</p>
                    <p className="text-xs">{new Date(order.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <MessageSquare className="w-3 h-3" />
                      {order.comments?.length || 0} comments
                    </span>
                    <span className="flex items-center gap-1">
                      <FileText className="w-3 h-3" />
                      {order.proofs?.length || 0} proofs
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Order Details */}
        {selectedOrder && (
          <Card>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Order Details</h2>
                <div className="flex items-center gap-2 flex-wrap">
                  <select
                    value={selectedOrder.workflow_status || 'submitted'}
                    onChange={(e) => handleStatusUpdate(selectedOrder.id, e.target.value as any)}
                    className="input text-sm"
                  >
                    <option value="submitted">Submitted</option>
                    <option value="in_review">In Review</option>
                    <option value="designer_assigned">Designer Assigned</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>

                  {/* Assign Designer */}
                  {designers.length > 0 && (
                    <>
                      <select
                        value={selectedDesignerId}
                        onChange={(e) => setSelectedDesignerId(e.target.value)}
                        className="input text-sm"
                      >
                        <option value="">Assign Designer…</option>
                        {designers.map(d => (
                          <option key={d.id} value={d.id}>{d.full_name} ({d.email})</option>
                        ))}
                      </select>
                      <Button size="sm" onClick={handleAssignDesigner} disabled={!selectedDesignerId || assigning}>
                        {assigning ? 'Assigning…' : 'Assign'}
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* Contact Information */}
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium mb-2">Contact Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-400" />
                      <span>{selectedOrder.first_name} {selectedOrder.last_name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-gray-400" />
                      <span>{selectedOrder.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <span>{selectedOrder.phone}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      <span>{selectedOrder.address}</span>
                    </div>
                  </div>
                </div>

                {/* Order Details */}
                <div>
                  <h3 className="font-medium mb-2">Order Details</h3>
                  <div className="text-sm space-y-1">
                    <p><span className="font-medium">Service:</span> {selectedOrder.service_key}</p>
                    <p><span className="font-medium">Amount:</span> ${selectedOrder.total_amount}</p>
                    <p><span className="font-medium">Payment Status:</span> 
                      <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${getPaymentStatusColor(selectedOrder.payment_status)}`}>
                        {selectedOrder.payment_status}
                      </span>
                    </p>
                    <p><span className="font-medium">Created:</span> {new Date(selectedOrder.created_at).toLocaleString()}</p>
                  </div>
                </div>

                {/* Project Details */}
                <div>
                  <h3 className="font-medium mb-2">Project Details</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 p-3 rounded">
                    {selectedOrder.details}
                  </p>
                </div>

                {/* Files */}
                {selectedOrder.files && selectedOrder.files.length > 0 && (
                  <div>
                    <h3 className="font-medium mb-2">Uploaded Files</h3>
                    <div className="space-y-2">
                      {selectedOrder.files.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
                          <div className="flex items-center gap-2">
                            {file.type.startsWith('video/') ? (
                              <Video className="w-4 h-4 text-blue-500" />
                            ) : (
                              <Image className="w-4 h-4 text-green-500" />
                            )}
                            <span className="text-sm">{file.name}</span>
                            <span className="text-xs text-gray-500">({formatFileSize(file.size)})</span>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => window.open(file.url, '_blank')}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Comments */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium">Comments ({selectedOrder.comments?.length || 0})</h3>
                    <Button
                      size="sm"
                      onClick={() => setShowCommentModal(true)}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add Comment
                    </Button>
                  </div>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {selectedOrder.comments?.map((comment) => (
                      <div key={comment.id} className="p-2 bg-gray-50 dark:bg-gray-800 rounded text-sm">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium">{comment.author}</span>
                          <span className="text-xs text-gray-500">{new Date(comment.created_at).toLocaleString()}</span>
                        </div>
                        <p>{comment.content}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Proofs */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium">Proofs ({selectedOrder.proofs?.length || 0})</h3>
                    <Button
                      size="sm"
                      onClick={() => setShowProofModal(true)}
                    >
                      <Upload className="w-4 h-4 mr-1" />
                      Submit Proof
                    </Button>
                  </div>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {selectedOrder.proofs?.map((proof) => (
                      <div key={proof.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded text-sm">
                        <div className="flex items-center gap-2">
                          {proof.file_type.startsWith('video/') ? (
                            <Video className="w-4 h-4 text-blue-500" />
                          ) : (
                            <Image className="w-4 h-4 text-green-500" />
                          )}
                          <span>{proof.file_name}</span>
                          <span className="text-xs text-gray-500">{new Date(proof.created_at).toLocaleString()}</span>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => window.open(proof.file_url, '_blank')}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Comment Modal */}
      {showCommentModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full">
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">Add Comment</h3>
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="input min-h-[100px] resize-none mb-4"
                placeholder="Enter your comment..."
              />
              <div className="flex gap-3">
                <Button
                  onClick={() => {
                    setShowCommentModal(false);
                    setNewComment('');
                  }}
                  variant="secondary"
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAddComment}
                  disabled={!newComment.trim()}
                  className="flex-1"
                >
                  Add Comment
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Proof Modal */}
      {showProofModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full">
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">Submit Proof</h3>
              <div className="space-y-4">
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 text-center">
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*,video/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                    Click to upload or drag and drop
                  </p>
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    variant="secondary"
                    size="sm"
                  >
                    Choose Files
                  </Button>
                </div>

                {proofFiles.length > 0 && (
                  <div className="space-y-2">
                    {proofFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded text-sm">
                        <span>{file.name}</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeProofFile(index)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-3">
                  <Button
                    onClick={() => {
                      setShowProofModal(false);
                      setProofFiles([]);
                    }}
                    variant="secondary"
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSubmitProof}
                    disabled={proofFiles.length === 0 || isUploading}
                    className="flex-1"
                  >
                    {isUploading ? 'Uploading...' : 'Submit Proof'}
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

