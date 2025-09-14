import React, { useState, useEffect } from 'react';
import { Cloud, Key, Save, TestTube, AlertCircle, CheckCircle } from 'lucide-react';
import { S3Service } from '../../services/s3Service';
import { S3Configuration as S3ConfigType } from '../../types/database';

export default function S3Configuration() {
  const [config, setConfig] = useState<S3ConfigType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [formData, setFormData] = useState({
    name: 'OptiSigns Default',
    bucket_name: '',
    region: 'us-east-1',
    access_key_id: '',
    secret_access_key: '',
    is_active: true
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadConfiguration();
  }, []);

  const loadConfiguration = async () => {
    try {
      setIsLoading(true);
      const configData = await S3Service.getS3Configuration();
      if (configData) {
        setConfig(configData);
        setFormData({
          name: configData.name,
          bucket_name: configData.bucket_name,
          region: configData.region,
          access_key_id: configData.access_key_id,
          secret_access_key: configData.secret_access_key,
          is_active: configData.is_active
        });
      }
    } catch (error) {
      console.error('Error loading S3 configuration:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Configuration name is required';
    }

    if (!formData.bucket_name.trim()) {
      newErrors.bucket_name = 'Bucket name is required';
    }

    if (!formData.region.trim()) {
      newErrors.region = 'Region is required';
    }

    if (!formData.access_key_id.trim()) {
      newErrors.access_key_id = 'Access Key ID is required';
    }

    if (!formData.secret_access_key.trim()) {
      newErrors.secret_access_key = 'Secret Access Key is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      setIsSaving(true);
      setTestResult(null);
      
      const configId = await S3Service.saveS3Configuration(formData);
      
      if (configId) {
        await loadConfiguration();
        setTestResult({
          success: true,
          message: 'S3 configuration saved successfully!'
        });
      } else {
        setTestResult({
          success: false,
          message: 'Failed to save S3 configuration'
        });
      }
    } catch (error) {
      console.error('Error saving S3 configuration:', error);
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTest = async () => {
    if (!validateForm()) return;

    try {
      setIsTesting(true);
      setTestResult(null);

      // Test S3 connection by listing files
      const s3Config = {
        bucketName: formData.bucket_name,
        region: formData.region,
        accessKeyId: formData.access_key_id,
        secretAccessKey: formData.secret_access_key
      };

      const files = await S3Service.listOptiSignsFiles(s3Config);
      
      setTestResult({
        success: true,
        message: `Connection successful! Found ${files.length} files in the bucket.`
      });
    } catch (error) {
      console.error('Error testing S3 connection:', error);
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : 'Connection test failed'
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">S3 Configuration</h2>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Configure AWS S3 settings for OptiSigns Proof of Play CSV imports
        </p>
      </div>

      {/* Configuration Form */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Configuration Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Configuration Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.name ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'
                } bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
                placeholder="e.g., OptiSigns Production"
              />
              {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
            </div>

            {/* Bucket Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                S3 Bucket Name
              </label>
              <input
                type="text"
                value={formData.bucket_name}
                onChange={(e) => handleInputChange('bucket_name', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.bucket_name ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'
                } bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
                placeholder="e.g., optisigns-proof-of-play"
              />
              {errors.bucket_name && <p className="text-red-500 text-sm mt-1">{errors.bucket_name}</p>}
            </div>

            {/* Region */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                AWS Region
              </label>
              <select
                value={formData.region}
                onChange={(e) => handleInputChange('region', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.region ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'
                } bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
              >
                <option value="us-east-1">US East (N. Virginia)</option>
                <option value="us-west-2">US West (Oregon)</option>
                <option value="eu-west-1">Europe (Ireland)</option>
                <option value="ap-southeast-1">Asia Pacific (Singapore)</option>
              </select>
              {errors.region && <p className="text-red-500 text-sm mt-1">{errors.region}</p>}
            </div>

            {/* Access Key ID */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Access Key ID
              </label>
              <input
                type="text"
                value={formData.access_key_id}
                onChange={(e) => handleInputChange('access_key_id', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.access_key_id ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'
                } bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
                placeholder="AKIA..."
              />
              {errors.access_key_id && <p className="text-red-500 text-sm mt-1">{errors.access_key_id}</p>}
            </div>

            {/* Secret Access Key */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Secret Access Key
              </label>
              <input
                type="password"
                value={formData.secret_access_key}
                onChange={(e) => handleInputChange('secret_access_key', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.secret_access_key ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'
                } bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
                placeholder="Enter your secret access key"
              />
              {errors.secret_access_key && <p className="text-red-500 text-sm mt-1">{errors.secret_access_key}</p>}
            </div>

            {/* Active Status */}
            <div className="md:col-span-2">
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => handleInputChange('is_active', e.target.checked)}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Active Configuration
                </span>
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Only one S3 configuration can be active at a time
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 rounded-b-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={handleTest}
                disabled={isTesting || isSaving}
                className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <TestTube className="h-4 w-4" />
                <span>{isTesting ? 'Testing...' : 'Test Connection'}</span>
              </button>
            </div>

            <button
              onClick={handleSave}
              disabled={isSaving || isTesting}
              className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="h-4 w-4" />
              <span>{isSaving ? 'Saving...' : 'Save Configuration'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Test Result */}
      {testResult && (
        <div className={`rounded-lg p-4 ${
          testResult.success 
            ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
            : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
        }`}>
          <div className="flex items-center space-x-3">
            {testResult.success ? (
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
            )}
            <p className={`text-sm font-medium ${
              testResult.success 
                ? 'text-green-800 dark:text-green-200'
                : 'text-red-800 dark:text-red-200'
            }`}>
              {testResult.message}
            </p>
          </div>
        </div>
      )}

      {/* Current Configuration Status */}
      {config && (
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <Cloud className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <div>
              <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                Current Configuration
              </h3>
              <p className="text-sm text-blue-600 dark:text-blue-400">
                {config.name} - {config.bucket_name} ({config.region})
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
