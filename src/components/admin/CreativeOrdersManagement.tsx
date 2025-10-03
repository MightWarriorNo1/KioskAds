import { useState, useEffect } from 'react';
import { Package, Clock, CheckCircle, XCircle, RefreshCw, Eye, FileText } from 'lucide-react';
import { useNotification } from '../../contexts/NotificationContext';
import { AdminService } from '../../services/adminService';

// Unified interface for both creative orders and custom ad orders
interface UnifiedOrder {
  id: string;
  user_id: string;
  type: 'creative' | 'custom_ad';
  status: string;
  total_amount: number;
  created_at: string;
  updated_at: string;
  user: {
    id: string;
    full_name: string;
    email: string;
    company_name?: string;
  };
  // Creative order specific fields
  service_id?: string;
  service?: {
    id: string;
    name: string;
    category: string;
    price: number;
    delivery_time: number;
  };
  requirements?: any;
  final_delivery?: string;
  // Custom ad order specific fields
  service_key?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  address?: string;
  details?: string;
  files?: Array<{ name: string; url: string; size: number; type: string }>;
  payment_status?: 'pending' | 'succeeded' | 'failed';
  workflow_status?: string;
  assigned_designer_id?: string | null;
  comments?: Array<{
    id: string;
    content: string;
    author: string;
    created_at: string;
  }>;
  proofs?: Array<{
    id: string;
    file_name: string;
    file_url: string;
    file_type: string;
    created_at: string;
  }>;
}

