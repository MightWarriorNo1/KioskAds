import { useState, useEffect } from 'react';
import { Settings, Mail, CreditCard, Cloud, Key, Globe, Save, DollarSign, Database, Tag, TrendingUp } from 'lucide-react';
import { AdminService } from '../../services/adminService';
import S3Configuration from './S3Configuration';
import TrackingTagsManagement from './TrackingTagsManagement';
import VolumeDiscountManagement from './VolumeDiscountManagement';
import { GoogleDriveConfiguration } from './GoogleDriveConfiguration';
import { UploadManagement } from './UploadManagement';
import StorageConfigurationManagement from './StorageConfigurationManagement';

export default function SystemSettings() {
  const [activeTab, setActiveTab] = useState('integrations');
  const [discountPercent, setDiscountPercent] = useState<number>(10);
  const [isSaving, setIsSaving] = useState(false);

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

  const tabs = [
    { id: 'integrations', name: 'Integrations', icon: Globe },
    { id: 'storage-config', name: 'Storage Configuration', icon: Database },
    { id: 's3-config', name: 'S3 Configuration', icon: Database },
    { id: 'gdrive-config', name: 'Google Drive', icon: Cloud },
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
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">System Settings</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">Configure platform integrations and system preferences</p>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex space-x-8 px-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  activeTab === tab.id
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                <span>{tab.name}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Integrations Tab */}
          {activeTab === 'integrations' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Third-Party Integrations</h3>
              
              <div className="grid md:grid-cols-2 gap-6">
                {/* Stripe */}
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                        <CreditCard className="h-5 w-5 text-purple-600" />
                      </div>
                      <span className="font-medium text-gray-900 dark:text-white">Stripe</span>
                    </div>
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">Connected</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Payment processing and payouts</p>
                  <button className="text-blue-600 hover:text-blue-800 text-sm">Manage Settings</button>
                </div>

                {/* Gmail API */}
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                        <Mail className="h-5 w-5 text-red-600" />
                      </div>
                      <span className="font-medium text-gray-900 dark:text-white">Gmail API</span>
                    </div>
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">Connected</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Automated email notifications</p>
                  <button className="text-blue-600 hover:text-blue-800 text-sm">Manage Settings</button>
                </div>

                {/* Google Drive */}
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Cloud className="h-5 w-5 text-blue-600" />
                      </div>
                      <span className="font-medium text-gray-900 dark:text-white">Google Drive</span>
                    </div>
                    <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">Pending</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">File storage and archiving</p>
                  <button className="text-blue-600 hover:text-blue-800 text-sm">Connect Now</button>
                </div>

                {/* Google OAuth */}
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                        <Key className="h-5 w-5 text-green-600" />
                      </div>
                      <span className="font-medium text-gray-900 dark:text-white">Google OAuth</span>
                    </div>
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">Connected</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">User authentication</p>
                  <button className="text-blue-600 hover:text-blue-800 text-sm">Manage Settings</button>
                </div>
              </div>

              {/* Pricing Settings */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <DollarSign className="h-5 w-5 text-blue-600" />
                    </div>
                    <span className="font-medium text-gray-900 dark:text-white">Pricing</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm text-gray-700 dark:text-gray-300">Additional kiosk discount (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={discountPercent}
                    onChange={(e) => setDiscountPercent(Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)))}
                    className="w-32 px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400">Applied to each kiosk beyond the first.</p>
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

          {/* Upload Management Tab */}
          {activeTab === 'upload-management' && <UploadManagement />}

          {/* Tracking Tags Tab */}
          {activeTab === 'tracking-tags' && <TrackingTagsManagement />}

          {/* Volume Discounts Tab */}
          {activeTab === 'volume-discounts' && <VolumeDiscountManagement />}

          {/* Other tabs content would go here */}
          {!['integrations', 'storage-config', 's3-config', 'gdrive-config', 'upload-management', 'tracking-tags', 'volume-discounts'].includes(activeTab) && (
            <div className="text-center py-12">
              <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">{tabs.find(t => t.id === activeTab)?.name} Settings</h3>
              <p className="text-gray-500 dark:text-gray-400">Configuration options for {tabs.find(t => t.id === activeTab)?.name.toLowerCase()}</p>
            </div>
          )}
        </div>

        {/* Save Button */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 rounded-b-xl">
          <button onClick={handleSave} disabled={isSaving} className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors flex items-center space-x-2 disabled:opacity-60">
            <Save className="h-4 w-4" />
            <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}