import { useState, useEffect, useCallback } from 'react';
import { Save, Eye, EyeOff, Youtube } from 'lucide-react';
import { AdminService } from '../../services/adminService';
import { useNotification } from '../../contexts/NotificationContext';

export default function HowItWorksManagement() {
  const { addNotification } = useNotification();
  const [title, setTitle] = useState('');
  
  // Video settings
  const [videoTitle, setVideoTitle] = useState('');
  const [videoDescription, setVideoDescription] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  
  // Second video settings
  const [video2Title, setVideo2Title] = useState('');
  const [video2Description, setVideo2Description] = useState('');
  const [youtube2Url, setYoutube2Url] = useState('');
  
  const [isHidden, setIsHidden] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      const settings = await AdminService.getSystemSettings();
      
      const titleSetting = settings.find(s => s.key === 'how_it_works_title');
      const hiddenSetting = settings.find(s => s.key === 'how_it_works_hidden');
      
      // Video settings
      const videoTitleSetting = settings.find(s => s.key === 'how_it_works_video_title');
      const videoDescSetting = settings.find(s => s.key === 'how_it_works_video_description');
      const videoUrlSetting = settings.find(s => s.key === 'how_it_works_video_url');
      
      // Second video settings
      const video2TitleSetting = settings.find(s => s.key === 'how_it_works_video2_title');
      const video2DescSetting = settings.find(s => s.key === 'how_it_works_video2_description');
      const video2UrlSetting = settings.find(s => s.key === 'how_it_works_video2_url');

      setTitle(titleSetting?.value || 'How It Works');
      setIsHidden(hiddenSetting?.value === true || hiddenSetting?.value === 'true');
      
      setVideoTitle(videoTitleSetting?.value || '');
      setVideoDescription(videoDescSetting?.value || '');
      setYoutubeUrl(videoUrlSetting?.value || '');
      
      setVideo2Title(video2TitleSetting?.value || '');
      setVideo2Description(video2DescSetting?.value || '');
      setYoutube2Url(video2UrlSetting?.value || '');
    } catch (error) {
      console.error('Error loading how it works settings:', error);
      addNotification('error', 'Error', 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, [addNotification]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleSave = async () => {
    try {
      setSaving(true);
      
      await Promise.all([
        AdminService.updateSystemSetting('how_it_works_title', title, true),
        AdminService.updateSystemSetting('how_it_works_hidden', isHidden, true),
        // Video settings
        AdminService.updateSystemSetting('how_it_works_video_title', videoTitle, true),
        AdminService.updateSystemSetting('how_it_works_video_description', videoDescription, true),
        AdminService.updateSystemSetting('how_it_works_video_url', youtubeUrl, true),
        // Second video settings
        AdminService.updateSystemSetting('how_it_works_video2_title', video2Title, true),
        AdminService.updateSystemSetting('how_it_works_video2_description', video2Description, true),
        AdminService.updateSystemSetting('how_it_works_video2_url', youtube2Url, true)
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

          {/* Video Section */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <div className="flex items-center gap-2 mb-4">
              <Youtube className="h-5 w-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Video</h3>
            </div>
            
            <div className="space-y-4 pl-7">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Video Title
                </label>
                <input
                  type="text"
                  value={videoTitle}
                  onChange={(e) => setVideoTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter video title"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Video Description
                </label>
                <textarea
                  value={videoDescription}
                  onChange={(e) => setVideoDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter video description"
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
            </div>
          </div>

          {/* Second Video Section */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <div className="flex items-center gap-2 mb-4">
              <Youtube className="h-5 w-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Video 2</h3>
            </div>
            
            <div className="space-y-4 pl-7">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Video Title
                </label>
                <input
                  type="text"
                  value={video2Title}
                  onChange={(e) => setVideo2Title(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter video title"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Video Description
                </label>
                <textarea
                  value={video2Description}
                  onChange={(e) => setVideo2Description(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter video description"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Youtube className="inline h-4 w-4 mr-1" />
                  YouTube Video URL
                </label>
                <input
                  type="url"
                  value={youtube2Url}
                  onChange={(e) => setYoutube2Url(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="https://www.youtube.com/watch?v=..."
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Enter a full YouTube URL (e.g., https://www.youtube.com/watch?v=VIDEO_ID)
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="isHidden"
              checked={isHidden}
              onChange={(e) => setIsHidden(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="isHidden" className="ml-2 flex items-center text-sm text-gray-900 dark:text-white">
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
          <strong>Note:</strong> The How It Works page is accessible at <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">/how-it-works</code>. 
          When hidden, the page will show a Page Not Available message to visitors.
        </p>
      </div>
    </div>
  );
}

