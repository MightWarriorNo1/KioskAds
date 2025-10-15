import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { CustomAdsService, CustomAdOrder, WorkflowStep } from '../../services/customAdsService';
import { useNotification } from '../../contexts/NotificationContext';
import { BillingService } from '../../services/billingService';
import { MediaService } from '../../services/mediaService';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, useElements, useStripe, PaymentElement } from '@stripe/react-stripe-js';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { 
  Plus, 
  Eye, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  FileText,
  Image,
  Video,
  Download,
  Calendar,
  User,
  DollarSign,
  MessageSquare,
  Send
} from 'lucide-react';

interface CustomAdDashboardProps {
  userRole: 'client' | 'host' | 'admin';
}

export default function CustomAdDashboard({ userRole }: CustomAdDashboardProps) {
  const { user } = useAuth();
  const { addNotification } = useNotification();
  const [orders, setOrders] = useState<CustomAdOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<CustomAdOrder | null>(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);

  useEffect(() => {
    if (user) {
      loadOrders();
    }
  }, [user]);

  const loadOrders = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const userOrders = await CustomAdsService.getUserOrders(user.id);
      setOrders(userOrders);
    } catch (error) {
      console.error('Error loading orders:', error);
      addNotification('error', 'Error', 'Failed to load custom ad orders');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: CustomAdOrder['workflow_status']) => {
    switch (status) {
      case 'submitted':
      case 'in_review':
        return <Clock className="w-5 h-5 text-blue-500" />;
      case 'designer_assigned':
        return <User className="w-5 h-5 text-purple-500" />;
      case 'proofs_ready':
      case 'client_review':
        return <Eye className="w-5 h-5 text-orange-500" />;
      case 'approved':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'rejected':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'cancelled':
        return <XCircle className="w-5 h-5 text-gray-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: CustomAdOrder['workflow_status']) => {
    switch (status) {
      case 'submitted':
      case 'in_review':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'designer_assigned':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'proofs_ready':
      case 'client_review':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'approved':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleViewOrder = async (order: CustomAdOrder) => {
    setSelectedOrder(order);
    setShowOrderDetails(true);
  };

  const handleCloseOrderDetails = () => {
    setSelectedOrder(null);
    setShowOrderDetails(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600 dark:text-gray-400">Loading orders...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">
            Custom Ad Orders
          </h1>
          <p className="text-sm lg:text-base text-gray-600 dark:text-gray-400">
            Manage your custom ad creation requests
          </p>
        </div>
        <Button
          onClick={() => window.location.href = '/custom-ads'}
          className="flex items-center gap-2 w-full sm:w-auto"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">New Order</span>
          <span className="sm:hidden">New</span>
        </Button>
      </div>

      {/* Orders List */}
      {orders.length === 0 ? (
        <Card className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No Custom Ad Orders
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            You haven't placed any custom ad orders yet. Create your first order to get started.
          </p>
          <Button
            onClick={() => window.location.href = '/custom-ads'}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Create New Order
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4">
          {orders.map((order) => (
            <Card key={order.id} className="p-4 lg:p-6 hover:shadow-lg transition-shadow">
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
                    <h3 className="text-base lg:text-lg font-semibold text-gray-900 dark:text-white truncate">
                      {order.service?.name || order.service_key}
                    </h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${getStatusColor(order.workflow_status)}`}>
                      {order.workflow_status.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-4 lg:gap-6 text-xs lg:text-sm text-gray-600 dark:text-gray-400 mb-4">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 lg:w-4 lg:h-4 flex-shrink-0" />
                      <span className="truncate">Ordered {formatDate(order.created_at)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <DollarSign className="w-3 h-3 lg:w-4 lg:h-4 flex-shrink-0" />
                      <span>${order.total_amount}</span>
                    </div>
                    {order.assigned_designer_id && (
                      <div className="flex items-center gap-1">
                        <User className="w-3 h-3 lg:w-4 lg:h-4 flex-shrink-0" />
                        <span className="truncate">{order.designer?.full_name || 'Designer Assigned'}</span>
                      </div>
                    )}
                  </div>

                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-2">
                    {order.details}
                  </p>

                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      {order.files.length > 0 && (
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          {order.files.some(f => f.type.startsWith('video/')) ? (
                            <Video className="w-3 h-3" />
                          ) : (
                            <Image className="w-3 h-3" />
                          )}
                          <span>{order.files.length} file{order.files.length !== 1 ? 's' : ''}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 lg:ml-4">
                  {getStatusIcon(order.workflow_status)}
                  <Button
                    onClick={() => handleViewOrder(order)}
                    variant="secondary"
                    size="sm"
                    className="flex items-center gap-1 w-full sm:w-auto"
                  >
                    <Eye className="w-4 h-4" />
                    <span className="hidden sm:inline">View</span>
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Order Details Modal */}
      {showOrderDetails && selectedOrder && (
        <OrderDetailsModal
          order={selectedOrder}
          onClose={handleCloseOrderDetails}
          userRole={userRole}
        />
      )}
    </div>
  );
}

interface OrderDetailsModalProps {
  order: CustomAdOrder;
  onClose: () => void;
  userRole: 'client' | 'host' | 'admin';
}

function OrderDetailsModal({ order, onClose, userRole }: OrderDetailsModalProps) {
  const { user } = useAuth();
  const { addNotification } = useNotification();
  const navigate = useNavigate();
  const [proofs, setProofs] = useState<any[]>([]);
  const [loadingProofs, setLoadingProofs] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'proofs' | 'workflow' | 'comments'>('details');
  const [showPayment, setShowPayment] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentMessage, setPaymentMessage] = useState<string | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  useEffect(() => {
    loadProofs();
  }, [order.id]);

  const loadProofs = async () => {
    try {
      setLoadingProofs(true);
      const orderProofs = await CustomAdsService.getOrderProofs(order.id);
      setProofs(orderProofs);
    } catch (error) {
      console.error('Error loading proofs:', error);
    } finally {
      setLoadingProofs(false);
    }
  };

  const workflowSteps = CustomAdsService.getWorkflowSteps(order);

  const handleApproveProof = async (proofId: string) => {
    try {
      await CustomAdsService.approveProof(proofId);
      addNotification('success', 'Approved', 'Proof approved successfully');
      await loadProofs();
    } catch (e) {
      console.error(e);
      addNotification('error', 'Failed', 'Could not approve proof');
    }
  };

  const handleRequestEdits = async (proofId: string) => {
    const feedback = window.prompt('Enter requested edits/comments for the designer:');
    if (!feedback) return;
    try {
      await CustomAdsService.rejectProof(proofId, feedback);
      addNotification('success', 'Requested', 'Revision requested');
      await loadProofs();
    } catch (e) {
      console.error(e);
      addNotification('error', 'Failed', 'Could not request revisions');
    }
  };

  const handleCreateCampaignFromProof = async (proof: any) => {
    try {
      if (!user) return;
      const file = (proof.files || []).find((f: any) => f.type.startsWith('image/') || f.type.startsWith('video/')) || proof.files?.[0];
      if (!file) {
        addNotification('error', 'No Media', 'No media file found in this proof');
        return;
      }
      const asset = await MediaService.createMediaFromApprovedCustomAd({
        userId: user.id,
        sourceId: order.id,
        fileName: file.name,
        publicUrl: file.url,
        fileSize: file.size,
        mimeType: file.type,
        fileType: file.type.startsWith('image/') ? 'image' : 'video'
      });
      localStorage.setItem('preselectedMediaAssetId', asset.id);
      addNotification('success', 'Media Ready', 'Approved ad prepared. Continue to create your campaign.');
      navigate(userRole === 'host' ? '/host/new-campaign' : '/client/new-campaign');
    } catch (e) {
      console.error(e);
      addNotification('error', 'Failed', 'Could not prepare media from approved proof');
    }
  };

  const handlePayNow = async () => {
    if (!user || isProcessingPayment) return;
    
    setIsProcessingPayment(true);
    setPaymentMessage(null);
    
    try {
      const intent = await BillingService.createPaymentIntent({
        amount: Math.round(order.total_amount * 100),
        currency: 'usd',
        metadata: {
          orderId: order.id,
          serviceKey: order.service_key,
          email: order.email,
        },
      });

      if (!intent?.clientSecret) {
        setPaymentMessage('Unable to start payment. Please try again.');
        setIsProcessingPayment(false);
        return;
      }

      setClientSecret(intent.clientSecret);
      setShowPayment(true);
    } catch (error) {
      console.error('Error creating payment intent:', error);
      setPaymentMessage('Error creating payment intent. Please try again.');
      setIsProcessingPayment(false);
    }
  };

  const handlePaymentSuccess = async () => {
    try {
      // Update order payment status
      await CustomAdsService.updateOrderPaymentStatus(order.id, 'succeeded');
      addNotification('success', 'Payment Successful', 'Your payment has been processed successfully.');
      setShowPayment(false);
      setClientSecret(null);
      setIsProcessingPayment(false);
      // Refresh the order data or close modal
      onClose();
    } catch (error) {
      console.error('Error updating payment status:', error);
      addNotification('error', 'Payment Error', 'Payment succeeded but failed to update order status.');
      setIsProcessingPayment(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 lg:p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg lg:text-xl font-bold text-gray-900 dark:text-white truncate">
              Order Details - {order.service?.name || order.service_key}
            </h2>
            <p className="text-xs lg:text-sm text-gray-600 dark:text-gray-400 truncate">
              Order ID: {order.id}
            </p>
          </div>
          <Button onClick={onClose} variant="ghost" size="sm" className="flex-shrink-0">
            <XCircle className="w-5 h-5" />
          </Button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex overflow-x-auto space-x-4 lg:space-x-8 px-4 lg:px-6">
            {['details', 'proofs', 'workflow', 'comments'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`py-4 px-1 border-b-2 font-medium text-xs lg:text-sm whitespace-nowrap ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="p-4 lg:p-6 overflow-y-auto max-h-[60vh]">
          {activeTab === 'details' && (
            <OrderDetailsTab 
              order={order} 
              onPayNow={handlePayNow}
              showPayment={showPayment}
              clientSecret={clientSecret}
              paymentMessage={paymentMessage}
              onPaymentSuccess={handlePaymentSuccess}
              isProcessingPayment={isProcessingPayment}
            />
          )}
          
          {activeTab === 'proofs' && (
            <ProofsTab 
              order={order} 
              proofs={proofs} 
              loading={loadingProofs}
              userRole={userRole}
              onApprove={handleApproveProof}
              onRequestEdit={handleRequestEdits}
              onCreateCampaign={handleCreateCampaignFromProof}
            />
          )}
          
          {activeTab === 'workflow' && (
            <WorkflowTab order={order} workflowSteps={workflowSteps} />
          )}
          
          {activeTab === 'comments' && (
            <CommentsTab order={order} onClose={onClose} />
          )}
        </div>
      </div>
    </div>
  );
}

function OrderDetailsTab({ 
  order, 
  onPayNow, 
  showPayment, 
  clientSecret, 
  paymentMessage, 
  onPaymentSuccess,
  isProcessingPayment
}: { 
  order: CustomAdOrder;
  onPayNow: () => void;
  showPayment: boolean;
  clientSecret: string | null;
  paymentMessage: string | null;
  onPaymentSuccess: () => void;
  isProcessingPayment: boolean;
}) {
  return (
    <div className="space-y-6">
      {/* Order Information */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Order Information
          </h3>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Service</label>
              <p className="text-gray-900 dark:text-white">{order.service?.name || order.service_key}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Amount</label>
              <p className="text-gray-900 dark:text-white">${order.total_amount}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Payment Status</label>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  order.payment_status === 'succeeded' 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    : order.payment_status === 'failed'
                    ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                    : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                }`}>
                  {order.payment_status.toUpperCase()}
                </span>
                {order.payment_status === 'pending' && (
                  <Button
                    onClick={onPayNow}
                    className="ml-2"
                    size="sm"
                    disabled={isProcessingPayment}
                  >
                    {isProcessingPayment ? 'Processing...' : 'Pay Now'}
                  </Button>
                )}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Status</label>
              <p className="text-gray-900 dark:text-white capitalize">
                {order.workflow_status.replace('_', ' ')}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Order Date</label>
              <p className="text-gray-900 dark:text-white">
                {new Date(order.created_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Contact Information
          </h3>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Name</label>
              <p className="text-gray-900 dark:text-white">
                {order.user?.full_name || `${order.first_name} ${order.last_name}`}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Email</label>
              <p className="text-gray-900 dark:text-white">{order.email}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Phone</label>
              <p className="text-gray-900 dark:text-white">{order.phone}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Address</label>
              <p className="text-gray-900 dark:text-white">{order.address}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Project Details */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Project Details
        </h3>
        <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
          {order.details}
        </p>
      </div>

      {/* Uploaded Files */}
      {order.files.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Uploaded Files
          </h3>
          <div className="grid gap-3">
            {order.files.map((file, index) => (
              <div key={index} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg gap-3">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {file.type.startsWith('video/') ? (
                    <Video className="w-4 h-4 lg:w-5 lg:h-5 text-blue-500 flex-shrink-0" />
                  ) : (
                    <Image className="w-4 h-4 lg:w-5 lg:h-5 text-green-500 flex-shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {file.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => window.open(file.url, '_blank')}
                  variant="ghost"
                  size="sm"
                  className="flex items-center gap-1 w-full sm:w-auto"
                >
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">View</span>
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Payment Form */}
      {showPayment && clientSecret && (
        <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Complete Payment
          </h3>
          {paymentMessage && (
            <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg">
              {paymentMessage}
            </div>
          )}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <Elements stripe={loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string)} options={{ clientSecret }}>
              <PaymentForm onSuccess={onPaymentSuccess} />
            </Elements>
          </div>
        </div>
      )}
    </div>
  );
}

function ProofsTab({ proofs, loading, userRole, onApprove, onRequestEdit, onCreateCampaign }: { 
  order: CustomAdOrder; 
  proofs: any[]; 
  loading: boolean;
  userRole: 'client' | 'host' | 'admin';
  onApprove: (proofId: string) => void;
  onRequestEdit: (proofId: string) => void;
  onCreateCampaign: (proof: any) => void;
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600 dark:text-gray-400">Loading proofs...</span>
      </div>
    );
  }

  if (proofs.length === 0) {
    return (
      <div className="text-center py-8">
        <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          No Design Proofs Yet
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Design proofs will appear here once your designer starts working on your order.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {proofs.map((proof) => (
        <Card key={proof.id} className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {proof.title} - Version {proof.version_number}
              </h3>
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
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              {proof.description}
            </p>
          )}

          {/* Proof Files */}
          {proof.files.length > 0 && (
            <div className="grid gap-3 mb-4">
              {proof.files.map((file: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center gap-3">
                    {file.type.startsWith('video/') ? (
                      <Video className="w-5 h-5 text-blue-500" />
                    ) : (
                      <Image className="w-5 h-5 text-green-500" />
                    )}
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {file.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={() => window.open(file.url, '_blank')}
                    variant="ghost"
                    size="sm"
                    className="flex items-center gap-1"
                  >
                    <Download className="w-4 h-4" />
                    View
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Client/Host Actions */}
          {(userRole === 'client' || userRole === 'host') && (
            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              {proof.status === 'submitted' && (
                <>
                  <Button
                    onClick={() => onApprove(proof.id)}
                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700 w-full sm:w-auto"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Approve
                  </Button>
                  <Button
                    onClick={() => onRequestEdit(proof.id)}
                    variant="secondary"
                    className="flex items-center gap-2 w-full sm:w-auto"
                  >
                    <XCircle className="w-4 h-4" />
                    Request Edits
                  </Button>
                </>
              )}
              {proof.status === 'approved' && (
                <Button
                  onClick={() => onCreateCampaign(proof)}
                  className="flex items-center gap-2 w-full sm:w-auto"
                >
                  <CheckCircle className="w-4 h-4" />
                  Create Campaign
                </Button>
              )}
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}

function WorkflowTab({ workflowSteps }: { order: CustomAdOrder; workflowSteps: WorkflowStep[] }) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Order Progress
      </h3>
      
      <div className="space-y-4">
        {workflowSteps.map((step, index) => (
          <div key={step.id} className="flex items-start gap-4">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
              step.status === 'completed' 
                ? 'bg-green-600 text-white' 
                : step.status === 'current'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
            }`}>
              {step.status === 'completed' ? '✓' : index + 1}
            </div>
            <div className="flex-1">
              <h4 className={`font-medium ${
                step.status === 'current' 
                  ? 'text-blue-600 dark:text-blue-400' 
                  : step.status === 'completed'
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-gray-500 dark:text-gray-400'
              }`}>
                {step.name}
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {step.description}
              </p>
              {step.completed_at && (
                <p className="text-xs text-gray-500 mt-1">
                  Completed on {new Date(step.completed_at).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PaymentForm({ onSuccess }: { onSuccess: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setMessage(null);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.origin + '/custom-ads-dashboard',
      },
    });

    if (error) {
      setMessage(error.message || 'An unexpected error occurred.');
    } else {
      onSuccess();
    }

    setIsProcessing(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      <Button
        type="submit"
        disabled={!stripe || isProcessing}
        className="w-full"
      >
        {isProcessing ? 'Processing...' : 'Pay Now'}
      </Button>
      {message && (
        <div className="text-red-600 dark:text-red-400 text-sm">
          {message}
        </div>
      )}
    </form>
  );
}

function CommentsTab({ order, onClose }: { order: CustomAdOrder; onClose: () => void }) {
  const { user } = useAuth();
  const { addNotification } = useNotification();
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [comments, setComments] = useState(order.comments || []);

  const handleSubmitComment = async () => {
    if (!newComment.trim() || !user?.id) return;
    
    try {
      setSubmittingComment(true);
      await CustomAdsService.addComment(order.id, newComment.trim(), user.id);
      addNotification('success', 'Comment sent', 'Your message has been sent to the designer');
      setNewComment('');
      
      // Reload comments
      const updatedOrder = await CustomAdsService.getOrder(order.id);
      if (updatedOrder) {
        setComments(updatedOrder.comments || []);
      }
    } catch (e) {
      console.error(e);
      addNotification('error', 'Failed', 'Could not send comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <MessageSquare className="w-5 h-5" />
        <h3 className="text-lg font-semibold">Communication with Designer</h3>
      </div>
      
      {/* Comments List */}
      <div className="space-y-3 max-h-60 overflow-y-auto">
        {comments.length === 0 ? (
          <p className="text-sm text-gray-600">No messages yet. Start a conversation with the designer.</p>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">{comment.author}</span>
                <span className="text-xs text-gray-500">{new Date(comment.created_at).toLocaleString()}</span>
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300">{comment.content}</p>
            </div>
          ))
        )}
      </div>

      {/* Add Comment Form */}
      <div className="border-t pt-4">
        <div className="flex flex-col sm:flex-row gap-2">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Ask questions, provide feedback, or request changes..."
            className="flex-1 p-3 border rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={3}
            disabled={submittingComment}
          />
          <Button
            onClick={handleSubmitComment}
            disabled={!newComment.trim() || submittingComment}
            className="px-4 py-2 flex items-center gap-2 w-full sm:w-auto"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">{submittingComment ? 'Sending...' : 'Send'}</span>
            <span className="sm:hidden">{submittingComment ? '...' : 'Send'}</span>
          </Button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Use this to communicate with the designer about your ad requirements, feedback, or questions.
        </p>
      </div>
    </div>
  );
}

