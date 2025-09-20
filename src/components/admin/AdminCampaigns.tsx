import { useEffect, useMemo, useState } from 'react';
import { Calendar, Play, PauseCircle, XCircle, RefreshCw, Search, Edit, Save, X, DollarSign, Filter } from 'lucide-react';
import { AdminService, AdminCampaignItem } from '../../services/adminService';
import { useNotification } from '../../contexts/NotificationContext';

type ExtendedAdminCampaignItem = AdminCampaignItem & { max_video_duration?: number };

export default function AdminCampaigns() {
  const { addNotification } = useNotification();
  const [campaigns, setCampaigns] = useState<ExtendedAdminCampaignItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'upcoming' | 'expired'>('all');
  const [editingCampaign, setEditingCampaign] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{
    name: string;
    description: string;
    status: string;
    budget: number;
    dailyBudget: number;
    startDate: string;
    endDate: string;
  }>({
    name: '',
    description: '',
    status: '',
    budget: 0,
    dailyBudget: 0,
    startDate: '',
    endDate: ''
  });
  const [pendingMaxById, setPendingMaxById] = useState<Record<string, number>>({});

  useEffect(() => {
    loadCampaigns();
  }, []);

  const loadCampaigns = async () => {
    try {
      setLoading(true);
      const data = await AdminService.getAllCampaigns();
      setCampaigns(data);
    } catch (error) {
      console.error('Error loading campaigns:', error);
      addNotification('error', 'Error', 'Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  };

  const startEditing = (campaign: ExtendedAdminCampaignItem) => {
    setEditingCampaign(campaign.id);
    setEditForm({
      name: campaign.name,
      description: campaign.description || '',
      status: campaign.status,
      budget: campaign.budget,
      dailyBudget: campaign.daily_budget || 0,
      startDate: campaign.start_date,
      endDate: campaign.end_date
    });
  };

  const cancelEditing = () => {
    setEditingCampaign(null);
    setEditForm({
      name: '',
      description: '',
      status: '',
      budget: 0,
      dailyBudget: 0,
      startDate: '',
      endDate: ''
    });
  };

  const saveCampaignChanges = async (campaignId: string) => {
    try {
      const campaign = campaigns.find(c => c.id === campaignId);
      if (!campaign) return;

      // Update campaign details
      await AdminService.updateCampaignDetails(campaignId, {
        name: editForm.name,
        description: editForm.description
      });

      // Update status if changed
      if (editForm.status !== campaign.status) {
        await AdminService.updateCampaignStatus(campaignId, editForm.status as any);
      }

      // Update budget if changed
      if (editForm.budget !== campaign.budget || editForm.dailyBudget !== (campaign.daily_budget || 0)) {
        await AdminService.updateCampaignBudget(campaignId, editForm.budget, editForm.dailyBudget);
      }

      // Update dates if changed
      if (editForm.startDate !== campaign.start_date || editForm.endDate !== campaign.end_date) {
        await AdminService.updateCampaignDates(campaignId, editForm.startDate, editForm.endDate);
      }

      // Reload campaigns to reflect changes
      await loadCampaigns();
      setEditingCampaign(null);
      addNotification('success', 'Campaign Updated', 'Campaign has been updated successfully');
    } catch (error) {
      console.error('Error updating campaign:', error);
      addNotification('error', 'Update Failed', 'Failed to update campaign');
    }
  };

  const updateCampaignStatus = async (campaignId: string, status: string) => {
    try {
      await AdminService.updateCampaignStatus(campaignId, status as any);
      await loadCampaigns();
      addNotification('success', 'Status Updated', `Campaign status changed to ${status}`);
    } catch (error) {
      console.error('Error updating campaign status:', error);
      addNotification('error', 'Update Failed', 'Failed to update campaign status');
    }
  };

  const now = new Date();
  const categorized = useMemo(() => {
    const matchesQuery = (c: AdminCampaignItem) => {
      const q = query.trim().toLowerCase();
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        (c.description || '').toLowerCase().includes(q) ||
        (c.user?.full_name || '').toLowerCase().includes(q) ||
        (c.user?.email || '').toLowerCase().includes(q) ||
        (c.user?.company_name || '').toLowerCase().includes(q)
      );
    };

    const active = campaigns.filter(c => matchesQuery(c) && new Date(c.start_date) <= now && new Date(c.end_date) >= now && c.status === 'active');
    const upcoming = campaigns.filter(c => matchesQuery(c) && new Date(c.start_date) > now);
    const expired = campaigns.filter(c => matchesQuery(c) && new Date(c.end_date) < now);
    
    return { active, upcoming, expired };
  }, [campaigns, query, now]);

  const filteredCampaigns = useMemo(() => {
    const allCampaigns = campaigns.filter(c => {
      const q = query.trim().toLowerCase();
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        (c.description || '').toLowerCase().includes(q) ||
        (c.user?.full_name || '').toLowerCase().includes(q) ||
        (c.user?.email || '').toLowerCase().includes(q) ||
        (c.user?.company_name || '').toLowerCase().includes(q)
      );
    });

    switch (statusFilter) {
      case 'active':
        return categorized.active;
      case 'upcoming':
        return categorized.upcoming;
      case 'expired':
        return categorized.expired;
      case 'all':
      default:
        return allCampaigns;
    }
  }, [campaigns, query, statusFilter, categorized]);

  const Stat = ({ label, value, icon: Icon, color }: { label: string; value: number | string; icon: any; color: string }) => (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{label}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">{value}</p>
        </div>
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );

  const CampaignList = ({ items, title }: { items: AdminCampaignItem[]; title: string }) => (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title} ({items.length})</h3>
      </div>
      {items.length === 0 ? (
        <div className="p-6 text-center text-gray-500 dark:text-gray-400">No campaigns</div>
      ) : (
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {items.map(c => (
            <div key={c.id} className="p-6">
              {editingCampaign === c.id ? (
                // Edit Mode
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Edit Campaign</h4>
                    <div className="flex gap-2">
                      <button
                        onClick={() => saveCampaignChanges(c.id)}
                        className="flex items-center gap-1 px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                      >
                        <Save className="h-4 w-4" />
                        Save
                      </button>
                      <button
                        onClick={cancelEditing}
                        className="flex items-center gap-1 px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700"
                      >
                        <X className="h-4 w-4" />
                        Cancel
                      </button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Campaign Name</label>
                      <input
                        type="text"
                        value={editForm.name}
                        onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                      <select
                        value={editForm.status}
                        onChange={(e) => setEditForm(prev => ({ ...prev, status: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        <option value="draft">Draft</option>
                        <option value="pending">Pending</option>
                        <option value="active">Active</option>
                        <option value="paused">Paused</option>
                        <option value="completed">Completed</option>
                        <option value="rejected">Rejected</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Budget ($)</label>
                      <input
                        type="number"
                        value={editForm.budget}
                        onChange={(e) => setEditForm(prev => ({ ...prev, budget: parseFloat(e.target.value) || 0 }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Daily Budget ($)</label>
                      <input
                        type="number"
                        value={editForm.dailyBudget}
                        onChange={(e) => setEditForm(prev => ({ ...prev, dailyBudget: parseFloat(e.target.value) || 0 }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Date</label>
                      <input
                        type="date"
                        value={editForm.startDate}
                        onChange={(e) => setEditForm(prev => ({ ...prev, startDate: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">End Date</label>
                      <input
                        type="date"
                        value={editForm.endDate}
                        onChange={(e) => setEditForm(prev => ({ ...prev, endDate: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                    <textarea
                      value={editForm.description}
                      onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
              ) : (
                // View Mode
                <div className="flex flex-col md:flex-row md:items-start md:justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-white truncate max-w-full">{c.name}</h4>
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 capitalize flex-shrink-0">{c.status}</span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">{c.description || '—'}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
                      <span className="inline-flex items-center gap-1"><Calendar className="h-4 w-4" />{new Date(c.start_date).toLocaleDateString()} - {new Date(c.end_date).toLocaleDateString()}</span>
                      <span className="inline-flex items-center gap-1"><DollarSign className="h-4 w-4" />Budget: ${c.budget.toLocaleString()}</span>
                      {c.daily_budget && (
                        <span className="inline-flex items-center gap-1">Daily: ${c.daily_budget.toLocaleString()}</span>
                      )}
                      {c.user && (
                        <span className="inline-flex items-center gap-1">Owner: {c.user.full_name} ({c.user.company_name || c.user.email}) · Role: {c.user.role ? c.user.role : 'Unknown'}</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="mt-3 flex flex-col gap-2 w-full md:w-64 md:ml-4">
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => startEditing(c)}
                        className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                      >
                        <Edit className="h-4 w-4" />
                        Edit
                      </button>
                      <select
                        value={c.status}
                        onChange={(e) => updateCampaignStatus(c.id, e.target.value)}
                        className="flex-1 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        <option value="draft">Draft</option>
                        <option value="pending">Pending</option>
                        <option value="active">Active</option>
                        <option value="paused">Paused</option>
                        <option value="completed">Completed</option>
                        <option value="rejected">Rejected</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-xs text-gray-600 dark:text-gray-300 mb-1">Max video duration (seconds) (max 60s)</label>
          <div className="flex gap-2 items-center flex-wrap">
            <input
              type="number"
              min={5}
              max={60}
              value={Number.isFinite(pendingMaxById[c.id]) ? pendingMaxById[c.id] : (c.max_video_duration ?? 15)}
              onChange={(e) => {
                const raw = parseInt(e.target.value, 10);
                setPendingMaxById(prev => ({ ...prev, [c.id]: isNaN(raw) ? (c.max_video_duration ?? 15) : raw }));
              }}
              placeholder={(c.max_video_duration ?? 15).toString()}
              className="w-full md:w-28 px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            <button
              className="px-3 py-1 rounded bg-green-600 text-white text-xs hover:bg-green-700"
              onClick={async () => {
                const raw = Number.isFinite(pendingMaxById[c.id]) ? pendingMaxById[c.id] : (c.max_video_duration ?? 15);
                const val = Math.max(5, Math.min(60, Number(raw)));
                try {
                  await AdminService.setCampaignMaxVideoDuration(c.id, val);
                  await loadCampaigns();
                  setPendingMaxById(prev => ({ ...prev, [c.id]: val }));
                  addNotification('success', 'Duration Updated', `Max video duration set to ${val}s`);
                } catch (err) {
                  console.error(err);
                  addNotification('error', 'Update Failed', 'Failed to update video duration');
                }
              }}
              title="Set max duration"
            >Set</button>
            <span className="text-xs text-gray-500 dark:text-gray-400">Current: {c.max_video_duration ?? 15}s</span>
            <button
              className="px-3 py-1 rounded bg-purple-600 text-white text-xs hover:bg-purple-700"
              onClick={async () => {
                try {
                  await AdminService.setCampaignMaxVideoDuration(c.id, 15);
                  await loadCampaigns();
                  setPendingMaxById(prev => ({ ...prev, [c.id]: 15 }));
                  addNotification('success', 'Duration Reset', 'Max video duration reset to 15s');
                } catch (err) {
                  console.error(err);
                  addNotification('error', 'Reset Failed', 'Failed to reset video duration');
                }
              }}
              title="Reset to 15s"
            >Reset</button>
          </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Campaigns</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1 sm:mt-2">Overview of all client campaigns</p>
        </div>
        <button
          onClick={loadCampaigns}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 w-full sm:w-auto"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
        <Stat label="Total" value={campaigns.length} icon={Calendar} color="bg-gray-50" />
        <Stat label="Active" value={categorized.active.length} icon={Play} color="bg-green-50" />
        <Stat label="Upcoming" value={categorized.upcoming.length} icon={PauseCircle} color="bg-blue-50" />
        <Stat label="Expired" value={categorized.expired.length} icon={XCircle} color="bg-red-50" />
      </div>

      {/* Filter Controls */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex items-center gap-2 flex-1">
            <Search className="h-4 w-4 text-gray-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, owner, company, email..."
              className="w-full bg-transparent outline-none text-sm text-gray-900 dark:text-white placeholder:text-gray-400"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'upcoming' | 'expired')}
              className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">All Campaigns</option>
              <option value="active">Active</option>
              <option value="upcoming">Upcoming</option>
              <option value="expired">Expired</option>
            </select>
          </div>
        </div>
      </div>

      {/* Campaign Display */}
      {statusFilter === 'all' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
          <CampaignList title="Active" items={categorized.active} />
          <CampaignList title="Upcoming" items={categorized.upcoming} />
          <CampaignList title="Expired" items={categorized.expired} />
        </div>
      ) : (
        <div className="max-w-4xl mx-auto">
          <CampaignList 
            title={`${statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)} Campaigns`} 
            items={filteredCampaigns} 
          />
        </div>
      )}
    </div>
  );
}


