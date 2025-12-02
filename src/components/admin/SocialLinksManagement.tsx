import { useState, useEffect } from 'react';
import { Facebook, Instagram, Music, Save, Link as LinkIcon } from 'lucide-react';
import { AdminService } from '../../services/adminService';
import { useNotification } from '../../contexts/NotificationContext';

interface SocialLinks {
  facebook: string;
  instagram: string;
  tiktok: string;
}

export default function SocialLinksManagement() {
  const { addNotification } = useNotification();
  const [links, setLinks] = useState<SocialLinks>({
    facebook: '',
    instagram: '',
    tiktok: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    loadSocialLinks();
  }, []);

  const loadSocialLinks = async () => {
    try {
      setLoading(true);
      const settings = await AdminService.getSystemSettings();
      
      const facebookSetting = settings.find(s => s.key === 'social_link_facebook');
      const instagramSetting = settings.find(s => s.key === 'social_link_instagram');
      const tiktokSetting = settings.find(s => s.key === 'social_link_tiktok');

      setLinks({
        facebook: facebookSetting?.value ? (typeof facebookSetting.value === 'string' ? JSON.parse(facebookSetting.value) : facebookSetting.value) : '',
        instagram: instagramSetting?.value ? (typeof instagramSetting.value === 'string' ? JSON.parse(instagramSetting.value) : instagramSetting.value) : '',
        tiktok: tiktokSetting?.value ? (typeof tiktokSetting.value === 'string' ? JSON.parse(tiktokSetting.value) : tiktokSetting.value) : ''
      });
    } catch (error) {
      console.error('Error loading social links:', error);
      addNotification('error', 'Error', 'Failed to load social links');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (platform: keyof SocialLinks, value: string) => {
    setLinks(prev => ({
      ...prev,
      [platform]: value
    }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      await Promise.all([
        AdminService.updateSystemSetting('social_link_facebook', links.facebook),
        AdminService.updateSystemSetting('social_link_instagram', links.instagram),
        AdminService.updateSystemSetting('social_link_tiktok', links.tiktok)
      ]);

      setHasChanges(false);
      addNotification('success', 'Success', 'Social links saved successfully');
    } catch (error) {
      console.error('Error saving social links:', error);
      addNotification('error', 'Error', 'Failed to save social links. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const validateUrl = (url: string): boolean => {
    if (!url) return true; // Empty URL is valid (optional)
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Header */}
      <div className="px-4 sm:px-0">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Social Links Management</h1>
        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1 sm:mt-2">
          Manage social media links that will appear in the footer of all pages. Leave empty to hide a social icon.
        </p>
      </div>

      {/* Content Card */}
      <div className="bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6">

      <div className="space-y-4">
        {/* Facebook */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <Facebook className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-white">Facebook</label>
              <p className="text-xs text-gray-500 dark:text-gray-400">Your Facebook page or profile URL</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <LinkIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
            <input
              type="url"
              value={links.facebook}
              onChange={(e) => handleInputChange('facebook', e.target.value)}
              placeholder="https://facebook.com/yourpage"
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          {links.facebook && !validateUrl(links.facebook) && (
            <p className="text-xs text-red-500 mt-1">Please enter a valid URL</p>
          )}
        </div>

        {/* Instagram */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
              <Instagram className="h-5 w-5 text-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-white">Instagram</label>
              <p className="text-xs text-gray-500 dark:text-gray-400">Your Instagram profile URL</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <LinkIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
            <input
              type="url"
              value={links.instagram}
              onChange={(e) => handleInputChange('instagram', e.target.value)}
              placeholder="https://instagram.com/yourprofile"
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          {links.instagram && !validateUrl(links.instagram) && (
            <p className="text-xs text-red-500 mt-1">Please enter a valid URL</p>
          )}
        </div>

        {/* TikTok */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-10 h-10 bg-black dark:bg-gray-800 rounded-lg flex items-center justify-center">
              <Music className="h-5 w-5 text-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-white">TikTok</label>
              <p className="text-xs text-gray-500 dark:text-gray-400">Your TikTok profile URL</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <LinkIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
            <input
              type="url"
              value={links.tiktok}
              onChange={(e) => handleInputChange('tiktok', e.target.value)}
              placeholder="https://tiktok.com/@yourprofile"
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          {links.tiktok && !validateUrl(links.tiktok) && (
            <p className="text-xs text-red-500 mt-1">Please enter a valid URL</p>
          )}
        </div>
      </div>

        {/* Save Button */}
        {hasChanges && (
          <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={handleSave}
              disabled={saving || !validateUrl(links.facebook) || !validateUrl(links.instagram) || !validateUrl(links.tiktok)}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors flex items-center space-x-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <Save className="h-4 w-4" />
              <span>{saving ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

