import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Eye, TestTube, CheckCircle, AlertCircle, Code, Globe } from 'lucide-react';
import { TrackingService } from '../../services/trackingService';
import { TrackingTag } from '../../types/database';

export default function TrackingTagsManagement() {
  const [tags, setTags] = useState<TrackingTag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingTag, setEditingTag] = useState<TrackingTag | null>(null);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    platform: 'google_analytics' as const,
    tag_id: '',
    tag_code: '',
    is_active: true,
    placement: 'head' as const,
    conditions: {}
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadTags();
  }, []);

  const loadTags = async () => {
    try {
      setIsLoading(true);
      const tagsData = await TrackingService.getTrackingTags();
      setTags(tagsData);
    } catch (error) {
      console.error('Error loading tracking tags:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Tag name is required';
    }

    if (!formData.tag_id.trim()) {
      newErrors.tag_id = 'Tag ID is required';
    }

    if (!formData.tag_code.trim()) {
      newErrors.tag_code = 'Tag code is required';
    }

    // Validate tag code based on platform
    const validation = TrackingService.validateTrackingTagCode(formData.platform, formData.tag_code);
    if (!validation.isValid) {
      newErrors.tag_code = validation.errors.join(', ');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreate = async () => {
    if (!validateForm()) return;

    try {
      setIsCreating(true);
      setTestResult(null);
      
      const tagId = await TrackingService.createTrackingTag(formData);
      
      if (tagId) {
        await loadTags();
        resetForm();
        setTestResult({
          success: true,
          message: 'Tracking tag created successfully!'
        });
      } else {
        setTestResult({
          success: false,
          message: 'Failed to create tracking tag'
        });
      }
    } catch (error) {
      console.error('Error creating tracking tag:', error);
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingTag || !validateForm()) return;

    try {
      setIsCreating(true);
      setTestResult(null);
      
      const success = await TrackingService.updateTrackingTag(editingTag.id, formData);
      
      if (success) {
        await loadTags();
        resetForm();
        setTestResult({
          success: true,
          message: 'Tracking tag updated successfully!'
        });
      } else {
        setTestResult({
          success: false,
          message: 'Failed to update tracking tag'
        });
      }
    } catch (error) {
      console.error('Error updating tracking tag:', error);
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (tagId: string) => {
    if (!confirm('Are you sure you want to delete this tracking tag?')) return;

    try {
      const success = await TrackingService.deleteTrackingTag(tagId);
      if (success) {
        await loadTags();
        setTestResult({
          success: true,
          message: 'Tracking tag deleted successfully!'
        });
      } else {
        setTestResult({
          success: false,
          message: 'Failed to delete tracking tag'
        });
      }
    } catch (error) {
      console.error('Error deleting tracking tag:', error);
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  };

  const handleTest = async (tagId: string) => {
    try {
      setTestResult(null);
      const result = await TrackingService.testTrackingTag(tagId);
      setTestResult(result);
    } catch (error) {
      console.error('Error testing tracking tag:', error);
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : 'Test failed'
      });
    }
  };

  const handleEdit = (tag: TrackingTag) => {
    setEditingTag(tag);
    setFormData({
      name: tag.name,
      platform: tag.platform,
      tag_id: tag.tag_id,
      tag_code: tag.tag_code,
      is_active: tag.is_active,
      placement: tag.placement,
      conditions: tag.conditions
    });
    setIsEditing(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      platform: 'google_analytics',
      tag_id: '',
      tag_code: '',
      is_active: true,
      placement: 'head',
      conditions: {}
    });
    setEditingTag(null);
    setIsEditing(false);
    setErrors({});
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'google_analytics':
      case 'google_tag_manager':
        return <Globe className="h-4 w-4 text-blue-600" />;
      case 'facebook_pixel':
        return <Globe className="h-4 w-4 text-blue-800" />;
      case 'bing_ads':
        return <Globe className="h-4 w-4 text-yellow-600" />;
      default:
        return <Code className="h-4 w-4 text-gray-600" />;
    }
  };

  const getPlatformColor = (platform: string) => {
    switch (platform) {
      case 'google_analytics':
      case 'google_tag_manager':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'facebook_pixel':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'bing_ads':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Tracking Tags</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Manage third-party tracking tags for marketing analytics
          </p>
        </div>
        <button
          onClick={resetForm}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          <span>Add New Tag</span>
        </button>
      </div>

      {/* Form */}
      {(isEditing || !editingTag) && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {isEditing ? 'Edit Tracking Tag' : 'Create New Tracking Tag'}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Tag Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Tag Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.name ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'
                  } bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
                  placeholder="e.g., Google Analytics 4"
                />
                {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
              </div>

              {/* Platform */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Platform
                </label>
                <select
                  value={formData.platform}
                  onChange={(e) => handleInputChange('platform', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="google_analytics">Google Analytics</option>
                  <option value="google_tag_manager">Google Tag Manager</option>
                  <option value="facebook_pixel">Facebook Pixel</option>
                  <option value="bing_ads">Bing Ads</option>
                  <option value="custom">Custom</option>
                </select>
              </div>

              {/* Tag ID */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Tag ID
                </label>
                <input
                  type="text"
                  value={formData.tag_id}
                  onChange={(e) => handleInputChange('tag_id', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.tag_id ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'
                  } bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
                  placeholder="e.g., G-XXXXXXXXXX"
                />
                {errors.tag_id && <p className="text-red-500 text-sm mt-1">{errors.tag_id}</p>}
              </div>

              {/* Placement */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Placement
                </label>
                <select
                  value={formData.placement}
                  onChange={(e) => handleInputChange('placement', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="head">Head</option>
                  <option value="body">Body</option>
                  <option value="footer">Footer</option>
                </select>
              </div>

              {/* Tag Code */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Tag Code
                </label>
                <textarea
                  value={formData.tag_code}
                  onChange={(e) => handleInputChange('tag_code', e.target.value)}
                  rows={6}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.tag_code ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'
                  } bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm`}
                  placeholder="Paste your tracking code here..."
                />
                {errors.tag_code && <p className="text-red-500 text-sm mt-1">{errors.tag_code}</p>}
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
                    Active
                  </span>
                </label>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end space-x-3 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={resetForm}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={isEditing ? handleUpdate : handleCreate}
                disabled={isCreating}
                className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                <span>{isCreating ? 'Saving...' : (isEditing ? 'Update' : 'Create')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tags List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tags.map((tag) => (
          <div key={tag.id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-2">
                {getPlatformIcon(tag.platform)}
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${getPlatformColor(tag.platform)}`}>
                  {tag.platform.replace('_', ' ').toUpperCase()}
                </span>
              </div>
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => handleTest(tag.id)}
                  className="p-1 text-gray-400 hover:text-blue-600"
                  title="Test Tag"
                >
                  <TestTube className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleEdit(tag)}
                  className="p-1 text-gray-400 hover:text-blue-600"
                  title="Edit Tag"
                >
                  <Edit className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(tag.id)}
                  className="p-1 text-gray-400 hover:text-red-600"
                  title="Delete Tag"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">{tag.name}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">ID: {tag.tag_id}</p>
            <p className="text-xs text-gray-500 dark:text-gray-500 mb-3">
              Placement: {tag.placement}
            </p>

            <div className="flex items-center justify-between">
              <span className={`text-xs px-2 py-1 rounded-full ${
                tag.is_active 
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                  : 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
              }`}>
                {tag.is_active ? 'Active' : 'Inactive'}
              </span>
              <button
                onClick={() => navigator.clipboard.writeText(tag.tag_code)}
                className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
              >
                Copy Code
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {tags.length === 0 && (
        <div className="text-center py-12">
          <Code className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No tracking tags found
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Create your first tracking tag to get started with analytics.
          </p>
        </div>
      )}

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
    </div>
  );
}
