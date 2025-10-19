import { useState, useEffect, useCallback } from 'react';
import { CampaignAndAssetSchedulerService, SchedulerInfo } from '../../services/campaignAndAssetSchedulerService';
import AssetArchiveTester from './AssetArchiveTester';

interface SchedulerSettings {
  [key: string]: {
    value: unknown;
    description: string;
  };
}

export default function CampaignAndAssetSchedulerManagement() {
  const [schedulerInfo, setSchedulerInfo] = useState<SchedulerInfo[]>([]);
  const [settings, setSettings] = useState<SchedulerSettings>({});
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [timeInputs, setTimeInputs] = useState<{
    campaignStatusTime: string;
    assetFolderTime: string;
  }>({
    campaignStatusTime: '00:00',
    assetFolderTime: '00:00'
  });
  const [cronSchedule, setCronSchedule] = useState<string>('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [info, settingsData, cronTime] = await Promise.all([
        CampaignAndAssetSchedulerService.getSchedulerInfo(),
        CampaignAndAssetSchedulerService.getSchedulerSettings(),
        CampaignAndAssetSchedulerService.getSchedulerCronTime()
      ]);
      setSchedulerInfo(info);
      setSettings(settingsData);
      setCronSchedule(cronTime);
      
      // Update time inputs from settings
      // Both schedulers use the asset_folder_scheduler_time field as requested
      const assetTime = settingsData['asset_folder_scheduler_time']?.value;
      
      setTimeInputs({
        campaignStatusTime: typeof assetTime === 'string' ? assetTime.replace(/"/g, '') : '00:00',
        assetFolderTime: typeof assetTime === 'string' ? assetTime.replace(/"/g, '') : '00:00'
      });
    } catch (error) {
      console.error('Error loading scheduler data:', error);
      showMessage('error', 'Failed to load scheduler data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const handleAction = async (action: () => Promise<string>, actionName: string) => {
    try {
      setActionLoading(actionName);
      const result = await action();
      showMessage('success', result);
      await loadData(); // Refresh data after action
    } catch (error) {
      console.error(`Error ${actionName}:`, error);
      showMessage('error', `Failed to ${actionName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setActionLoading(null);
    }
  };

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };

  const getStatusBadge = (active: boolean) => {
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
        active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
      }`}>
        {active ? 'Active' : 'Inactive'}
      </span>
    );
  };

  const handleTimeUpdate = async (schedulerType: 'campaignStatus' | 'assetFolder', newTime: string) => {
    try {
      setActionLoading(`updating ${schedulerType} time`);
      
      let result: string;
      if (schedulerType === 'campaignStatus') {
        result = await CampaignAndAssetSchedulerService.updateCampaignStatusSchedulerTime(newTime);
      } else {
        result = await CampaignAndAssetSchedulerService.updateAssetFolderSchedulerTime(newTime);
      }
      
      showMessage('success', result);
      await loadData(); // Refresh data after update
    } catch (error) {
      console.error(`Error updating ${schedulerType} time:`, error);
      showMessage('error', `Failed to update ${schedulerType} time: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading scheduler data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            Campaign and Asset Schedulers Management
          </h3>
          <p className="text-sm text-gray-500 mb-6">
            Manage automated campaign status changes and asset folder movements that run at 12:00 AM Los Angeles time.
          </p>

          {message && (
            <div className={`mb-4 p-4 rounded-md ${
              message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
            }`}>
              {message.text}
            </div>
          )}

          {/* Scheduler Status Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {schedulerInfo.map((scheduler) => (
              <div key={scheduler.scheduler_type} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-lg font-medium text-gray-900 capitalize">
                    {scheduler.scheduler_type.replace('_', ' ')} Scheduler
                  </h4>
                  {getStatusBadge(scheduler.cron_job_active)}
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Enabled:</span>
                    <span className={scheduler.scheduler_enabled ? 'text-green-600' : 'text-red-600'}>
                      {scheduler.scheduler_enabled ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Time:</span>
                    <span className="font-mono bg-gray-100 px-2 py-1 rounded">
                      {scheduler.scheduler_time} {scheduler.scheduler_timezone}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Last Run:</span>
                    <span>{formatDateTime(scheduler.last_run_time)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Next Run:</span>
                    <span>{formatDateTime(scheduler.next_run_time)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <button
              onClick={() => handleAction(
                () => CampaignAndAssetSchedulerService.triggerBothSchedulers(),
                'triggering both schedulers'
              )}
              disabled={actionLoading === 'triggering both schedulers'}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {actionLoading === 'triggering both schedulers' ? 'Triggering...' : 'Trigger Both Schedulers'}
            </button>

            <button
              onClick={() => handleAction(
                () => CampaignAndAssetSchedulerService.testBothSchedulers(),
                'testing both schedulers'
              )}
              disabled={actionLoading === 'testing both schedulers'}
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {actionLoading === 'testing both schedulers' ? 'Testing...' : 'Test Both Schedulers'}
            </button>

            <button
              onClick={() => handleAction(
                () => CampaignAndAssetSchedulerService.restartUnifiedSchedulers(),
                'restarting unified schedulers'
              )}
              disabled={actionLoading === 'restarting unified schedulers'}
              className="bg-yellow-600 text-white px-4 py-2 rounded-md hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {actionLoading === 'restarting unified schedulers' ? 'Restarting...' : 'Restart Unified Schedulers'}
            </button>
          </div>

          {/* Individual Scheduler Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Campaign Status Scheduler */}
            <div className="border rounded-lg p-4">
              <h4 className="text-lg font-medium text-gray-900 mb-4">Campaign Status Scheduler</h4>
              <p className="text-sm text-gray-500 mb-4">
                Automatically changes campaign status from 'approved' to 'active' at start date and from 'active' to 'completed' at end date.
              </p>
              
              <div className="space-y-2">
                <button
                  onClick={() => handleAction(
                    () => CampaignAndAssetSchedulerService.triggerCampaignStatusScheduler(),
                    'triggering campaign status scheduler'
                  )}
                  disabled={actionLoading === 'triggering campaign status scheduler'}
                  className="w-full bg-blue-600 text-white px-3 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  {actionLoading === 'triggering campaign status scheduler' ? 'Triggering...' : 'Trigger Now'}
                </button>

                <button
                  onClick={() => handleAction(
                    async () => {
                      const result = await CampaignAndAssetSchedulerService.testCampaignStatusScheduler();
                      return JSON.stringify(result);
                    },
                    'testing campaign status scheduler'
                  )}
                  disabled={actionLoading === 'testing campaign status scheduler'}
                  className="w-full bg-green-600 text-white px-3 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  {actionLoading === 'testing campaign status scheduler' ? 'Testing...' : 'Test Edge Function'}
                </button>

                <button
                  onClick={() => handleAction(
                    () => CampaignAndAssetSchedulerService.restartCampaignStatusScheduler(),
                    'restarting campaign status scheduler'
                  )}
                  disabled={actionLoading === 'restarting campaign status scheduler'}
                  className="w-full bg-yellow-600 text-white px-3 py-2 rounded-md hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  {actionLoading === 'restarting campaign status scheduler' ? 'Restarting...' : 'Restart Scheduler'}
                </button>
              </div>
            </div>

            {/* Asset Folder Scheduler */}
            <div className="border rounded-lg p-4">
              <h4 className="text-lg font-medium text-gray-900 mb-4">Asset Folder Scheduler</h4>
              <p className="text-sm text-gray-500 mb-4">
                Automatically moves assets from 'scheduled' to 'active' folder when campaigns start, and from 'active' to 'archive' when campaigns end.
              </p>
              
              <div className="space-y-2">
                <button
                  onClick={() => handleAction(
                    () => CampaignAndAssetSchedulerService.triggerAssetFolderScheduler(),
                    'triggering asset folder scheduler'
                  )}
                  disabled={actionLoading === 'triggering asset folder scheduler'}
                  className="w-full bg-blue-600 text-white px-3 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  {actionLoading === 'triggering asset folder scheduler' ? 'Triggering...' : 'Trigger Now'}
                </button>

                <button
                  onClick={() => handleAction(
                    async () => {
                      const result = await CampaignAndAssetSchedulerService.testAssetFolderScheduler();
                      return JSON.stringify(result);
                    },
                    'testing asset folder scheduler'
                  )}
                  disabled={actionLoading === 'testing asset folder scheduler'}
                  className="w-full bg-green-600 text-white px-3 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  {actionLoading === 'testing asset folder scheduler' ? 'Testing...' : 'Test Edge Function'}
                </button>

                <button
                  onClick={() => handleAction(
                    () => CampaignAndAssetSchedulerService.restartAssetFolderScheduler(),
                    'restarting asset folder scheduler'
                  )}
                  disabled={actionLoading === 'restarting asset folder scheduler'}
                  className="w-full bg-yellow-600 text-white px-3 py-2 rounded-md hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  {actionLoading === 'restarting asset folder scheduler' ? 'Restarting...' : 'Restart Scheduler'}
                </button>
              </div>
            </div>
          </div>

          {/* Current Cron Schedule */}
          {cronSchedule && (
            <div className="mt-6 border-t pt-6">
              <h4 className="text-lg font-medium text-gray-900 mb-4">Current Cron Schedule</h4>
              <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-300">Current UTC Cron Schedule:</p>
                    <p className="font-mono text-lg font-bold text-blue-600 dark:text-blue-400">{cronSchedule}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600 dark:text-gray-300">Los Angeles Time:</p>
                    <p className="font-mono text-lg font-bold text-green-600 dark:text-green-400">
                      {timeInputs.campaignStatusTime}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Time Configuration */}
          <div className="mt-6 border-t pt-6">
            <h4 className="text-lg font-medium text-gray-900 mb-4">Scheduler Time Configuration</h4>
            <p className="text-sm text-gray-500 mb-6">
              Configure when the schedulers should run daily (Los Angeles time). Both campaign status changes and asset folder movements will occur at this time.
            </p>
            
            <div className="max-w-md mx-auto">
              {/* Unified Scheduler Time */}
              <div className="border rounded-lg p-4">
                <h5 className="font-medium text-gray-900 mb-3">Scheduler Time (Both Campaign Status & Asset Folder)</h5>
                <p className="text-sm text-gray-500 mb-4">
                  This time controls when campaigns become active and when assets are moved between folders.
                </p>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Time (Los Angeles)
                    </label>
                    <input
                      type="time"
                      value={timeInputs.campaignStatusTime}
                      onChange={(e) => setTimeInputs(prev => ({ 
                        ...prev, 
                        campaignStatusTime: e.target.value,
                        assetFolderTime: e.target.value 
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none text-black focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <button
                    onClick={() => handleTimeUpdate('campaignStatus', timeInputs.campaignStatusTime)}
                    disabled={actionLoading === 'updating campaignStatus time'}
                    className="w-full bg-blue-600 text-white px-3 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    {actionLoading === 'updating campaignStatus time' ? 'Updating...' : 'Update Scheduler Time'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* System Settings */}
          <div className="mt-6 border-t pt-6">
            <h4 className="text-lg font-medium text-gray-900 mb-4">System Settings</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(settings).map(([key, setting]) => (
                <div key={key} className="border rounded-lg p-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <h5 className="font-medium text-gray-900">{key}</h5>
                      <p className="text-sm text-gray-500">{setting.description}</p>
                    </div>
                    <div className="text-sm">
                      <span className="text-gray-500">Value: </span>
                      <span className="font-mono">{String(setting.value)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Asset Archive Tester */}
          <div className="mt-8 border-t pt-6">
            <h4 className="text-lg font-medium text-gray-900 mb-4">Asset Archive Tester</h4>
            <AssetArchiveTester />
          </div>
        </div>
      </div>
    </div>
  );
}
