import React, { useState, useEffect } from 'react';
import { CreditCard, Download, Eye, Calendar, Filter, BarChart3, Plus, Edit, Trash2, DollarSign, TrendingUp, AlertCircle } from 'lucide-react';
import { useNotification } from '../../contexts/NotificationContext';
import { useAuth } from '../../contexts/AuthContext';
import { BillingService } from '../../services/billingService';
import { Invoice, PaymentMethod } from '../../types/database';

interface BillingMetric {
  title: string;
  value: string;
  change: string;
  changeType: 'positive' | 'negative';
  icon: any;
  color: 'blue' | 'green' | 'purple' | 'orange';
}

export default function Billing() {
  const { addNotification } = useNotification();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'invoices' | 'payment-methods'>('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [billingSummary, setBillingSummary] = useState({
    totalInvoices: 0,
    totalPaid: 0,
    totalPending: 0,
    totalOverdue: 0
  });

  // Fetch billing data on component mount
  useEffect(() => {
    if (user?.id) {
      fetchBillingData();
    }
  }, [user]);

  const fetchBillingData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch user's invoices
      const userInvoices = await BillingService.getUserInvoices(user!.id);
      setInvoices(userInvoices);
      
      // Fetch payment methods
      const userPaymentMethods = await BillingService.getPaymentMethods(user!.id);
      setPaymentMethods(userPaymentMethods);
      
      // Fetch billing summary
      const summary = await BillingService.getBillingSummary(user!.id);
      setBillingSummary({
        totalInvoices: summary.totalInvoices,
        totalPaid: summary.totalPaid,
        totalPending: summary.totalPending,
        totalOverdue: summary.totalOverdue
      });
      
    } catch (error) {
      console.error('Error fetching billing data:', error);
      addNotification('error', 'Billing Error', 'Failed to load billing data');
    } finally {
      setIsLoading(false);
    }
  };

  const billingMetrics: BillingMetric[] = [
    {
      title: 'Total Spent',
      value: `$${billingSummary.totalPaid.toLocaleString()}`,
      change: '+15% from last month',
      changeType: 'positive',
      icon: DollarSign,
      color: 'blue'
    },
    {
      title: 'Pending Amount',
      value: `$${billingSummary.totalPending.toLocaleString()}`,
      change: 'Due in 15 days',
      changeType: 'negative',
      icon: AlertCircle,
      color: 'orange'
    },
    {
      title: 'Overdue Amount',
      value: `$${billingSummary.totalOverdue.toLocaleString()}`,
      change: 'Action required',
      changeType: 'negative',
      icon: AlertCircle,
      color: 'purple'
    },
    {
      title: 'Avg. Monthly Spend',
      value: `$${billingSummary.totalInvoices > 0 ? Math.round(billingSummary.totalPaid / billingSummary.totalInvoices) : 0}`,
      change: '+8% from last month',
      changeType: 'positive',
      icon: TrendingUp,
      color: 'green'
    }
  ];

  const getStatusColor = (status: Invoice['status']) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const tabs = [
    { id: 'overview', name: 'Overview' },
    { id: 'invoices', name: 'Invoices' },
    { id: 'payment-methods', name: 'Payment Methods' }
  ];

  const handleDownloadInvoice = async (invoice: Invoice) => {
    try {
      addNotification('info', 'Download Started', `Invoice ${invoice.id} is being downloaded...`);
      
      // Get invoice PDF from billing service
      const pdfUrl = await BillingService.getInvoicePDF(invoice.id);
      
      // Create a temporary link to download the PDF
      const link = document.createElement('a');
      link.href = pdfUrl;
      link.download = `invoice-${invoice.id}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      addNotification('success', 'Download Complete', `Invoice ${invoice.id} has been downloaded successfully`);
    } catch (error) {
      console.error('Error downloading invoice:', error);
      addNotification('error', 'Download Failed', 'Failed to download invoice');
    }
  };

  const handleViewInvoice = (invoice: Invoice) => {
    addNotification('info', 'Invoice Details', `Viewing details for invoice ${invoice.id}`);
    // In a real app, this would open a modal or navigate to invoice details page
  };

  const handleAddPaymentMethod = () => {
    addNotification('info', 'Add Payment Method', 'Payment method form will open...');
    // In a real app, this would open a modal to add payment method
  };

  const handleEditPaymentMethod = async (method: PaymentMethod) => {
    try {
      addNotification('info', 'Edit Payment Method', `Editing ${method.brand} card ending in ${method.last4}`);
      // In a real app, this would open a modal to edit payment method
    } catch (error) {
      addNotification('error', 'Edit Failed', 'Failed to edit payment method');
    }
  };

  const handleRemovePaymentMethod = async (method: PaymentMethod) => {
    try {
      if (window.confirm(`Are you sure you want to remove ${method.brand} card ending in ${method.last4}?`)) {
        await BillingService.deletePaymentMethod(method.id);
        addNotification('success', 'Payment Method Removed', `${method.brand} card has been removed successfully`);
        // Refresh payment methods
        fetchBillingData();
      }
    } catch (error) {
      console.error('Error removing payment method:', error);
      addNotification('error', 'Remove Failed', 'Failed to remove payment method');
    }
  };

  const handleSetDefaultPaymentMethod = async (method: PaymentMethod) => {
    try {
      await BillingService.setDefaultPaymentMethod(method.id);
      addNotification('success', 'Default Updated', `${method.brand} card is now your default payment method`);
      // Refresh payment methods
      fetchBillingData();
    } catch (error) {
      console.error('Error setting default payment method:', error);
      addNotification('error', 'Update Failed', 'Failed to set default payment method');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading billing data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Billing & Payments</h1>
        <p className="text-gray-600 mt-2">Manage your payments, invoices, and billing information</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Billing Summary */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {billingMetrics.map((metric, index) => (
              <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{metric.title}</p>
                    <p className="text-2xl font-bold text-gray-900 mt-2">{metric.value}</p>
                    <p className={`text-sm mt-1 ${metric.changeType === 'positive' ? 'text-green-600' : 'text-red-600'}`}>
                      {metric.change}
                    </p>
                  </div>
                  <div className={`p-3 rounded-lg ${getColorClasses(metric.color)}`}>
                    <metric.icon className="h-6 w-6" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Spending Chart */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Monthly Spending</h3>
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span>Total Spent</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span>Campaign Costs</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                  <span>Service Fees</span>
                </div>
              </div>
            </div>
            <div className="h-64 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10"></div>
              <div className="text-center relative z-10">
                <BarChart3 className="h-12 w-12 text-blue-500 mx-auto mb-4" />
                <p className="text-gray-600 font-medium">Interactive Spending Chart</p>
                <p className="text-sm text-gray-500 mt-2">Breakdown by campaigns and services over time</p>
              </div>
            </div>
          </div>

          {/* Recent Transactions */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Transactions</h3>
            <div className="space-y-3">
              {invoices.slice(0, 5).map((invoice) => (
                <div key={invoice.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`w-2 h-2 rounded-full ${invoice.status === 'paid' ? 'bg-green-500' : invoice.status === 'pending' ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{invoice.description || `Invoice ${invoice.id}`}</p>
                      <p className="text-xs text-gray-500">{new Date(invoice.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">${invoice.amount.toFixed(2)}</p>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(invoice.status)}`}>
                      {invoice.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Invoices Tab */}
      {activeTab === 'invoices' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">Recent Invoices</h3>
            <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
              View All
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {invoices.length > 0 ? (
                  invoices.map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{invoice.id}</div>
                          <div className="text-sm text-gray-500">{invoice.description || 'Campaign charges'}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {new Date(invoice.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        ${invoice.amount.toFixed(2)}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(invoice.status)}`}>
                          {invoice.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <button 
                            className="text-blue-600 hover:text-blue-800 transition-colors"
                            onClick={() => handleViewInvoice(invoice)}
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button 
                            className="text-gray-600 hover:text-gray-800 transition-colors"
                            onClick={() => handleDownloadInvoice(invoice)}
                          >
                            <Download className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                      No invoices found. Invoices will appear here when campaigns are created.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Payment Methods Tab */}
      {activeTab === 'payment-methods' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Payment Methods</h3>
              <button 
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                onClick={handleAddPaymentMethod}
              >
                <Plus className="h-4 w-4" />
                <span>Add Payment Method</span>
              </button>
            </div>
            
            <div className="space-y-4">
              {paymentMethods.length > 0 ? (
                paymentMethods.map((method) => (
                  <div key={method.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
                    <div className="flex items-center space-x-4">
                      <div className="p-2 bg-gray-100 rounded-lg">
                        <CreditCard className="h-6 w-6 text-gray-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {method.brand} •••• {method.last4}
                        </p>
                        <p className="text-sm text-gray-500">
                          Expires {method.expiry_month.toString().padStart(2, '0')}/{method.expiry_year}
                        </p>
                      </div>
                      {method.is_default && (
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                          Default
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      {!method.is_default && (
                        <button 
                          className="text-blue-600 hover:text-blue-800 text-sm transition-colors flex items-center space-x-1"
                          onClick={() => handleSetDefaultPaymentMethod(method)}
                        >
                          <span>Set Default</span>
                        </button>
                      )}
                      <button 
                        className="text-blue-600 hover:text-blue-800 text-sm transition-colors flex items-center space-x-1"
                        onClick={() => handleEditPaymentMethod(method)}
                      >
                        <Edit className="h-3 w-3" />
                        <span>Edit</span>
                      </button>
                      <button 
                        className="text-red-600 hover:text-red-800 text-sm transition-colors flex items-center space-x-1"
                        onClick={() => handleRemovePaymentMethod(method)}
                      >
                        <Trash2 className="h-3 w-3" />
                        <span>Remove</span>
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No payment methods added yet</p>
                  <p className="text-sm text-gray-400 mt-1">Add a payment method to get started</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function getColorClasses(color: string) {
  switch (color) {
    case 'blue': return 'bg-blue-50 text-blue-600';
    case 'green': return 'bg-green-50 text-green-600';
    case 'purple': return 'bg-purple-50 text-purple-600';
    case 'orange': return 'bg-orange-50 text-orange-600';
    default: return 'bg-gray-50 text-gray-600';
  }
}