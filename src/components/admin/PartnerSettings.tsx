import React, { useState, useEffect, useCallback } from 'react';
import { Upload, Save, X, Image as ImageIcon, Users, Settings, Plus, Edit, Trash2, Eye, EyeOff } from 'lucide-react';
import { AdminService } from '../../services/adminService';
import { PartnerLogosService, PartnerLogo } from '../../services/partnerLogosService';
import { useNotification } from '../../contexts/NotificationContext';
import { supabase } from '../../lib/supabaseClient';

interface PartnerSettingsData {
  partnerNameText: string;
  partnerLogoUrl: string;
  logoBackgroundColor: string;
  isHidden: boolean;
}

interface PartnerLogoFormData {
  name: string;
  logo_url: string;
  website_url: string;
  is_active: boolean;
  display_order: number;
}

export default function PartnerSettings() {
  const { addNotification } = useNotification();
  const [settings, setSettings] = useState<PartnerSettingsData>({
    partnerNameText: 'Proudly Partnered With',
    partnerLogoUrl: '',
    logoBackgroundColor: '#ffffff',
    isHidden: false
  });
  const [partnerLogos, setPartnerLogos] = useState<PartnerLogo[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [showLogoModal, setShowLogoModal] = useState(false);
  const [editingLogo, setEditingLogo] = useState<PartnerLogo | null>(null);
  const [logoFormData, setLogoFormData] = useState<PartnerLogoFormData>({
    name: '',
    logo_url: '',
    website_url: '',
    is_active: true,
    display_order: 0
  });

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      const [systemSettings, logosData] = await Promise.all([
        AdminService.getSystemSettings(),
        PartnerLogosService.getAllPartnerLogos()
      ]);
      
      const partnerNameSetting = systemSettings.find(s => s.key === 'partner_name_text');
      const partnerLogoSetting = systemSettings.find(s => s.key === 'partner_logo_url');
      const logoBackgroundColorSetting = systemSettings.find(s => s.key === 'partner_logo_background_color');
      const partnerHiddenSetting = systemSettings.find(s => s.key === 'partner_section_hidden');
      
      // Handle JSONB values - they are stored as JSON-encoded strings
      const getStringValue = (value: unknown, defaultValue: string): string => {
        if (typeof value === 'string') {
          // If it's a JSON string, parse it
          if (value.startsWith('"') && value.endsWith('"')) {
            try {
              return JSON.parse(value);
            } catch {
              return value;
            }
          }
          return value;
        }
        return defaultValue;
      };

      const loadedSettings = {
        partnerNameText: getStringValue(partnerNameSetting?.value, 'Proudly Partnered With'),
        partnerLogoUrl: getStringValue(partnerLogoSetting?.value, ''),
        logoBackgroundColor: getStringValue(logoBackgroundColorSetting?.value, '#ffffff'),
        isHidden: partnerHiddenSetting?.value === true || partnerHiddenSetting?.value === 'true'
      };

      console.log('PartnerSettings - Loaded settings:', {
        partnerNameSetting: partnerNameSetting?.value,
        partnerLogoSetting: partnerLogoSetting?.value,
        logoBackgroundColorSetting: logoBackgroundColorSetting?.value,
        partnerHiddenSetting: partnerHiddenSetting?.value,
        partnerHiddenSettingType: typeof partnerHiddenSetting?.value,
        loadedSettings
      });

      setSettings(loadedSettings);
      
      
      setPartnerLogos(logosData);
    } catch (error) {
      console.error('Error loading partner settings:', error);
      addNotification('error', 'Error', 'Failed to load partner settings');
    } finally {
      setLoading(false);
    }
  }, [addNotification]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleInputChange = (field: keyof PartnerSettingsData, value: string | boolean) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
    setHasChanges(true);
  };

  const handleLogoInputChange = (field: keyof PartnerLogoFormData, value: string | boolean | number) => {
    setLogoFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      addNotification('error', 'Invalid File', 'Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      addNotification('error', 'File Too Large', 'Please select a file smaller than 5MB');
      return;
    }

    try {
      setUploading(true);
      
      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `partner-logo-${Date.now()}.${fileExt}`;
      const filePath = `partner-logos/${fileName}`;

      // Upload to Supabase Storage
      const { error } = await supabase.storage
        .from('media-assets')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('Storage upload error:', error);
        if (error.message.includes('Bucket not found')) {
          addNotification('error', 'Storage Error', 'Storage bucket not configured. Please contact your administrator.');
        } else if (error.message.includes('permission')) {
          addNotification('error', 'Permission Error', 'You do not have permission to upload files. Please ensure you are logged in as an admin.');
        } else {
          addNotification('error', 'Upload Failed', `Upload failed: ${error.message}`);
        }
        return;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('media-assets')
        .getPublicUrl(filePath);

      setLogoFormData(prev => ({
        ...prev,
        logo_url: publicUrl
      }));
      
      addNotification('success', 'Success', 'Logo uploaded successfully');
    } catch (error) {
      console.error('Error uploading file:', error);
      addNotification('error', 'Upload Failed', 'Failed to upload logo');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      console.log('PartnerSettings - Saving settings:', {
        partnerNameText: settings.partnerNameText,
        partnerLogoUrl: settings.partnerLogoUrl,
        logoBackgroundColor: settings.logoBackgroundColor,
        isHidden: settings.isHidden,
        isHiddenType: typeof settings.isHidden
      });

      // Save all settings
      await Promise.all([
        AdminService.updateSystemSetting('partner_name_text', settings.partnerNameText),
        AdminService.updateSystemSetting('partner_logo_url', settings.partnerLogoUrl),
        AdminService.updateSystemSetting('partner_logo_background_color', settings.logoBackgroundColor),
        AdminService.updateSystemSetting('partner_section_hidden', settings.isHidden)
      ]);
      setHasChanges(false);
      
      // Trigger refresh on homepage
      localStorage.setItem('partner_settings_updated', Date.now().toString());
      
      addNotification('success', 'Success', 'Partner settings saved successfully');
    } catch (error) {
      console.error('Error saving partner settings:', error);
      addNotification('error', 'Save Failed', 'Failed to save partner settings');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveLogo = () => {
    setSettings(prev => ({
      ...prev,
      partnerLogoUrl: ''
    }));
    setHasChanges(true);
  };

  const openLogoModal = (logo?: PartnerLogo) => {
    if (logo) {
      setEditingLogo(logo);
      setLogoFormData({
        name: logo.name,
        logo_url: logo.logo_url,
        website_url: logo.website_url || '',
        is_active: logo.is_active,
        display_order: logo.display_order
      });
    } else {
      setEditingLogo(null);
      setLogoFormData({
        name: '',
        logo_url: '',
        website_url: '',
        is_active: true,
        display_order: partnerLogos.length + 1
      });
    }
    setShowLogoModal(true);
  };

  const closeLogoModal = () => {
    setShowLogoModal(false);
    setEditingLogo(null);
    setLogoFormData({
      name: '',
      logo_url: '',
      website_url: '',
      is_active: true,
      display_order: 0
    });
  };

  const handleSaveLogo = async () => {
    try {
      if (editingLogo) {
        await PartnerLogosService.updatePartnerLogo(editingLogo.id, logoFormData);
        addNotification('success', 'Success', 'Partner logo updated successfully');
      } else {
        await PartnerLogosService.createPartnerLogo(logoFormData);
        addNotification('success', 'Success', 'Partner logo created successfully');
      }
      
      closeLogoModal();
      loadSettings();
    } catch (error) {
      console.error('Error saving partner logo:', error);
      addNotification('error', 'Save Failed', 'Failed to save partner logo');
    }
  };

  const handleDeleteLogo = async (logoId: string) => {
    if (!confirm('Are you sure you want to delete this partner logo?')) return;
    
    try {
      await PartnerLogosService.deletePartnerLogo(logoId);
      addNotification('success', 'Success', 'Partner logo deleted successfully');
      loadSettings();
    } catch (error) {
      console.error('Error deleting partner logo:', error);
      addNotification('error', 'Delete Failed', 'Failed to delete partner logo');
    }
  };

  const handleToggleLogoStatus = async (logoId: string, isActive: boolean) => {
    try {
      await PartnerLogosService.togglePartnerLogoStatus(logoId, isActive);
      addNotification('success', 'Success', `Partner logo ${isActive ? 'activated' : 'deactivated'} successfully`);
      loadSettings();
    } catch (error) {
      console.error('Error toggling partner logo status:', error);
      addNotification('error', 'Update Failed', 'Failed to update partner logo status');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Section Settings */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-3 mb-6">
          <Users className="h-6 w-6 text-primary-600" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Partner Section Settings
          </h3>
        </div>

        <div className="space-y-6">
          {/* Partner Name Text */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Partner Section Title
            </label>
            <input
              type="text"
              value={settings.partnerNameText}
              onChange={(e) => handleInputChange('partnerNameText', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
              placeholder="Enter partner section title"
            />
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              This text will be displayed as the heading for the "Proudly Partnered With" section on the home page.
            </p>
          </div>

          {/* Partner Logo Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Partner Logo
            </label>
            
            {settings.partnerLogoUrl ? (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-24 h-24 border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-700 flex items-center justify-center">
                    <img
                      src={settings.partnerLogoUrl}
                      alt="Partner logo preview"
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      Current logo
                    </p>
                    <button
                      onClick={handleRemoveLogo}
                      className="text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                    >
                      Remove logo
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center">
                <ImageIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  No logo uploaded
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500">
                  Upload a transparent PNG logo for the partner section
                </p>
              </div>
            )}

            <div className="mt-4">
              <label className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 cursor-pointer">
                <Upload className="h-4 w-4 mr-2" />
                {uploading ? 'Uploading...' : 'Upload Logo'}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  className="hidden"
                />
              </label>
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Recommended: Transparent PNG, max 5MB. The logo will be displayed in the partner section.
              </p>
            </div>
          </div>

          {/* Logo Background Color */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Logo Background Color
            </label>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
              <input
                type="color"
                value={settings.logoBackgroundColor}
                onChange={(e) => handleInputChange('logoBackgroundColor', e.target.value)}
                className="w-12 h-10 border border-gray-300 dark:border-gray-600 rounded-md cursor-pointer flex-shrink-0"
              />
              <input
                type="text"
                value={settings.logoBackgroundColor}
                onChange={(e) => handleInputChange('logoBackgroundColor', e.target.value)}
                className="w-full sm:flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                placeholder="#ffffff"
              />
            </div>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Choose the background color for partner logos in the "Proudly Partnered With" section.
            </p>
          </div>

          {/* Hide/Show Section Toggle */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Section Visibility
            </label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleInputChange('isHidden', !settings.isHidden)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                  settings.isHidden ? 'bg-red-600' : 'bg-green-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.isHidden ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {settings.isHidden ? 'Hide Section' : 'Show Section'}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {settings.isHidden 
                    ? 'The "Proudly Partnered With" section will be hidden from the homepage'
                    : 'The "Proudly Partnered With" section will be visible on the homepage'
                  }
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Partner Logos Management */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Settings className="h-6 w-6 text-primary-600" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Partner Logos
            </h3>
          </div>
          <button
            onClick={() => openLogoModal()}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Partner Logo
          </button>
        </div>

        {partnerLogos.length === 0 ? (
          <div className="text-center py-8">
            <ImageIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">No partner logos added yet</p>
            <p className="text-sm text-gray-400 dark:text-gray-500">Click "Add Partner Logo" to get started</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {partnerLogos.map((logo) => (
              <div key={logo.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-gray-900 dark:text-white">{logo.name}</h4>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleLogoStatus(logo.id, !logo.is_active)}
                      className={`p-1 rounded ${
                        logo.is_active 
                          ? 'text-green-600 hover:bg-green-50' 
                          : 'text-gray-400 hover:bg-gray-50'
                      }`}
                    >
                      {logo.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </button>
                    <button
                      onClick={() => openLogoModal(logo)}
                      className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteLogo(logo.id)}
                      className="p-1 text-red-600 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                
                <div className="w-full h-16 bg-gray-50 dark:bg-gray-700 rounded-lg flex items-center justify-center mb-3">
                  <img
                    src={logo.logo_url}
                    alt={`${logo.name} logo`}
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
                
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  <p>Order: {logo.display_order}</p>
                  {logo.website_url && (
                    <p className="truncate">Website: {logo.website_url}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={!hasChanges || saving}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      {/* Partner Logo Modal */}
      {showLogoModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {editingLogo ? 'Edit Partner Logo' : 'Add Partner Logo'}
              </h3>
              <button
                onClick={closeLogoModal}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Partner Name *
                </label>
                <input
                  type="text"
                  value={logoFormData.name}
                  onChange={(e) => handleLogoInputChange('name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Enter partner name"
                />
              </div>

              {/* Logo Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Logo *
                </label>
                {logoFormData.logo_url ? (
                  <div className="mb-3">
                    <div className="w-24 h-24 border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-700 flex items-center justify-center">
                      <img
                        src={logoFormData.logo_url}
                        alt="Logo preview"
                        className="max-w-full max-h-full object-contain"
                      />
                    </div>
                  </div>
                ) : null}
                
                <label className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 cursor-pointer">
                  <Upload className="h-4 w-4 mr-2" />
                  {uploading ? 'Uploading...' : 'Upload Logo'}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/jpg"
                    onChange={handleFileUpload}
                    disabled={uploading}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Website URL */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Website URL
                </label>
                <input
                  type="url"
                  value={logoFormData.website_url}
                  onChange={(e) => handleLogoInputChange('website_url', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                  placeholder="https://example.com"
                />
              </div>

              {/* Display Order */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Display Order
                </label>
                <input
                  type="number"
                  value={logoFormData.display_order}
                  onChange={(e) => handleLogoInputChange('display_order', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                  placeholder="0"
                />
              </div>

              {/* Active Status */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={logoFormData.is_active}
                  onChange={(e) => handleLogoInputChange('is_active', e.target.checked)}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label htmlFor="is_active" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                  Active (visible on website)
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={closeLogoModal}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveLogo}
                disabled={!logoFormData.name || !logoFormData.logo_url}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {editingLogo ? 'Update Logo' : 'Add Logo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}