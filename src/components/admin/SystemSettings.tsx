import { useState, useEffect, useRef } from 'react';
import { Settings, Mail, CreditCard, Cloud, Key, Globe, Save, DollarSign, Database, Tag, TrendingUp, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { AdminService } from '../../services/adminService';
import S3Configuration from './S3Configuration';
import TrackingTagsManagement from './TrackingTagsManagement';
import VolumeDiscountManagement from './VolumeDiscountManagement';
import { GoogleDriveConfiguration } from './GoogleDriveConfiguration';
import { GoogleDriveSettings } from './GoogleDriveSettings';
import { UploadManagement } from './UploadManagement';
import StorageConfigurationManagement from './StorageConfigurationManagement';
import NotificationSettings from './NotificationSettings';

export default function SystemSettings() {
  const [activeTab, setActiveTab] = useState('integrations');
  const [discountPercent, setDiscountPercent] = useState<number>(10);
  const [isSaving, setIsSaving] = useState(false);
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const tabNavRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const settings = await AdminService.getSystemSettings();
        const item = settings.find(s => s.key === 'additional_kiosk_discount_percent');
        if (item) {
          const v = item.value;
          setDiscountPercent(typeof v === 'number' ? v : (v?.percent ?? 10));
        }
      } catch {}
    };
    load();
  }, []);

  useEffect(() => {
    // Check scroll position when tab changes
    setTimeout(checkScrollPosition, 100);
    setTimeout(checkTabScrollPosition, 100);
  }, [activeTab]);

  const checkScrollPosition = () => {
    const container = scrollContainerRef.current;
    if (container) {
      const { scrollTop, scrollHeight, clientHeight } = container;
      setCanScrollUp(scrollTop > 0);
      setCanScrollDown(scrollTop < scrollHeight - clientHeight - 1);
      
      // Calculate scroll progress (0 to 100)
      const maxScroll = scrollHeight - clientHeight;
      const progress = maxScroll > 0 ? (scrollTop / maxScroll) * 100 : 0;
      setScrollProgress(progress);
    }
  };

  const scrollToTop = () => {
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToBottom = () => {
    const container = scrollContainerRef.current;
    if (container) {
      container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
    }
  };

  const checkTabScrollPosition = () => {
    const container = tabNavRef.current;
    if (container) {
      const { scrollLeft, scrollWidth, clientWidth } = container;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
    }
  };

  const scrollTabsLeft = () => {
    const container = tabNavRef.current;
    if (container) {
      container.scrollBy({ left: -200, behavior: 'smooth' });
    }
  };

  const scrollTabsRight = () => {
    const container = tabNavRef.current;
    if (container) {
      container.scrollBy({ left: 200, behavior: 'smooth' });
    }
  };

  const tabs = [
    { id: 'integrations', name: 'Integrations', icon: Globe },
    { id: 'storage-config', name: 'Storage Configuration', icon: Database },
    { id: 's3-config', name: 'S3 Configuration', icon: Database },
    { id: 'gdrive-config', name: 'Google Drive Config', icon: Cloud },
    { id: 'gdrive-settings', name: 'Google Drive Settings', icon: Settings },
    { id: 'upload-management', name: 'Upload Management', icon: Settings },
    { id: 'tracking-tags', name: 'Tracking Tags', icon: Tag },
    { id: 'volume-discounts', name: 'Volume Discounts', icon: TrendingUp },
    { id: 'payments', name: 'Payments', icon: CreditCard },
    { id: 'notifications', name: 'Notifications', icon: Mail },
    { id: 'security', name: 'Security', icon: Key }
  ];

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await AdminService.updateSystemSetting('additional_kiosk_discount_percent', discountPercent);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Header */}
      <div className="px-4 sm:px-0">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">System Settings</h1>
        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1 sm:mt-2">Configure platform integrations and system preferences</p>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <div className="relative tab-nav">
            <nav 
              ref={tabNavRef}
              onScroll={checkTabScrollPosition}
              className="flex overflow-x-auto scrollbar-hide px-4 sm:px-6"
            >
              <div className="flex space-x-1 sm:space-x-4 min-w-max">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`py-3 sm:py-4 px-3 sm:px-4 border-b-2 font-medium text-xs sm:text-sm flex items-center space-x-1 sm:space-x-2 whitespace-nowrap transition-colors ${
                      activeTab === tab.id
                      ? 'border-purple-500 text-purple-600 dark:text-purple-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
                    }`}
                  >
                    <tab.icon className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                    <span className="hidden sm:inline">{tab.name}</span>
                    <span className="sm:hidden">
                      {tab.name.length > 8 ? tab.name.split(' ')[0] : tab.name}
                    </span>
                  </button>
                ))}
              </div>
            </nav>
            
            {/* Tab scroll indicators */}
            {canScrollLeft && (
              <button
                onClick={scrollTabsLeft}
                className="tab-scroll-indicator left-2"
                title="Scroll left"
              >
                <ChevronLeft className="h-4 w-4 text-gray-600 dark:text-gray-400" />
              </button>
            )}
            
            {canScrollRight && (
              <button
                onClick={scrollTabsRight}
                className="tab-scroll-indicator right-2"
                title="Scroll right"
              >
                <ChevronRight className="h-4 w-4 text-gray-600 dark:text-gray-400" />
              </button>
            )}
          </div>
        </div>

        <div className="relative scroll-container">
          {/* Scroll Progress Bar */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gray-200 dark:bg-gray-700 z-10">
            <div 
              className="h-full bg-purple-600 transition-all duration-150 ease-out"
              style={{ width: `${scrollProgress}%` }}
            />
          </div>
          
          <div 
            ref={scrollContainerRef}
            onScroll={checkScrollPosition}
            className="p-4 sm:p-6 pt-6 sm:pt-8 max-h-[calc(100vh-200px)] sm:max-h-[calc(100vh-180px)] lg:max-h-[calc(100vh-160px)] overflow-y-auto scrollbar-custom smooth-scroll"
          >
          {/* Integrations Tab */}
          {activeTab === 'integrations' && (
            <div className="space-y-4 sm:space-y-6">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">Third-Party Integrations</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                {/* Stripe */}
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 sm:p-4">
                  <div className="flex items-center justify-between mb-2 sm:mb-3">
                    <div className="flex items-center space-x-2 sm:space-x-3">
                      <div className="w-6 h-6 sm:w-8 sm:h-8 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <CreditCard className="h-3 w-3 sm:h-5 sm:w-5 text-purple-600" />
                      </div>
                      <span className="font-medium text-sm sm:text-base text-gray-900 dark:text-white">Stripe</span>
                    </div>
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full flex-shrink-0">Connected</span>
                  </div>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-2 sm:mb-3">Payment processing and payouts</p>
                  <button className="text-blue-600 hover:text-blue-800 text-xs sm:text-sm">Manage Settings</button>
                </div>

                {/* Gmail API */}
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 sm:p-4">
                  <div className="flex items-center justify-between mb-2 sm:mb-3">
                    <div className="flex items-center space-x-2 sm:space-x-3">
                      <div className="w-6 h-6 sm:w-8 sm:h-8 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Mail className="h-3 w-3 sm:h-5 sm:w-5 text-red-600" />
                      </div>
                      <span className="font-medium text-sm sm:text-base text-gray-900 dark:text-white">Gmail API</span>
                    </div>
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full flex-shrink-0">Connected</span>
                  </div>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-2 sm:mb-3">Automated email notifications</p>
                  <button className="text-blue-600 hover:text-blue-800 text-xs sm:text-sm">Manage Settings</button>
                </div>

                {/* Google Drive */}
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 sm:p-4">
                  <div className="flex items-center justify-between mb-2 sm:mb-3">
                    <div className="flex items-center space-x-2 sm:space-x-3">
                      <div className="w-6 h-6 sm:w-8 sm:h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Cloud className="h-3 w-3 sm:h-5 sm:w-5 text-blue-600" />
                      </div>
                      <span className="font-medium text-sm sm:text-base text-gray-900 dark:text-white">Google Drive</span>
                    </div>
                    <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full flex-shrink-0">Pending</span>
                  </div>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-2 sm:mb-3">File storage and archiving</p>
                  <button className="text-blue-600 hover:text-blue-800 text-xs sm:text-sm">Connect Now</button>
                </div>

                {/* Google OAuth */}
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 sm:p-4">
                  <div className="flex items-center justify-between mb-2 sm:mb-3">
                    <div className="flex items-center space-x-2 sm:space-x-3">
                      <div className="w-6 h-6 sm:w-8 sm:h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Key className="h-3 w-3 sm:h-5 sm:w-5 text-green-600" />
                      </div>
                      <span className="font-medium text-sm sm:text-base text-gray-900 dark:text-white">Google OAuth</span>
                    </div>
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full flex-shrink-0">Connected</span>
                  </div>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-2 sm:mb-3">User authentication</p>
                  <button className="text-blue-600 hover:text-blue-800 text-xs sm:text-sm">Manage Settings</button>
                </div>
              </div>

              {/* Pricing Settings */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 sm:p-4">
                <div className="flex items-center justify-between mb-2 sm:mb-3">
                  <div className="flex items-center space-x-2 sm:space-x-3">
                    <div className="w-6 h-6 sm:w-8 sm:h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <DollarSign className="h-3 w-3 sm:h-5 sm:w-5 text-blue-600" />
                    </div>
                    <span className="font-medium text-sm sm:text-base text-gray-900 dark:text-white">Pricing</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-xs sm:text-sm text-gray-700 dark:text-gray-300">Additional kiosk discount (%)</label>
                  <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={discountPercent}
                      onChange={(e) => setDiscountPercent(Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)))}
                      className="w-full sm:w-32 px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg text-sm"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400">Applied to each kiosk beyond the first.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Storage Configuration Tab */}
          {activeTab === 'storage-config' && <StorageConfigurationManagement />}

          {/* S3 Configuration Tab */}
          {activeTab === 's3-config' && <S3Configuration />}

          {/* Google Drive Configuration Tab */}
          {activeTab === 'gdrive-config' && <GoogleDriveConfiguration />}

          {/* Google Drive Settings Tab */}
          {activeTab === 'gdrive-settings' && <GoogleDriveSettings />}

          {/* Upload Management Tab */}
          {activeTab === 'upload-management' && <UploadManagement />}

          {/* Tracking Tags Tab */}
          {activeTab === 'tracking-tags' && <TrackingTagsManagement />}

          {/* Volume Discounts Tab */}
          {activeTab === 'volume-discounts' && <VolumeDiscountManagement />}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && <NotificationSettings />}

          {/* Other tabs content would go here */}
          {!['integrations', 'storage-config', 's3-config', 'gdrive-config', 'gdrive-settings', 'upload-management', 'tracking-tags', 'volume-discounts', 'notifications'].includes(activeTab) && (
            <div className="text-center py-12">
              <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">{tabs.find(t => t.id === activeTab)?.name} Settings</h3>
              <p className="text-gray-500 dark:text-gray-400">Configuration options for {tabs.find(t => t.id === activeTab)?.name.toLowerCase()}</p>
            </div>
          )}
          </div>
          
          {/* Scroll Indicators */}
          {canScrollUp && (
            <button
              onClick={scrollToTop}
              className="absolute top-2 right-2 z-20 p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 hover:bg-gray-50 dark:hover:bg-gray-700"
              title="Scroll to top"
            >
              <ChevronUp className="h-4 w-4 text-gray-600 dark:text-gray-400" />
            </button>
          )}
          
          {canScrollDown && (
            <button
              onClick={scrollToBottom}
              className="absolute bottom-2 right-2 z-20 p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 hover:bg-gray-50 dark:hover:bg-gray-700"
              title="Scroll to bottom"
            >
              <ChevronDown className="h-4 w-4 text-gray-600 dark:text-gray-400" />
            </button>
          )}
        </div>

        {/* Save Button */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 rounded-b-lg sm:rounded-b-xl">
          <div className="flex justify-end">
            <button onClick={handleSave} disabled={isSaving} className="bg-purple-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors flex items-center space-x-2 disabled:opacity-60 text-sm sm:text-base">
              <Save className="h-3 w-3 sm:h-4 sm:w-4" />
              <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}