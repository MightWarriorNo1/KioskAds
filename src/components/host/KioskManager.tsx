import React, { useState, useEffect } from 'react';
import { Monitor, MapPin, Wifi, WifiOff, Settings, BarChart3, Plus, Eye, DollarSign, TrendingUp, List, Map, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { HostService, HostKiosk } from '../../services/hostService';
import ProofOfPlayWidget from '../shared/ProofOfPlayWidget';
import LeafletMap from '../MapContainer';
import Card from '../ui/Card';
import Button from '../ui/Button';

export default function KioskManager() {
  const { user } = useAuth();
  const { addNotification } = useNotification();
  const [view, setView] = useState<'list' | 'map'>('list');
  const [kiosks, setKiosks] = useState<HostKiosk[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedKiosk, setSelectedKiosk] = useState<HostKiosk | null>(null);

  useEffect(() => {
    const loadKiosks = async () => {
      if (!user?.id) return;
      
      try {
        setLoading(true);
        const kiosksData = await HostService.getHostKiosks(user.id);
        setKiosks(kiosksData);
      } catch (error) {
        console.error('Error loading kiosks:', error);
        addNotification('error', 'Error', 'Failed to load kiosks');
      } finally {
        setLoading(false);
      }
    };

    loadKiosks();
  }, [user?.id, addNotification]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'inactive': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'maintenance': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const getTrafficColor = (traffic: string) => {
    switch (traffic) {
      case 'high': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const handleKioskSelect = (kiosk: HostKiosk) => {
    setSelectedKiosk(kiosk);
    // Don't show notification for selection, just update state
  };

  const handleViewToggle = (newView: 'list' | 'map') => {
    setView(newView);
  };

  // Convert kiosks to map data format
  const mapKioskData = kiosks.map(kiosk => ({
    id: kiosk.kiosk.id,
    name: kiosk.kiosk.name,
    city: kiosk.kiosk.city,
    price: `$${kiosk.kiosk.price}`,
    traffic: `${kiosk.kiosk.traffic_level.charAt(0).toUpperCase() + kiosk.kiosk.traffic_level.slice(1)} Traffic`,
    position: [kiosk.kiosk.coordinates.lat, kiosk.kiosk.coordinates.lng] as [number, number],
    hasWarning: kiosk.kiosk.status !== 'active'
  }));

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Kiosk Manager</h1>
          <p className="mt-2">Loading your kiosks...</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 animate-pulse">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-4"></div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full mb-2"></div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Kiosk Manager</h1>
          <p className="mt-2">Manage and monitor your assigned kiosks</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={view === 'list' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => handleViewToggle('list')}
          >
            <List className="h-4 w-4 mr-2" />
            List
          </Button>
          <Button
            variant={view === 'map' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => handleViewToggle('map')}
          >
            <Map className="h-4 w-4 mr-2" />
            Map
          </Button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Kiosks</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{kiosks.length}</p>
            </div>
            <Monitor className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </div>
        </Card>
        
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Kiosks</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {kiosks.filter(k => k.kiosk.status === 'active').length}
              </p>
            </div>
            <Wifi className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
        </Card>
        
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">High Traffic</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {kiosks.filter(k => k.kiosk.traffic_level === 'high').length}
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-orange-600 dark:text-orange-400" />
          </div>
        </Card>
        
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Avg. Commission</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {kiosks.length > 0 ? `${(kiosks.reduce((sum, k) => sum + k.commission_rate, 0) / kiosks.length).toFixed(1)}%` : '0%'}
              </p>
            </div>
            <DollarSign className="h-8 w-8 text-purple-600 dark:text-purple-400" />
          </div>
        </Card>
      </div>

      {/* Main Content */}
      {view === 'list' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {kiosks.map((kiosk) => (
            <Card key={kiosk.id} className="p-6 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => handleKioskSelect(kiosk)}>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{kiosk.kiosk.name}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{kiosk.kiosk.location}</p>
                </div>
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(kiosk.kiosk.status)}`}>
                  {kiosk.kiosk.status}
                </span>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Traffic Level</span>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTrafficColor(kiosk.kiosk.traffic_level)}`}>
                    {kiosk.kiosk.traffic_level}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Base Rate</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">${kiosk.kiosk.base_rate}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Commission</span>
                  <span className="text-sm font-medium text-green-600 dark:text-green-400">{kiosk.commission_rate}%</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Location</span>
                  <span className="text-sm text-gray-900 dark:text-white">{kiosk.kiosk.city}, {kiosk.kiosk.state}</span>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500 dark:text-gray-400">Assigned</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {new Date(kiosk.assigned_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Kiosk Locations</h3>
          {mapKioskData.length > 0 ? (
            <div className="h-96 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
              <LeafletMap
                kioskData={mapKioskData}
                onKioskSelect={(kiosk) => {
                  const hostKiosk = kiosks.find(k => k.kiosk.id === kiosk.id);
                  if (hostKiosk) {
                    handleKioskSelect(hostKiosk);
                  }
                }}
                center={mapKioskData[0].position}
                zoom={11}
                className="h-full w-full"
              />
            </div>
          ) : (
            <div className="h-96 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center bg-gray-50 dark:bg-gray-800">
              <div className="text-center">
                <div className="text-gray-400 dark:text-gray-500 mb-2">
                  <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <p className="text-gray-500 dark:text-gray-400">No kiosks available for mapping</p>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* PoP Information for All Kiosks */}
      <ProofOfPlayWidget
        accountId={user?.id}
        title="Play Activity Across All Kiosks"
        showTable={true}
        showExport={true}
        maxRecords={20}
        dateRange={{
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          endDate: new Date().toISOString().split('T')[0]
        }}
      />

      {/* Selected Kiosk Details */}
      {selectedKiosk && (
        <Card className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{selectedKiosk.kiosk.name}</h3>
              <p className="text-gray-600 dark:text-gray-400">{selectedKiosk.kiosk.location}</p>
            </div>
            <Button variant="secondary" size="sm" onClick={() => setSelectedKiosk(null)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-3">Kiosk Information</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Status:</span>
                  <span className={`text-sm font-medium ${getStatusColor(selectedKiosk.kiosk.status)}`}>
                    {selectedKiosk.kiosk.status}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Traffic Level:</span>
                  <span className={`text-sm font-medium ${getTrafficColor(selectedKiosk.kiosk.traffic_level)}`}>
                    {selectedKiosk.kiosk.traffic_level}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Base Rate:</span>
                  <span className="text-sm font-medium">${selectedKiosk.kiosk.base_rate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Commission Rate:</span>
                  <span className="text-sm font-medium text-green-600 dark:text-green-400">{selectedKiosk.commission_rate}%</span>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-3">Location Details</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Address:</span>
                  <span className="text-sm text-right">{selectedKiosk.kiosk.address}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">City:</span>
                  <span className="text-sm">{selectedKiosk.kiosk.city}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">State:</span>
                  <span className="text-sm">{selectedKiosk.kiosk.state}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Coordinates:</span>
                  <span className="text-sm font-mono">
                    {selectedKiosk.kiosk.coordinates.lat.toFixed(4)}, {selectedKiosk.kiosk.coordinates.lng.toFixed(4)}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          {selectedKiosk.kiosk.description && (
            <div className="mt-6">
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">Description</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">{selectedKiosk.kiosk.description}</p>
            </div>
          )}

          {/* PoP Information for Selected Kiosk */}
          <div className="mt-6">
            <ProofOfPlayWidget
              accountId={user?.id}
              kioskId={selectedKiosk.kiosk.id}
              title={`Play Activity - ${selectedKiosk.kiosk.name}`}
              showTable={true}
              maxRecords={10}
              dateRange={{
                startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                endDate: new Date().toISOString().split('T')[0]
              }}
            />
          </div>
        </Card>
      )}
    </div>
  );
}