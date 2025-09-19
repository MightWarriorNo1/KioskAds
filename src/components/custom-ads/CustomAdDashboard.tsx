import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { CustomAdsService, CustomAdOrder, WorkflowStep } from '../../services/customAdsService';
import { useNotification } from '../../contexts/NotificationContext';
import ProgressSteps from '../shared/ProgressSteps';
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
  MessageSquare,
  Calendar,
  User,
  DollarSign
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Custom Ad Orders
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage your custom ad creation requests
          </p>
        </div>
        <Button
          onClick={() => window.location.href = '/custom-ads'}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          New Order
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
            <Card key={order.id} className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {order.service?.name || order.service_key}
                    </h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.workflow_status)}`}>
                      {order.workflow_status.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-6 text-sm text-gray-600 dark:text-gray-400 mb-4">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>Ordered {formatDate(order.created_at)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <DollarSign className="w-4 h-4" />
                      <span>${order.total_amount}</span>
                    </div>
                    {order.assigned_designer_id && (
                      <div className="flex items-center gap-1">
                        <User className="w-4 h-4" />
                        <span>{order.designer?.full_name || 'Designer Assigned'}</span>
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

                <div className="flex items-center gap-2 ml-4">
                  {getStatusIcon(order.workflow_status)}
                  <Button
                    onClick={() => handleViewOrder(order)}
                    variant="secondary"
                    size="sm"
                    className="flex items-center gap-1"
                  >
                    <Eye className="w-4 h-4" />
                    View
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
  const [proofs, setProofs] = useState<any[]>([]);
  const [loadingProofs, setLoadingProofs] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'proofs' | 'workflow'>('details');

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

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Order Details - {order.service?.name || order.service_key}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Order ID: {order.id}
            </p>
          </div>
          <Button onClick={onClose} variant="ghost" size="sm">
            <XCircle className="w-5 h-5" />
          </Button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex space-x-8 px-6">
            {['details', 'proofs', 'workflow'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
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
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {activeTab === 'details' && (
            <OrderDetailsTab order={order} />
          )}
          
          {activeTab === 'proofs' && (
            <ProofsTab 
              order={order} 
              proofs={proofs} 
              loading={loadingProofs}
              userRole={userRole}
            />
          )}
          
          {activeTab === 'workflow' && (
            <WorkflowTab order={order} workflowSteps={workflowSteps} />
          )}
        </div>
      </div>
    </div>
  );
}

function OrderDetailsTab({ order }: { order: CustomAdOrder }) {
  return (
    <div className="space-y-6">
      {/* Order Information */}
      <div className="grid md:grid-cols-2 gap-6">
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
                {order.first_name} {order.last_name}
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
        </div>
      )}
    </div>
  );
}

function ProofsTab({ order, proofs, loading, userRole }: { 
  order: CustomAdOrder; 
  proofs: any[]; 
  loading: boolean;
  userRole: 'client' | 'host' | 'admin';
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

          {/* Client Actions */}
          {userRole === 'client' && proof.status === 'submitted' && (
            <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button
                onClick={() => {/* Handle approve */}}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="w-4 h-4" />
                Approve
              </Button>
              <Button
                onClick={() => {/* Handle reject */}}
                variant="secondary"
                className="flex items-center gap-2"
              >
                <XCircle className="w-4 h-4" />
                Request Revision
              </Button>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}

function WorkflowTab({ order, workflowSteps }: { order: CustomAdOrder; workflowSteps: WorkflowStep[] }) {
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

