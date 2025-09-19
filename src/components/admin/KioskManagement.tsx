import React, { useState, useEffect } from 'react';
import { Monitor, MapPin, Wifi, WifiOff, Settings, Search, Download, Upload, RefreshCw, FileText, X, Folder, User, UserPlus, UserMinus } from 'lucide-react';
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
  const [selectedKiosk, setSelectedKiosk] = useState<Kiosk | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Kiosk>>({});
  const [assignForm, setAssignForm] = useState({
    kioskId: '',
    hostId: '',
    commissionRate: 70.00
  });

  useEffect(() => {
    loadKiosks();
    loadHosts();
  }, []);

  const loadKiosks = async () => {
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
  };

  const loadHosts = async () => {
    try {
      const data = await AdminService.getAllHosts();
      setHosts(data || []);
    } catch (error) {
      console.error('Error loading hosts:', error);
      addNotification('error', 'Error', 'Failed to load hosts');
    }
  };

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
      coordinates: { lat: kiosk.coordinates.lat, lng: kiosk.coordinates.lng }
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
          coordinates: editForm.coordinates
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Kiosk Management</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Assign kiosks to host users for ad management and revenue tracking</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={loadKiosks}
            disabled={loading}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => setShowAssignModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <UserPlus className="h-4 w-4" />
            <span>Assign Kiosk to Host</span>
          </button>
          <button
            onClick={exportKiosks}
            className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Download className="h-4 w-4" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Upload className="h-4 w-4" />
            <span>Import CSV</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 p-6">
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

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 p-6">
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

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 p-6">
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

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 p-6">
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
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-64">
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
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="maintenance">Maintenance</option>
            </select>
          </div>
          <div>
            <select
              value={trafficFilter}
              onChange={(e) => setTrafficFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="all">All Traffic Levels</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* Kiosks Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
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
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Kiosk
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Traffic
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Pricing
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Host
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredKiosks.map((kiosk) => {
                  const StatusIcon = getStatusIcon(kiosk.status);
                  return (
                    <tr key={kiosk.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                              <StatusIcon className="h-5 w-5 text-purple-600" />
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">{kiosk.name}</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">{kiosk.id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white">{kiosk.location}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">{kiosk.city}, {kiosk.state}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">{kiosk.address}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTrafficColor(kiosk.traffic_level)}`}>
                          {kiosk.traffic_level}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white">${kiosk.price.toFixed(2)}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">Base: ${kiosk.base_rate.toFixed(2)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {kiosk.host_assignments && kiosk.host_assignments.length > 0 ? (
                          <div className="space-y-1">
                            {kiosk.host_assignments.map((assignment) => (
                              <div key={assignment.id} className="flex items-center space-x-2">
                                <div className="flex items-center space-x-1">
                                  <User className="h-3 w-3 text-gray-400" />
                                  <span className="text-sm text-gray-900 dark:text-white">
                                    {assignment.host.full_name}
                                  </span>
                                </div>
                                <button
                                  onClick={() => handleUnassignHost(assignment.id)}
                                  className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                                  title="Unassign host"
                                >
                                  <UserMinus className="h-3 w-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-sm text-gray-500 dark:text-gray-400">No host assigned</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(kiosk.status)}`}>
                          {kiosk.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
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
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-3xl h-[70vh] mx-4 flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Location - {selectedKiosk.name}</h3>
              <button onClick={() => { setShowLocationModal(false); setSelectedKiosk(null); }} className="text-gray-400 hover:text-gray-600">
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="flex-1">
              <LeafletMap
                center={[selectedKiosk.coordinates.lat, selectedKiosk.coordinates.lng] as any}
                zoom={14}
                kioskData={[{
                  id: selectedKiosk.id,
                  name: selectedKiosk.name,
                  city: `${selectedKiosk.city}, ${selectedKiosk.state}`,
                  price: `$${selectedKiosk.price.toFixed(2)}`,
                  traffic: selectedKiosk.traffic_level === 'high' ? 'High Traffic' : selectedKiosk.traffic_level === 'medium' ? 'Medium Traffic' : 'Low Traffic',
                  position: [selectedKiosk.coordinates.lat, selectedKiosk.coordinates.lng] as any,
                  address: selectedKiosk.address
                }]}
              />
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettingsModal && selectedKiosk && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-2xl mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Edit Settings - {selectedKiosk.name}</h3>
              <button onClick={() => { setShowSettingsModal(false); setSelectedKiosk(null); }} className="text-gray-400 hover:text-gray-600">
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
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
    </div>
  );
}