export default function CreativeOrdersManagement() {
  const [orders, setOrders] = useState<UnifiedOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<UnifiedOrder | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all'); // all | creative | custom_ad
  const [durationFilter, setDurationFilter] = useState<string>('all'); // 30 | 90 | 180 | all
  const { addNotification } = useNotification();

  useEffect(() => {
    loadAllOrders();
  }, []);

  const loadAllOrders = async () => {
    try {
      setLoading(true);
      const [creativeOrders, customAdOrders] = await Promise.all([
        AdminService.getCreativeOrders(),
        AdminService.getCustomAdOrders()
      ]);

      // Transform creative orders to unified format
      const unifiedCreativeOrders: UnifiedOrder[] = creativeOrders.map(order => ({
        ...order,
        type: 'creative' as const,
        status: order.status
      }));

      // Transform custom ad orders to unified format
      const unifiedCustomAdOrders: UnifiedOrder[] = customAdOrders.map(order => ({
        ...order,
        type: 'custom_ad' as const,
        status: order.workflow_status || order.status || 'submitted'
      }));

      // Combine and sort by creation date
      const allOrders = [...unifiedCreativeOrders, ...unifiedCustomAdOrders]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setOrders(allOrders);
    } catch (error) {
      console.error('Error loading orders:', error);
      addNotification('error', 'Error', 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  // Read-only page: no status updates or editing actions

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
      case 'submitted': return 'bg-yellow-100 text-yellow-800';
      case 'in_progress':
      case 'in_review':
      case 'designer_assigned': return 'bg-blue-100 text-blue-800';
      case 'proofs_ready':
      case 'client_review': return 'bg-purple-100 text-purple-800';
      case 'completed':
      case 'approved': return 'bg-green-100 text-green-800';
      case 'cancelled':
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
      case 'submitted': return Clock;
      case 'in_progress':
      case 'in_review':
      case 'designer_assigned': return Package;
      case 'proofs_ready':
      case 'client_review': return Eye;
      case 'completed':
      case 'approved': return CheckCircle;
      case 'cancelled':
      case 'rejected': return XCircle;
      default: return Package;
    }
  };

  const getOrderTypeIcon = (type: string) => {
    switch (type) {
      case 'creative': return Package;
      case 'custom_ad': return FileText;
      default: return Package;
    }
  };

  const filteredOrders = orders.filter(order => {
    const statusMatch = statusFilter === 'all' || order.status === statusFilter;
    const typeMatch = typeFilter === 'all' || order.type === typeFilter;
    const categoryMatch = categoryFilter === 'all' || 
      (order.service?.category === categoryFilter) ||
      (order.type === 'custom_ad' && order.service_key === categoryFilter);
    const durationMatch = durationFilter === 'all' || 
      (order.service?.delivery_time === Number(durationFilter));
    return statusMatch && typeMatch && categoryMatch && durationMatch;
  });

  const statusCounts = {
    all: orders.length,
    pending: orders.filter(o => ['pending', 'submitted'].includes(o.status)).length,
    in_progress: orders.filter(o => ['in_progress', 'in_review', 'designer_assigned'].includes(o.status)).length,
    review: orders.filter(o => ['proofs_ready', 'client_review'].includes(o.status)).length,
    completed: orders.filter(o => ['completed', 'approved'].includes(o.status)).length,
    cancelled: orders.filter(o => ['cancelled', 'rejected'].includes(o.status)).length,
  } as const;

  const typeCounts = {
    all: orders.length,
    creative: orders.filter(o => o.type === 'creative').length,
    custom_ad: orders.filter(o => o.type === 'custom_ad').length,
  } as const;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Creative Orders Management</h1>
          <p className="text-gray-600 mt-2">Manage creative service orders and custom ad orders from clients and hosts</p>
        </div>
        <button
          onClick={loadAllOrders}
          disabled={loading}
          className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid md:grid-cols-6 gap-6">
        {/* Status Cards */}
        {Object.entries(statusCounts).map(([status, count]) => {
          const StatusIcon = status === 'all' ? Package : getStatusIcon(status);
          return (
            <div key={status} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 capitalize">
                    {status === 'all' ? 'Total Orders' : status.replace('_', ' ')}
                  </p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">{count}</p>
                </div>
                <div className={`p-3 rounded-lg ${
                  status === 'all' ? 'bg-purple-50' :
                  status === 'pending' ? 'bg-yellow-50' :
                  status === 'in_progress' ? 'bg-blue-50' :
                  status === 'review' ? 'bg-purple-50' :
                  status === 'completed' ? 'bg-green-50' :
                  'bg-red-50'
                }`}>
                  <StatusIcon className={`h-6 w-6 ${
                    status === 'all' ? 'text-purple-600' :
                    status === 'pending' ? 'text-yellow-600' :
                    status === 'in_progress' ? 'text-blue-600' :
                    status === 'review' ? 'text-purple-600' :
                    status === 'completed' ? 'text-green-600' :
                    'text-red-600'
                  }`} />
                </div>
              </div>
            </div>
          );
        })}
        
        {/* Type Cards */}
        {Object.entries(typeCounts).slice(1).map(([type, count]) => {
          const TypeIcon = getOrderTypeIcon(type);
          return (
            <div key={type} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 capitalize">
                    {type.replace('_', ' ')} Orders
                  </p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">{count}</p>
                </div>
                <div className={`p-3 rounded-lg ${
                  type === 'creative' ? 'bg-blue-50' : 'bg-green-50'
                }`}>
                  <TypeIcon className={`h-6 w-6 ${
                    type === 'creative' ? 'text-blue-600' : 'text-green-600'
                  }`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-sm font-medium dark:text-white text-gray-700 mb-2">Type</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="all">All Types</option>
              <option value="creative">Creative Orders</option>
              <option value="custom_ad">Custom Ad Orders</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium dark:text-white text-gray-700 mb-2">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending/Submitted</option>
              <option value="in_progress">In Progress</option>
              <option value="review">Under Review</option>
              <option value="completed">Completed/Approved</option>
              <option value="cancelled">Cancelled/Rejected</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium dark:text-white text-gray-700 mb-2">Category</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="all">All Categories</option>
              <option value="image">Image Design</option>
              <option value="video">Video Production</option>
              <option value="design">Brand Design</option>
              <option value="copywriting">Copywriting</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium dark:text-white text-gray-700 mb-2">Duration</label>
            <select
              value={durationFilter}
              onChange={(e) => setDurationFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="all">All Durations</option>
              <option value="30">30 days</option>
              <option value="90">90 days</option>
              <option value="180">180 days</option>
            </select>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold dark:text-white text-gray-900">All Orders (Creative & Custom Ads)</h3>
        </div>
        
        {loading ? (
          <div className="p-6 text-center">
            <RefreshCw className="h-8 w-8 text-gray-400 animate-spin mx-auto mb-4" />
            <p className="text-gray-500">Loading orders...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-6 text-center">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No orders found</h3>
            <p className="text-gray-500">No orders match your current filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Order
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Service/Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredOrders.map((order) => {
                  const StatusIcon = getStatusIcon(order.status);
                  const TypeIcon = getOrderTypeIcon(order.type);
                  return (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-8 w-8">
                            <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                              order.type === 'creative' ? 'bg-blue-100' : 'bg-green-100'
                            }`}>
                              <TypeIcon className={`h-4 w-4 ${
                                order.type === 'creative' ? 'text-blue-600' : 'text-green-600'
                              }`} />
                            </div>
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900 capitalize">
                              {order.type.replace('_', ' ')}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                              <StatusIcon className="h-5 w-5 text-purple-600" />
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              #{order.id.slice(-8)}
                            </div>
                            <div className="text-sm text-gray-500">
                              {order.type === 'creative' 
                                ? order.service?.name || 'Creative Service'
                                : order.service_key || 'Custom Ad Service'
                              }
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{order.user.full_name}</div>
                        <div className="text-sm text-gray-500">{order.user.email}</div>
                        {order.user.company_name && (
                          <div className="text-sm text-gray-500">{order.user.company_name}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {order.type === 'creative' ? (
                          <>
                            <div className="text-sm text-gray-900 capitalize">{order.service?.category}</div>
                            <div className="text-sm text-gray-500">{order.service?.delivery_time} days</div>
                          </>
                        ) : (
                          <>
                            <div className="text-sm text-gray-900">{order.service_key}</div>
                            <div className="text-sm text-gray-500 truncate max-w-xs">
                              {order.details?.substring(0, 50)}...
                            </div>
                          </>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          ${order.total_amount.toFixed(2)}
                        </div>
                        {order.type === 'custom_ad' && order.payment_status && (
                          <div className={`text-xs ${
                            order.payment_status === 'succeeded' ? 'text-green-600' :
                            order.payment_status === 'pending' ? 'text-yellow-600' :
                            'text-red-600'
                          }`}>
                            {order.payment_status}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(order.status)}`}>
                          {order.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(order.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => setSelectedOrder(order)}
                          className="text-purple-600 hover:text-purple-900 flex items-center space-x-1"
                        >
                          <Eye className="h-4 w-4" />
                          <span>View</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Order Details Modal (read-only) */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Order Details</h3>
                <div className="flex items-center mt-1">
                  <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    selectedOrder.type === 'creative' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                  }`}>
                    {selectedOrder.type === 'creative' ? 'Creative Order' : 'Custom Ad Order'}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Order Info */}
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Order Information</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Order ID:</span>
                      <span className="text-sm text-gray-900">#{selectedOrder.id.slice(-8)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Type:</span>
                      <span className="text-sm text-gray-900 capitalize">{selectedOrder.type.replace('_', ' ')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Status:</span>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedOrder.status)}`}>
                        {selectedOrder.status.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Amount:</span>
                      <span className="text-sm text-gray-900">${selectedOrder.total_amount.toFixed(2)}</span>
                    </div>
                    {selectedOrder.type === 'custom_ad' && selectedOrder.payment_status && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Payment:</span>
                        <span className={`text-sm ${
                          selectedOrder.payment_status === 'succeeded' ? 'text-green-600' :
                          selectedOrder.payment_status === 'pending' ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>
                          {selectedOrder.payment_status}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Created:</span>
                      <span className="text-sm text-gray-900">{new Date(selectedOrder.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Client Information</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Name:</span>
                      <span className="text-sm text-gray-900">
                        {selectedOrder.user?.full_name || 
                         (selectedOrder.type === 'custom_ad' && selectedOrder.first_name && selectedOrder.last_name
                          ? `${selectedOrder.first_name} ${selectedOrder.last_name}`
                          : selectedOrder.user?.full_name)
                        }
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Email:</span>
                      <span className="text-sm text-gray-900">{selectedOrder.user.email}</span>
                    </div>
                    {selectedOrder.type === 'custom_ad' && selectedOrder.phone && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Phone:</span>
                        <span className="text-sm text-gray-900">{selectedOrder.phone}</span>
                      </div>
                    )}
                    {selectedOrder.user.company_name && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Company:</span>
                        <span className="text-sm text-gray-900">{selectedOrder.user.company_name}</span>
                      </div>
                    )}
                    {selectedOrder.type === 'custom_ad' && selectedOrder.address && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Address:</span>
                        <span className="text-sm text-gray-900">{selectedOrder.address}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Service Details */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Service Details</h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  {selectedOrder.type === 'creative' ? (
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{selectedOrder.service?.name}</div>
                        <div className="text-sm text-gray-500 capitalize">{selectedOrder.service?.category}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-gray-900">${selectedOrder.service?.price?.toFixed(2)}</div>
                        <div className="text-sm text-gray-500">{selectedOrder.service?.delivery_time} days delivery</div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900">Service Key</div>
                          <div className="text-sm text-gray-500">{selectedOrder.service_key}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-gray-900">${selectedOrder.total_amount.toFixed(2)}</div>
                          <div className="text-sm text-gray-500">Custom Ad Service</div>
                        </div>
                      </div>
                      {selectedOrder.details && (
                        <div>
                          <div className="text-sm font-medium text-gray-900 mb-1">Project Details</div>
                          <div className="text-sm text-gray-500 whitespace-pre-wrap">{selectedOrder.details}</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Requirements/Details */}
              {selectedOrder.type === 'creative' && selectedOrder.requirements && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Requirements</h4>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <pre className="text-sm text-gray-900 whitespace-pre-wrap">
                      {JSON.stringify(selectedOrder.requirements, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              {/* Files for Custom Ad Orders */}
              {selectedOrder.type === 'custom_ad' && selectedOrder.files && selectedOrder.files.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Uploaded Files</h4>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="space-y-2">
                      {selectedOrder.files.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-white rounded border">
                          <div className="flex items-center space-x-2">
                            <FileText className="h-4 w-4 text-gray-500" />
                            <span className="text-sm text-gray-900">{file.name}</span>
                            <span className="text-xs text-gray-500">({(file.size / 1024).toFixed(1)} KB)</span>
                          </div>
                          <a
                            href={file.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 text-sm"
                          >
                            View
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Comments for Custom Ad Orders */}
              {selectedOrder.type === 'custom_ad' && selectedOrder.comments && selectedOrder.comments.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Comments</h4>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="space-y-3">
                      {selectedOrder.comments.map((comment) => (
                        <div key={comment.id} className="p-3 bg-white rounded border">
                          <div className="flex justify-between items-start mb-1">
                            <span className="text-sm font-medium text-gray-900">{comment.author}</span>
                            <span className="text-xs text-gray-500">
                              {new Date(comment.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="text-sm text-gray-700">{comment.content}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Proofs for Custom Ad Orders */}
              {selectedOrder.type === 'custom_ad' && selectedOrder.proofs && selectedOrder.proofs.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Design Proofs</h4>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="space-y-2">
                      {selectedOrder.proofs.map((proof) => (
                        <div key={proof.id} className="flex items-center justify-between p-2 bg-white rounded border">
                          <div className="flex items-center space-x-2">
                            <FileText className="h-4 w-4 text-gray-500" />
                            <span className="text-sm text-gray-900">{proof.file_name}</span>
                            <span className="text-xs text-gray-500">({proof.file_type})</span>
                          </div>
                          <a
                            href={proof.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 text-sm"
                          >
                            View
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Final Delivery */}
              {selectedOrder.final_delivery && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Final Delivery</h4>
                  <div className="bg-green-50 rounded-lg p-4">
                    <div className="text-sm text-gray-900">{selectedOrder.final_delivery}</div>
                  </div>
                </div>
              )}

              {/* No editing/actions in read-only view */}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
