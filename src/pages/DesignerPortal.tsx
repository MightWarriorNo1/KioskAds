import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate, useNavigate, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { DesignerService, type CustomAdOrder } from '../services/designerService';
import { useNotification } from '../contexts/NotificationContext';
import DesignerLayout from '../components/layouts/DesignerLayout';
import { AdminService } from '../services/adminService';
import { supabase } from '../lib/supabaseClient';
import { CustomAdsService } from '../services/customAdsService';
import Card from '../components/ui/Card';

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
      {/* KPI Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="text-xs text-gray-500">Assigned Orders</div>
            <div className="text-2xl font-semibold">{stats.totalAssigned}</div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-gray-500">Pending Client Review</div>
            <div className="text-2xl font-semibold">{stats.pendingReviews}</div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-gray-500">Approved This Month</div>
            <div className="text-2xl font-semibold">{stats.approvedThisMonth}</div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-gray-500">Revision Requests</div>
            <div className="text-2xl font-semibold">{stats.revisionRequests}</div>
          </Card>
        </div>
      )}

      <section>
        <h2 className="text-lg font-medium">Assigned to you</h2>
        {myOrders.length === 0 ? (
          <Card className="p-4 mt-3"><p className="text-sm text-gray-600">No orders yet.</p></Card>
        ) : (
          <div className="mt-3 grid gap-3">
            {myOrders.map((o) => (
              <Card key={o.id} className="p-4 flex items-center justify-between">
                <div>
                  <div className="font-medium">{o.service?.name || 'Custom Ad'}</div>
                  <div className="text-xs text-gray-600">#{o.id.slice(0, 8)} • {new Date(o.created_at).toLocaleString()}</div>
                  <div className="text-xs mt-1">Status: {(o as any)['workflow_status'] ?? 'submitted'}</div>
                </div>
                <button className="px-3 py-1.5 text-sm border rounded hover:bg-gray-50" onClick={() => navigate(`/designer/orders/${o.id}`)}>Open</button>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-lg font-medium">Unassigned queue</h2>
        {unassigned.length === 0 ? (
          <Card className="p-4 mt-3"><p className="text-sm text-gray-600">No unassigned orders.</p></Card>
        ) : (
          <div className="mt-3 grid gap-3">
            {unassigned.map((o) => (
              <Card key={o.id} className="p-4 flex items-center justify-between">
                <div>
                  <div className="font-medium">{o.service?.name || 'Custom Ad'}</div>
                  <div className="text-xs text-gray-600">#{o.id.slice(0, 8)} • {new Date(o.created_at).toLocaleString()}</div>
                  <div className="text-xs mt-1">Client: {o.first_name} {o.last_name} • ${o.total_amount.toFixed(2)}</div>
                </div>
                <button
                  className="px-3 py-1.5 text-sm border rounded hover:bg-gray-50 disabled:opacity-50"
                  disabled={!!taking}
                  onClick={() => handleTake(o.id)}
                >{taking === o.id ? 'Taking…' : 'Take order'}</button>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-lg font-medium">Recent proofs</h2>
        {recentProofs.length === 0 ? (
          <Card className="p-4 mt-3"><p className="text-sm text-gray-600">No recent proofs.</p></Card>
        ) : (
          <div className="mt-3 grid gap-3">
            {recentProofs.map((p) => (
              <Card key={p.id} className="p-3 flex items-center justify-between">
                <div>
                  <div className="font-medium">V{p.version_number} - {p.title || 'Untitled'}</div>
                  <div className="text-xs text-gray-600">#{p.order_id.slice(0,8)} • {new Date(p.created_at).toLocaleString()} • {p.status.replace('_',' ')}</div>
                </div>
                <button className="px-3 py-1.5 text-sm border rounded hover:bg-gray-50" onClick={() => navigate(`/designer/orders/${p.order_id}`)}>Open Order</button>
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
    <div className="space-y-4">
      <h2 className="text-lg font-medium">Custom Ad Orders</h2>
      {orders.length === 0 ? (
        <Card className="p-4"><p className="text-sm text-gray-600">No assigned orders yet.</p></Card>
      ) : (
        <div className="grid gap-3">
          {orders.map((o) => (
            <Card key={o.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="font-medium">{(o as any).service?.name || 'Custom Ad'}</div>
                  <div className="text-xs text-gray-600">#{o.id.slice(0,8)} • {new Date(o.created_at).toLocaleString()}</div>
                  <div className="text-xs text-gray-700"><span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${((o as any)['workflow_status']||'submitted')==='designer_assigned' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'}`}>{((o as any)['workflow_status']||'submitted').replace('_',' ')}</span></div>
                </div>
                <div className="text-right space-y-2">
                  <div className="text-sm font-semibold">${Number((o as any).total_amount || 0).toFixed(0)}</div>
                  <button className="px-3 py-1.5 text-sm border rounded hover:bg-gray-50" onClick={() => navigate(`/designer/orders/${o.id}`)}>Open</button>
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
      {/* @ts-ignore reuse payout history list via HostService for now */}
      <div className="text-sm text-gray-600">Payout history will appear here once connected.</div>
    </div>
  );
}

function DesignerProfile() {
  // Reuse the main ProfilePage inside portal body
  const ProfilePage = require('../pages/ProfilePage').default;
  return <ProfilePage />;
}

function DesignerOrderDetails() {
  const { id } = useParams<{ id: string }>();
  const { addNotification } = useNotification();
  const [order, setOrder] = useState<CustomAdOrder | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [proofs, setProofs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [files, setFiles] = useState<File[]>([]);

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
      const { user } = (await import('../contexts/AuthContext')).useAuth();
      // Fallback if hook not accessible here; we'll instead rely on order.designer or prompt
      // Upload files using CustomAdsService.uploadFiles requires a userId
      const currentUserId = (window as any).__currentUserId || (order as any)?.assigned_designer_id || '';
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

  if (loading) return <div className="text-sm text-gray-600">Loading…</div>;
  if (!order) return <div className="text-sm text-gray-600">Not found.</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">{(order as any).service?.name || 'Custom Ad'} • #{order.id.slice(0,8)}</h2>
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
            <div>Name: {order.first_name} {order.last_name}</div>
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
                  <div className="p-2 text-xs text-gray-500 dark:text-gray-400 truncate">{file.name}</div>
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
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100">{p.status.replace('_',' ')}</span>
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
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
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


