import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { HostService } from '../services/hostService';
import { HostAssignmentSchedulerService, SchedulerInfo } from '../services/hostAssignmentSchedulerService';
import { supabase } from '../lib/supabaseClient';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';

interface Assignment {
  id: string;
  ad_id: string;
  kiosk_id: string;
  start_date: string;
  end_date: string;
  status: string;
  ad: {
    id: string;
    name: string;
    status: string;
  };
  kiosk: {
    id: string;
    name: string;
    location: string;
  };
}

export default function DebugAssignmentPage() {
  const { user } = useAuth();
  const { addNotification } = useNotification();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [schedulerInfo, setSchedulerInfo] = useState<SchedulerInfo | null>(null);
  const [schedulerLoading, setSchedulerLoading] = useState(false);

  useEffect(() => {
    if (user?.id) {
      loadAssignments();
      loadSchedulerInfo();
    }
  }, [user?.id]);

  const loadAssignments = async () => {
    try {
      setLoading(true);
      const data = await HostService.getHostAdAssignments(user!.id);
      setAssignments(data);
    } catch (error) {
      console.error('Error loading assignments:', error);
      addNotification('error', 'Error', 'Failed to load assignments');
    } finally {
      setLoading(false);
    }
  };

  const loadSchedulerInfo = async () => {
    try {
      setSchedulerLoading(true);
      const info = await HostAssignmentSchedulerService.getSchedulerInfo();
      setSchedulerInfo(info);
    } catch (error) {
      console.error('Error loading scheduler info:', error);
      addNotification('error', 'Error', 'Failed to load scheduler info');
    } finally {
      setSchedulerLoading(false);
    }
  };

  const processScheduledAssignments = async () => {
    try {
      setProcessing(true);
      console.log('[DebugAssignmentPage] DEBUG: Manually triggering processScheduledAssignments via edge function');
      console.log('[DebugAssignmentPage] DEBUG: Current time:', new Date().toISOString());
      console.log('[DebugAssignmentPage] DEBUG: Current assignments before processing:', assignments);
      
      // Call the edge function instead of the HostService method
      const { data, error } = await supabase.functions.invoke('process-scheduled-assignments');
      
      if (error) {
        console.error('[DebugAssignmentPage] DEBUG: Edge function error:', error);
        throw error;
      }
      
      console.log('[DebugAssignmentPage] DEBUG: Edge function response:', data);
      console.log('[DebugAssignmentPage] DEBUG: Response details:', {
        success: data.success,
        message: data.message,
        processed: data.processed,
        activatedAds: data.activatedAds
      });
      
      addNotification('success', 'Success', `Scheduled assignments processed: ${data.processed || 0} assignments, ${data.activatedAds || 0} ads activated`);
      await loadAssignments(); // Reload to see updated statuses
      
      console.log('[DebugAssignmentPage] DEBUG: Assignments after processing:', assignments);
    } catch (error) {
      console.error('[DebugAssignmentPage] DEBUG: Error processing scheduled assignments:', error);
      addNotification('error', 'Error', 'Failed to process scheduled assignments');
    } finally {
      setProcessing(false);
    }
  };

  const createTestAssignment = async () => {
    try {
      setProcessing(true);
      console.log('[DebugAssignmentPage] DEBUG: Creating test assignment with past start date');
      
      // Create a test assignment that starts yesterday (so it should be processed immediately)
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 1); // Yesterday
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 6); // 7 days from yesterday

      const startDateString = startDate.toISOString().split('T')[0];
      const endDateString = endDate.toISOString().split('T')[0];

      console.log('[DebugAssignmentPage] DEBUG: Test assignment dates:', {
        startDate: startDateString,
        endDate: endDateString,
        startDateISO: startDate.toISOString(),
        endDateISO: endDate.toISOString()
      });
      
      // First, we need to get a host ad and kiosk to create the assignment
      const { data: hostAds, error: adsError } = await supabase
        .from('host_ads')
        .select('id, name')
        .eq('host_id', user!.id)
        .eq('status', 'approved')
        .limit(1);

      if (adsError || !hostAds || hostAds.length === 0) {
        addNotification('error', 'Error', 'No approved host ads found. Please create and approve a host ad first.');
        return;
      }

      const { data: kiosks, error: kiosksError } = await supabase
        .from('host_kiosks')
        .select('kiosk_id, kiosks(id, name)')
        .eq('host_id', user!.id)
        .eq('status', 'active')
        .limit(1);

      if (kiosksError || !kiosks || kiosks.length === 0) {
        addNotification('error', 'Error', 'No active kiosks found. Please assign a kiosk first.');
        return;
      }

      const hostAd = hostAds[0];
      const kiosk = kiosks[0];

      console.log('[DebugAssignmentPage] DEBUG: Using host ad:', hostAd);
      console.log('[DebugAssignmentPage] DEBUG: Using kiosk:', kiosk);

      // Create the test assignment
      const { data: newAssignment, error: createError } = await supabase
        .from('host_ad_assignments')
        .insert({
          host_id: user!.id,
          ad_id: hostAd.id,
          kiosk_id: kiosk.kiosk_id,
          start_date: startDateString,
          end_date: endDateString,
          status: 'pending',
          priority: 1
        })
        .select()
        .single();

      if (createError) {
        console.error('[DebugAssignmentPage] DEBUG: Error creating test assignment:', createError);
        throw createError;
      }

      console.log('[DebugAssignmentPage] DEBUG: Test assignment created:', newAssignment);
      addNotification('success', 'Success', `Test assignment created with start date: ${startDateString} (yesterday)`);
      await loadAssignments();
    } catch (error) {
      console.error('Error creating test assignment:', error);
      addNotification('error', 'Error', 'Failed to create test assignment');
    } finally {
      setProcessing(false);
    }
  };

  const testScheduler = async () => {
    try {
      setProcessing(true);
      console.log('[DebugAssignmentPage] DEBUG: Testing scheduler via service');
      const result = await HostAssignmentSchedulerService.testHostAssignmentProcessor();
      console.log('[DebugAssignmentPage] DEBUG: Scheduler test result:', result);
      addNotification('success', 'Success', 'Scheduler test completed successfully');
      await loadAssignments();
    } catch (error) {
      console.error('Error testing scheduler:', error);
      addNotification('error', 'Error', 'Failed to test scheduler');
    } finally {
      setProcessing(false);
    }
  };

  const restartSchedulers = async () => {
    try {
      setProcessing(true);
      console.log('[DebugAssignmentPage] DEBUG: Restarting all schedulers');
      const result = await HostAssignmentSchedulerService.restartAllSchedulers();
      console.log('[DebugAssignmentPage] DEBUG: Scheduler restart result:', result);
      addNotification('success', 'Success', 'Schedulers restarted successfully');
      await loadSchedulerInfo();
    } catch (error) {
      console.error('Error restarting schedulers:', error);
      addNotification('error', 'Error', 'Failed to restart schedulers');
    } finally {
      setProcessing(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'completed': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString() + ' ' + new Date(dateString).toLocaleTimeString();
  };

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card title="Debug Assignment Page">
          <p className="text-gray-600 dark:text-gray-400">Please sign in to access the debug page.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Debug Assignment Page</h1>
          <p className="text-gray-600 dark:text-gray-400">Test scheduled assignment processing and asset movement</p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={loadAssignments}
            disabled={loading}
            variant="secondary"
          >
            {loading ? 'Loading...' : 'Refresh'}
          </Button>
          <Button
            onClick={processScheduledAssignments}
            disabled={processing}
            loading={processing}
          >
            Process Scheduled Assignments
          </Button>
        </div>
      </div>

      {/* Debug Actions */}
      <Card title="Debug Actions">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">Manual Processing</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                Manually trigger the scheduled assignment processing. This simulates what happens when the cron job runs.
              </p>
              <Button
                onClick={processScheduledAssignments}
                disabled={processing}
                loading={processing}
                className="w-full"
              >
                Process Now
              </Button>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">Test Assignment</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                Create a test assignment that starts in 1 minute for testing the processing logic.
              </p>
              <Button
                onClick={createTestAssignment}
                disabled={processing}
                loading={processing}
                variant="secondary"
                className="w-full"
              >
                Create Test Assignment
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Current Time */}
      <Card title="Current System Time">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          <p><strong>Current Time:</strong> {new Date().toLocaleString()}</p>
          <p><strong>ISO String:</strong> {new Date().toISOString()}</p>
        </div>
      </Card>

      {/* Scheduler Status */}
      <Card title="Scheduler Status">
        {schedulerLoading ? (
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-500"></div>
          </div>
        ) : schedulerInfo ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Scheduler Configuration</h4>
                <div className="space-y-2 text-sm">
                  <p><strong>Enabled:</strong> <span className={schedulerInfo.scheduler_enabled ? 'text-green-600' : 'text-red-600'}>{schedulerInfo.scheduler_enabled ? 'Yes' : 'No'}</span></p>
                  <p><strong>Schedule Time:</strong> {schedulerInfo.scheduler_time} ({schedulerInfo.scheduler_timezone})</p>
                </div>
              </div>
              
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                <h4 className="font-medium text-green-900 dark:text-green-100 mb-2">Cron Job Status</h4>
                <div className="space-y-2 text-sm">
                  <p><strong>Asset Folder Scheduler:</strong> <span className={schedulerInfo.asset_folder_cron_active ? 'text-green-600' : 'text-red-600'}>{schedulerInfo.asset_folder_cron_active ? 'Active' : 'Inactive'}</span></p>
                  <p><strong>Host Assignment Processor:</strong> <span className={schedulerInfo.host_assignment_cron_active ? 'text-green-600' : 'text-red-600'}>{schedulerInfo.host_assignment_cron_active ? 'Active' : 'Inactive'}</span></p>
                </div>
              </div>
            </div>
            
            <div className="flex gap-3">
              <Button
                onClick={testScheduler}
                disabled={processing}
                loading={processing}
                variant="secondary"
              >
                Test Scheduler
              </Button>
              <Button
                onClick={restartSchedulers}
                disabled={processing}
                loading={processing}
                variant="secondary"
              >
                Restart Schedulers
              </Button>
              <Button
                onClick={loadSchedulerInfo}
                disabled={schedulerLoading}
                variant="outline"
              >
                Refresh Status
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-gray-600 dark:text-gray-400">Failed to load scheduler info</p>
          </div>
        )}
      </Card>

      {/* Assignment Analysis */}
      <Card title="Assignment Analysis">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Pending Assignments</h4>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {assignments.filter(a => a.status === 'pending').length}
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Should be processed if start_date ≤ now
              </p>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
              <h4 className="font-medium text-green-900 dark:text-green-100 mb-2">Active Assignments</h4>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {assignments.filter(a => a.status === 'active').length}
              </p>
              <p className="text-sm text-green-700 dark:text-green-300">
                Currently running
              </p>
            </div>
            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
              <h4 className="font-medium text-yellow-900 dark:text-yellow-100 mb-2">Should Process</h4>
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                {assignments.filter(a => a.status === 'pending' && new Date(a.start_date) <= new Date()).length}
              </p>
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                Ready to activate
              </p>
            </div>
          </div>
          
          {/* Detailed Analysis */}
          <div className="mt-4">
            <h4 className="font-medium text-gray-900 dark:text-white mb-2">Detailed Analysis</h4>
            <div className="space-y-2">
              {assignments.map((assignment) => {
                const startDate = new Date(assignment.start_date);
                const now = new Date();
                const shouldProcess = assignment.status === 'pending' && startDate <= now;
                
                return (
                  <div key={assignment.id} className={`p-3 rounded-lg border ${
                    shouldProcess 
                      ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800' 
                      : 'bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-700'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-medium">{assignment.ad.name}</span>
                        <span className={`ml-2 px-2 py-1 rounded text-xs ${
                          shouldProcess ? 'bg-yellow-200 text-yellow-800' : 'bg-gray-200 text-gray-600'
                        }`}>
                          {shouldProcess ? 'SHOULD PROCESS' : 'Not ready'}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Start: {assignment.start_date}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </Card>

      {/* Assignments List */}
      <Card title={`Assignments (${assignments.length})`}>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
          </div>
        ) : assignments.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-600 dark:text-gray-400">No assignments found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {assignments.map((assignment) => (
              <div key={assignment.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        {assignment.ad.name}
                      </h4>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(assignment.status)}`}>
                        {assignment.status}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Kiosk:</span>
                        <div className="font-medium">{assignment.kiosk.name}</div>
                        <div className="text-gray-500">{assignment.kiosk.location}</div>
                      </div>
                      
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Start Date:</span>
                        <div className="font-medium">{formatDate(assignment.start_date)}</div>
                        <div className={`text-xs ${
                          new Date(assignment.start_date) <= new Date() 
                            ? 'text-green-600 dark:text-green-400' 
                            : 'text-yellow-600 dark:text-yellow-400'
                        }`}>
                          {new Date(assignment.start_date) <= new Date() ? 'Should be active' : 'Scheduled'}
                        </div>
                      </div>
                      
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">End Date:</span>
                        <div className="font-medium">{formatDate(assignment.end_date)}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
