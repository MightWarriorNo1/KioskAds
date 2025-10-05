import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, MapPin, Clock, CheckCircle, AlertCircle, Plus, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { HostService, HostAd, HostKiosk, HostAdAssignment } from '../../services/hostService';
import Button from '../ui/Button';
import Card from '../ui/Card';

interface AssignmentForm {
  kioskId: string;
  startDate: string;
  endDate: string;
  priority: number;
}

export default function AdKioskAssignment() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addNotification } = useNotification();
  
  const [ad, setAd] = useState<HostAd | null>(null);
  const [kiosks, setKiosks] = useState<HostKiosk[]>([]);
  const [assignments, setAssignments] = useState<HostAdAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAssignmentForm, setShowAssignmentForm] = useState(false);
  const [assignmentForm, setAssignmentForm] = useState<AssignmentForm>({
    kioskId: '',
    startDate: '',
    endDate: '',
    priority: 1
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      if (!id || !user?.id) return;
      
      try {
        setLoading(true);
        const [ads, kiosksData, assignmentsData] = await Promise.all([
          HostService.getHostAds(user.id),
          HostService.getHostKiosks(user.id),
          HostService.getHostAdAssignments(user.id)
        ]);
        
        const foundAd = ads.find(ad => ad.id === id);
        if (!foundAd) {
          addNotification('error', 'Ad Not Found', 'The requested ad could not be found');
          navigate('/host/ads');
          return;
        }
        
        // Check if this ad is already approved and auto-assigned
        const adAssignments = assignmentsData.filter(assignment => assignment.ad_id === id);
        const hasActiveAssignments = adAssignments.some(assignment => assignment.status === 'active');
        
        if (foundAd.status === 'active' && hasActiveAssignments) {
          addNotification('error', 'Ad Already Assigned', 'This ad has been approved and automatically assigned to your kiosks. You cannot manually assign it again.');
          navigate('/host/ads');
          return;
        }
        
        setAd(foundAd);
        setKiosks(kiosksData);
        setAssignments(adAssignments);
      } catch (error) {
        console.error('Error loading data:', error);
        addNotification('error', 'Error', 'Failed to load data');
        navigate('/host/ads');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id, user?.id, addNotification, navigate]);

  const handleAssignmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!ad || !user?.id) return;
    
    // Validate form
    if (!assignmentForm.kioskId || !assignmentForm.startDate || !assignmentForm.endDate) {
      addNotification('error', 'Validation Error', 'Please fill in all required fields');
      return;
    }
    
    if (new Date(assignmentForm.startDate) >= new Date(assignmentForm.endDate)) {
      addNotification('error', 'Validation Error', 'End date must be after start date');
      return;
    }
    
    try {
      setSubmitting(true);
      
      const newAssignment = await HostService.createAdAssignment({
        hostId: user.id,
        adId: ad.id,
        kioskId: assignmentForm.kioskId,
        startDate: assignmentForm.startDate,
        endDate: assignmentForm.endDate,
        priority: assignmentForm.priority
      });
      
      setAssignments(prev => [...prev, newAssignment]);
      setShowAssignmentForm(false);
      setAssignmentForm({
        kioskId: '',
        startDate: '',
        endDate: '',
        priority: 1
      });
      
      addNotification('success', 'Assignment Created', 'Ad has been assigned to kiosk successfully');
    } catch (error) {
      console.error('Error creating assignment:', error);
      addNotification('error', 'Assignment Failed', 'Failed to assign ad to kiosk');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'approved': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'rejected': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'paused': return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
      case 'completed': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const getAvailableKiosks = () => {
    const assignedKioskIds = assignments.map(assignment => assignment.kiosk_id);
    return kiosks.filter(kiosk => !assignedKioskIds.includes(kiosk.kiosk.id));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (!ad) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          Ad Not Found
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          The requested ad could not be found.
        </p>
        <Button onClick={() => navigate('/host/ads')}>
          Back to Ads
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="secondary"
          onClick={() => navigate('/host/ads')}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Ads
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Assign Ad to Kiosks</h1>
          <p className="text-gray-600 dark:text-gray-400">Assign "{ad.name}" to your kiosks</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ad Preview */}
        <div className="lg:col-span-1">
          <Card title="Ad Preview">
            <div className="space-y-4">
              <div className="aspect-[9/16] bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
                {ad.media_type === 'image' ? (
                  <img
                    src={ad.media_url}
                    alt={ad.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <video
                    src={ad.media_url}
                    className="w-full h-full object-cover"
                    muted
                  />
                )}
              </div>
              
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">{ad.name}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {ad.description || 'No description'}
                </p>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-600 dark:text-gray-400">{ad.duration}s</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(ad.status)}`}>
                    {ad.status.replace('_', ' ')}
                  </span>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Assignments */}
        <div className="lg:col-span-2 space-y-6">
          {/* Current Assignments */}
          <Card title="Current Assignments">
            {assignments.length === 0 ? (
              <div className="text-center py-8">
                <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No Assignments Yet
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  This ad hasn't been assigned to any kiosks yet.
                </p>
                <Button onClick={() => setShowAssignmentForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Assign to Kiosk
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {assignments.map((assignment) => (
                  <div key={assignment.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-medium text-gray-900 dark:text-white">
                            {assignment.kiosk.name}
                          </h4>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(assignment.status)}`}>
                            {assignment.status}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-gray-400" />
                            <span className="text-gray-600 dark:text-gray-400">
                              {assignment.kiosk.location}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            <span className="text-gray-600 dark:text-gray-400">
                              {new Date(assignment.start_date).toLocaleDateString()} - {new Date(assignment.end_date).toLocaleDateString()}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <span className="text-gray-600 dark:text-gray-400">Priority:</span>
                            <span className="text-gray-900 dark:text-white">{assignment.priority}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <Button onClick={() => setShowAssignmentForm(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Assign to Another Kiosk
                  </Button>
                </div>
              </div>
            )}
          </Card>

          {/* Assignment Form */}
          {showAssignmentForm && (
            <Card title="Assign to Kiosk">
              <form onSubmit={handleAssignmentSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Select Kiosk *
                  </label>
                  <select
                    value={assignmentForm.kioskId}
                    onChange={(e) => setAssignmentForm(prev => ({ ...prev, kioskId: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                    required
                  >
                    <option value="">Choose a kiosk...</option>
                    {getAvailableKiosks().map((kiosk) => (
                      <option key={kiosk.kiosk.id} value={kiosk.kiosk.id}>
                        {kiosk.kiosk.name} - {kiosk.kiosk.location}
                      </option>
                    ))}
                  </select>
                  {getAvailableKiosks().length === 0 && (
                    <p className="mt-2 text-sm text-yellow-600 dark:text-yellow-400 flex items-center gap-1">
                      <AlertCircle className="h-4 w-4" />
                      All your kiosks are already assigned to this ad
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Start Date *
                    </label>
                    <input
                      type="date"
                      value={assignmentForm.startDate}
                      onChange={(e) => setAssignmentForm(prev => ({ ...prev, startDate: e.target.value }))}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      End Date *
                    </label>
                    <input
                      type="date"
                      value={assignmentForm.endDate}
                      onChange={(e) => setAssignmentForm(prev => ({ ...prev, endDate: e.target.value }))}
                      min={assignmentForm.startDate || new Date().toISOString().split('T')[0]}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Priority
                  </label>
                  <select
                    value={assignmentForm.priority}
                    onChange={(e) => setAssignmentForm(prev => ({ ...prev, priority: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value={1}>Low (1)</option>
                    <option value={2}>Medium (2)</option>
                    <option value={3}>High (3)</option>
                  </select>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Higher priority ads will be shown more frequently
                  </p>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setShowAssignmentForm(false);
                      setAssignmentForm({
                        kioskId: '',
                        startDate: '',
                        endDate: '',
                        priority: 1
                      });
                    }}
                    disabled={submitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={submitting || getAvailableKiosks().length === 0}
                    loading={submitting}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Assign to Kiosk
                  </Button>
                </div>
              </form>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
