import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, MapPin, Play, Pause, Edit, BarChart3, Plus, Eye, Clock, CheckCircle, X, Upload } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { HostService, HostAdAssignment, HostAd, HostKiosk } from '../../services/hostService';
import ProofOfPlayWidget from '../shared/ProofOfPlayWidget';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { toLocalDateString } from '../../utils/dateUtils';

export default function AdAssignment() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addNotification } = useNotification();
  const [assignments, setAssignments] = useState<HostAdAssignment[]>([]);
  const [ads, setAds] = useState<HostAd[]>([]);
  const [kiosks, setKiosks] = useState<HostKiosk[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewAssignment, setShowNewAssignment] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<HostAdAssignment | null>(null);
  const [newAssignment, setNewAssignment] = useState({
    adId: '',
    kioskId: '',
    startDate: '',
    endDate: '',
    priority: 1
  });

  useEffect(() => {
    const loadData = async () => {
      if (!user?.id) return;
      
      try {
        setLoading(true);
        const [assignmentsData, adsData, kiosksData] = await Promise.all([
          HostService.getHostAdAssignments(user.id),
          HostService.getHostAds(user.id),
          HostService.getHostKiosks(user.id)
        ]);

        setAssignments(assignmentsData);
        
        // Filter ads to only show those that can be manually assigned
        // (exclude approved ads that are already automatically assigned)
        const availableAds = adsData.filter(ad => {
          if (ad.status !== 'active') return false;
          
          // Check if this ad already has active assignments (auto-assigned by admin)
          const hasActiveAssignments = assignmentsData.some(assignment => 
            assignment.ad_id === ad.id && assignment.status === 'active'
          );
          
          return !hasActiveAssignments;
        });
        
        setAds(availableAds);
        setKiosks(kiosksData); // HostService now filters for active kiosks
      } catch (error) {
        console.error('Error loading assignment data:', error);
        addNotification('error', 'Error', 'Failed to load assignment data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user?.id, addNotification]);

  const handleCreateAssignment = async () => {
    if (!user?.id || !newAssignment.adId || !newAssignment.kioskId || !newAssignment.startDate || !newAssignment.endDate) {
      addNotification('error', 'Validation Error', 'Please fill in all required fields');
      return;
    }

    try {
      const assignment = await HostService.createAdAssignment({
        hostId: user.id,
        adId: newAssignment.adId,
        kioskId: newAssignment.kioskId,
        startDate: newAssignment.startDate,
        endDate: newAssignment.endDate,
        priority: newAssignment.priority
      });

      setAssignments(prev => [assignment, ...prev]);
      setShowNewAssignment(false);
      setNewAssignment({
        adId: '',
        kioskId: '',
        startDate: '',
        endDate: '',
        priority: 1
      });
      
      addNotification('success', 'Assignment Created', 'Ad assignment has been created successfully');
    } catch (error) {
      console.error('Error creating assignment:', error);
      addNotification('error', 'Creation Failed', 'Failed to create ad assignment');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'approved': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'rejected': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'paused': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400';
      case 'completed': return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <Play className="h-4 w-4" />;
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'approved': return <CheckCircle className="h-4 w-4" />;
      case 'rejected': return <X className="h-4 w-4" />;
      case 'paused': return <Pause className="h-4 w-4" />;
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Ad Assignment</h1>
          <p className="mt-2">Loading assignment data...</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
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
          <h1 className="text-3xl font-bold">Ad Assignment</h1>
          <p className="mt-2">Assign and schedule ads to your kiosks</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={() => setShowNewAssignment(true)}
            disabled={ads.length === 0 || kiosks.length === 0}
          >
            <Plus className="h-4 w-4 mr-2" />
            New Assignment
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid md:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Assignments</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {assignments.filter(a => a.status === 'active').length}
              </p>
            </div>
            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <Play className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Pending Review</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {assignments.filter(a => a.status === 'pending').length}
              </p>
            </div>
            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <Clock className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Available Ads</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {ads.length}
              </p>
            </div>
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <Eye className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Kiosks</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {kiosks.length}
              </p>
            </div>
            <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <MapPin className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </Card>
      </div>

      {/* New Assignment Modal */}
      {showNewAssignment && (
        <Card className="p-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Create New Assignment</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Assign an approved ad to a kiosk</p>
            </div>
            <Button variant="secondary" size="sm" onClick={() => setShowNewAssignment(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Select Ad *
              </label>
              <select
                value={newAssignment.adId}
                onChange={(e) => setNewAssignment(prev => ({ ...prev, adId: e.target.value }))}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="">Choose an ad...</option>
                {ads.map(ad => (
                  <option key={ad.id} value={ad.id}>{ad.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Select Kiosk *
              </label>
              <select
                value={newAssignment.kioskId}
                onChange={(e) => setNewAssignment(prev => ({ ...prev, kioskId: e.target.value }))}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="">Choose a kiosk...</option>
                {kiosks.map(kiosk => (
                  <option key={kiosk.id} value={kiosk.kiosk.id}>{kiosk.kiosk.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Start Date *
              </label>
              <input
                type="date"
                value={newAssignment.startDate}
                onChange={(e) => setNewAssignment(prev => ({ ...prev, startDate: toLocalDateString(e.target.value) }))}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                End Date *
              </label>
              <input
                type="date"
                value={newAssignment.endDate}
                onChange={(e) => setNewAssignment(prev => ({ ...prev, endDate: toLocalDateString(e.target.value) }))}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Priority
              </label>
              <select
                value={newAssignment.priority}
                onChange={(e) => setNewAssignment(prev => ({ ...prev, priority: parseInt(e.target.value) }))}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
              >
                <option value={1}>Low (1)</option>
                <option value={2}>Medium (2)</option>
                <option value={3}>High (3)</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <Button variant="secondary" onClick={() => setShowNewAssignment(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateAssignment}>
              Create Assignment
            </Button>
          </div>
        </Card>
      )}

      {/* Assignments Table */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Current Assignments</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Ad</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Kiosk</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Schedule</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Priority</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
              {assignments.map((assignment) => (
                <tr key={assignment.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{assignment.ad.name}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {assignment.ad.media_type} • {assignment.ad.duration}s
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <MapPin className="h-4 w-4 text-gray-400 mr-2" />
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{assignment.kiosk.name}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">{assignment.kiosk.city}, {assignment.kiosk.state}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                    <div>
                      <div>{new Date(assignment.start_date).toLocaleDateString()}</div>
                      <div className="text-gray-500 dark:text-gray-400">to {new Date(assignment.end_date).toLocaleDateString()}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(assignment.status)}`}>
                      {getStatusIcon(assignment.status)}
                      <span className="ml-1">{assignment.status}</span>
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      assignment.priority === 3 ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' :
                      assignment.priority === 2 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' :
                      'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                    }`}>
                      {assignment.priority === 3 ? 'High' : assignment.priority === 2 ? 'Medium' : 'Low'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setSelectedAssignment(assignment)}
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          // TODO: Implement edit functionality
                          addNotification('info', 'Edit Assignment', 'Edit functionality will be implemented soon');
                        }}
                        title="Edit Assignment"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* PoP Information for Ad Assignments */}
      <ProofOfPlayWidget
        accountId={user?.id}
        title="Play Activity for Assigned Ads"
        showTable={true}
        showExport={true}
        maxRecords={15}
        dateRange={{
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          endDate: new Date().toISOString().split('T')[0]
        }}
      />

      {/* Assignment Details Modal */}
      {selectedAssignment && (
        <Card className="p-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Assignment Details</h3>
              <p className="text-gray-600 dark:text-gray-400">Assignment ID: {selectedAssignment.id}</p>
            </div>
            <Button variant="secondary" size="sm" onClick={() => setSelectedAssignment(null)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-3">Ad Information</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Name:</span>
                  <span className="text-sm font-medium">{selectedAssignment.ad.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Type:</span>
                  <span className="text-sm font-medium">{selectedAssignment.ad.media_type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Duration:</span>
                  <span className="text-sm font-medium">{selectedAssignment.ad.duration}s</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Status:</span>
                  <span className={`text-sm font-medium ${getStatusColor(selectedAssignment.ad.status)}`}>
                    {selectedAssignment.ad.status}
                  </span>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-3">Kiosk Information</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Name:</span>
                  <span className="text-sm font-medium">{selectedAssignment.kiosk.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Location:</span>
                  <span className="text-sm font-medium">{selectedAssignment.kiosk.location}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">City:</span>
                  <span className="text-sm font-medium">{selectedAssignment.kiosk.city}, {selectedAssignment.kiosk.state}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <h4 className="font-medium text-gray-900 dark:text-white mb-3">Schedule Details</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <span className="text-sm text-gray-600 dark:text-gray-400">Start Date:</span>
                <div className="text-sm font-medium">{new Date(selectedAssignment.start_date).toLocaleDateString()}</div>
              </div>
              <div>
                <span className="text-sm text-gray-600 dark:text-gray-400">End Date:</span>
                <div className="text-sm font-medium">{new Date(selectedAssignment.end_date).toLocaleDateString()}</div>
              </div>
              <div>
                <span className="text-sm text-gray-600 dark:text-gray-400">Priority:</span>
                <div className="text-sm font-medium">
                  {selectedAssignment.priority === 3 ? 'High' : selectedAssignment.priority === 2 ? 'Medium' : 'Low'}
                </div>
              </div>
            </div>
          </div>

          {/* PoP Information for Selected Assignment */}
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <ProofOfPlayWidget
              accountId={user?.id}
              campaignId={selectedAssignment.campaign_id}
              kioskId={selectedAssignment.kiosk_id}
              title={`Play Activity - ${selectedAssignment.ad.name}`}
              showTable={true}
              maxRecords={10}
              dateRange={{
                startDate: selectedAssignment.start_date,
                endDate: selectedAssignment.end_date
              }}
            />
          </div>
        </Card>
      )}
    </div>
  );
}