import React, { useEffect, useMemo, useState } from 'react';
import { Calendar, Clock, Play, PauseCircle, CheckCircle2, XCircle, RefreshCw, Search } from 'lucide-react';
import { AdminService, AdminCampaignItem } from '../../services/adminService';
import { useNotification } from '../../contexts/NotificationContext';

export default function AdminCampaigns() {
  const { addNotification } = useNotification();
  const [campaigns, setCampaigns] = useState<AdminCampaignItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

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

  const Section = ({ title, items }: { title: string; items: AdminCampaignItem[] }) => (
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
              <div className="flex flex-col md:flex-row md:items-start md:justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white truncate max-w-full">{c.name}</h4>
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 capitalize flex-shrink-0">{c.status}</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">{c.description || '—'}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
                    <span className="inline-flex items-center gap-1"><Calendar className="h-4 w-4" />{new Date(c.start_date).toLocaleDateString()} - {new Date(c.end_date).toLocaleDateString()}</span>
                    <span className="inline-flex items-center gap-1"><Clock className="h-4 w-4" />Budget: ${c.budget.toLocaleString()}</span>
                    {c.user && (
                      <span className="inline-flex items-center gap-1">Owner: {c.user.full_name} ({c.user.company_name || c.user.email}) · Role: {c.user.role ? c.user.role : 'Unknown'}</span>
                    )}
                  </div>
                </div>
                <div className="mt-3 w-full md:w-64 md:ml-4">
                  <label className="block text-xs text-gray-600 dark:text-gray-300 mb-1">Max video duration (seconds)</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min={5}
                      max={120}
                      placeholder="15"
                      className="w-full md:w-24 px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      onBlur={async (e) => {
                        const val = parseInt(e.target.value, 10);
                        if (!isNaN(val) && val > 0) {
                          try {
                            await AdminService.setCampaignMaxVideoDuration(c.id, val);
                          } catch (err) {
                            console.error(err);
                          }
                        }
                      }}
                    />
                    <button
                      className="px-3 py-1 rounded bg-purple-600 text-white text-xs hover:bg-purple-700"
                      onClick={async () => {
                        try {
                          await AdminService.setCampaignMaxVideoDuration(c.id, 15);
                        } catch (err) {
                          console.error(err);
                        }
                      }}
                      title="Reset to 15s"
                    >Reset</button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Campaigns</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Overview of all client campaigns</p>
        </div>
        <button
          onClick={loadCampaigns}
          disabled={loading}
          className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      <div className="grid md:grid-cols-4 gap-6">
        <Stat label="Total" value={campaigns.length} icon={Calendar} color="bg-gray-50" />
        <Stat label="Active" value={categorized.active.length} icon={Play} color="bg-green-50" />
        <Stat label="Upcoming" value={categorized.upcoming.length} icon={PauseCircle} color="bg-blue-50" />
        <Stat label="Expired" value={categorized.expired.length} icon={XCircle} color="bg-red-50" />
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-gray-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, owner, company, email..."
            className="w-full bg-transparent outline-none text-sm text-gray-900 dark:text-white placeholder:text-gray-400"
          />
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Section title="Active" items={categorized.active} />
        <Section title="Upcoming" items={categorized.upcoming} />
        <Section title="Expired" items={categorized.expired} />
      </div>
    </div>
  );
}


