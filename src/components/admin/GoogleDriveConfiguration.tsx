import React, { useState, useEffect } from 'react';
import { GoogleDriveService, Kiosk } from '../../services/googleDriveService';
import { GoogleDriveConfig } from '../../types/database';
import { supabase } from '../../lib/supabaseClient';
import { AdminService } from '../../services/adminService';

interface GoogleDriveConfigurationProps {
  onConfigChange?: () => void;
}

export const GoogleDriveConfiguration: React.FC<GoogleDriveConfigurationProps> = ({
  onConfigChange
}) => {
  const [configs, setConfigs] = useState<GoogleDriveConfig[]>([]);
  const [selectedConfig, setSelectedConfig] = useState<GoogleDriveConfig | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [kiosks, setKiosks] = useState<Kiosk[]>([]);
  const [folderStatus, setFolderStatus] = useState<any[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ success: boolean; message: string; foldersSynced: number } | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    client_id: '',
    client_secret: '',
    refresh_token: '',
    is_active: false
  });

  useEffect(() => {
    loadConfigurations();
    loadKiosks();
  }, []);

  // Automatically load folder status when a config is available/changes
  useEffect(() => {
    if (selectedConfig) {
      // Show any existing kiosk folder mappings immediately
      loadFolderStatus();
    }
  }, [selectedConfig]);

  const loadConfigurations = async () => {
    try {
      setIsLoading(true);
      // Fetch all configs from DB and select the active one by default
      const configsFromDb = await AdminService.getGoogleDriveConfigs();
      setConfigs(configsFromDb || []);
      const activeConfig = (configsFromDb || []).find((c: any) => c.is_active) || (configsFromDb || [])[0] || null;
      setSelectedConfig(activeConfig ?? null);
    } catch (error) {
      console.error('Error loading configurations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadKiosks = async () => {
    try {
      const { data, error } = await supabase
        .from('kiosks')
        .select('*')
        .order('name');

      if (error) throw error;
      setKiosks(data || []);
    } catch (error) {
      console.error('Error loading kiosks:', error);
    }
  };

  const loadFolderStatus = async () => {
    try {
      const status = await GoogleDriveService.getFolderStructureStatus();
      setFolderStatus(status);
    } catch (error) {
      console.error('Error loading folder status:', error);
    }
  };

  const handleEdit = (config: GoogleDriveConfig) => {
    setSelectedConfig(config);
    setFormData({
      name: config.name,
      client_id: config.client_id,
      client_secret: config.client_secret,
      refresh_token: config.refresh_token,
      is_active: config.is_active
    });
    setIsEditing(true);
  };

  const handleCreateNew = () => {
    setSelectedConfig(null);
    setFormData({
      name: '',
      client_id: '',
      client_secret: '',
      refresh_token: '',
      is_active: false
    });
    setIsEditing(true);
  };

  const handleSave = async () => {
    try {
      setIsLoading(true);
      
      const configId = await GoogleDriveService.saveGoogleDriveConfig(formData);
      
      if (configId) {
        await loadConfigurations();
        setIsEditing(false);
        setTestResult(null);
        onConfigChange?.();
      }
    } catch (error) {
      console.error('Error saving configuration:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestConnection = async () => {
    if (!selectedConfig) return;

    try {
      setIsTesting(true);
      setTestResult(null);

      const result = await GoogleDriveService.testConnection(selectedConfig);
      setTestResult(result);
    } catch (error) {
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : 'Test failed'
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleCreateFolders = async () => {
    if (!selectedConfig) return;

    try {
      setIsLoading(true);
      const results = await GoogleDriveService.createKioskFolders(selectedConfig.id, kiosks);
      setFolderStatus(results);
    } catch (error) {
      console.error('Error creating folders:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateScheduledFolders = async () => {
    try {
      setIsLoading(true);
      setSyncResult(null);
      
      await GoogleDriveService.ensureScheduledFoldersExist();
      await loadFolderStatus();
      
      setSyncResult({
        success: true,
        message: 'Scheduled folders created successfully for all kiosks',
        foldersSynced: 0
      });
    } catch (error) {
      console.error('Error creating scheduled folders:', error);
      setSyncResult({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create scheduled folders',
        foldersSynced: 0
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setFormData({
      name: '',
      client_id: '',
      client_secret: '',
      refresh_token: '',
      is_active: false
    });
    setTestResult(null);
  };

  const handleSyncAllNow = async () => {
    try {
      setIsSyncing(true);
      setSyncResult(null);

      // Use immediate sync to bypass queue and move files directly to active folder
      const result = await GoogleDriveService.syncAllFoldersImmediate();
      setSyncResult({
        success: result.success,
        message: result.message,
        foldersSynced: result.foldersSynced
      });

      // Refresh folder status after sync
      await loadFolderStatus();
    } catch (error) {
      setSyncResult({
        success: false,
        message: error instanceof Error ? error.message : 'Sync failed',
        foldersSynced: 0
      });
    } finally {
      setIsSyncing(false);
    }
  };

  if (isLoading && !isEditing) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Google Drive Configuration</h3>
          <p className="text-sm text-gray-500">
            Configure Google Drive integration for automated ad distribution to kiosks
          </p>
        </div>
        <button
          onClick={handleCreateNew}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Add Configuration
        </button>
      </div>

      {/* Configuration List */}
      {!isEditing && (
        <div className="space-y-4">
          {configs.map((config) => (
            <div
              key={config.id}
              className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <h4 className="font-medium text-gray-900 dark:text-white">{config.name}</h4>
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        config.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {config.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    Client ID: {config.client_id.substring(0, 20)}...
                  </p>
                  <p className="text-sm text-gray-500">
                    Created: {new Date(config.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleEdit(config)}
                    className="px-3 py-1 text-sm text-blue-600 hover:text-blue-700 transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      setSelectedConfig(config);
                      handleTestConnection();
                    }}
                    disabled={isTesting}
                    className="px-3 py-1 text-sm text-green-600 hover:text-green-700 transition-colors disabled:opacity-50"
                  >
                    {isTesting ? 'Testing...' : 'Test'}
                  </button>
                </div>
              </div>
            </div>
          ))}

          {configs.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <p>No Google Drive configurations found.</p>
              <p className="text-sm">Click "Add Configuration" to get started.</p>
            </div>
          )}
        </div>
      )}

      {/* Edit Form */}
      {isEditing && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 rounded-lg p-6">
          <h4 className="text-lg font-medium text-gray-900 mb-4">
            {selectedConfig ? 'Edit Configuration' : 'New Configuration'}
          </h4>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Configuration Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter configuration name"
              />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Client ID
              </label>
              <input
                type="text"
                value={formData.client_id}
                onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter Google Drive Client ID"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Client Secret
              </label>
              <input
                type="password"
                value={formData.client_secret}
                onChange={(e) => setFormData({ ...formData, client_secret: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter Google Drive Client Secret"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Refresh Token
              </label>
              <input
                type="password"
                value={formData.refresh_token}
                onChange={(e) => setFormData({ ...formData, refresh_token: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter Google Drive Refresh Token"
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="is_active" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                Active Configuration
              </label>
            </div>

            {/* Test Result */}
            {testResult && (
              <div
                className={`p-3 rounded-md ${
                  testResult.success
                    ? 'bg-green-50 text-green-800 border border-green-200'
                    : 'bg-red-50 text-red-800 border border-red-200'
                }`}
              >
                {testResult.message}
              </div>
            )}

            <div className="flex justify-end space-x-3">
              <button
                onClick={handleCancel}
                className="px-4 py-2 text-sm text-gray-700 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isLoading}
                className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {isLoading ? 'Saving...' : 'Save Configuration'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Folder Management */}
      {selectedConfig && !isEditing && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-lg font-medium text-gray-900 dark:text-white">Kiosk Folder Management</h4>
            <div className="space-x-2">
              <button
                onClick={loadFolderStatus}
                className="px-3 py-1 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 transition-colors"
              >
                Refresh Status
              </button>
              <button
                onClick={handleCreateFolders}
                disabled={isLoading}
                className="px-3 py-1 text-sm text-white bg-green-600 dark:bg-green-400 rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {isLoading ? 'Creating...' : 'Create All Folders'}
              </button>
              <button
                onClick={handleCreateScheduledFolders}
                disabled={isLoading}
                className="px-3 py-1 text-sm text-white bg-orange-600 dark:bg-orange-400 rounded-md hover:bg-orange-700 transition-colors disabled:opacity-50"
              >
                {isLoading ? 'Creating...' : 'Create Scheduled Folders'}
              </button>
              <button
                onClick={handleSyncAllNow}
                disabled={isSyncing || !selectedConfig?.is_active}
                className="px-3 py-1 text-sm text-white bg-purple-600 dark:bg-purple-400 rounded-md hover:bg-purple-700 transition-colors disabled:opacity-50"
              >
                {isSyncing ? 'Syncing...' : 'Sync All Now'}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {folderStatus.map((folder) => (
              <div
                key={folder.id}
                className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-md"
              >
                <div>
                  <span className="font-medium text-gray-900 dark:text-white">{folder.kioskName}</span>
                  {folder.folderPath && (
                    <div className="text-xs text-blue-600 dark:text-blue-400 mb-1">
                      📁 {folder.folderPath}
                    </div>
                  )}
                  <div className="text-sm text-gray-500 dark:text-gray-50">
                    Active: {folder.activeFolderId || 'Not created'}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-50">
                    Archive: {folder.archiveFolderId || 'Not created'}
                  </div>
                </div>
                <span
                  className={`px-2 py-1 text-xs rounded-full ${
                    folder.status === 'ready'
                      ? 'bg-green-100 text-green-800'
                      : folder.status === 'error'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}
                >
                  {folder.status}
                </span>
              </div>
            ))}

            {folderStatus.length === 0 && (
              <div className="text-center py-4 text-gray-500">
                <p>No folder status information available.</p>
                <p className="text-sm">Click "Create All Folders" to set up folder structure.</p>
              </div>
            )}
          </div>

          {/* Sync Result Display */}
          {syncResult && (
            <div className={`mt-4 p-4 rounded-md ${
              syncResult.success 
                ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' 
                : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
            }`}>
              <div className="flex">
                <div className={`h-5 w-5 mr-2 mt-0.5 ${
                  syncResult.success ? 'text-green-400' : 'text-red-400'
                }`}>
                  {syncResult.success ? '✓' : '✗'}
                </div>
                <div>
                  <p className={`text-sm font-medium ${
                    syncResult.success 
                      ? 'text-green-800 dark:text-green-200' 
                      : 'text-red-800 dark:text-red-200'
                  }`}>
                    {syncResult.message}
                  </p>
                  {syncResult.success && syncResult.foldersSynced > 0 && (
                    <p className={`text-xs mt-1 ${
                      syncResult.success 
                        ? 'text-green-700 dark:text-green-300' 
                        : 'text-red-700 dark:text-red-300'
                    }`}>
                      {syncResult.foldersSynced} folders synced successfully
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Instructions */}
      <div className="bg-blue-50 dark:bg-gray-800 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 dark:text-white mb-2">Setup Instructions</h4>
        <ol className="text-sm text-blue-800 dark:text-white space-y-1 list-decimal list-inside">
          <li>Create a Google Cloud Project and enable the Google Drive API</li>
          <li>Create OAuth 2.0 credentials and download the JSON file</li>
          <li>Use the OAuth playground to generate a refresh token</li>
          <li>Enter the credentials above and test the connection</li>
          <li>Create folder structure for all kiosks</li>
          <li>Configure automated uploads and sync schedules</li>
        </ol>
      </div>
    </div>
  );
};
