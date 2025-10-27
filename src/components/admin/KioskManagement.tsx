import React, { useState, useEffect, useCallback } from 'react';
import { Monitor, MapPin, Wifi, WifiOff, Settings, Search, Download, Upload, RefreshCw, FileText, X, Folder, User, UserPlus, UserMinus, Plus, Trash2 } from 'lucide-react';
import { useNotification } from '../../contexts/NotificationContext';
import { AdminService } from '../../services/adminService';
import { supabase } from '../../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import LeafletMap from '../MapContainer';

interface Kiosk {
  id: string;
  name: string;
  location: string;
  address: string;
  city: string;
  state: string;
  traffic_level: 'low' | 'medium' | 'high';
  base_rate: number;
  price: number;
  status: 'active' | 'inactive' | 'maintenance';
  coordinates: {
    lat: number;
    lng: number;
  };
  description?: string;
  content_restrictions?: string[];
  created_at: string;
  updated_at: string;
  host_assignments?: Array<{
    id: string;
    host_id: string;
    status: 'active' | 'inactive' | 'suspended';
    commission_rate: number;
    assigned_at: string;
    host: {
      id: string;
      full_name: string;
      email: string;
      company_name?: string;
    };
  }>;
}

interface Host {
  id: string;
  full_name: string;
  email: string;
  company_name?: string;
  role: string;
}

