import { useState, useEffect } from 'react';
import { Save, Eye, EyeOff, Youtube } from 'lucide-react';
import { AdminService } from '../../services/adminService';
import { useNotification } from '../../contexts/NotificationContext';

export default function HowItWorksManagement() {
  const { addNotification } = useNotification();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [isHidden, setIsHidden] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const settings = await AdminService.getSystemSettings();
      
      const titleSetting = settings.find(s => s.key === 'how_it_works_title');
      const descSetting = settings.find(s => s.key === 'how_it_works_description');
      const urlSetting = settings.find(s => s.key === 'how_it_works_youtube_url');
      const hiddenSetting = settings.find(s => s.key === 'how_it_works_hidden');

      setTitle(titleSetting?.value || 'How It Works');
      setDescription(descSetting?.value || '');
      setYoutubeUrl(urlSetting?.value || '');
      setIsHidden(hiddenSetting?.value === true || hiddenSetting?.value === 'true');
    } catch (error) {
      console.error('Error loading how it works settings:', error);
      addNotification('error', 'Error', 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      await Promise.all([
        AdminService.updateSystemSetting('how_it_works_title', title),
        AdminService.updateSystemSetting('how_it_works_description', description),
        AdminService.updateSystemSetting('how_it_works_youtube_url', youtubeUrl),
        AdminService.updateSystemSetting('how_it_works_hidden', isHidden)
      ]);

      addNotification('success', 'Success', 'How It Works page settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      addNotification('error', 'Error', 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">How It Works Page Management</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Configure the "How It Works" page content and visibility
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Page Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="How It Works"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter a description for the How It Works page..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Youtube className="inline h-4 w-4 mr-1" />
              YouTube Video URL
            </label>
            <input
              type="url"
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="https://www.youtube.com/watch?v=..."
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Enter a full YouTube URL (e.g., https://www.youtube.com/watch?v=VIDEO_ID)
            </p>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="isHidden"
              checked={isHidden}
              onChange={(e) => setIsHidden(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="isHidden" className="ml-2 block text-sm text-gray-900 dark:text-white flex items-center">
              {isHidden ? <EyeOff className="h-4 w-4 mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
              Hide page from public navigation
            </label>
          </div>

          <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="h-4 w-4" />
              <span>{saving ? 'Saving...' : 'Save Settings'}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <p className="text-blue-800 dark:text-blue-200 text-sm">
          <strong>Note:</strong> The "How It Works" page is accessible at <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">/how-it-works</code>. 
          When hidden, the page will show a "Page Not Available" message to visitors.
        </p>
      </div>
    </div>
  );
}

