import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, DollarSign, Percent, TrendingUp, Users } from 'lucide-react';
import { VolumeDiscountService } from '../../services/volumeDiscountService';
import { VolumeDiscountSetting } from '../../types/database';

export default function VolumeDiscountManagement() {
  const [settings, setSettings] = useState<VolumeDiscountSetting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingSetting, setEditingSetting] = useState<VolumeDiscountSetting | null>(null);
  const [summary, setSummary] = useState({
    totalDiscountsGiven: 0,
    totalSavings: 0,
    averageDiscountPercentage: 0,
    mostUsedDiscount: null as VolumeDiscountSetting | null
  });
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    discount_type: 'percentage' as const,
    discount_value: 0,
    min_kiosks: 2,
    max_kiosks: undefined as number | undefined,
    is_active: true,
    valid_from: new Date().toISOString().split('T')[0],
    valid_until: undefined as string | undefined
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadSettings();
    loadSummary();
  }, []);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      const settingsData = await VolumeDiscountService.getVolumeDiscountSettings();
      setSettings(settingsData);
    } catch (error) {
      console.error('Error loading volume discount settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadSummary = async () => {
    try {
      const summaryData = await VolumeDiscountService.getVolumeDiscountSummary();
      setSummary(summaryData);
    } catch (error) {
      console.error('Error loading summary:', error);
    }
  };

  const validateForm = (): boolean => {
    const validation = VolumeDiscountService.validateVolumeDiscountSetting(formData);
    setErrors(validation.errors.reduce((acc, error, index) => ({ ...acc, [`error_${index}`]: error }), {}));
    return validation.isValid;
  };

  const handleCreate = async () => {
    if (!validateForm()) return;

    try {
      setIsCreating(true);
      
      const settingId = await VolumeDiscountService.createVolumeDiscountSetting(formData);
      
      if (settingId) {
        await loadSettings();
        await loadSummary();
        resetForm();
      }
    } catch (error) {
      console.error('Error creating volume discount setting:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingSetting || !validateForm()) return;

    try {
      setIsCreating(true);
      
      const success = await VolumeDiscountService.updateVolumeDiscountSetting(editingSetting.id, formData);
      
      if (success) {
        await loadSettings();
        await loadSummary();
        resetForm();
      }
    } catch (error) {
      console.error('Error updating volume discount setting:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (settingId: string) => {
    if (!confirm('Are you sure you want to delete this volume discount setting?')) return;

    try {
      const success = await VolumeDiscountService.deleteVolumeDiscountSetting(settingId);
      if (success) {
        await loadSettings();
        await loadSummary();
      }
    } catch (error) {
      console.error('Error deleting volume discount setting:', error);
    }
  };

  const handleEdit = (setting: VolumeDiscountSetting) => {
    setEditingSetting(setting);
    setFormData({
      name: setting.name,
      description: setting.description || '',
      discount_type: setting.discount_type,
      discount_value: setting.discount_value,
      min_kiosks: setting.min_kiosks,
      max_kiosks: setting.max_kiosks || undefined,
      is_active: setting.is_active,
      valid_from: setting.valid_from.split('T')[0],
      valid_until: setting.valid_until ? setting.valid_until.split('T')[0] : undefined
    });
    setIsEditing(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      discount_type: 'percentage',
      discount_value: 0,
      min_kiosks: 2,
      max_kiosks: undefined,
      is_active: true,
      valid_from: new Date().toISOString().split('T')[0],
      valid_until: undefined
    });
    setEditingSetting(null);
    setIsEditing(false);
    setErrors({});
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;

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
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Volume Discounts</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Manage volume discount settings for multiple kiosk campaigns
          </p>
        </div>
        <button
          onClick={resetForm}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          <span>Add New Discount</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Discounts Given</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{summary.totalDiscountsGiven}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <DollarSign className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Savings</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(summary.totalSavings)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
              <Percent className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Avg Discount</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{summary.averageDiscountPercentage}%</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
              <TrendingUp className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Most Used</p>
              <p className="text-sm font-bold text-gray-900 dark:text-white">
                {summary.mostUsedDiscount?.name || 'N/A'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      {(isEditing || !editingSetting) && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {isEditing ? 'Edit Volume Discount' : 'Create New Volume Discount'}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Discount Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.error_0 ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'
                  } bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
                  placeholder="e.g., Standard Volume Discount"
                />
                {errors.error_0 && <p className="text-red-500 text-sm mt-1">{errors.error_0}</p>}
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Optional description"
                />
              </div>

              {/* Discount Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Discount Type
                </label>
                <select
                  value={formData.discount_type}
                  onChange={(e) => handleInputChange('discount_type', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="percentage">Percentage</option>
                  <option value="fixed_amount">Fixed Amount</option>
                </select>
              </div>

              {/* Discount Value */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Discount Value
                </label>
                <div className="relative">
                  {formData.discount_type === 'percentage' ? (
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Percent className="h-4 w-4 text-gray-400" />
                    </div>
                  ) : (
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <DollarSign className="h-4 w-4 text-gray-400" />
                    </div>
                  )}
                  <input
                    type="number"
                    value={formData.discount_value}
                    onChange={(e) => handleInputChange('discount_value', parseFloat(e.target.value) || 0)}
                    className={`w-full ${formData.discount_type === 'percentage' ? 'pl-10' : 'pl-10'} pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.error_1 ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'
                    } bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
                    placeholder={formData.discount_type === 'percentage' ? '15' : '50'}
                    min="0"
                    max={formData.discount_type === 'percentage' ? 100 : undefined}
                  />
                </div>
                {errors.error_1 && <p className="text-red-500 text-sm mt-1">{errors.error_1}</p>}
              </div>

              {/* Min Kiosks */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Minimum Kiosks
                </label>
                <input
                  type="number"
                  value={formData.min_kiosks}
                  onChange={(e) => handleInputChange('min_kiosks', parseInt(e.target.value) || 2)}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.error_2 ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'
                  } bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
                  placeholder="2"
                  min="2"
                />
                {errors.error_2 && <p className="text-red-500 text-sm mt-1">{errors.error_2}</p>}
              </div>

              {/* Max Kiosks */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Maximum Kiosks (Optional)
                </label>
                <input
                  type="number"
                  value={formData.max_kiosks || ''}
                  onChange={(e) => handleInputChange('max_kiosks', e.target.value ? parseInt(e.target.value) : undefined)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Leave empty for no limit"
                  min="1"
                />
              </div>

              {/* Valid From */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Valid From
                </label>
                <input
                  type="date"
                  value={formData.valid_from}
                  onChange={(e) => handleInputChange('valid_from', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              {/* Valid Until */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Valid Until (Optional)
                </label>
                <input
                  type="date"
                  value={formData.valid_until || ''}
                  onChange={(e) => handleInputChange('valid_until', e.target.value || undefined)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
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

      {/* Settings List */}
      <div className="space-y-4">
        {settings.map((setting) => (
          <div key={setting.id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <h3 className="font-semibold text-gray-900 dark:text-white">{setting.name}</h3>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    setting.is_active 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                  }`}>
                    {setting.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                
                {setting.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{setting.description}</p>
                )}

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Type:</span>
                    <span className="ml-1 font-medium text-gray-900 dark:text-white">
                      {setting.discount_type === 'percentage' ? 'Percentage' : 'Fixed Amount'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Value:</span>
                    <span className="ml-1 font-medium text-gray-900 dark:text-white">
                      {setting.discount_type === 'percentage' 
                        ? `${setting.discount_value}%` 
                        : formatCurrency(setting.discount_value)
                      }
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Min Kiosks:</span>
                    <span className="ml-1 font-medium text-gray-900 dark:text-white">{setting.min_kiosks}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Max Kiosks:</span>
                    <span className="ml-1 font-medium text-gray-900 dark:text-white">
                      {setting.max_kiosks || 'No limit'}
                    </span>
                  </div>
                </div>

                <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Valid from {new Date(setting.valid_from).toLocaleDateString()}
                  {setting.valid_until && ` to ${new Date(setting.valid_until).toLocaleDateString()}`}
                </div>
              </div>

              <div className="flex items-center space-x-2 ml-4">
                <button
                  onClick={() => handleEdit(setting)}
                  className="p-2 text-gray-400 hover:text-blue-600"
                  title="Edit Setting"
                >
                  <Edit className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(setting.id)}
                  className="p-2 text-gray-400 hover:text-red-600"
                  title="Delete Setting"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {settings.length === 0 && (
        <div className="text-center py-12">
          <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No volume discount settings found
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Create your first volume discount setting to encourage multi-kiosk campaigns.
          </p>
        </div>
      )}
    </div>
  );
}
