import { useState, useEffect, useCallback } from 'react';
import { Clock, Play, Square, RotateCcw, Settings, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { useNotification } from '../../contexts/NotificationContext';
import { AssetFolderSchedulerService, AssetFolderSchedulerInfo, CronJobStatus } from '../../services/assetFolderSchedulerService';

export default function AssetFolderSchedulerManagement() {
  const [schedulerInfo, setSchedulerInfo] = useState<AssetFolderSchedulerInfo | null>(null);
  const [cronJobStatus, setCronJobStatus] = useState<CronJobStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<Record<string, unknown> | null>(null);
  const [newTime, setNewTime] = useState('');
  const [showTimeModal, setShowTimeModal] = useState(false);
  const { addNotification } = useNotification();

  const loadSchedulerInfo = useCallback(async () => {
    try {
      setLoading(true);
      const [info, status] = await Promise.all([
        AssetFolderSchedulerService.getSchedulerInfo(),
        AssetFolderSchedulerService.getCronJobStatus()
      ]);
      
      setSchedulerInfo(info);
      setCronJobStatus(status);
    } catch (error) {
      console.error('Error loading scheduler info:', error);
      addNotification('error', 'Error', 'Failed to load scheduler information');
    } finally {
      setLoading(false);
    }
  }, [addNotification]);

  useEffect(() => {
    loadSchedulerInfo();
  }, [loadSchedulerInfo]);

  const handleTriggerScheduler = async () => {
    try {
      setActionLoading('trigger');
      const result = await AssetFolderSchedulerService.triggerScheduler();
      addNotification('success', 'Success', result);
      await loadSchedulerInfo();
    } catch (error) {
      console.error('Error triggering scheduler:', error);
      addNotification('error', 'Error', 'Failed to trigger scheduler');
    } finally {
      setActionLoading(null);
    }
  };

  const handleStopScheduler = async () => {
    try {
      setActionLoading('stop');
      const result = await AssetFolderSchedulerService.stopScheduler();
      addNotification('success', 'Success', result);
      await loadSchedulerInfo();
    } catch (error) {
      console.error('Error stopping scheduler:', error);
      addNotification('error', 'Error', 'Failed to stop scheduler');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRestartScheduler = async () => {
    try {
      setActionLoading('restart');
      const result = await AssetFolderSchedulerService.restartScheduler();
      addNotification('success', 'Success', result);
      await loadSchedulerInfo();
    } catch (error) {
      console.error('Error restarting scheduler:', error);
      addNotification('error', 'Error', 'Failed to restart scheduler');
    } finally {
      setActionLoading(null);
    }
  };

  const handleTestScheduler = async () => {
    try {
      setActionLoading('test');
      const result = await AssetFolderSchedulerService.testScheduler();
      setTestResult(result);
      addNotification('success', 'Success', 'Scheduler test completed');
    } catch (error) {
      console.error('Error testing scheduler:', error);
      addNotification('error', 'Error', 'Failed to test scheduler');
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdateTime = async () => {
    if (!newTime) {
      addNotification('error', 'Error', 'Please enter a valid time');
      return;
    }

    try {
      setActionLoading('updateTime');
      const result = await AssetFolderSchedulerService.updateSchedulerTime(newTime);
      addNotification('success', 'Success', result);
      setShowTimeModal(false);
      setNewTime('');
      await loadSchedulerInfo();
    } catch (error) {
      console.error('Error updating scheduler time:', error);
      addNotification('error', 'Error', 'Failed to update scheduler time');
    } finally {
      setActionLoading(null);
    }
  };

  const formatDateTime = (dateString: string | null | undefined) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };

  const getStatusIcon = (active: boolean) => {
    if (active) {
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    }
    return <XCircle className="w-5 h-5 text-red-500" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="w-6 h-6 animate-spin" />
        <span className="ml-2">Loading scheduler information...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <Clock className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold">Asset Folder Scheduler</h2>
          </div>
          <button
            onClick={loadSchedulerInfo}
            className="flex items-center space-x-2 px-3 py-2 text-sm bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-md transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
        </div>

        {/* Status Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              {getStatusIcon(schedulerInfo?.cron_job_active || false)}
              <span className="font-medium">Cron Job Status</span>
            </div>
            <p className="text-sm text-gray-600">
              {schedulerInfo?.cron_job_active ? 'Active' : 'Inactive'}
            </p>
          </div>

          <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Clock className="w-5 h-5 text-blue-500" />
              <span className="font-medium">Scheduled Time</span>
            </div>
            <p className="text-sm text-gray-600">
              {schedulerInfo?.scheduler_time || 'Not set'} ({schedulerInfo?.scheduler_timezone || 'America/Los_Angeles'})
            </p>
          </div>

          <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="font-medium">Last Run</span>
            </div>
            <p className="text-sm text-gray-600">
              {formatDateTime(schedulerInfo?.last_run_time)}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3 mb-6">
          <button
            onClick={handleTriggerScheduler}
            disabled={actionLoading === 'trigger'}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Play className="w-4 h-4" />
            <span>{actionLoading === 'trigger' ? 'Triggering...' : 'Trigger Now'}</span>
          </button>

          <button
            onClick={handleTestScheduler}
            disabled={actionLoading === 'test'}
            className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Settings className="w-4 h-4" />
            <span>{actionLoading === 'test' ? 'Testing...' : 'Test Scheduler'}</span>
          </button>

          <button
            onClick={handleStopScheduler}
            disabled={actionLoading === 'stop'}
            className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Square className="w-4 h-4" />
            <span>{actionLoading === 'stop' ? 'Stopping...' : 'Stop Scheduler'}</span>
          </button>

          <button
            onClick={handleRestartScheduler}
            disabled={actionLoading === 'restart'}
            className="flex items-center space-x-2 px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            <span>{actionLoading === 'restart' ? 'Restarting...' : 'Restart Scheduler'}</span>
          </button>

          <button
            onClick={() => setShowTimeModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
          >
            <Clock className="w-4 h-4" />
            <span>Change Time</span>
          </button>
        </div>

        {/* Test Results */}
        {testResult && (
          <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4 mb-6">
            <h3 className="font-medium mb-2">Test Results</h3>
            <pre className="text-sm bg-white dark:bg-slate-700 p-3 rounded border overflow-auto">
              {JSON.stringify(testResult, null, 2)}
            </pre>
          </div>
        )}

        {/* Cron Job Details */}
        {cronJobStatus.length > 0 && (
          <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4">
            <h3 className="font-medium mb-3">Cron Job Details</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Job ID</th>
                    <th className="text-left py-2">Schedule</th>
                    <th className="text-left py-2">Command</th>
                    <th className="text-left py-2">Active</th>
                  </tr>
                </thead>
                <tbody>
                  {cronJobStatus.map((job, index) => (
                    <tr key={index} className="border-b">
                      <td className="py-2">{job.jobid}</td>
                      <td className="py-2 font-mono">{job.schedule}</td>
                      <td className="py-2 font-mono text-xs">{job.command}</td>
                      <td className="py-2">
                        {getStatusIcon(job.active)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Time Update Modal */}
      {showTimeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">Update Scheduler Time</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                New Time (Los Angeles time, 24-hour format)
              </label>
              <input
                type="time"
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-slate-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="00:00"
              />
              <p className="text-xs text-gray-500 mt-1">
                Current time: {schedulerInfo?.scheduler_time || 'Not set'}
              </p>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowTimeModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateTime}
                disabled={actionLoading === 'updateTime'}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {actionLoading === 'updateTime' ? 'Updating...' : 'Update Time'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
