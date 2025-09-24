import { useState, useEffect } from 'react';
import { Upload, Users, Monitor, Settings, Save, Plus, X, AlertTriangle, CheckCircle, Edit, Trash2 } from 'lucide-react';
import { AdminService } from '../../services/adminService';
import { useNotification } from '../../contexts/NotificationContext';

interface AdUploadLimit {
  id: string;
  host_id?: string;
  kiosk_id?: string;
  max_ads: number;
  current_ads: number;
  limit_type: 'global' | 'host' | 'kiosk';
  is_active: boolean;
  created_at: string;
  updated_at: string;
  host?: {
    id: string;
    full_name: string;
    email: string;
    company_name?: string;
  };
  kiosk?: {
    id: string;
    name: string;
    location: string;
    city: string;
    state: string;
  };
}

interface Host {
  id: string;
  full_name: string;
  email: string;
  company_name?: string;
}

interface Kiosk {
  id: string;
  name: string;
  location: string;
  city: string;
  state: string;
}

export default function AdUploadLimits() {
  const { addNotification } = useNotification();
  const [limits, setLimits] = useState<AdUploadLimit[]>([]);
  const [hosts, setHosts] = useState<Host[]>([]);
  const [kiosks, setKiosks] = useState<Kiosk[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingLimit, setEditingLimit] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState({
    limit_type: 'global' as 'global' | 'host' | 'kiosk',
    host_id: '',
    kiosk_id: '',
    max_ads: 10,
    is_active: true
  });
  const [editForm, setEditForm] = useState({
    max_ads: 10,
    is_active: true
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [limitsData, hostsData, kiosksData] = await Promise.all([
        AdminService.getAdUploadLimits(),
        AdminService.getAllHosts(),
        AdminService.getKiosksWithHosts()
      ]);
      
      // If relationship fields were expected, resolve them separately here if needed
      setLimits(limitsData || []);
      setHosts(hostsData || []);
      setKiosks(kiosksData || []);
    } catch (error) {
      console.error('Error loading data:', error);
      addNotification('error', 'Error', 'Failed to load ad upload limits');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLimit = async () => {
    try {
      setSaving(true);
      
      const limitData = {
        limit_type: createForm.limit_type,
        max_ads: createForm.max_ads,
        is_active: createForm.is_active,
        ...(createForm.limit_type === 'host' && { host_id: createForm.host_id }),
        ...(createForm.limit_type === 'kiosk' && { kiosk_id: createForm.kiosk_id })
      };

      await AdminService.createAdUploadLimit(limitData);
      
      addNotification('success', 'Success', 'Ad upload limit created successfully');
      setShowCreateModal(false);
      setCreateForm({
        limit_type: 'global',
        host_id: '',
        kiosk_id: '',
        max_ads: 10,
        is_active: true
      });
      await loadData();
    } catch (error) {
      console.error('Error creating limit:', error);
      addNotification('error', 'Error', 'Failed to create ad upload limit');
    } finally {
      setSaving(false);
    }
  };

  const handleEditLimit = (limit: AdUploadLimit) => {
    setEditingLimit(limit.id);
    setEditForm({
      max_ads: limit.max_ads,
      is_active: limit.is_active
    });
  };

  const handleSaveEdit = async (limitId: string) => {
    try {
      setSaving(true);
      await AdminService.updateAdUploadLimit(limitId, editForm);
      
      addNotification('success', 'Success', 'Ad upload limit updated successfully');
      setEditingLimit(null);
      await loadData();
    } catch (error) {
      console.error('Error updating limit:', error);
      addNotification('error', 'Error', 'Failed to update ad upload limit');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteLimit = async (limitId: string) => {
    if (!confirm('Are you sure you want to delete this ad upload limit?')) {
      return;
    }

    try {
      await AdminService.deleteAdUploadLimit(limitId);
      addNotification('success', 'Success', 'Ad upload limit deleted successfully');
      await loadData();
    } catch (error) {
      console.error('Error deleting limit:', error);
      addNotification('error', 'Error', 'Failed to delete ad upload limit');
    }
  };

  const getLimitTypeIcon = (type: string) => {
    switch (type) {
      case 'global': return Settings;
      case 'host': return Users;
      case 'kiosk': return Monitor;
      default: return Settings;
    }
  };

  const getLimitTypeColor = (type: string) => {
    switch (type) {
      case 'global': return 'bg-purple-100 text-purple-800';
      case 'host': return 'bg-blue-100 text-blue-800';
      case 'kiosk': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getUsageColor = (current: number, max: number) => {
    const percentage = (current / max) * 100;
    if (percentage >= 90) return 'text-red-600';
    if (percentage >= 75) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getUsageBarColor = (current: number, max: number) => {
    const percentage = (current / max) * 100;
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 75) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Ad Upload Limits
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Configure how many ads hosts can upload to their kiosks
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>Add Limit</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Limits</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">{limits.length}</p>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg">
              <Settings className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Global Limits</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                {limits.filter(l => l.limit_type === 'global').length}
              </p>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg">
              <Settings className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Host Limits</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                {limits.filter(l => l.limit_type === 'host').length}
              </p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Kiosk Limits</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                {limits.filter(l => l.limit_type === 'kiosk').length}
              </p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <Monitor className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Limits List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Upload Limits</h3>
        </div>
        
        {limits.length === 0 ? (
          <div className="p-6 text-center">
            <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No limits configured</h3>
            <p className="text-gray-500 dark:text-gray-400">Create your first ad upload limit to get started.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {limits.map((limit) => {
              const LimitIcon = getLimitTypeIcon(limit.limit_type);
              const isEditing = editingLimit === limit.id;
              
              return (
                <div key={limit.id} className="p-6">
                  {isEditing ? (
                    // Edit Mode
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Edit Limit</h4>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleSaveEdit(limit.id)}
                            disabled={saving}
                            className="flex items-center gap-1 px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50"
                          >
                            <Save className="h-4 w-4" />
                            Save
                          </button>
                          <button
                            onClick={() => setEditingLimit(null)}
                            className="flex items-center gap-1 px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700"
                          >
                            <X className="h-4 w-4" />
                            Cancel
                          </button>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Max Ads
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={editForm.max_ads}
                            onChange={(e) => setEditForm(prev => ({ ...prev, max_ads: parseInt(e.target.value) || 1 }))}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Status
                          </label>
                          <select
                            value={editForm.is_active ? 'active' : 'inactive'}
                            onChange={(e) => setEditForm(prev => ({ ...prev, is_active: e.target.value === 'active' }))}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          >
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  ) : (
                    // View Mode
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <div className="flex items-center space-x-2">
                            <div className="p-2 rounded-lg bg-purple-100">
                              <LimitIcon className="h-4 w-4 text-purple-600" />
                            </div>
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getLimitTypeColor(limit.limit_type)}`}>
                              {limit.limit_type.toUpperCase()}
                            </span>
                            {!limit.is_active && (
                              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                                INACTIVE
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          {limit.limit_type === 'host' && limit.host && (
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              <strong>Host:</strong> {limit.host.full_name} ({limit.host.email})
                            </p>
                          )}
                          
                          {limit.limit_type === 'kiosk' && limit.kiosk && (
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              <strong>Kiosk:</strong> {limit.kiosk.name} - {limit.kiosk.location}, {limit.kiosk.city}, {limit.kiosk.state}
                            </p>
                          )}
                          
                          {limit.limit_type === 'global' && (
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              <strong>Global Limit:</strong> Applies to all hosts and kiosks
                            </p>
                          )}
                        </div>
                        
                        <div className="mt-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              Ad Usage
                            </span>
                            <span className={`text-sm font-semibold ${getUsageColor(limit.current_ads, limit.max_ads)}`}>
                              {limit.current_ads} / {limit.max_ads}
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${getUsageBarColor(limit.current_ads, limit.max_ads)}`}
                              style={{ width: `${Math.min((limit.current_ads / limit.max_ads) * 100, 100)}%` }}
                            />
                          </div>
                          {limit.current_ads >= limit.max_ads && (
                            <div className="flex items-center mt-2 text-sm text-red-600">
                              <AlertTriangle className="h-4 w-4 mr-1" />
                              Limit reached
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="mt-4 flex gap-2 md:mt-0">
                        <button
                          onClick={() => handleEditLimit(limit)}
                          className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                        >
                          <Edit className="h-4 w-4" />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteLimit(limit.id)}
                          className="flex items-center gap-1 px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Create Ad Upload Limit</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Limit Type
                </label>
                <select
                  value={createForm.limit_type}
                  onChange={(e) => setCreateForm(prev => ({ 
                    ...prev, 
                    limit_type: e.target.value as 'global' | 'host' | 'kiosk',
                    host_id: '',
                    kiosk_id: ''
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="global">Global (All Hosts/Kiosks)</option>
                  <option value="host">Host Specific</option>
                  <option value="kiosk">Kiosk Specific</option>
                </select>
              </div>
              
              {createForm.limit_type === 'host' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Select Host
                  </label>
                  <select
                    value={createForm.host_id}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, host_id: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="">Select a host...</option>
                    {hosts.map(host => (
                      <option key={host.id} value={host.id}>
                        {host.full_name} ({host.email})
                      </option>
                    ))}
                  </select>
                </div>
              )}
              
              {createForm.limit_type === 'kiosk' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Select Kiosk
                  </label>
                  <select
                    value={createForm.kiosk_id}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, kiosk_id: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="">Select a kiosk...</option>
                    {kiosks.map(kiosk => (
                      <option key={kiosk.id} value={kiosk.id}>
                        {kiosk.name} - {kiosk.location}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Max Ads
                </label>
                <input
                  type="number"
                  min="1"
                  value={createForm.max_ads}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, max_ads: parseInt(e.target.value) || 1 }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Status
                </label>
                <select
                  value={createForm.is_active ? 'active' : 'inactive'}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, is_active: e.target.value === 'active' }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-600 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateLimit}
                  disabled={saving || (createForm.limit_type === 'host' && !createForm.host_id) || (createForm.limit_type === 'kiosk' && !createForm.kiosk_id)}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
                >
                  <Plus className="h-4 w-4" />
                  <span>{saving ? 'Creating...' : 'Create Limit'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
