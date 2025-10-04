import React, { useState, useEffect } from 'react';
import { Upload, Save, X, Image as ImageIcon, Users, Settings } from 'lucide-react';
import { AdminService } from '../../services/adminService';
import { useNotification } from '../../contexts/NotificationContext';
import { supabase } from '../../lib/supabaseClient';

interface PartnerSettingsData {
  partnerNameText: string;
  partnerLogoUrl: string;
}

export default function PartnerSettings() {
  const { addNotification } = useNotification();
  const [settings, setSettings] = useState<PartnerSettingsData>({
    partnerNameText: 'Proudly Partnered With',
    partnerLogoUrl: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const systemSettings = await AdminService.getSystemSettings();
      
      const partnerNameSetting = systemSettings.find(s => s.key === 'partner_name_text');
      const partnerLogoSetting = systemSettings.find(s => s.key === 'partner_logo_url');
      
      setSettings({
        partnerNameText: partnerNameSetting?.value || 'Proudly Partnered With',
        partnerLogoUrl: partnerLogoSetting?.value || ''
      });
    } catch (error) {
      console.error('Error loading partner settings:', error);
      addNotification('error', 'Error', 'Failed to load partner settings');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof PartnerSettingsData, value: string) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
    setHasChanges(true);
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
      const { data, error } = await supabase.storage
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

      setSettings(prev => ({
        ...prev,
        partnerLogoUrl: publicUrl
      }));
      setHasChanges(true);
      
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
      
      // Save both settings
      await Promise.all([
        AdminService.updateSystemSetting('partner_name_text', settings.partnerNameText),
        AdminService.updateSystemSetting('partner_logo_url', settings.partnerLogoUrl)
      ]);

      setHasChanges(false);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
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
        </div>
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
    </div>
  );
}
