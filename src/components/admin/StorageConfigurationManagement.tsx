import React, { useState, useEffect } from 'react';
import { Cloud, Key, Save, TestTube, AlertCircle, CheckCircle, Plus, Edit, Trash2, Settings, Database, FolderOpen } from 'lucide-react';
import { StorageConfigService, StorageConfig, S3ConfigData, GoogleDriveConfigData, LocalConfigData } from '../../services/storageConfigService';
import { useNotification } from '../../contexts/NotificationContext';

export default function StorageConfigurationManagement() {
  const { addNotification } = useNotification();
  const [configs, setConfigs] = useState<StorageConfig[]>([]);
  const [selectedConfig, setSelectedConfig] = useState<StorageConfig | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; details?: any } | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    storage_type: 's3' as 's3' | 'google_drive' | 'local',
    description: '',
    is_active: false,
    is_default: false,
    config_data: {} as any
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadConfigurations();
  }, []);

  const loadConfigurations = async () => {
    try {
      setIsLoading(true);
      const configs = await StorageConfigService.getAllStorageConfigs();
      setConfigs(configs);
    } catch (error) {
      console.error('Error loading configurations:', error);
      addNotification('error', 'Error', 'Failed to load storage configurations');
    } finally {
      setIsLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.storage_type) {
      newErrors.storage_type = 'Storage type is required';
    }

    // Validate config data based on storage type
    switch (formData.storage_type) {
      case 's3':
        if (!formData.config_data.bucket_name) {
          newErrors.bucket_name = 'Bucket name is required';
        }
        if (!formData.config_data.region) {
          newErrors.region = 'Region is required';
        }
        if (!formData.config_data.access_key_id) {
          newErrors.access_key_id = 'Access Key ID is required';
        }
        if (!formData.config_data.secret_access_key) {
          newErrors.secret_access_key = 'Secret Access Key is required';
        }
        break;
      case 'google_drive':
        if (!formData.config_data.client_id) {
          newErrors.client_id = 'Client ID is required';
        }
        if (!formData.config_data.client_secret) {
          newErrors.client_secret = 'Client Secret is required';
        }
        if (!formData.config_data.refresh_token) {
          newErrors.refresh_token = 'Refresh Token is required';
        }
        if (!formData.config_data.folder_id) {
          newErrors.folder_id = 'Folder ID is required';
        }
        break;
      case 'local':
        if (!formData.config_data.directory_path) {
          newErrors.directory_path = 'Directory path is required';
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      addNotification('error', 'Validation Error', 'Please fix the form errors');
      return;
    }

    try {
      setIsSaving(true);
      
      if (selectedConfig && isEditing) {
        // Update existing configuration
        const success = await StorageConfigService.updateStorageConfig(selectedConfig.id, {
          name: formData.name,
          config_data: formData.config_data,
          description: formData.description,
          is_active: formData.is_active,
          is_default: formData.is_default
        });

        if (success) {
          addNotification('success', 'Success', 'Storage configuration updated successfully');
          await loadConfigurations();
          setIsEditing(false);
          setSelectedConfig(null);
        } else {
          addNotification('error', 'Error', 'Failed to update storage configuration');
        }
      } else {
        // Create new configuration
        const configId = await StorageConfigService.createStorageConfig({
          name: formData.name,
          storage_type: formData.storage_type,
          config_data: formData.config_data,
          description: formData.description,
          is_active: formData.is_active,
          is_default: formData.is_default
        });

        if (configId) {
          addNotification('success', 'Success', 'Storage configuration created successfully');
          await loadConfigurations();
          setShowCreateForm(false);
          resetForm();
        } else {
          addNotification('error', 'Error', 'Failed to create storage configuration');
        }
      }
    } catch (error) {
      console.error('Error saving configuration:', error);
      addNotification('error', 'Error', 'Failed to save storage configuration');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTest = async () => {
    if (!selectedConfig) return;

    try {
      setIsTesting(true);
      setTestResult(null);

      const result = await StorageConfigService.testStorageConfig(selectedConfig);
      setTestResult(result);

      if (result.success) {
        addNotification('success', 'Test Successful', result.message);
      } else {
        addNotification('error', 'Test Failed', result.message);
      }
    } catch (error) {
      console.error('Error testing configuration:', error);
      addNotification('error', 'Error', 'Failed to test storage configuration');
    } finally {
      setIsTesting(false);
    }
  };

  const handleEdit = (config: StorageConfig) => {
    setSelectedConfig(config);
    setIsEditing(true);
    setFormData({
      name: config.name,
      storage_type: config.storage_type,
      description: config.description || '',
      is_active: config.is_active,
      is_default: config.is_default,
      config_data: config.config_data
    });
    setErrors({});
    setTestResult(null);
  };

  const handleDelete = async (config: StorageConfig) => {
    if (!confirm(`Are you sure you want to delete "${config.name}"?`)) return;

    try {
      const success = await StorageConfigService.deleteStorageConfig(config.id);
      if (success) {
        addNotification('success', 'Success', 'Storage configuration deleted successfully');
        await loadConfigurations();
        if (selectedConfig?.id === config.id) {
          setSelectedConfig(null);
          setIsEditing(false);
        }
      } else {
        addNotification('error', 'Error', 'Failed to delete storage configuration');
      }
    } catch (error) {
      console.error('Error deleting configuration:', error);
      addNotification('error', 'Error', 'Failed to delete storage configuration');
    }
  };

  const handleSetDefault = async (config: StorageConfig) => {
    try {
      const success = await StorageConfigService.setDefaultStorageConfig(config.id, config.storage_type);
      if (success) {
        addNotification('success', 'Success', `${config.name} set as default ${config.storage_type} configuration`);
        await loadConfigurations();
      } else {
        addNotification('error', 'Error', 'Failed to set default configuration');
      }
    } catch (error) {
      console.error('Error setting default configuration:', error);
      addNotification('error', 'Error', 'Failed to set default configuration');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      storage_type: 's3',
      description: '',
      is_active: false,
      is_default: false,
      config_data: {}
    });
    setErrors({});
    setTestResult(null);
  };

  const handleCreateNew = () => {
    setShowCreateForm(true);
    setSelectedConfig(null);
    setIsEditing(false);
    resetForm();
  };

  const getStorageTypeIcon = (type: string) => {
    switch (type) {
      case 's3':
        return <Cloud className="h-5 w-5 text-orange-600" />;
      case 'google_drive':
        return <FolderOpen className="h-5 w-5 text-blue-600" />;
      case 'local':
        return <Database className="h-5 w-5 text-green-600" />;
      default:
        return <Settings className="h-5 w-5 text-gray-600" />;
    }
  };

  const renderConfigForm = () => {
    return (
      <div className="space-y-6">
        {/* Basic Information */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Basic Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Configuration Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className={`w-full px-3 py-2 border rounded-lg ${
                  errors.name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                } dark:bg-gray-700 dark:text-white`}
                placeholder="Enter configuration name"
              />
              {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Storage Type
              </label>
              <select
                value={formData.storage_type}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  storage_type: e.target.value as 's3' | 'google_drive' | 'local',
                  config_data: {} // Reset config data when type changes
                })}
                className={`w-full px-3 py-2 border rounded-lg ${
                  errors.storage_type ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                } dark:bg-gray-700 dark:text-white`}
              >
                <option value="s3">AWS S3</option>
                <option value="google_drive">Google Drive</option>
                <option value="local">Local Storage</option>
              </select>
              {errors.storage_type && <p className="text-red-500 text-sm mt-1">{errors.storage_type}</p>}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                rows={3}
                placeholder="Enter description (optional)"
              />
            </div>
          </div>
        </div>

        {/* Storage Configuration */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {formData.storage_type === 's3' && 'AWS S3 Configuration'}
            {formData.storage_type === 'google_drive' && 'Google Drive Configuration'}
            {formData.storage_type === 'local' && 'Local Storage Configuration'}
          </h3>

          {formData.storage_type === 's3' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Bucket Name
                </label>
                <input
                  type="text"
                  value={formData.config_data.bucket_name || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    config_data: { ...formData.config_data, bucket_name: e.target.value }
                  })}
                  className={`w-full px-3 py-2 border rounded-lg ${
                    errors.bucket_name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  } dark:bg-gray-700 dark:text-white`}
                  placeholder="my-analytics-bucket"
                />
                {errors.bucket_name && <p className="text-red-500 text-sm mt-1">{errors.bucket_name}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Region
                </label>
                <input
                  type="text"
                  value={formData.config_data.region || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    config_data: { ...formData.config_data, region: e.target.value }
                  })}
                  className={`w-full px-3 py-2 border rounded-lg ${
                    errors.region ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  } dark:bg-gray-700 dark:text-white`}
                  placeholder="us-east-1"
                />
                {errors.region && <p className="text-red-500 text-sm mt-1">{errors.region}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Access Key ID
                </label>
                <input
                  type="text"
                  value={formData.config_data.access_key_id || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    config_data: { ...formData.config_data, access_key_id: e.target.value }
                  })}
                  className={`w-full px-3 py-2 border rounded-lg ${
                    errors.access_key_id ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  } dark:bg-gray-700 dark:text-white`}
                  placeholder="AKIAIOSFODNN7EXAMPLE"
                />
                {errors.access_key_id && <p className="text-red-500 text-sm mt-1">{errors.access_key_id}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Secret Access Key
                </label>
                <input
                  type="password"
                  value={formData.config_data.secret_access_key || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    config_data: { ...formData.config_data, secret_access_key: e.target.value }
                  })}
                  className={`w-full px-3 py-2 border rounded-lg ${
                    errors.secret_access_key ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  } dark:bg-gray-700 dark:text-white`}
                  placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
                />
                {errors.secret_access_key && <p className="text-red-500 text-sm mt-1">{errors.secret_access_key}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Folder Prefix (Optional)
                </label>
                <input
                  type="text"
                  value={formData.config_data.folder_prefix || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    config_data: { ...formData.config_data, folder_prefix: e.target.value }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  placeholder="analytics/"
                />
              </div>
            </div>
          )}

          {formData.storage_type === 'google_drive' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Client ID
                </label>
                <input
                  type="text"
                  value={formData.config_data.client_id || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    config_data: { ...formData.config_data, client_id: e.target.value }
                  })}
                  className={`w-full px-3 py-2 border rounded-lg ${
                    errors.client_id ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  } dark:bg-gray-700 dark:text-white`}
                  placeholder="123456789-abcdefghijklmnop.apps.googleusercontent.com"
                />
                {errors.client_id && <p className="text-red-500 text-sm mt-1">{errors.client_id}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Client Secret
                </label>
                <input
                  type="password"
                  value={formData.config_data.client_secret || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    config_data: { ...formData.config_data, client_secret: e.target.value }
                  })}
                  className={`w-full px-3 py-2 border rounded-lg ${
                    errors.client_secret ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  } dark:bg-gray-700 dark:text-white`}
                  placeholder="GOCSPX-abcdefghijklmnopqrstuvwx"
                />
                {errors.client_secret && <p className="text-red-500 text-sm mt-1">{errors.client_secret}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Refresh Token
                </label>
                <input
                  type="password"
                  value={formData.config_data.refresh_token || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    config_data: { ...formData.config_data, refresh_token: e.target.value }
                  })}
                  className={`w-full px-3 py-2 border rounded-lg ${
                    errors.refresh_token ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  } dark:bg-gray-700 dark:text-white`}
                  placeholder="1//04abcdefghijklmnopqrstuvwxyz"
                />
                {errors.refresh_token && <p className="text-red-500 text-sm mt-1">{errors.refresh_token}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Folder ID
                </label>
                <input
                  type="text"
                  value={formData.config_data.folder_id || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    config_data: { ...formData.config_data, folder_id: e.target.value }
                  })}
                  className={`w-full px-3 py-2 border rounded-lg ${
                    errors.folder_id ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  } dark:bg-gray-700 dark:text-white`}
                  placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                />
                {errors.folder_id && <p className="text-red-500 text-sm mt-1">{errors.folder_id}</p>}
              </div>
            </div>
          )}

          {formData.storage_type === 'local' && (
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Directory Path
                </label>
                <input
                  type="text"
                  value={formData.config_data.directory_path || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    config_data: { ...formData.config_data, directory_path: e.target.value }
                  })}
                  className={`w-full px-3 py-2 border rounded-lg ${
                    errors.directory_path ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  } dark:bg-gray-700 dark:text-white`}
                  placeholder="/path/to/analytics/files"
                />
                {errors.directory_path && <p className="text-red-500 text-sm mt-1">{errors.directory_path}</p>}
              </div>
            </div>
          )}
        </div>

        {/* Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Settings</h3>
          <div className="space-y-4">
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

            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_default"
                checked={formData.is_default}
                onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="is_default" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                Default Configuration for {formData.storage_type.toUpperCase()}
              </label>
            </div>
          </div>
        </div>

        {/* Test Result */}
        {testResult && (
          <div className={`rounded-lg p-4 ${
            testResult.success ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
          }`}>
            <div className="flex items-center">
              {testResult.success ? (
                <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
              )}
              <span className={`font-medium ${
                testResult.success ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'
              }`}>
                {testResult.message}
              </span>
            </div>
            {testResult.details && (
              <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                <pre className="whitespace-pre-wrap">{JSON.stringify(testResult.details, null, 2)}</pre>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end space-x-3">
          <button
            onClick={() => {
              setIsEditing(false);
              setSelectedConfig(null);
              setShowCreateForm(false);
              resetForm();
            }}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
          
          {selectedConfig && (
            <button
              onClick={handleTest}
              disabled={isTesting}
              className="px-4 py-2 text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/20 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/30 transition-colors disabled:opacity-50"
            >
              {isTesting ? (
                <>
                  <TestTube className="h-4 w-4 mr-2 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <TestTube className="h-4 w-4 mr-2" />
                  Test Connection
                </>
              )}
            </button>
          )}

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <Save className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Configuration
              </>
            )}
          </button>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading storage configurations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Storage Configuration</h2>
          <p className="text-gray-600 dark:text-gray-400">Manage AWS S3, Google Drive, and local storage configurations for CSV analytics imports</p>
        </div>
        <button
          onClick={handleCreateNew}
          className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Configuration
        </button>
      </div>

      {/* Configurations List */}
      {!showCreateForm && !isEditing && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {configs.map((config) => (
            <div key={config.id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  {getStorageTypeIcon(config.storage_type)}
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">{config.name}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 capitalize">{config.storage_type}</p>
                  </div>
                </div>
                <div className="flex space-x-1">
                  <button
                    onClick={() => handleEdit(config)}
                    className="p-1 text-gray-600 hover:text-blue-600 transition-colors"
                    title="Edit"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(config)}
                    className="p-1 text-gray-600 hover:text-red-600 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {config.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{config.description}</p>
              )}

              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Status:</span>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    config.is_active 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-200' 
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                  }`}>
                    {config.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Default:</span>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    config.is_default 
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-200' 
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                  }`}>
                    {config.is_default ? 'Yes' : 'No'}
                  </span>
                </div>
              </div>

              <div className="flex space-x-2">
                {!config.is_default && (
                  <button
                    onClick={() => handleSetDefault(config)}
                    className="flex-1 px-3 py-2 text-sm text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/20 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/30 transition-colors"
                  >
                    Set Default
                  </button>
                )}
                <button
                  onClick={() => handleEdit(config)}
                  className="flex-1 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Edit
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Form */}
      {(showCreateForm || isEditing) && renderConfigForm()}
    </div>
  );
}
