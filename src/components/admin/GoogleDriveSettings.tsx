import React, { useState, useEffect } from 'react';
import { Clock, Save, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';
import { GoogleDriveService } from '../../services/googleDriveService';
import { GoogleDriveConfig } from '../../types/database';

interface GoogleDriveSettingsProps {
  onConfigChange?: () => void;
}

export const GoogleDriveSettings: React.FC<GoogleDriveSettingsProps> = ({
  onConfigChange
}) => {
  const [config, setConfig] = useState<GoogleDriveConfig | null>(null);
  const [dailyUploadTime, setDailyUploadTime] = useState('09:00');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setIsLoading(true);
      const configData = await GoogleDriveService.getGoogleDriveConfig();
      if (configData) {
        setConfig(configData);
        // Convert time format from HH:MM:SS to HH:MM for input
        const timeValue = configData.daily_upload_time ? 
          configData.daily_upload_time.substring(0, 5) : '09:00';
        setDailyUploadTime(timeValue);
      }
    } catch (error) {
      console.error('Error loading Google Drive config:', error);
      setMessage({ type: 'error', text: 'Failed to load Google Drive configuration' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!config) return;

    try {
      setIsSaving(true);
      setMessage(null);

      // Convert time format from HH:MM to HH:MM:SS
      const timeWithSeconds = `${dailyUploadTime}:00`;

      const updatedConfig = {
        ...config,
        daily_upload_time: timeWithSeconds
      };

      await GoogleDriveService.updateGoogleDriveConfig(updatedConfig);
      setConfig(updatedConfig);
      setMessage({ type: 'success', text: 'Daily upload time updated successfully!' });
      onConfigChange?.();
    } catch (error) {
      console.error('Error saving settings:', error);
      setMessage({ type: 'error', text: 'Failed to save settings' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSyncAllNow = async () => {
    try {
      setIsSyncing(true);
      setMessage(null);

      const result = await GoogleDriveService.syncAllFolders();
      
      if (result.success) {
        setMessage({ 
          type: 'success', 
          text: `Sync completed successfully! ${result.foldersSynced} folders synced.` 
        });
      } else {
        setMessage({ 
          type: 'error', 
          text: result.message || 'Sync failed' 
        });
      }
    } catch (error) {
      console.error('Error syncing all folders:', error);
      setMessage({ type: 'error', text: 'Failed to sync all folders' });
    } finally {
      setIsSyncing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading settings...</span>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="text-center p-8">
        <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Google Drive Configuration</h3>
        <p className="text-gray-600">Please configure Google Drive integration first.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-gray-200 pb-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Google Drive Settings
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Configure daily upload schedule and manage folder synchronization
        </p>
      </div>

      {/* Daily Upload Time Setting */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
            <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Daily Upload Schedule
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Set the time for daily scheduled uploads to Google Drive
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="daily-upload-time" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Upload Time
            </label>
            <input
              type="time"
              id="daily-upload-time"
              value={dailyUploadTime}
              onChange={(e) => setDailyUploadTime(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Files will be uploaded to Google Drive at this time daily
            </p>
          </div>

          <div className="flex items-end">
            <button
              onClick={handleSaveSettings}
              disabled={isSaving}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-md flex items-center justify-center space-x-2 transition-colors"
            >
              {isSaving ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <Save className="h-4 w-4" />
              )}
              <span>{isSaving ? 'Saving...' : 'Save Settings'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Sync All Now Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
            <RefreshCw className="h-5 w-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Manual Synchronization
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Manually sync all Google Drive folders for all kiosks
            </p>
          </div>
        </div>

        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-4 mb-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-yellow-400 mr-2 mt-0.5" />
            <div className="text-sm">
              <p className="text-yellow-800 dark:text-yellow-200 font-medium">
                Manual Sync Warning
              </p>
              <p className="text-yellow-700 dark:text-yellow-300 mt-1">
                This will sync all folders for all kiosks immediately. This process may take several minutes depending on the number of files.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleSyncAllNow}
          disabled={isSyncing}
          className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-4 py-3 rounded-md flex items-center justify-center space-x-2 transition-colors font-medium"
        >
          {isSyncing ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
          ) : (
            <RefreshCw className="h-5 w-5" />
          )}
          <span>{isSyncing ? 'Syncing All Folders...' : 'Sync All Now'}</span>
        </button>
      </div>

      {/* Message Display */}
      {message && (
        <div className={`rounded-md p-4 ${
          message.type === 'success' 
            ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' 
            : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
        }`}>
          <div className="flex">
            {message.type === 'success' ? (
              <CheckCircle className="h-5 w-5 text-green-400 mr-2 mt-0.5" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-400 mr-2 mt-0.5" />
            )}
            <p className={`text-sm ${
              message.type === 'success' 
                ? 'text-green-800 dark:text-green-200' 
                : 'text-red-800 dark:text-red-200'
            }`}>
              {message.text}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