export default function KioskManagement() {
  const { addNotification } = useNotification();
  const navigate = useNavigate();
  const [kiosks, setKiosks] = useState<Kiosk[]>([]);
  const [hosts, setHosts] = useState<Host[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [trafficFilter, setTrafficFilter] = useState<string>('all');
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedKiosk, setSelectedKiosk] = useState<Kiosk | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Kiosk>>({});
  const [assignForm, setAssignForm] = useState({
    kioskId: '',
    hostId: '',
    commissionRate: 70.00
  });
  const [createForm, setCreateForm] = useState({
    name: '',
    location: '',
    address: '',
    city: '',
    state: '',
    traffic_level: 'medium' as 'low' | 'medium' | 'high',
    base_rate: 0,
    price: 0,
    status: 'active' as 'active' | 'inactive' | 'maintenance',
    coordinates: { lat: 0, lng: 0 },
    description: ''
  });
  const [creating, setCreating] = useState(false);

  const loadKiosks = useCallback(async () => {
    try {
      setLoading(true);
      const data = await AdminService.getKiosksWithHosts();
      setKiosks(data || []);
    } catch (error) {
      console.error('Error loading kiosks:', error);
      addNotification('error', 'Error', 'Failed to load kiosks');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Remove addNotification dependency to prevent unnecessary reloads

  const loadHosts = useCallback(async () => {
    try {
      const data = await AdminService.getAllHosts();
      setHosts(data || []);
    } catch (error) {
      console.error('Error loading hosts:', error);
      addNotification('error', 'Error', 'Failed to load hosts');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Remove addNotification dependency to prevent unnecessary reloads

  useEffect(() => {
    loadKiosks();
    loadHosts();
  }, [loadKiosks, loadHosts]);

  const exportKiosks = async () => {
    try {
      const csvData = await AdminService.exportKiosks();
      const blob = new Blob([csvData], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kiosks-export-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      addNotification('success', 'Export Complete', 'Kiosks have been exported to CSV');
    } catch (error) {
      console.error('Error exporting kiosks:', error);
      addNotification('error', 'Error', 'Failed to export kiosks');
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'text/csv') {
      setImportFile(file);
    } else {
      addNotification('error', 'Invalid File', 'Please select a CSV file');
    }
  };

  const handleAssignFolders = (kioskId: string) => {
    navigate(`/admin/kiosk-folders?kiosk=${kioskId}`);
  };

  const handleShowLocation = (kiosk: Kiosk) => {
    setSelectedKiosk(kiosk);
    setShowLocationModal(true);
  };

  const handleShowSettings = (kiosk: Kiosk) => {
    setSelectedKiosk(kiosk);
    setEditForm({
      name: kiosk.name,
      location: kiosk.location,
      address: kiosk.address,
      city: kiosk.city,
      state: kiosk.state,
      traffic_level: kiosk.traffic_level,
      base_rate: kiosk.base_rate,
      price: kiosk.price,
      status: kiosk.status,
      description: kiosk.description,
      coordinates: { lat: kiosk.coordinates.lat, lng: kiosk.coordinates.lng },
      content_restrictions: kiosk.content_restrictions || []
    });
    setShowSettingsModal(true);
  };

  const handleShowAssign = (kiosk: Kiosk) => {
    setSelectedKiosk(kiosk);
    setAssignForm({
      kioskId: kiosk.id,
      hostId: '',
      commissionRate: 70.00
    });
    setShowAssignModal(true);
  };

  const handleDeleteKiosk = async (kiosk: Kiosk) => {
    if (!confirm(`Are you sure you want to delete "${kiosk.name}"? This will permanently remove the kiosk and all its Google Drive folders. This action cannot be undone.`)) {
      return;
    }

    try {
      await AdminService.deleteKiosk(kiosk.id);
      addNotification('success', 'Kiosk Deleted', `Kiosk "${kiosk.name}" and its Google Drive folders have been successfully deleted`);
      await loadKiosks(); // Refresh the kiosk list
    } catch (error) {
      console.error('Error deleting kiosk:', error);
      addNotification('error', 'Delete Failed', 'Failed to delete kiosk. Please try again.');
    }
  };

  const handleAssignHost = async () => {
    if (!assignForm.kioskId || !assignForm.hostId) {
      addNotification('error', 'Validation Error', 'Please select both a kiosk and a host');
      return;
    }

    try {
      await AdminService.assignKioskToHost(
        assignForm.kioskId,
        assignForm.hostId,
        assignForm.commissionRate
      );
      
      addNotification('success', 'Host Assignment Complete', 'Kiosk successfully assigned to host user');
      setShowAssignModal(false);
      setSelectedKiosk(null);
      setAssignForm({
        kioskId: '',
        hostId: '',
        commissionRate: 70.00
      });
      await loadKiosks();
    } catch (error) {
      console.error('Error assigning kiosk to host:', error);
      addNotification('error', 'Host Assignment Failed', 'Failed to assign kiosk to host user');
    }
  };

  const handleUnassignHost = async (assignmentId: string) => {
    try {
      await AdminService.unassignKioskFromHost(assignmentId);
      addNotification('success', 'Host Unassignment Complete', 'Kiosk unassigned from host user successfully');
      await loadKiosks();
    } catch (error) {
      console.error('Error unassigning kiosk from host:', error);
      addNotification('error', 'Host Unassignment Failed', 'Failed to unassign kiosk from host user');
    }
  };


  const handleSaveSettings = async () => {
    if (!selectedKiosk) return;
    try {
      setSavingSettings(true);
      const { error } = await supabase
        .from('kiosks')
        .update({
          name: editForm.name,
          location: editForm.location,
          address: editForm.address,
          city: editForm.city,
          state: editForm.state,
          traffic_level: editForm.traffic_level,
          base_rate: editForm.base_rate,
          price: editForm.price,
          status: editForm.status,
          description: editForm.description,
          coordinates: editForm.coordinates,
          content_restrictions: (editForm.content_restrictions || [])
        })
        .eq('id', selectedKiosk.id);

      if (error) throw error;
      addNotification('success', 'Saved', 'Kiosk settings updated');
      setShowSettingsModal(false);
      setSelectedKiosk(null);
      await loadKiosks();
    } catch (err) {
      console.error('Error saving kiosk settings:', err);
      addNotification('error', 'Error', 'Failed to save kiosk settings');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleCreateKiosk = async () => {
    try {
      setCreating(true);
      
      // Validate required fields
      if (!createForm.name || !createForm.location || !createForm.address || 
          !createForm.city || !createForm.state || createForm.base_rate <= 0 || 
          createForm.price <= 0 || createForm.coordinates.lat === 0 || createForm.coordinates.lng === 0) {
        addNotification('error', 'Validation Error', 'Please fill in all required fields including valid coordinates');
        return;
      }

      const newKiosk = await AdminService.createKiosk(createForm);
      addNotification('success', 'Kiosk Created', `Successfully created kiosk "${newKiosk.name}"`);
      setShowCreateModal(false);
      setCreateForm({
        name: '',
        location: '',
        address: '',
        city: '',
        state: '',
        traffic_level: 'medium',
        base_rate: 0,
        price: 0,
        status: 'active',
        coordinates: { lat: 0, lng: 0 },
        description: ''
      });
      await loadKiosks();
    } catch (error) {
      console.error('Error creating kiosk:', error);
      addNotification('error', 'Error', 'Failed to create kiosk');
    } finally {
      setCreating(false);
    }
  };

  const importKiosks = async () => {
    if (!importFile) return;

    try {
      setImporting(true);
      const text = await importFile.text();
      const lines = text.split('\n').filter(line => line.trim());
      const headers = lines[0].split(',');
      const errors: string[] = [];
      let success = 0;

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',');
        if (values.length !== headers.length) {
          errors.push(`Row ${i + 1}: Invalid number of columns`);
          continue;
        }

        const kioskData = {
          name: values[0],
          location: values[1],
          address: values[2],
          city: values[3],
          state: values[4],
          traffic_level: values[5] as 'low' | 'medium' | 'high',
          base_rate: Number(values[6]),
          price: Number(values[7]),
          status: values[8] as 'active' | 'inactive' | 'maintenance',
          coordinates: {
            lat: Number(values[9]),
            lng: Number(values[10])
          },
          description: values[11] || null
        };

        try {
          const { error } = await supabase
            .from('kiosks')
            .insert(kioskData);

          if (error) {
            errors.push(`Row ${i + 1}: ${error.message}`);
          } else {
            success++;
          }
        } catch (err) {
          errors.push(`Row ${i + 1}: ${err}`);
        }
      }

      addNotification(
        'success', 
        'Import Complete', 
        `Successfully imported ${success} kiosks. ${errors.length} errors occurred.`
      );

      if (errors.length > 0) {
        console.log('Import errors:', errors);
      }

      setShowImportModal(false);
      setImportFile(null);
      loadKiosks();
    } catch (error) {
      console.error('Error importing kiosks:', error);
      addNotification('error', 'Error', 'Failed to import kiosks');
    } finally {
      setImporting(false);
    }
  };

  const filteredKiosks = kiosks.filter(kiosk => {
    const matchesSearch = 
      kiosk.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      kiosk.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      kiosk.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
      kiosk.state.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || kiosk.status === statusFilter;
    const matchesTraffic = trafficFilter === 'all' || kiosk.traffic_level === trafficFilter;
    
    return matchesSearch && matchesStatus && matchesTraffic;
  });

  const stats = {
    total: kiosks.length,
    active: kiosks.filter(k => k.status === 'active').length,
    inactive: kiosks.filter(k => k.status === 'inactive').length,
    maintenance: kiosks.filter(k => k.status === 'maintenance').length
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'maintenance': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTrafficColor = (traffic: string) => {
    switch (traffic) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return Wifi;
      case 'inactive': return WifiOff;
      case 'maintenance': return Settings;
      default: return WifiOff;
    }
  };

  return (
    <div className="space-y-4 lg:space-y-6 px-2 sm:px-4 lg:px-0">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center space-y-4 lg:space-y-0">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">Kiosk Management</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Assign kiosks to host users for ad management and revenue tracking</p>
        </div>
        <div className="flex flex-wrap gap-2 lg:gap-3">
          <button
            onClick={loadKiosks}
            disabled={loading}
            className="flex items-center space-x-2 px-3 lg:px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 text-sm lg:text-base"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center space-x-2 px-3 lg:px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm lg:text-base"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Create New Kiosk</span>
            <span className="sm:hidden">Create</span>
          </button>
          <button
            onClick={() => setShowAssignModal(true)}
            className="flex items-center space-x-2 px-3 lg:px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm lg:text-base"
          >
            <UserPlus className="h-4 w-4" />
            <span className="hidden sm:inline">Assign Kiosk to Host</span>
            <span className="sm:hidden">Assign</span>
          </button>
          <button
            onClick={exportKiosks}
            className="flex items-center space-x-2 px-3 lg:px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm lg:text-base"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Export CSV</span>
            <span className="sm:hidden">Export</span>
          </button>
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center space-x-2 px-3 lg:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm lg:text-base"
          >
            <Upload className="h-4 w-4" />
            <span className="hidden sm:inline">Import CSV</span>
            <span className="sm:hidden">Import</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 p-4 lg:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Kiosks</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">{stats.total}</p>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg">
              <Monitor className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 p-4 lg:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">{stats.active}</p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <Wifi className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 p-4 lg:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Inactive</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">{stats.inactive}</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <WifiOff className="h-6 w-6 text-gray-600" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 p-4 lg:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Maintenance</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">{stats.maintenance}</p>
            </div>
            <div className="p-3 bg-yellow-50 rounded-lg">
              <Settings className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 lg:p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 min-w-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search kiosks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-2">
            <div className="sm:w-48">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="maintenance">Maintenance</option>
              </select>
            </div>
            <div className="sm:w-48">
              <select
                value={trafficFilter}
                onChange={(e) => setTrafficFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="all">All Traffic Levels</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Kiosks Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-4 lg:px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Kiosks</h3>
        </div>
        
        {loading ? (
          <div className="p-6 text-center">
            <RefreshCw className="h-8 w-8 text-gray-400 animate-spin mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">Loading kiosks...</p>
          </div>
        ) : filteredKiosks.length === 0 ? (
          <div className="p-6 text-center">
            <Monitor className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No kiosks found</h3>
            <p className="text-gray-500 dark:text-gray-400">No kiosks match your current filters.</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden lg:block">
              <table className="w-full table-fixed">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="w-1/6 px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Kiosk
                    </th>
                    <th className="w-1/5 px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Location
                    </th>
                    <th className="w-20 px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Traffic
                    </th>
                    <th className="w-24 px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Pricing
                    </th>
                    <th className="w-1/6 px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Host
                    </th>
                    <th className="w-20 px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="w-32 px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredKiosks.map((kiosk) => {
                    const StatusIcon = getStatusIcon(kiosk.status);
                    return (
                      <tr key={kiosk.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-3 py-3">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-8 w-8">
                              <div className="h-8 w-8 rounded-lg bg-purple-100 flex items-center justify-center">
                                <StatusIcon className="h-4 w-4 text-purple-600" />
                              </div>
                            </div>
                            <div className="ml-2 min-w-0">
                              <div className="text-sm font-medium text-gray-900 dark:text-white truncate">{kiosk.name}</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{kiosk.id}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <div className="text-sm text-gray-900 dark:text-white truncate">{kiosk.location}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{kiosk.city}, {kiosk.state}</div>
                        </td>
                        <td className="px-3 py-3">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTrafficColor(kiosk.traffic_level)}`}>
                            {kiosk.traffic_level}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <div className="text-sm text-gray-900 dark:text-white">${kiosk.price.toFixed(2)}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">Base: ${kiosk.base_rate.toFixed(2)}</div>
                        </td>
                        <td className="px-3 py-3">
                          {kiosk.host_assignments && kiosk.host_assignments.length > 0 ? (
                            <div className="space-y-1">
                              {kiosk.host_assignments.map((assignment) => (
                                <div key={assignment.id} className="flex items-center space-x-1">
                                  <User className="h-3 w-3 text-gray-400 flex-shrink-0" />
                                  <span className="text-xs text-gray-900 dark:text-white truncate">
                                    {assignment.host.full_name}
                                  </span>
                                  <button
                                    onClick={() => handleUnassignHost(assignment.id)}
                                    className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 flex-shrink-0"
                                    title="Unassign host"
                                  >
                                    <UserMinus className="h-3 w-3" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-xs text-gray-500 dark:text-gray-400">No host</div>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(kiosk.status)}`}>
                            {kiosk.status}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex flex-wrap gap-1">
                            <button 
                              onClick={() => handleShowAssign(kiosk)}
                              className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                              title="Assign Kiosk to Host User"
                            >
                              <UserPlus className="h-4 w-4" />
                            </button>
                            <button 
                              onClick={() => handleAssignFolders(kiosk.id)}
                              className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                              title="Assign Google Drive Folders"
                            >
                              <Folder className="h-4 w-4" />
                            </button>
                            <button onClick={() => handleShowLocation(kiosk)} className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300">
                              <MapPin className="h-4 w-4" />
                            </button>
                            <button onClick={() => handleShowSettings(kiosk)} className="text-purple-600 hover:text-purple-900 dark:text-purple-400 dark:hover:text-purple-300">
                              <Settings className="h-4 w-4" />
                            </button>
                            <button 
                              onClick={() => handleDeleteKiosk(kiosk)} 
                              className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                              title="Delete Kiosk"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="lg:hidden">
              <div className="space-y-3">
                {filteredKiosks.map((kiosk) => {
                  const StatusIcon = getStatusIcon(kiosk.status);
                  return (
                    <div key={kiosk.id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3 mx-1">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-3 min-w-0 flex-1">
                          <div className="flex-shrink-0 h-8 w-8">
                            <div className="h-8 w-8 rounded-lg bg-purple-100 flex items-center justify-center">
                              <StatusIcon className="h-4 w-4 text-purple-600" />
                            </div>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium text-gray-900 dark:text-white truncate">{kiosk.name}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{kiosk.id}</div>
                            <div className="text-xs text-gray-600 dark:text-gray-300 truncate">{kiosk.location}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{kiosk.city}, {kiosk.state}</div>
                          </div>
                        </div>
                        <div className="flex-shrink-0 ml-2">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(kiosk.status)}`}>
                            {kiosk.status}
                          </span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Traffic</div>
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTrafficColor(kiosk.traffic_level)}`}>
                            {kiosk.traffic_level}
                          </span>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Pricing</div>
                          <div className="text-sm text-gray-900 dark:text-white">${kiosk.price.toFixed(2)}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">Base: ${kiosk.base_rate.toFixed(2)}</div>
                        </div>
                      </div>

                      {kiosk.host_assignments && kiosk.host_assignments.length > 0 && (
                        <div className="mb-3">
                          <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">Host</div>
                          <div className="space-y-2">
                            {kiosk.host_assignments.map((assignment) => (
                              <div key={assignment.id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 rounded px-2 py-1">
                                <div className="flex items-center space-x-2 min-w-0 flex-1">
                                  <User className="h-3 w-3 text-gray-400 flex-shrink-0" />
                                  <span className="text-xs text-gray-900 dark:text-white truncate">
                                    {assignment.host.full_name}
                                  </span>
                                </div>
                                <button
                                  onClick={() => handleUnassignHost(assignment.id)}
                                  className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 flex-shrink-0 ml-2"
                                  title="Unassign host"
                                >
                                  <UserMinus className="h-3 w-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-2">
                        <button 
                          onClick={() => handleShowAssign(kiosk)}
                          className="flex items-center justify-center space-x-1 px-2 py-2 text-xs bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200 dark:bg-indigo-900 dark:text-indigo-300 dark:hover:bg-indigo-800 transition-colors"
                        >
                          <UserPlus className="h-3 w-3" />
                          <span>Assign</span>
                        </button>
                        <button 
                          onClick={() => handleAssignFolders(kiosk.id)}
                          className="flex items-center justify-center space-x-1 px-2 py-2 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 dark:bg-green-900 dark:text-green-300 dark:hover:bg-green-800 transition-colors"
                        >
                          <Folder className="h-3 w-3" />
                          <span>Folders</span>
                        </button>
                        <button 
                          onClick={() => handleShowLocation(kiosk)} 
                          className="flex items-center justify-center space-x-1 px-2 py-2 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-300 dark:hover:bg-blue-800 transition-colors"
                        >
                          <MapPin className="h-3 w-3" />
                          <span>Location</span>
                        </button>
                        <button 
                          onClick={() => handleShowSettings(kiosk)} 
                          className="flex items-center justify-center space-x-1 px-2 py-2 text-xs bg-purple-100 text-purple-700 rounded hover:bg-purple-200 dark:bg-purple-900 dark:text-purple-300 dark:hover:bg-purple-800 transition-colors"
                        >
                          <Settings className="h-3 w-3" />
                          <span>Settings</span>
                        </button>
                        <button 
                          onClick={() => handleDeleteKiosk(kiosk)} 
                          className="flex items-center justify-center space-x-1 px-2 py-2 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 dark:bg-red-900 dark:text-red-300 dark:hover:bg-red-800 transition-colors"
                        >
                          <Trash2 className="h-3 w-3" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-4 lg:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Import Kiosks</h3>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportFile(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select CSV File
                </label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                {importFile && (
                  <div className="mt-2 flex items-center space-x-2 text-sm text-green-600">
                    <FileText className="h-4 w-4" />
                    <span>{importFile.name}</span>
                  </div>
                )}
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-2">CSV Format</h4>
                <p className="text-xs text-blue-800 dark:text-blue-300">
                  Required columns: name, location, address, city, state, traffic_level, base_rate, price, status, lat, lng, description (optional)
                </p>
                <p className="text-xs text-blue-800 dark:text-blue-300 mt-1">
                  Traffic levels: low, medium, high | Status: active, inactive, maintenance
                </p>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowImportModal(false);
                    setImportFile(null);
                  }}
                  className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-600 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={importKiosks}
                  disabled={!importFile || importing}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
                >
                  {importing ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  <span>{importing ? 'Importing...' : 'Import'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Location Modal */}
      {showLocationModal && selectedKiosk && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-4 lg:p-6 w-full max-w-3xl h-[70vh] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Location - {selectedKiosk.name}</h3>
              <button onClick={() => { setShowLocationModal(false); setSelectedKiosk(null); }} className="text-gray-400 hover:text-gray-600">
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="flex-1">
              <LeafletMap
                center={[selectedKiosk.coordinates.lat, selectedKiosk.coordinates.lng] as [number, number]}
                zoom={14}
                kioskData={[{
                  id: selectedKiosk.id,
                  name: selectedKiosk.name,
                  city: `${selectedKiosk.city}, ${selectedKiosk.state}`,
                  price: `$${selectedKiosk.price.toFixed(2)}`,
                  traffic: selectedKiosk.traffic_level === 'high' ? 'High Traffic' : selectedKiosk.traffic_level === 'medium' ? 'Medium Traffic' : 'Low Traffic',
                  position: [selectedKiosk.coordinates.lat, selectedKiosk.coordinates.lng] as [number, number],
                  address: selectedKiosk.address
                }]}
              />
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettingsModal && selectedKiosk && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-4 lg:p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Edit Settings - {selectedKiosk.name}</h3>
              <button onClick={() => { setShowSettingsModal(false); setSelectedKiosk(null); }} className="text-gray-400 hover:text-gray-600">
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
                <input value={editForm.name || ''} onChange={(e) => setEditForm(f => ({ ...f, name: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Location</label>
                <input value={editForm.location || ''} onChange={(e) => setEditForm(f => ({ ...f, location: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Address</label>
                <input value={editForm.address || ''} onChange={(e) => setEditForm(f => ({ ...f, address: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">City</label>
                <input value={editForm.city || ''} onChange={(e) => setEditForm(f => ({ ...f, city: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">State</label>
                <input value={editForm.state || ''} onChange={(e) => setEditForm(f => ({ ...f, state: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Traffic</label>
                <select value={editForm.traffic_level || 'low'} onChange={(e) => setEditForm(f => ({ ...f, traffic_level: e.target.value as Kiosk['traffic_level'] }))} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded">
                  <option value="low">low</option>
                  <option value="medium">medium</option>
                  <option value="high">high</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Base Rate</label>
                <input type="number" step="0.01" value={editForm.base_rate ?? 0} onChange={(e) => setEditForm(f => ({ ...f, base_rate: Number(e.target.value) }))} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Price</label>
                <input type="number" step="0.01" value={editForm.price ?? 0} onChange={(e) => setEditForm(f => ({ ...f, price: Number(e.target.value) }))} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                <select value={editForm.status || 'active'} onChange={(e) => setEditForm(f => ({ ...f, status: e.target.value as Kiosk['status'] }))} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded">
                  <option value="active">active</option>
                  <option value="inactive">inactive</option>
                  <option value="maintenance">maintenance</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <textarea value={editForm.description || ''} onChange={(e) => setEditForm(f => ({ ...f, description: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Content Restrictions</label>
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">Enter one restriction per line, e.g. "No Gyms", "No Alcohol"</div>
                <textarea
                  value={(editForm.content_restrictions || []).join('\n')}
                  onChange={(e) => {
                    const lines = e.target.value.split('\n').map(s => s.trim()).filter(Boolean);
                    setEditForm(f => ({ ...f, content_restrictions: lines }));
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded min-h-[120px]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Latitude</label>
                <input type="number" step="0.000001" value={editForm.coordinates?.lat ?? 0} onChange={(e) => setEditForm(f => ({ ...f, coordinates: { lat: Number(e.target.value), lng: f.coordinates?.lng ?? 0 } as Kiosk['coordinates'] }))} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Longitude</label>
                <input type="number" step="0.000001" value={editForm.coordinates?.lng ?? 0} onChange={(e) => setEditForm(f => ({ ...f, coordinates: { lat: f.coordinates?.lat ?? 0, lng: Number(e.target.value) } as Kiosk['coordinates'] }))} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded" />
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <button onClick={() => { setShowSettingsModal(false); setSelectedKiosk(null); }} className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-600 rounded hover:bg-gray-200 dark:hover:bg-gray-500">Cancel</button>
              <button onClick={handleSaveSettings} disabled={savingSettings} className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 flex items-center space-x-2">
                {savingSettings && <RefreshCw className="h-4 w-4 animate-spin" />}
                <span>{savingSettings ? 'Saving...' : 'Save'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Host Assignment Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-4 lg:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Assign Kiosk to Host</h3>
              <button onClick={() => { setShowAssignModal(false); setSelectedKiosk(null); setAssignForm({kioskId: '', hostId: '', commissionRate: 70.00}); }} className="text-gray-400 hover:text-gray-600">
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Select Kiosk</label>
                <select
                  value={assignForm.kioskId}
                  onChange={(e) => setAssignForm(f => ({ ...f, kioskId: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="">Select a kiosk...</option>
                  {kiosks.map(kiosk => (
                    <option key={kiosk.id} value={kiosk.id}>
                      {kiosk.name} - {kiosk.location}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Select Host</label>
                <select
                  value={assignForm.hostId}
                  onChange={(e) => setAssignForm(f => ({ ...f, hostId: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="">Select a host...</option>
                  {hosts.map(host => (
                    <option key={host.id} value={host.id}>
                      {host.full_name} ({host.email})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Commission Rate (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={assignForm.commissionRate}
                  onChange={(e) => setAssignForm(f => ({ ...f, commissionRate: Number(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <div className="bg-blue-50 dark:bg-gray-800 border border-blue-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-2">Commission Information</h4>
                <p className="text-xs text-blue-800 dark:text-blue-300">
                  The host will receive {assignForm.commissionRate.toFixed(2)}% of the revenue generated from this kiosk. 
                  The platform will keep the remaining {(100 - assignForm.commissionRate).toFixed(2)}%.
                </p>
              </div>
              <div className="bg-yellow-50 dark:bg-gray-800 border border-yellow-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-yellow-900 dark:text-yellow-300 mb-2">Note</h4>
                <p className="text-xs text-yellow-800 dark:text-yellow-300">
                  If no host is assigned, the admin will be the default host for this kiosk. 
                  Hosts can only manage ads and view revenue for their assigned kiosks.
                </p>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => { setShowAssignModal(false); setSelectedKiosk(null); }}
                  className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-600 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAssignHost}
                  disabled={!assignForm.kioskId || !assignForm.hostId}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
                >
                  <UserPlus className="h-4 w-4" />
                  <span>Assign to Host</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Kiosk Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-4 lg:p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Create New Kiosk</h3>
              <button 
                onClick={() => { 
                  setShowCreateModal(false); 
                  setCreateForm({
                    name: '',
                    location: '',
                    address: '',
                    city: '',
                    state: '',
                    traffic_level: 'medium',
                    base_rate: 0,
                    price: 0,
                    status: 'active',
                    coordinates: { lat: 0, lng: 0 },
                    description: ''
                  });
                }} 
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Kiosk Name *</label>
                <input
                  type="text"
                  value={createForm.name}
                  onChange={(e) => setCreateForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Enter kiosk name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Location *</label>
                <input
                  type="text"
                  value={createForm.location}
                  onChange={(e) => setCreateForm(f => ({ ...f, location: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Enter location"
                />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Address *</label>
                <input
                  type="text"
                  value={createForm.address}
                  onChange={(e) => setCreateForm(f => ({ ...f, address: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Enter full address"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">City *</label>
                <input
                  type="text"
                  value={createForm.city}
                  onChange={(e) => setCreateForm(f => ({ ...f, city: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Enter city"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">State *</label>
                <input
                  type="text"
                  value={createForm.state}
                  onChange={(e) => setCreateForm(f => ({ ...f, state: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Enter state"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Traffic Level *</label>
                <select
                  value={createForm.traffic_level}
                  onChange={(e) => setCreateForm(f => ({ ...f, traffic_level: e.target.value as 'low' | 'medium' | 'high' }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                <select
                  value={createForm.status}
                  onChange={(e) => setCreateForm(f => ({ ...f, status: e.target.value as 'active' | 'inactive' | 'maintenance' }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="maintenance">Maintenance</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Base Rate ($) *</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={createForm.base_rate}
                  onChange={(e) => setCreateForm(f => ({ ...f, base_rate: Number(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="0.00"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Price ($) *</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={createForm.price}
                  onChange={(e) => setCreateForm(f => ({ ...f, price: Number(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="0.00"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Latitude *</label>
                <input
                  type="number"
                  step="0.000001"
                  value={createForm.coordinates.lat}
                  onChange={(e) => setCreateForm(f => ({ ...f, coordinates: { ...f.coordinates, lat: Number(e.target.value) } }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="0.000000"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Longitude *</label>
                <input
                  type="number"
                  step="0.000001"
                  value={createForm.coordinates.lng}
                  onChange={(e) => setCreateForm(f => ({ ...f, coordinates: { ...f.coordinates, lng: Number(e.target.value) } }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="0.000000"
                />
              </div>
              
              <div className="md:col-span-2">
                <div className="bg-blue-50 dark:bg-gray-800 border border-blue-200 dark:border-gray-600 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-2">Coordinate Helper</h4>
                  <p className="text-xs text-blue-800 dark:text-blue-300 mb-3">
                    You can get coordinates from Google Maps by right-clicking on a location and copying the coordinates.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      if (navigator.geolocation) {
                        navigator.geolocation.getCurrentPosition(
                          (position) => {
                            setCreateForm(f => ({
                              ...f,
                              coordinates: {
                                lat: position.coords.latitude,
                                lng: position.coords.longitude
                              }
                            }));
                            addNotification('success', 'Location Found', 'Current location coordinates have been set');
                          },
                          (error) => {
                            console.error('Geolocation error:', error);
                            addNotification('error', 'Location Error', 'Could not get current location. Please enter coordinates manually.');
                          }
                        );
                      } else {
                        addNotification('error', 'Not Supported', 'Geolocation is not supported by this browser. Please enter coordinates manually.');
                      }
                    }}
                    className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition-colors"
                  >
                    Use Current Location
                  </button>
                </div>
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <textarea
                  value={createForm.description}
                  onChange={(e) => setCreateForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Enter kiosk description (optional)"
                  rows={3}
                />
              </div>
            </div>
            
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => { 
                  setShowCreateModal(false); 
                  setCreateForm({
                    name: '',
                    location: '',
                    address: '',
                    city: '',
                    state: '',
                    traffic_level: 'medium',
                    base_rate: 0,
                    price: 0,
                    status: 'active',
                    coordinates: { lat: 0, lng: 0 },
                    description: ''
                  });
                }}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-600 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateKiosk}
                disabled={creating}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center space-x-2 transition-colors"
              >
                {creating && <RefreshCw className="h-4 w-4 animate-spin" />}
                <Plus className="h-4 w-4" />
                <span>{creating ? 'Creating...' : 'Create Kiosk'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}