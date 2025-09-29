import React, { useState, useEffect } from 'react';
import { Package, Clock, CheckCircle, XCircle, RefreshCw, Eye } from 'lucide-react';
import { useNotification } from '../../contexts/NotificationContext';
import { AdminService, CreativeOrder } from '../../services/adminService';

export default function CreativeOrdersManagement() {
  const [orders, setOrders] = useState<CreativeOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<CreativeOrder | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [durationFilter, setDurationFilter] = useState<string>('all'); // 30 | 90 | 180 | all
  const { addNotification } = useNotification();

  useEffect(() => {
    loadCreativeOrders();
  }, []);

  const loadCreativeOrders = async () => {
    try {
      setLoading(true);
      const creativeOrders = await AdminService.getCreativeOrders();
      setOrders(creativeOrders);
    } catch (error) {
      console.error('Error loading creative orders:', error);
      addNotification('error', 'Error', 'Failed to load creative orders');
    } finally {
      setLoading(false);
    }
  };

  // Read-only page: no status updates or editing actions

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return Clock;
      case 'in_progress': return Package;
      case 'completed': return CheckCircle;
      case 'cancelled': return XCircle;
      default: return Package;
    }
  };

  const filteredOrders = orders.filter(order => {
    const statusMatch = statusFilter === 'all' || order.status === statusFilter;
    const categoryMatch = categoryFilter === 'all' || order.service.category === categoryFilter;
    const durationMatch = durationFilter === 'all' || order.service.delivery_time === Number(durationFilter);
    return statusMatch && categoryMatch && durationMatch;
  });

  const statusCounts = {
    all: orders.length,
    pending: orders.filter(o => o.status === 'pending').length,
    completed: orders.filter(o => o.status === 'completed').length,
    cancelled: orders.filter(o => o.status === 'cancelled').length,
  } as const;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Creative Orders Management</h1>
          <p className="text-gray-600 mt-2">Manage creative service orders and track delivery progress</p>
        </div>
        <button
          onClick={loadCreativeOrders}
          disabled={loading}
          className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid md:grid-cols-4 gap-6">
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
                  status === 'completed' ? 'bg-green-50' :
                  'bg-red-50'
                }`}>
                  <StatusIcon className={`h-6 w-6 ${
                    status === 'all' ? 'text-purple-600' :
                    status === 'pending' ? 'text-yellow-600' :
                    status === 'completed' ? 'text-green-600' :
                    'text-red-600'
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
            <label className="block text-sm font-medium dark:text-white text-gray-700 mb-2">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
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
          <h3 className="text-lg font-semibold dark:text-white text-gray-900">Creative Orders</h3>
        </div>
        
        {loading ? (
          <div className="p-6 text-center">
            <RefreshCw className="h-8 w-8 text-gray-400 animate-spin mx-auto mb-4" />
            <p className="text-gray-500">Loading creative orders...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-6 text-center">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No orders found</h3>
            <p className="text-gray-500">No creative orders match your current filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Order
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Service
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
                  return (
                    <tr key={order.id} className="hover:bg-gray-50">
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
                              {order.service.name}
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
                        <div className="text-sm text-gray-900 capitalize">{order.service.category}</div>
                        <div className="text-sm text-gray-500">{order.service.delivery_time} days</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          ${order.total_amount.toFixed(2)}
                        </div>
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
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Order Details</h3>
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
                      <span className="text-sm text-gray-500">Status:</span>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedOrder.status)}`}>
                        {selectedOrder.status.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Amount:</span>
                      <span className="text-sm text-gray-900">${selectedOrder.total_amount.toFixed(2)}</span>
                    </div>
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
                      <span className="text-sm text-gray-900">{selectedOrder.user.full_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Email:</span>
                      <span className="text-sm text-gray-900">{selectedOrder.user.email}</span>
                    </div>
                    {selectedOrder.user.company_name && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Company:</span>
                        <span className="text-sm text-gray-900">{selectedOrder.user.company_name}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Service Details */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Service Details</h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{selectedOrder.service.name}</div>
                      <div className="text-sm text-gray-500 capitalize">{selectedOrder.service.category}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900">${selectedOrder.service.price.toFixed(2)}</div>
                      <div className="text-sm text-gray-500">{selectedOrder.service.delivery_time} days delivery</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Requirements */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Requirements</h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  <pre className="text-sm text-gray-900 whitespace-pre-wrap">
                    {JSON.stringify(selectedOrder.requirements, null, 2)}
                  </pre>
                </div>
              </div>

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
