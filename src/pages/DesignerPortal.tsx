import { Suspense, lazy } from 'react';
import { Routes, Route, Navigate, useNavigate, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { DesignerService, type CustomAdOrder } from '../services/designerService';
import { useNotification } from '../contexts/NotificationContext';
import DesignerLayout from '../components/layouts/DesignerLayout';
// import { AdminService } from '../services/adminService';
import { supabase } from '../lib/supabaseClient';
import { CustomAdsService } from '../services/customAdsService';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { MessageSquare, Send, BarChart3, Users, CheckCircle, Clock, FileText, Plus, Eye, TrendingUp, DollarSign, AlertCircle } from 'lucide-react';

// Helper function to get custom ad service name based on service_key and files
function getCustomAdServiceName(order: CustomAdOrder): string {
  const serviceKey = (order as CustomAdOrder & { service_key?: string }).service_key;
  
  // Check if files indicate photo or video type
  if (order.files && order.files.length > 0) {
    const fileTypes = order.files.map(f => f.type?.toLowerCase() || '');
    const hasVideo = fileTypes.some(type => type.includes('video'));
    const hasImage = fileTypes.some(type => type.includes('image') || type.includes('photo'));
    
    if (hasVideo) {
      return 'Custom Ad - Video';
    } else if (hasImage) {
      return 'Custom Ad - Photo';
    }
  }
  
  // Fallback to service_key based logic
  switch (serviceKey) {
    case 'photography':
      return 'Custom Ad - Photo';
    case 'videography':
    case 'video_ad_creation':
      return 'Custom Ad - Video';
    case 'graphic-design':
    case 'vertical_ad_design':
    case 'vertical_ad_with_upload':
    default:
      return 'Custom Ad';
  }
}

// Removed old inline DesignerLayout to use the shared layout

function DesignerDashboard() {
  const { user } = useAuth();
  const { addNotification } = useNotification();
  const navigate = useNavigate();
  const [myOrders, setMyOrders] = useState<CustomAdOrder[]>([]);
  const [unassigned, setUnassigned] = useState<CustomAdOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [taking, setTaking] = useState<string | null>(null);
  const [stats, setStats] = useState<{ totalAssigned: number; pendingReviews: number; approvedThisMonth: number; revisionRequests: number } | null>(null);
  const [recentProofs, setRecentProofs] = useState<Array<{ id: string; order_id: string; status: string; created_at: string; version_number: number; title: string }>>([]);

  useEffect(() => {
    const load = async () => {
      if (!user?.id) return;
      try {
        setLoading(true);
        // Resolve designer profile id via profiles to match assigned_designer_id
        let designerId = user.id;
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .eq('email', user.email)
            .single();
          designerId = profile?.id || user.id;
        } catch (_) {}

        const [mine, un, s, recent] = await Promise.all([
          DesignerService.getMyOrders(designerId),
          DesignerService.getUnassignedOrders(),
          DesignerService.getDashboardStats(designerId),
          DesignerService.getRecentActivity(designerId),
        ]);
        setMyOrders(mine);
        setUnassigned(un);
        setStats(s);
        setRecentProofs(recent.recentProofs);
      } catch (e) {
        console.error(e);
        addNotification('error', 'Error', 'Failed to load orders');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user?.id]);

  const handleTake = async (orderId: string) => {
    if (!user?.id) return;
    setTaking(orderId);
    try {
      await DesignerService.takeOrder(orderId, user.id);
      addNotification('success', 'Assigned', 'Order assigned to you');
      // refresh lists
      const [mine, un] = await Promise.all([
        DesignerService.getMyOrders(user.id),
        DesignerService.getUnassignedOrders(),
      ]);
      setMyOrders(mine);
      setUnassigned(un);
    } catch (e) {
      console.error(e);
      addNotification('error', 'Failed', 'Could not take order');
    } finally {
      setTaking(null);
    }
  };

  if (loading) {
    return <div className="text-sm text-gray-600">Loading orders…</div>;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center lg:text-left">
        <h1 className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 bg-clip-text text-transparent mb-4 flex items-center gap-3">
          <BarChart3 className="h-10 w-10 text-purple-600" />
          Designer Dashboard
        </h1>
        <p className="text-xl text-slate-700 dark:text-slate-200 max-w-2xl">
          Manage your design projects and track your creative workflow
        </p>
      </div>

      {/* KPI Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-700">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-blue-600 dark:text-blue-400 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Assigned Orders
                </div>
                <div className="text-3xl font-bold text-blue-900 dark:text-blue-100 mt-2">{stats.totalAssigned}</div>
              </div>
              <div className="h-12 w-12 bg-blue-500 rounded-lg flex items-center justify-center">
                <FileText className="h-6 w-6 text-white" />
              </div>
            </div>
          </Card>
          <Card className="p-6 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border-orange-200 dark:border-orange-700">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-orange-600 dark:text-orange-400 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Pending Review
                </div>
                <div className="text-3xl font-bold text-orange-900 dark:text-orange-100 mt-2">{stats.pendingReviews}</div>
              </div>
              <div className="h-12 w-12 bg-orange-500 rounded-lg flex items-center justify-center">
                <Clock className="h-6 w-6 text-white" />
              </div>
            </div>
          </Card>
          <Card className="p-6 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-700">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-green-600 dark:text-green-400 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Approved This Month
                </div>
                <div className="text-3xl font-bold text-green-900 dark:text-green-100 mt-2">{stats.approvedThisMonth}</div>
              </div>
              <div className="h-12 w-12 bg-green-500 rounded-lg flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-white" />
              </div>
            </div>
          </Card>
          <Card className="p-6 bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border-red-200 dark:border-red-700">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-red-600 dark:text-red-400 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Revision Requests
                </div>
                <div className="text-3xl font-bold text-red-900 dark:text-red-100 mt-2">{stats.revisionRequests}</div>
              </div>
              <div className="h-12 w-12 bg-red-500 rounded-lg flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-white" />
              </div>
            </div>
          </Card>
        </div>
      )}

      <section>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3 mb-6">
          <Users className="h-6 w-6 text-purple-600" />
          Assigned to you
        </h2>
        {myOrders.length === 0 ? (
          <Card className="p-8 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="h-16 w-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                <FileText className="h-8 w-8 text-gray-400" />
              </div>
              <p className="text-lg text-gray-600 dark:text-gray-400">No orders assigned yet</p>
              <p className="text-sm text-gray-500">New orders will appear here when assigned to you</p>
            </div>
          </Card>
        ) : (
          <div className="grid gap-4">
            {myOrders.map((o) => (
              <Card key={o.id} className="p-6 hover:shadow-lg transition-shadow duration-200 border-l-4 border-l-purple-500">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="h-10 w-10 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
                        <FileText className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <div className="text-lg font-semibold text-gray-900 dark:text-white">{getCustomAdServiceName(o)}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">#{o.id.slice(0, 8)} • {new Date(o.created_at).toLocaleString()}</div>
                      </div>
                    </div>
                    <div className="ml-13">
                      <div className="text-sm text-gray-700 dark:text-gray-300 mb-1">
                        <span className="font-medium">Client:</span> {o.user?.full_name || `${o.first_name} ${o.last_name}`}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          <span className="font-medium">Status:</span>
                        </span>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          ((o as any)['workflow_status'] ?? 'submitted') === 'designer_assigned' 
                            ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400' 
                            : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                        }`}>
                          {((o as any)['workflow_status'] ?? 'submitted').replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button 
                    onClick={() => navigate(`/designer/orders/${o.id}`)}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center gap-2"
                  >
                    <Eye className="h-4 w-4" />
                    Open
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3 mb-6">
          <Plus className="h-6 w-6 text-green-600" />
          Unassigned queue
        </h2>
        {unassigned.length === 0 ? (
          <Card className="p-8 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="h-16 w-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
                <Plus className="h-8 w-8 text-green-600" />
              </div>
              <p className="text-lg text-gray-600 dark:text-gray-400">No unassigned orders available</p>
              <p className="text-sm text-gray-500">New orders will appear here when they become available</p>
            </div>
          </Card>
        ) : (
          <div className="grid gap-4">
            {unassigned.map((o) => (
              <Card key={o.id} className="p-6 hover:shadow-lg transition-shadow duration-200 border-l-4 border-l-green-500">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="h-10 w-10 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                        <FileText className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <div className="text-lg font-semibold text-gray-900 dark:text-white">{getCustomAdServiceName(o)}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">#{o.id.slice(0, 8)} • {new Date(o.created_at).toLocaleString()}</div>
                      </div>
                    </div>
                    <div className="ml-13">
                      <div className="text-sm text-gray-700 dark:text-gray-300 mb-1">
                        <span className="font-medium">Client:</span> {o.user?.full_name || `${o.first_name} ${o.last_name}`}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          <span className="font-medium">Amount:</span> ${o.total_amount.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button
                    onClick={() => handleTake(o.id)}
                    disabled={!!taking}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-2 disabled:opacity-50"
                  >
                    {taking === o.id ? (
                      <>
                        <Clock className="h-4 w-4 animate-spin" />
                        Taking...
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4" />
                        Take order
                      </>
                    )}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3 mb-6">
          <TrendingUp className="h-6 w-6 text-blue-600" />
          Recent proofs
        </h2>
        {recentProofs.length === 0 ? (
          <Card className="p-8 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="h-16 w-16 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
                <TrendingUp className="h-8 w-8 text-blue-600" />
              </div>
              <p className="text-lg text-gray-600 dark:text-gray-400">No recent proofs</p>
              <p className="text-sm text-gray-500">Your submitted proofs will appear here</p>
            </div>
          </Card>
        ) : (
          <div className="grid gap-4">
            {recentProofs.map((p) => (
              <Card key={p.id} className="p-6 hover:shadow-lg transition-shadow duration-200 border-l-4 border-l-blue-500">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="h-10 w-10 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                        <FileText className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <div className="text-lg font-semibold text-gray-900 dark:text-white">
                          V{p.version_number} - {p.title || 'Untitled'}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          #{p.order_id.slice(0,8)} • {new Date(p.created_at).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <div className="ml-13">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          <span className="font-medium">Status:</span>
                        </span>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          p.status === 'approved' 
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400' 
                            : p.status === 'pending' 
                            ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400'
                            : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                        }`}>
                          {p.status.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button 
                    onClick={() => navigate(`/designer/orders/${p.order_id}`)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
                  >
                    <Eye className="h-4 w-4" />
                    Open Order
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function DesignerOrders() {
  const { user } = useAuth();
  const { addNotification } = useNotification();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<CustomAdOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!user?.id) return;
      try {
        setLoading(true);
        let designerId = user.id;
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .eq('email', user.email)
            .single();
          designerId = profile?.id || user.id;
        } catch (_) {}
        const mine = await DesignerService.getMyOrders(designerId);
        setOrders(mine);
      } catch (e) {
        console.error(e);
        addNotification('error', 'Error', 'Failed to load orders');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user?.id]);

  if (loading) return <div className="text-sm text-gray-600">Loading…</div>;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center lg:text-left">
        <h1 className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-4 flex items-center gap-3">
          <FileText className="h-10 w-10 text-indigo-600" />
          Custom Ad Orders
        </h1>
        <p className="text-xl text-slate-700 dark:text-slate-200 max-w-2xl">
          Manage and track all your assigned design projects
        </p>
      </div>

      {/* Orders List */}
      {orders.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="flex flex-col items-center gap-6">
            <div className="h-20 w-20 bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-full flex items-center justify-center">
              <FileText className="h-10 w-10 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">No orders assigned yet</h3>
              <p className="text-lg text-gray-600 dark:text-gray-400 mb-4">You don't have any custom ad orders assigned to you at the moment.</p>
              <p className="text-sm text-gray-500">New orders will appear here when they are assigned to you by the system.</p>
            </div>
          </div>
        </Card>
      ) : (
        <div className="grid gap-6">
          {orders.map((o) => (
            <Card key={o.id} className="p-6 hover:shadow-lg transition-all duration-200 border-l-4 border-l-indigo-500 bg-gradient-to-r from-white to-indigo-50/30 dark:from-slate-800 dark:to-indigo-900/20">
              <div className="flex items-start justify-between gap-6">
                <div className="flex-1">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="h-12 w-12 bg-indigo-100 dark:bg-indigo-900/20 rounded-xl flex items-center justify-center">
                      <FileText className="h-6 w-6 text-indigo-600" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white">{getCustomAdServiceName(o)}</h3>
                      <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                        <span>#{o.id.slice(0,8)}</span>
                        <span>•</span>
                        <span>{new Date(o.created_at).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-4 mb-4">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-gray-500" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        <span className="font-medium">Client:</span> {o.user?.full_name || `${o.first_name} ${o.last_name}`}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-gray-500" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        <span className="font-medium">Amount:</span> ${Number((o as any).total_amount || 0).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">Status:</span>
                    <span className={`px-3 py-1.5 rounded-full text-sm font-semibold ${
                      ((o as any)['workflow_status']||'submitted') === 'designer_assigned' 
                        ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400' 
                        : ((o as any)['workflow_status']||'submitted') === 'in_progress'
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                        : ((o as any)['workflow_status']||'submitted') === 'pending_review'
                        ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400'
                        : ((o as any)['workflow_status']||'submitted') === 'approved'
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                        : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                    }`}>
                      {((o as any)['workflow_status']||'submitted').replace('_',' ')}
                    </span>
                  </div>
                </div>
                
                <div className="flex flex-col items-end gap-3">
                  <div className="text-right">
                    <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                      ${Number((o as any).total_amount || 0).toFixed(0)}
                    </div>
                    <div className="text-sm text-gray-500">Total Amount</div>
                  </div>
                  <Button 
                    onClick={() => navigate(`/designer/orders/${o.id}`)}
                    className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-2 font-medium transition-colors duration-200"
                  >
                    <Eye className="h-4 w-4" />
                    Open Order
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

const StripeConnectSetupLazy = lazy(() => import('../components/host/StripeConnectSetup'));

function DesignerRevenue() {
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-medium">Revenue</h2>
      <div className="border rounded p-4">
        <Suspense fallback={<div className="text-sm text-gray-600">Loading Stripe Connect…</div>}>
          <StripeConnectSetupLazy onSetupComplete={() => {}} />
        </Suspense>
      </div>
      {/* @ts-expect-error reuse payout history list via HostService for now */}
      <div className="text-sm text-gray-600">Payout history will appear here once connected.</div>
    </div>
  );
}

function DesignerProfile() {
  // Reuse the main ProfilePage inside portal body
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const ProfilePage = require('../pages/ProfilePage').default;
  return <ProfilePage />;
}

function DesignerOrderDetails() {
  const { id } = useParams<{ id: string }>();
  const { addNotification } = useNotification();
  const { user } = useAuth();
  const [order, setOrder] = useState<CustomAdOrder | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [proofs, setProofs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const data = await DesignerService.getOrderWithDetails(id);
        setOrder(data.order);
        setComments(data.comments);
        setProofs(data.proofs);
      } catch (e) {
        console.error(e);
        addNotification('error', 'Error', 'Failed to load order');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const onUploadProofs = async () => {
    if (!id || files.length === 0) return;
    try {
      setUploading(true);
      // Upload files to custom-ad-uploads and create a proof in custom_ad_proofs
      const currentUserId = user?.id || (order as any)?.assigned_designer_id || '';
      const uploadedSummaries = await CustomAdsService.uploadFiles(currentUserId, files);
      const proofId = await CustomAdsService.createProof(
        id,
        currentUserId,
        `Proof ${new Date().toLocaleString()}`,
        '',
        uploadedSummaries
      );
      await CustomAdsService.submitProof(proofId);
      addNotification('success', 'Uploaded', 'Proofs submitted to client/host');
      const data = await DesignerService.getOrderWithDetails(id);
      setProofs(data.proofs);
    } catch (e) {
      console.error(e);
      addNotification('error', 'Failed', 'Could not upload proofs');
    } finally {
      setUploading(false);
      setFiles([]);
    }
  };

  const resolveSignedUrl = async (rawUrl: string, downloadName?: string): Promise<string> => {
    try {
      const match = rawUrl?.match(/\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/(.+)$/);
      if (!match) return rawUrl;
      const [, bucket, path] = match;
      const { data } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path, 600, downloadName ? { download: downloadName } as any : undefined as any);
      if (data?.signedUrl) return data.signedUrl as string;
      return rawUrl;
    } catch {
      return rawUrl;
    }
  };

  const handleDownload = async (file: { url: string; name: string }) => {
    try {
      const signed = await resolveSignedUrl(file.url, file.name);
      window.open(signed, '_blank');
    } catch (e) {
      console.error(e);
      addNotification('error', 'Download failed', 'Could not download file');
    }
  };

  const handleSubmitComment = async () => {
    if (!newComment.trim() || !id || !user?.id) return;
    
    try {
      setSubmittingComment(true);
      await DesignerService.addComment(id, newComment.trim(), user.id);
      addNotification('success', 'Comment sent', 'Your message has been sent to the client/host');
      setNewComment('');
      
      // Reload comments
      const data = await DesignerService.getOrderWithDetails(id);
      setComments(data.comments);
    } catch (e) {
      console.error(e);
      addNotification('error', 'Failed', 'Could not send comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  if (loading) return <div className="text-sm text-gray-600">Loading…</div>;
  if (!order) return <div className="text-sm text-gray-600">Not found.</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">{getCustomAdServiceName(order)} • #{order.id.slice(0,8)}</h2>
            <div className="text-xs text-gray-300 mt-1">Created: {new Date(order.created_at).toLocaleString()}</div>
          </div>
          <div>
            <span className={`px-2 py-1 rounded-full text-[10px] font-semibold ${((order as any)['workflow_status']||'submitted')==='designer_assigned' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-300'}`}>{((order as any)['workflow_status']||'submitted').replace('_',' ')}</span>
          </div>
        </div>
      </Card>

      {/* Contact and Project Details */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="p-4">
          <h3 className="font-medium mb-2">Client Info</h3>
          <div className="text-sm text-gray-300 space-y-1">
            <div>Name: {order.user?.full_name || `${order.first_name} ${order.last_name}`}</div>
            <div>Email: {order.email}</div>
            <div>Phone: {order.phone}</div>
            <div>Address: {order.address}</div>
          </div>
        </Card>
        <Card className="p-4">
          <h3 className="font-medium mb-2">Order Details</h3>
          <div className="text-sm text-gray-300 space-y-1">
            <div>Service: {(order as any).service_key}</div>
            <div>Amount: ${Number((order as any).total_amount || 0).toFixed(2)}</div>
            <div>Payment: {(order as any).payment_status}</div>
          </div>
        </Card>
      </div>

      <Card className="p-4">
        <h3 className="font-medium mb-2">Project Brief</h3>
        <div className="text-sm text-gray-300 whitespace-pre-wrap">{order.details}</div>
      </Card>

      {Array.isArray((order as any).files) && (order as any).files.length > 0 && (
        <Card className="p-4">
          <h3 className="font-medium mb-3">Uploaded Files</h3>
          <div className="grid md:grid-cols-2 gap-4">
            {(order as any).files.map((raw: any, idx: number) => {
              const file = {
                url: raw.url || raw.file_url,
                type: raw.type || raw.file_type || '',
                name: raw.name || raw.file_name || `file-${idx+1}`
              } as { url: string; type: string; name: string };
              const isImg = file.type.startsWith('image/');
              const isVideo = file.type.startsWith('video/');
              const trySigned = async (el: HTMLImageElement | HTMLVideoElement) => {
                try {
                  const match = file.url?.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/);
                  if (match) {
                    const [, bucket, path] = match;
                    const { data } = await supabase.storage.from(bucket).createSignedUrl(path, 120);
                    if (data?.signedUrl) {
                      el.src = data.signedUrl as string;
                      return true;
                    }
                  }
                } catch {}
                return false;
              };
              return (
                <div key={idx} className="border rounded bg-black/5 dark:bg-white/5 overflow-hidden">
                  <div className="w-full bg-black flex items-center justify-center">
                    {isImg ? (
                      <img
                        src={file.url}
                        alt={file.name}
                        className="w-full max-h-96 object-contain bg-white"
                        onError={async (e) => {
                          const el = e.currentTarget as HTMLImageElement;
                          const ok = await trySigned(el);
                          if (!ok) {
                            el.style.display = 'none';
                            const parent = el.parentElement as HTMLElement;
                            if (parent) parent.innerHTML = `<a href='${file.url}' class='text-blue-400 underline text-sm'>Open ${file.name}</a>`;
                          }
                        }}
                      />
                    ) : isVideo ? (
                      <video
                        src={file.url}
                        controls
                        playsInline
                        className="w-full max-h-96 object-contain bg-black"
                        onError={async (e) => {
                          const vid = e.currentTarget as HTMLVideoElement;
                          const ok = await trySigned(vid);
                          if (!ok) {
                            const parent = vid.parentElement as HTMLElement;
                            if (parent) parent.innerHTML = `<a href='${file.url}' class='text-blue-400 underline text-sm'>Open ${file.name}</a>`;
                          }
                        }}
                      />
                    ) : (
                      <a href={file.url} className="text-blue-600 underline text-sm">{file.name}</a>
                    )}
                  </div>
                  <div className="p-2 text-xs text-gray-500 dark:text-gray-400 flex items-center justify-between gap-2">
                    <span className="truncate">{file.name}</span>
                    <button className="px-2 py-1 border rounded text-[11px]" onClick={() => handleDownload(file)}>Download</button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Submit Proof */}
      <Card className="p-4">
        <h3 className="font-medium mb-3">Submit Proof</h3>
        <div className="flex items-center gap-3">
          <input type="file" multiple accept="image/*,video/*" onChange={(e) => setFiles(Array.from(e.target.files || []))} />
          <button
            className="px-3 py-1.5 text-sm border rounded hover:bg-gray-50 disabled:opacity-50"
            disabled={files.length === 0 || uploading}
            onClick={onUploadProofs}
          >{uploading ? 'Uploading…' : 'Upload proofs'}</button>
        </div>
      </Card>

      {/* Proofs */}
      <Card className="p-4">
        <h3 className="font-medium mb-3">Previous Proofs</h3>
        {proofs.length === 0 ? (
          <p className="text-sm text-gray-600">No proofs yet.</p>
        ) : (
          <div className="grid gap-3">
            {proofs.map((p: any) => (
              <div key={p.id} className="border rounded p-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">{p.title || 'Proof'} • V{p.version_number}</div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full text-black bg-gray-100">{p.status.replace('_',' ')}</span>
                </div>
                <div className="text-xs text-gray-600">{new Date(p.created_at).toLocaleString()}</div>
                {Array.isArray(p.files) && p.files.length > 0 && (
                  <div className="mt-2 grid gap-2">
                    {p.files.map((f: any, idx: number) => (
                      <div key={idx}>
                        {f.type?.startsWith('image/') ? (
                          <img src={f.url} alt={f.name} className="max-h-64 rounded" />
                        ) : f.type?.startsWith('video/') ? (
                          <video src={f.url} controls className="max-h-64 rounded" />
                        ) : (
                          <a href={f.url} className="text-blue-600 underline text-sm">View file</a>
                        )}
                        <div className="mt-1">
                          <button className="px-2 py-1 border rounded text-[11px]" onClick={() => handleDownload({ url: f.url, name: f.name || 'file' })}>Download</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Comments Section */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare className="w-5 h-5" />
          <h3 className="font-medium">Communication with Client/Host</h3>
        </div>
        
        {/* Comments List */}
        <div className="space-y-3 mb-4 max-h-60 overflow-y-auto">
          {comments.length === 0 ? (
            <p className="text-sm text-gray-600">No messages yet. Start a conversation with the client/host.</p>
          ) : (
            comments.map((comment: any) => (
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
          <div className="flex gap-2">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Ask about colors, positioning, style changes, or any other design questions..."
              className="flex-1 p-3 border rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
              disabled={submittingComment}
            />
            <Button
              onClick={handleSubmitComment}
              disabled={!newComment.trim() || submittingComment}
              className="px-4 py-2 flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              {submittingComment ? 'Sending...' : 'Send'}
            </Button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Use this to communicate with the client/host about design changes, questions, or clarifications.
          </p>
        </div>
      </Card>
    </div>
  );
}

export default function DesignerPortal() {
  return (
    <DesignerLayout>
      <Routes>
        <Route path="/" element={<DesignerDashboard />} />
        <Route path="/orders" element={<DesignerOrders />} />
        <Route path="/orders/:id" element={<DesignerOrderDetails />} />
        <Route path="/revenue" element={<DesignerRevenue />} />
        <Route path="/payouts" element={<div className="text-sm text-gray-600">Payout history will appear here once connected.</div>} />
        <Route path="/profile" element={<DesignerProfile />} />
        <Route path="*" element={<Navigate to="/designer" replace />} />
      </Routes>
    </DesignerLayout>
  );
}


