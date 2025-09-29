import { useEffect, useMemo, useState } from 'react';
import { Upload, Download } from 'lucide-react';
import { AdminService, InvitationItem } from '../../../services/adminService';

export default function Invitations() {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'client' | 'host' | 'designer' | 'admin'>('client');
  const [expires, setExpires] = useState<number>(7);
  const [statusFilter, setStatusFilter] = useState<'all'|'pending'|'sent'|'accepted'|'expired'|'revoked'>('all');
  const [roleFilter, setRoleFilter] = useState<'all'|'client'|'host'|'designer'|'admin'>('all');
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<InvitationItem[]>([]);

  const load = async () => {
    setLoading(true);
    try {
      const data = await AdminService.getInvitations({ status: statusFilter, role: roleFilter });
      setItems(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [statusFilter, roleFilter]);

  const onSendInvite = async () => {
    if (!email) return;
    await AdminService.sendInvitation(email, role, expires);
    setEmail('');
    await load();
  };

  const onResend = async (id: string) => { await AdminService.resendInvitation(id); await load(); };
  const onRevoke = async (id: string) => { await AdminService.revokeInvitation(id); await load(); };
  const onCancelAllPending = async () => { await AdminService.cancelAllPendingInvitations(); await load(); };

  const statusBadge = (s: InvitationItem['status']) => {
    const map: Record<InvitationItem['status'], string> = {
      pending: 'bg-yellow-900/20 text-yellow-300',
      sent: 'bg-blue-900/20 text-blue-300',
      accepted: 'bg-green-900/20 text-green-300',
      expired: 'bg-red-900/20 text-red-300',
      revoked: 'bg-gray-700 text-gray-300'
    };
    const label = s.charAt(0).toUpperCase() + s.slice(1);
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${map[s]}`}>{label}</span>;
  };

  return (
    <div className="space-y-4">
      {/* New Invitation */}
      <div className="bg-slate-900 rounded-xl border border-slate-700 p-4">
        <div className="text-slate-200 font-semibold mb-2">New Invitation</div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-center">
          <input value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="name@example.com" className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-slate-100" />
          <select value={role} onChange={(e)=>setRole(e.target.value as any)} className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-slate-100">
            <option value="client">Client</option>
            <option value="host">Host</option>
            <option value="designer">Designer</option>
            <option value="admin">Admin</option>
          </select>
          <select value={expires} onChange={(e)=>setExpires(Number(e.target.value))} className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-slate-100">
            <option value={7}>7 days</option>
            <option value={14}>14 days</option>
            <option value={30}>30 days</option>
          </select>
          <button onClick={onSendInvite} disabled={loading} className="bg-amber-500 hover:bg-amber-600 text-black font-semibold rounded-lg px-4 py-2">Send Invite</button>
        </div>
      </div>

      {/* Bulk Actions */}
      <div className="bg-slate-900 rounded-xl border border-slate-700 p-4">
        <div className="text-slate-200 font-semibold mb-3">Bulk Actions</div>
        <div className="flex flex-wrap gap-3">
          <label className="bg-slate-800 border border-slate-600 text-slate-100 rounded-lg px-3 py-2 inline-flex items-center gap-2 cursor-pointer">
            <Upload className="h-4 w-4"/>
            <span>Upload CSV</span>
            <input type="file" accept=".csv" className="hidden" onChange={async (e)=>{
              const file = e.target.files?.[0];
              if (!file) return;
              const text = await file.text();
              // Expect header: email,role,expires_days
              const lines = text.split(/\r?\n/).filter(l=>l.trim().length>0);
              if (!lines.length) return;
              const header = lines[0].split(',').map(h=>h.trim().toLowerCase());
              const emailIdx = header.indexOf('email');
              const roleIdx = header.indexOf('role');
              const expIdx = header.indexOf('expires_days');
              const rows: any[] = [];
              for (let i=1;i<lines.length;i++){
                const cols = lines[i].split(',');
                const email = cols[emailIdx]?.trim();
                const role = (cols[roleIdx]?.trim() as any) || 'client';
                const expires_days = Number((cols[expIdx]?.trim())||'7')||7;
                if (email) rows.push({ email, role, expires_days });
              }
              if (rows.length){
                await AdminService.bulkCreateInvitations(rows);
                await load();
              }
              e.currentTarget.value='';
            }} />
          </label>
          <a
            href={`data:text/csv;charset=utf-8,${encodeURIComponent('email,role,expires_days\nclient@example.com,client,7\nhost@example.com,host,14')}`}
            download="invitations_template.csv"
            className="bg-slate-800 border border-slate-600 text-slate-100 rounded-lg px-3 py-2 inline-flex items-center gap-2"
          >
            <Download className="h-4 w-4"/>Download Template
          </a>
          <button onClick={onCancelAllPending} className="bg-red-800/60 border border-red-700 text-red-100 rounded-lg px-3 py-2">Cancel All Pending</button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select value={statusFilter} onChange={(e)=>setStatusFilter(e.target.value as any)} className="bg-slate-900 border border-slate-700 text-slate-100 rounded-lg px-3 py-2">
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="sent">Sent</option>
          <option value="accepted">Accepted</option>
          <option value="expired">Expired</option>
          <option value="revoked">Revoked</option>
        </select>
        <select value={roleFilter} onChange={(e)=>setRoleFilter(e.target.value as any)} className="bg-slate-900 border border-slate-700 text-slate-100 rounded-lg px-3 py-2">
          <option value="all">All Roles</option>
          <option value="client">Client</option>
          <option value="host">Host</option>
          <option value="designer">Designer</option>
          <option value="admin">Admin</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-slate-900 rounded-xl border border-slate-700">
        <div className="px-4 py-3 border-b border-slate-700 text-slate-200 font-semibold">Pending & Sent Invitations</div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-800 text-slate-300">
              <tr>
                <th className="text-left px-4 py-2">Email</th>
                <th className="text-left px-4 py-2">Role</th>
                <th className="text-left px-4 py-2">Status</th>
                <th className="text-left px-4 py-2">Sent</th>
                <th className="text-left px-4 py-2">Expires</th>
                <th className="text-left px-4 py-2">Invited By</th>
                <th className="text-right px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map(it => (
                <tr key={it.id} className="border-t border-slate-800">
                  <td className="px-4 py-2 text-slate-100">{it.email}</td>
                  <td className="px-4 py-2 text-slate-300 capitalize">{it.role}</td>
                  <td className="px-4 py-2">{statusBadge(it.status)}</td>
                  <td className="px-4 py-2 text-slate-300">{it.sent_at ? new Date(it.sent_at).toLocaleString() : '—'}</td>
                  <td className="px-4 py-2 text-slate-300">{it.expires_at ? new Date(it.expires_at).toLocaleDateString() : '—'}</td>
                  <td className="px-4 py-2 text-slate-300">{it.invited_by || 'admin'}</td>
                  <td className="px-4 py-2">
                    <div className="flex justify-end gap-2">
                      {(it.status === 'pending' || it.status === 'sent') && (
                        <button onClick={()=>onResend(it.id)} className="bg-slate-800 border border-slate-600 text-slate-100 rounded-lg px-3 py-1">Resend</button>
                      )}
                      {it.status !== 'accepted' && it.status !== 'revoked' && (
                        <button onClick={()=>onRevoke(it.id)} className="bg-slate-800 border border-slate-600 text-slate-100 rounded-lg px-3 py-1">Revoke</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-slate-400">No invitations found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}


